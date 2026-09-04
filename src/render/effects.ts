import { KINDS, dropDistance, shapeOf, type GameEvent, type GameState } from '../engine'

/**
 * The visual memory of the renderer (ADR-0012).
 *
 * Animation needs to know where things WERE, and nothing else here remembers:
 * `reduce` mutates its state in place (ADR-0010), so the previous tick is gone by the
 * time anyone could look at it. This is the one place allowed to keep that. It is
 * derived state only -- nothing reads it back into the engine.
 *
 * Everything is a fixed set of numbers on one object created with the renderer.
 * `advance()` only subtracts, and no method allocates, so the per-frame path stays
 * allocation-free (NFR-PERF-03). Cell lists are exposed as a shared buffer plus a
 * count rather than a sliced array, for the same reason.
 */

/** Lock flash. Long enough to read, short enough not to feel like a delay. */
const FLASH_MS = 80
const TRAIL_MS = 100
const SHAKE_MS = 180
/** Peak shake displacement. Punctuation, not an event. */
const SHAKE_PX = 4
/**
 * How long a sideways step takes to travel. NOT one tick: at ARR = 2 ticks a step
 * lands every 33ms, and smoothing only the 16ms of the tick it happened on still
 * reads as a jump. Short enough that the piece never lags the key by much.
 */
const COL_TWEEN_MS = 45
/** The flash part of a line clear; the rest of `clearDelay` is the collapse. */
export const CLEAR_FLASH_MS = 80

export interface Cell {
  col: number
  row: number
}

export interface Effects {
  /**
   * Called BEFORE `reduce`, while the state still describes the tick about to end.
   *
   * Not optional bookkeeping. `reduce` locks a piece and spawns the next one inside
   * the same call, so by the time the events arrive `state.active` is already a
   * different piece -- reading it there put the lock flash at the top of the board
   * and the hard-drop trail off screen entirely. Interpolation needs a position from
   * before the step too, and nothing else keeps one (ADR-0010).
   */
  beforeTick(state: GameState): void
  onTick(state: GameState, events: readonly GameEvent[]): void
  /** Decay the timers. `dtMs` is real elapsed time, not ticks. */
  advance(dtMs: number): void

  /** Interpolated piece position. Whole numbers when motion is reduced. */
  pieceCol(state: GameState, alpha: number): number
  pieceRow(state: GameState, alpha: number): number
  /** Visual row including the sub-cell part of gravity. Exposed for its test. */
  visualRow(state: GameState): number

  /** 0..1 brightness of the just-locked cells. */
  flash(): number
  readonly flashCells: readonly Cell[]
  flashCount(): number

  /** 0..1 opacity of the hard-drop trail. */
  trail(): number
  readonly trailCells: readonly Cell[]
  trailCount(): number

  /** Canvas displacement in CSS px. Always 0 when motion is reduced. */
  shakeX(): number
  shakeY(): number

  /** FR-36 can be turned off: the tween makes the image lag the key slightly. */
  setSmoothHorizontal(on: boolean): void

  /** Live, not read once at construction. */
  reduced(): boolean
  dispose(): void
}

export function easeOutCubic(t: number): number {
  const u = 1 - t
  return 1 - u * u * u
}

/** Straight-line interpolation. Exposed so the rule itself has a test. */
export function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha
}

/**
 * `matchMedia` is listened to, not sampled once: someone changing the OS setting
 * mid-game is real, and a snapshot would ignore them until a reload (NFR-A11Y-05).
 */
function reducedMotionSource(): { get(): boolean; dispose(): void } {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { get: () => false, dispose: () => {} }
  }
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  let value = mq.matches
  const onChange = (e: MediaQueryListEvent) => {
    value = e.matches
  }
  mq.addEventListener('change', onChange)
  return { get: () => value, dispose: () => mq.removeEventListener('change', onChange) }
}

const makeBuffer = (): Cell[] => [
  { col: 0, row: 0 },
  { col: 0, row: 0 },
  { col: 0, row: 0 },
  { col: 0, row: 0 },
]

