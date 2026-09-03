import type { Config } from './types'

/** Logic ticks per second. The engine only ever advances in whole ticks (invariant #2). */
export const TICK_HZ = 60

export const COLS = 10
/** Rows the player can see. Every boundary check uses this, never a bare 20 (invariant #9). */
export const VISIBLE_ROWS = 20
/** Buffer above the visible field: pieces spawn here, and lock-out is detected in it. */
export const BUFFER_ROWS = 20
export const ROWS = VISIBLE_ROWS + BUFFER_ROWS
export const BOARD_SIZE = COLS * ROWS
/** First visible row index. Rows below this are the buffer and are never drawn. */
export const TOP_VISIBLE_ROW = BUFFER_ROWS

/** The loop may never run more than this many ticks in one frame (NFR-REL-04). */
export const MAX_TICKS_PER_FRAME = 5

export const DEFAULT_CONFIG: Config = {
  /** 500ms at 60Hz (FR-09). */
  lockDelay: 30,
  /** Invariant #8: without a cap, a player stalls forever and the game never ends. */
  moveResetMax: 15,
  /** 300ms. Long enough to see the rows go (FR-10). */
  clearDelay: 18,
  /** ~133ms before auto-repeat starts (FR-15). */
  das: 8,
  /** ~33ms between auto-repeat steps (FR-15). */
  arr: 2,
  /** Soft drop is this many times gravity, with a floor applied in timing.ts (FR-07). */
  softDropFactor: 20,
  /** FR-04. */
  queueLen: 5,
  maxLevel: 20,
  /** FR-11. */
  linesPerLevel: 10,
}
