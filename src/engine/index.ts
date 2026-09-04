/** The whole public surface of `engine/`. Nothing else imports its internals. */
export { createGame, reduce, drainEvents, ghostRow, cellAt } from './game'
export { COLS, ROWS, VISIBLE_ROWS, TOP_VISIBLE_ROW, TICK_HZ, MAX_TICKS_PER_FRAME, DEFAULT_CONFIG } from './config'
export { KINDS } from './types'
export { kindCode, kindOfCode, dropDistance } from './board'
export { shapeOf, SHAPES } from './pieces'
export { gravityCellsPerTick, effectiveGravity, effectiveSoftDrop } from './timing'
export type {
  Action,
  Active,
  Command,
  Config,
  GameEvent,
  GameState,
  Kind,
  Phase,
  Rot,
  SpinKind,
  Stats,
  TopOutReason,
} from './types'
