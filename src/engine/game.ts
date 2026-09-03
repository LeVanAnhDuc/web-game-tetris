import { createBag, nextKind } from './bag'
import {
  clearRows,
  createBoard,
  dropDistance,
  entirelyAboveVisible,
  findFullRows,
  fits,
  isRowFull,
  lockPiece,
} from './board'
import { COLS, DEFAULT_CONFIG, ROWS } from './config'
import { SPAWN } from './pieces'
import {
  dropPoints,
  detectSpin,
  isB2BEligible,
  scoreForClear,
} from './scoring'
import { rotateCCW, rotateCW, tryKicks } from './srs'
import { gravityCellsPerTick, levelFromLines, softDropCellsPerTick } from './timing'
import type { Command, Config, GameEvent, GameState, Kind, Rot, SpinKind } from './types'

/**
 * The reducer. `reduce` MUTATES the state it is given and returns the same object --
 * see ADR-0010 for why, and design.md §4 for what that means when writing tests.
 *
 * It never reads a clock, never calls `Math.random`, never touches the DOM
 * (invariant #1). Time exists only as whole ticks (invariant #2).
 */

const NO_EVENTS: readonly GameEvent[] = Object.freeze([])

export function createGame(seed: number, cfgIn?: Partial<Config>): GameState {
  const cfg: Config = { ...DEFAULT_CONFIG, ...cfgIn }
  const bag = createBag(seed)
  const queue: Kind[] = []
  for (let i = 0; i < cfg.queueLen; i++) queue.push(nextKind(bag))

  const s: GameState = {
    cfg,
    tick: 0,
    board: createBoard(),
    active: null,
    hold: null,
    holdUsed: false,
    bag,
    queue,
    held: { left: false, right: false, softDrop: false },
    dasDir: 0,
    dasTimer: 0,
    arrTimer: 0,
    gravityAcc: 0,
    onGround: false,
    lockTimer: 0,
    moveResets: 0,
    lastMove: null,
    lastKickIndex: -1,
    clearTimer: 0,
    pendingRows: [],
    stats: {
      score: 0,
      lines: 0,
      level: 1,
      combo: -1,
      b2b: false,
      tspins: 0,
      tetrises: 0,
      perfectClears: 0,
      piecesPlaced: 0,
      playTicks: 0,
    },
    phase: 'playing',
    topOutReason: null,
    events: [],
  }
  spawn(s)
  return s
}

export function drainEvents(s: GameState): readonly GameEvent[] {
  if (s.events.length === 0) return NO_EVENTS
  const out = s.events.slice()
  s.events.length = 0
  return out
}

/** Row the active piece would land on, for the ghost (FR-06). */
export function ghostRow(s: GameState): number | null {
  if (!s.active || s.phase === 'gameOver') return null
  return s.active.row + dropDistance(s.board, s.active)
}

function emit(s: GameState, ev: GameEvent): void {
  s.events.push(ev)
}

function spawn(s: GameState): void {
  const kind = s.queue.shift() as Kind
  s.queue.push(nextKind(s.bag))
  const at = SPAWN[kind]
  const active = { kind, rot: 0 as Rot, col: at.col, row: at.row }
  s.active = active
  s.holdUsed = false
  s.gravityAcc = 0
  s.lockTimer = 0
  s.moveResets = 0
  s.onGround = false
  s.lastMove = 'spawn'
  s.lastKickIndex = -1

  // Block out (FR-12): the new piece has nowhere to be.
  if (!fits(s.board, active.kind, active.rot, active.col, active.row)) {
    s.phase = 'gameOver'
    s.topOutReason = 'blockOut'
    emit(s, { t: 'topOut', reason: 'blockOut' })
  }
}

/** A successful move or rotation while grounded resets the lock timer, up to 15 times. */
function afterSuccessfulMove(s: GameState): void {
  if (s.onGround && s.moveResets < s.cfg.moveResetMax) {
    s.lockTimer = 0
    s.moveResets++
  }
}

function tryShift(s: GameState, dir: -1 | 1): boolean {
  const a = s.active
  if (!a) return false
  if (!fits(s.board, a.kind, a.rot, a.col + dir, a.row)) return false
  a.col += dir
  s.lastMove = 'shift'
  s.lastKickIndex = -1
  afterSuccessfulMove(s)
  emit(s, { t: 'move' })
  return true
}