export function createEffects(): Effects {
  const motion = reducedMotionSource()

  // Where the piece was before the last tick.
  let prevVisualRow = -1

  // Sideways motion is a short tween rather than tick interpolation.
  let colFrom = -1
  let colTweenT = 0
  let smoothHorizontal = true

  // Snapshot taken before `reduce` runs.
  let snapRow = -1
  let snapCol = -1
  let snapVisual = -1
  let snapLen = 0
  let snapValid = false
  const snapCells = makeBuffer()

  let flashT = 0
  let trailT = 0
  let shakeT = 0

  const flashCells = makeBuffer()
  let flashLen = 0
  const trailCells = makeBuffer()
  let trailLen = 0

  /**
   * Identity of the falling piece, compared as numbers rather than built into a
   * template string: this runs every tick, and the string version allocated sixty
   * times a second while this file claimed it allocated nothing.
   *
   * `hold` is part of it. Without it, holding a piece of the same kind at the same
   * rotation kept the same identity -- `piecesPlaced` does not move on a hold -- and
   * the swapped-in piece tweened across the board from the old one's column.
   */
  let lastKindIdx = -1
  let lastRot = -1
  let lastPlaced = -1
  let lastHoldIdx = -2

  function identityChanged(state: GameState): boolean {
    const a = state.active
    if (!a) return true
    const kindIdx = KINDS.indexOf(a.kind)
    const holdIdx = state.hold === null ? -1 : KINDS.indexOf(state.hold)
    const changed =
      kindIdx !== lastKindIdx ||
      a.rot !== lastRot ||
      state.stats.piecesPlaced !== lastPlaced ||
      holdIdx !== lastHoldIdx
    lastKindIdx = kindIdx
    lastRot = a.rot
    lastPlaced = state.stats.piecesPlaced
    lastHoldIdx = holdIdx
    return changed
  }

  /**
   * Row plus the sub-cell part of gravity.
   *
   * `dropDistance`, not `onGround`: the engine keeps accumulating gravity while a
   * piece rests and only zeroes the accumulator on the tick it tries to move and
   * cannot. So a resting piece can be sitting on `gravityAcc = 0.97`, and the frame
   * the player shifts it off a ledge it would be drawn a whole cell below where it
   * really is. Asking whether it can fall at all is exact.
   */
  function visual(state: GameState): number {
    const a = state.active
    if (!a) return 0
    if (dropDistance(state.board, a) === 0) return a.row
    return a.row + Math.min(0.999, Math.max(0, state.gravityAcc))
  }

  /** Copies the pre-tick snapshot into a buffer, re-based onto `row`. No allocation. */
  function copySnap(into: Cell[], row: number): number {
    let n = 0
    for (let i = 0; i < snapLen && n < into.length; i++) {
      const from = snapCells[i] as Cell
      const target = into[n] as Cell
      target.col = from.col
      target.row = row + (from.row - snapRow)
      n++
    }
    return n
  }

  return {
    beforeTick(state) {
      const a = state.active
      if (!a) {
        snapValid = false
        snapLen = 0
        return
      }
      snapValid = true
      snapRow = a.row
      snapCol = a.col
      snapVisual = visual(state)
      const cells = shapeOf(a.kind, a.rot).cells
      let n = 0
      for (let i = 0; i < cells.length && n < snapCells.length; i++) {
        const c = cells[i] as readonly [number, number]
        const target = snapCells[n] as Cell
        target.col = a.col + c[0]
        target.row = a.row + c[1]
        n++
      }
      snapLen = n
    },

    onTick(state, events) {
      const a = state.active

      // A hard drop moves the piece and then locks it in the same tick, so the flash
      // has to know how far it travelled before it came to rest.
      let hardDropCells = 0
      for (let i = 0; i < events.length; i++) {
        const ev = events[i] as GameEvent
        if (ev.t === 'hardDrop') hardDropCells = ev.cells
      }

      for (let i = 0; i < events.length; i++) {
        const ev = events[i] as GameEvent
        if (ev.t === 'hardDrop') {
          // The trail runs from where the drop STARTED; that row only exists in the
          // pre-tick snapshot, because `state.active` is the next piece by now.
          if (ev.cells > 0 && snapValid) {
            trailT = TRAIL_MS
            trailLen = copySnap(trailCells, snapRow)
          }
        } else if (ev.t === 'lock') {
          flashT = FLASH_MS
          flashLen = snapValid ? copySnap(flashCells, snapRow + hardDropCells) : 0
        } else if (ev.t === 'clear' && ev.rows === 4) {
          shakeT = SHAKE_MS
        }
      }

      if (!a) {
        prevVisualRow = -1
        lastKindIdx = -1
        colFrom = -1
        colTweenT = 0
        return
      }

      const snap = identityChanged(state)
      if (snap) {
        // New piece, a rotation, or a hold: snap rather than tween. Rotation is
        // instant because a wall kick can move the piece two cells and tweening that
        // reads as the piece passing through the wall.
        colFrom = a.col
        colTweenT = 0
      } else if (snapValid && a.col !== snapCol) {
        colFrom = snapCol
        colTweenT = COL_TWEEN_MS
      }

      // The position BEFORE this tick is what interpolation starts from. Reading it
      // afterwards made prev === cur on every frame, which quietly turned the whole
      // lerp into an identity while its test stayed green.
      prevVisualRow = snap || !snapValid ? visual(state) : snapVisual
    },

    advance(dtMs) {
      if (colTweenT > 0) colTweenT = Math.max(0, colTweenT - dtMs)
      if (flashT > 0) flashT = Math.max(0, flashT - dtMs)
      if (trailT > 0) trailT = Math.max(0, trailT - dtMs)
      if (shakeT > 0) shakeT = Math.max(0, shakeT - dtMs)
    },

    pieceCol(state) {
      const a = state.active
      if (!a) return 0
      if (!smoothHorizontal || motion.get() || colTweenT <= 0 || colFrom < 0) return a.col
      // Eased, so the step decelerates into place instead of stopping dead.
      return lerp(colFrom, a.col, easeOutCubic(1 - colTweenT / COL_TWEEN_MS))
    },

    visualRow: (state) => visual(state),

    pieceRow(state, alpha) {
      const a = state.active
      if (!a) return 0
      if (motion.get()) return a.row
      const cur = visual(state)
      if (prevVisualRow < 0) return cur
      // Forward only: gravityAcc resets when the row advances, so the previous value
      // is briefly larger and lerping across it would jerk the piece upward.
      if (cur < prevVisualRow) return cur
      return lerp(prevVisualRow, cur, alpha)
    },

    flash: () => (motion.get() || flashT <= 0 ? 0 : flashT / FLASH_MS),
    flashCells,
    flashCount: () => (motion.get() || flashT <= 0 ? 0 : flashLen),

    trail: () => (motion.get() || trailT <= 0 ? 0 : trailT / TRAIL_MS),
    trailCells,
    trailCount: () => (motion.get() || trailT <= 0 ? 0 : trailLen),

    shakeX() {
      if (motion.get() || shakeT <= 0) return 0
      const decay = shakeT / SHAKE_MS
      return Math.sin(shakeT * 0.08) * SHAKE_PX * decay
    },
    shakeY() {
      if (motion.get() || shakeT <= 0) return 0
      const decay = shakeT / SHAKE_MS
      return Math.cos(shakeT * 0.11) * SHAKE_PX * 0.6 * decay
    },

    setSmoothHorizontal(on) {
      smoothHorizontal = on
      if (!on) colTweenT = 0
    },

    reduced: () => motion.get(),
    dispose: () => motion.dispose(),
  }
}

