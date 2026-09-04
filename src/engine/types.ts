/**
 * Engine types. Nothing here imports anything outside `engine/` (invariant #1).
 */

export type Kind = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'

/** Board cells store 0 for empty and 1..7 for a kind, in this order. */
export const KINDS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as const satisfies readonly Kind[]

export type Rot = 0 | 1 | 2 | 3

export type Action =
  | 'left'
  | 'right'
  | 'softDrop'
  | 'hardDrop'
  | 'rotCW'
  | 'rotCCW'
  | 'hold'
  | 'pause'

/**
 * `input/` only ever says pressed or released. It never synthesises auto-repeat --
 * DAS/ARR are counted inside the engine, in ticks (ADR-0005).
 */
export interface Command {
  readonly k: 'press' | 'release'
  readonly a: Action
}

export type Phase = 'playing' | 'lineClearDelay' | 'gameOver' | 'paused'

/** What the piece did last. T-spin detection cannot be derived from the board alone. */
export type LastMove = 'spawn' | 'shift' | 'rotate' | 'drop' | null

export type SpinKind = 'none' | 'mini' | 'tspin'

export type TopOutReason = 'blockOut' | 'lockOut'

export type GameEvent =
  | { readonly t: 'move' }
  | { readonly t: 'rotate'; readonly kick: number }
  | { readonly t: 'hold' }
  | { readonly t: 'hardDrop'; readonly cells: number }
  | { readonly t: 'lock' }
  | {
      readonly t: 'clear'
      readonly rows: number
      readonly spin: SpinKind
      readonly b2b: boolean
      readonly combo: number
      readonly perfect: boolean
      readonly points: number
    }
  | { readonly t: 'levelUp'; readonly level: number }
  | { readonly t: 'topOut'; readonly reason: TopOutReason }

/** Top-left corner of the piece's matrix, in board coordinates. */
export interface Active {
  kind: Kind
  rot: Rot
  col: number
  row: number
}

export interface BagState {
  /** Remaining kinds of the current bag, popped from the end. One bag per game (invariant #6). */
  remaining: Kind[]
  rngState: number
}

export interface Stats {
  score: number
  lines: number
  level: number
  /** -1 means no combo is running; 0 is the first clear of a chain. */
  combo: number
  b2b: boolean
  tspins: number
  tetrises: number
  perfectClears: number
  piecesPlaced: number
  /** Ticks actually played. Does not advance while paused. */
  playTicks: number
}

export interface Config {
  /**
   * Multiplier on the level-based gravity curve, for the difficulty presets. 1 keeps
   * the Guideline curve exactly.
   */
  gravityScale: number
  /**
   * A flat fall speed in cells per second that REPLACES the level curve, for a
   * player-chosen speed. `null` means the curve applies.
   *
   * Both of these are part of `Config` and therefore part of what a replay needs:
   * `{seed, commands}` alone stopped being enough to reproduce a game the moment the
   * fall speed became something a player could change (ADR-0013).
   */
  fixedCellsPerSecond: number | null
  lockDelay: number
  moveResetMax: number
  clearDelay: number
  das: number
  arr: number
  softDropFactor: number
  queueLen: number
  maxLevel: number
  linesPerLevel: number
}

export interface GameState {
  readonly cfg: Config
  /** Monotonic tick counter. The only clock the engine has. */
  tick: number
  board: Uint8Array
  active: Active | null
  hold: Kind | null
  holdUsed: boolean
  bag: BagState
  queue: Kind[]
  held: { left: boolean; right: boolean; softDrop: boolean }
  /** Which horizontal direction the DAS timers currently belong to. */
  dasDir: -1 | 0 | 1
  dasTimer: number
  arrTimer: number
  gravityAcc: number
  onGround: boolean
  lockTimer: number
  moveResets: number
  lastMove: LastMove
  /** Index of the SRS offset that succeeded, or -1. Distinguishes a full T-spin from a mini. */
  lastKickIndex: number
  clearTimer: number
  pendingRows: number[]
  stats: Stats
  phase: Phase
  topOutReason: TopOutReason | null
  events: GameEvent[]
}