function tryRotate(s: GameState, cw: boolean): boolean {
  const a = s.active
  if (!a) return false
  const to = cw ? rotateCW(a.rot) : rotateCCW(a.rot)
  const result = tryKicks(a.kind, a.rot, to, a.col, a.row, (kind, rot, col, row) =>
    fits(s.board, kind, rot, col, row),
  )
  if (!result) return false
  a.rot = to
  a.col = result.col
  a.row = result.row
  s.lastMove = 'rotate'
  s.lastKickIndex = result.kick
  afterSuccessfulMove(s)
  emit(s, { t: 'rotate', kick: result.kick })
  return true
}

function tryHold(s: GameState): boolean {
  if (s.holdUsed || !s.active) return false
  const current = s.active.kind
  if (s.hold === null) {
    s.hold = current
    spawn(s)
  } else {
    const swapped = s.hold
    s.hold = current
    const at = SPAWN[swapped]
    s.active = { kind: swapped, rot: 0, col: at.col, row: at.row }
    s.gravityAcc = 0
    s.lockTimer = 0
    s.moveResets = 0
    s.onGround = false
    s.lastMove = 'spawn'
    s.lastKickIndex = -1
    if (!fits(s.board, swapped, 0, at.col, at.row)) {
      s.phase = 'gameOver'
      s.topOutReason = 'blockOut'
      emit(s, { t: 'topOut', reason: 'blockOut' })
      return true
    }
  }
  // One hold per piece (FR-05). `spawn` cleared the flag, so set it after.
  s.holdUsed = true
  emit(s, { t: 'hold' })
  return true
}

/** True when every row that is NOT about to be cleared is already empty. */
function wouldBePerfect(s: GameState, cleared: readonly number[]): boolean {
  for (let r = 0; r < ROWS; r++) {
    if (cleared.includes(r)) continue
    const base = r * COLS
    for (let c = 0; c < COLS; c++) {
      if (s.board[base + c] !== 0) return false
    }
  }
  return true
}

function lock(s: GameState): void {
  const a = s.active
  if (!a) return

  // Spin detection has to happen while the piece is still off the board: it reads
  // the corners AROUND the piece (invariant #7).
  const spin: SpinKind = detectSpin(s.board, a, s.lastMove, s.lastKickIndex)

  lockPiece(s.board, a)
  s.stats.piecesPlaced++
  emit(s, { t: 'lock' })

  // Lock out (FR-12): came to rest entirely above the visible field.
  if (entirelyAboveVisible(a)) {
    s.active = null
    s.phase = 'gameOver'
    s.topOutReason = 'lockOut'
    emit(s, { t: 'topOut', reason: 'lockOut' })
    return
  }

  findFullRows(s.board, s.pendingRows)
  const rows = s.pendingRows.length
  const perfect = rows > 0 && wouldBePerfect(s, s.pendingRows)
  const b2bActive = s.stats.b2b
  const combo = rows > 0 ? s.stats.combo + 1 : -1

  const points = scoreForClear({
    rows,
    spin,
    level: s.stats.level,
    b2bActive,
    perfect,
    combo,
  })
  s.stats.score += points
  s.stats.combo = combo
  if (spin !== 'none') s.stats.tspins++
  if (rows === 4) s.stats.tetrises++
  if (perfect) s.stats.perfectClears++
  if (rows > 0) s.stats.b2b = isB2BEligible(rows, spin)

  if (rows > 0) {
    emit(s, {
      t: 'clear',
      rows,
      spin,
      b2b: b2bActive && isB2BEligible(rows, spin),
      combo,
      perfect,
      points,
    })
    // The rows stay on the board and visible for the delay, then go (FR-10).
    s.phase = 'lineClearDelay'
    s.clearTimer = s.cfg.clearDelay
    s.active = null
  } else {
    s.active = null
    spawn(s)
  }
}

function finishClear(s: GameState): void {
  const before = s.stats.level
  clearRows(s.board, s.pendingRows)
  s.stats.lines += s.pendingRows.length
  s.pendingRows.length = 0
  s.stats.level = levelFromLines(s.stats.lines, s.cfg.linesPerLevel, s.cfg.maxLevel)
  if (s.stats.level !== before) emit(s, { t: 'levelUp', level: s.stats.level })
  s.phase = 'playing'
  spawn(s)
}

