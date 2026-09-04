import { shapeOf, type GameEvent, type GameState } from '../engine'

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
/**
 * How long a sideways step takes to travel. NOT one tick: at ARR = 2 ticks a step
 * lands every 33ms, and interpolating only the 16ms of the tick it happened on still
 * reads as a jump. Short enough that the piece never lags the key by much.
 */
const COL_TWEEN_MS = 45
const SHAKE_MS = 180
/** Peak shake displacement. Punctuation, not an event. */
const SHAKE_PX = 4
/** The flash part of a line clear; the rest of `clearDelay` is the collapse. */
export const CLEAR_FLASH_MS = 80

export interface Cell {
  col: number
  row: number
}

export interface Effects {
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

  // Where the piece was last tick. -1 means nothing to interpolate from.
  //
  // The ROW carries `gravityAcc` with it. Interpolating whole rows between ticks
  // does almost nothing: at level 1 the piece changes row once every 60 ticks, so 59
  // frames out of 60 have prev === cur and the 60th jumps a whole cell. The engine
  // already tracks how far into the next cell the piece has fallen, and that is the
  // number the eye wants.
  let prevCol = -1
  let prevVisualRow = -1
  let prevKey = ''

  // Sideways motion is a short tween rather than tick interpolation -- see
  // COL_TWEEN_MS.
  let colFrom = -1
  let colTweenT = 0

  let flashT = 0
  let trailT = 0
  let shakeT = 0

  const flashCells = makeBuffer()
  let flashLen = 0
  const trailCells = makeBuffer()
  let trailLen = 0

  /** Identity of the falling piece. A change means: do not interpolate across it. */
  function keyOf(state: GameState): string {
    const a = state.active
    return a ? `${a.kind}|${a.rot}|${state.stats.piecesPlaced}` : ''
  }

  /** Row plus the sub-cell part of gravity. 0 while the piece rests on something. */
  function visual(state: GameState): number {
    const a = state.active
    if (!a) return 0
    return a.row + (state.onGround ? 0 : Math.min(0.999, Math.max(0, state.gravityAcc)))
  }

  /** Fills a buffer with the active piece's cells placed at `row`. No allocation. */
  function fill(state: GameState, into: Cell[], row: number): number {
    const a = state.active
    if (!a) return 0
    const cells = shapeOf(a.kind, a.rot).cells
    let n = 0
    for (let i = 0; i < cells.length && n < into.length; i++) {
      const c = cells[i] as readonly [number, number]
      const target = into[n] as Cell
      target.col = a.col + c[0]
      target.row = row + c[1]
      n++
    }
    return n
  }

  return {
    onTick(state, events) {
      const a = state.active

      for (let i = 0; i < events.length; i++) {
        const ev = events[i] as GameEvent
        if (ev.t === 'hardDrop') {
          if (ev.cells > 0 && a) {
            trailT = TRAIL_MS
            trailLen = fill(state, trailCells, a.row - ev.cells)
          }
        } else if (ev.t === 'lock') {
          // `lock` is emitted while `active` still holds the piece that locked, so
          // this catches exactly the four cells that just came to rest.
          flashT = FLASH_MS
          flashLen = a ? fill(state, flashCells, a.row) : 0
        } else if (ev.t === 'clear' && ev.rows === 4) {
          shakeT = SHAKE_MS
        }
      }

      if (!a) {
        prevCol = -1
        prevVisualRow = -1
        prevKey = ''
        colFrom = -1
        colTweenT = 0
        return
      }

      const key = keyOf(state)
      const snap = key !== prevKey
      if (snap) {
        // New piece, or a rotation: snap rather than tween. Rotation is instant
        // because a wall kick can move the piece two cells and tweening that reads
        // as the piece passing through the wall.
        prevKey = key
        colFrom = a.col
        colTweenT = 0
      } else if (a.col !== prevCol && prevCol >= 0) {
        colFrom = prevCol
        colTweenT = COL_TWEEN_MS
      }
      prevCol = a.col
      prevVisualRow = snap ? a.row + state.gravityAcc : visual(state)
    },

    advance(dtMs) {
      if (colTweenT > 0) colTweenT = Math.max(0, colTweenT - dtMs)
      if (flashT > 0) flashT = Math.max(0, flashT - dtMs)
      if (trailT > 0) trailT = Math.max(0, trailT - dtMs)
      if (shakeT > 0) shakeT = Math.max(0, shakeT - dtMs)
    },

    pieceCol(state, _alpha) {
      const a = state.active
      if (!a) return 0
      if (motion.get() || colTweenT <= 0 || colFrom < 0) return a.col
      // Eased so the step decelerates into place instead of stopping dead.
      return lerp(colFrom, a.col, easeOutCubic(1 - colTweenT / COL_TWEEN_MS))
    },

    visualRow: (state) => visual(state),

    pieceRow(state, alpha) {
      const a = state.active
      if (!a) return 0
      if (motion.get()) return a.row
      const cur = visual(state)
      if (prevVisualRow < 0) return cur
      // Only interpolate FORWARD: gravityAcc resets to 0 when the row advances, so
      // the raw previous value is briefly larger than the current one and lerping
      // across that would jerk the piece upward.
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

    reduced: () => motion.get(),
    dispose: () => motion.dispose(),
  }
}

/**
 * Progress of the line-clear animation, derived entirely from engine state -- the
 * full rows are still on the board during `lineClearDelay`, and `clearTimer` is
 * already counting down, so this needs no memory of its own.
 */
export function clearPhase(
  state: GameState,
  clearDelayTicks: number,
  tickMs: number,
): { active: boolean; flash: number; collapse: number } {
  if (state.phase !== 'lineClearDelay' || state.pendingRows.length === 0) {
    return { active: false, flash: 0, collapse: 0 }
  }
  const totalMs = clearDelayTicks * tickMs
  // Clamped, not trusted: `clearTimer` is engine state and a caller can hand this
  // function a value outside the window. Unclamped, the flash alpha exceeds 1.
  const elapsed = Math.max(0, Math.min(totalMs, totalMs - state.clearTimer * tickMs))
  if (elapsed < CLEAR_FLASH_MS) {
    return { active: true, flash: Math.min(1, 1 - elapsed / CLEAR_FLASH_MS), collapse: 0 }
  }
  const collapseMs = Math.max(1, totalMs - CLEAR_FLASH_MS)
  const t = Math.min(1, Math.max(0, (elapsed - CLEAR_FLASH_MS) / collapseMs))
  return { active: true, flash: 0, collapse: easeOutCubic(t) }
}