export interface ClearPhase {
  active: boolean
  flash: number
  collapse: number
}

/**
 * Progress of the line-clear animation, derived entirely from engine state -- the
 * full rows are still on the board during `lineClearDelay` and `clearTimer` is
 * already counting down, so this needs no memory of its own.
 *
 * Writes into a caller-owned struct instead of returning a fresh object: it runs once
 * per frame, and returning a literal allocated on every one of them, early exit
 * included (NFR-PERF-03).
 *
 * `reduced` is a parameter because this is a free function with no access to the
 * motion source. Without it the flash, the fade and the collapse all kept running
 * under `prefers-reduced-motion` -- the three things design.md §6 says must not.
 */
export function clearPhase(
  state: GameState,
  clearDelayTicks: number,
  tickMs: number,
  out: ClearPhase,
  reduced = false,
): ClearPhase {
  if (reduced || state.phase !== 'lineClearDelay' || state.pendingRows.length === 0) {
    out.active = false
    out.flash = 0
    out.collapse = 0
    return out
  }
  const totalMs = clearDelayTicks * tickMs
  // Clamped, not trusted: `clearTimer` is engine state and a caller can hand this
  // function a value outside the window. Unclamped, the flash alpha exceeds 1.
  const elapsed = Math.max(0, Math.min(totalMs, totalMs - state.clearTimer * tickMs))
  if (elapsed < CLEAR_FLASH_MS) {
    out.active = true
    out.flash = Math.min(1, 1 - elapsed / CLEAR_FLASH_MS)
    out.collapse = 0
    return out
  }
  const collapseMs = Math.max(1, totalMs - CLEAR_FLASH_MS)
  const t = Math.min(1, Math.max(0, (elapsed - CLEAR_FLASH_MS) / collapseMs))
  out.active = true
  out.flash = 0
  out.collapse = easeOutCubic(t)
  return out
}