function applyCommand(s: GameState, cmd: Command): void {
  const { k, a } = cmd

  if (a === 'pause') {
    if (k !== 'press') return
    if (s.phase === 'playing' || s.phase === 'lineClearDelay') {
      s.phase = 'paused'
      // Releasing keys is impossible to observe while paused, so drop them all --
      // the same reason focus loss clears them (ADR-0005 §4).
      s.held.left = false
      s.held.right = false
      s.held.softDrop = false
      s.dasDir = 0
    } else if (s.phase === 'paused') {
      s.phase = s.pendingRows.length > 0 ? 'lineClearDelay' : 'playing'
    }
    return
  }

  // Everything except pause is ignored unless the game is actually running.
  if (s.phase !== 'playing') return

  if (a === 'left' || a === 'right') {
    const dir = a === 'left' ? -1 : 1
    if (k === 'press') {
      s.held[a] = true
      s.dasDir = dir
      s.dasTimer = 0
      s.arrTimer = 0
      tryShift(s, dir)
    } else {
      s.held[a] = false
      if (s.dasDir === dir) {
        const other = a === 'left' ? 'right' : 'left'
        if (s.held[other]) {
          s.dasDir = other === 'left' ? -1 : 1
          s.dasTimer = 0
          s.arrTimer = 0
        } else {
          s.dasDir = 0
        }
      }
    }
    return
  }

  if (a === 'softDrop') {
    s.held.softDrop = k === 'press'
    return
  }

  if (k !== 'press') return

  switch (a) {
    case 'hardDrop': {
      const active = s.active
      if (!active) return
      const d = dropDistance(s.board, active)
      active.row += d
      if (d > 0) {
        s.stats.score += dropPoints(d, true)
        s.lastMove = 'drop'
        s.lastKickIndex = -1
      }
      emit(s, { t: 'hardDrop', cells: d })
      s.onGround = true
      lock(s)
      return
    }
    case 'rotCW':
      tryRotate(s, true)
      return
    case 'rotCCW':
      tryRotate(s, false)
      return
    case 'hold':
      tryHold(s)
      return
    default:
      return
  }
}

function stepDas(s: GameState): void {
  if (s.dasDir === 0 || !s.active) return
  if (s.dasTimer < s.cfg.das) {
    s.dasTimer++
    return
  }
  if (s.arrTimer > 0) {
    s.arrTimer--
    return
  }
  tryShift(s, s.dasDir)
  s.arrTimer = s.cfg.arr
}

function stepGravity(s: GameState): void {
  const a = s.active
  if (!a) return
  const { level } = s.stats
  const soft = s.held.softDrop
  const rate = soft
    ? softDropCellsPerTick(level, s.cfg.maxLevel, s.cfg.softDropFactor)
    : gravityCellsPerTick(level, s.cfg.maxLevel)

  s.gravityAcc += rate
  while (s.gravityAcc >= 1) {
    if (!fits(s.board, a.kind, a.rot, a.col, a.row + 1)) {
      s.gravityAcc = 0
      break
    }
    a.row++
    s.gravityAcc -= 1
    s.lastMove = 'drop'
    s.lastKickIndex = -1
    if (soft) s.stats.score += dropPoints(1, false)
  }
}

function stepLock(s: GameState): void {
  const a = s.active
  if (!a) return
  s.onGround = !fits(s.board, a.kind, a.rot, a.col, a.row + 1)
  if (!s.onGround) {
    s.lockTimer = 0
    return
  }
  s.lockTimer++
  if (s.lockTimer >= s.cfg.lockDelay) lock(s)
}

export function reduce(s: GameState, cmds: readonly Command[]): GameState {
  for (let i = 0; i < cmds.length; i++) {
    applyCommand(s, cmds[i] as Command)
  }

  if (s.phase === 'gameOver' || s.phase === 'paused') return s

  if (s.phase === 'lineClearDelay') {
    s.clearTimer--
    if (s.clearTimer <= 0) finishClear(s)
    s.tick++
    s.stats.playTicks++
    return s
  }

  stepDas(s)
  stepGravity(s)
  stepLock(s)

  s.tick++
  s.stats.playTicks++
  return s
}

/** Read a board cell. Exposed so `render/` never indexes the array itself. */
export function cellAt(s: GameState, row: number, col: number): number {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return 0
  return s.board[row * COLS + col] as number
}

export { isRowFull }
