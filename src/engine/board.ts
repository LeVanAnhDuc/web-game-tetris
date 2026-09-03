import { BOARD_SIZE, COLS, ROWS, TOP_VISIBLE_ROW } from './config'
import { shapeOf } from './pieces'
import { KINDS, type Active, type Kind, type Rot } from './types'

/**
 * The board is one flat `Uint8Array` reused for the whole game -- 0 is empty,
 * 1..7 are the kinds in `KINDS` order. It is written in place; nothing copies it
 * per tick (ADR-0010, NFR-PERF-03).
 *
 * Row 0 is the TOP of the buffer, row `ROWS - 1` is the floor. Rows below
 * `TOP_VISIBLE_ROW` are the buffer and are never drawn.
 */

export function createBoard(): Uint8Array {
  return new Uint8Array(BOARD_SIZE)
}

export function kindCode(kind: Kind): number {
  return KINDS.indexOf(kind) + 1
}

export function kindOfCode(code: number): Kind | null {
  return code === 0 ? null : (KINDS[code - 1] ?? null)
}

export function idx(row: number, col: number): number {
  return row * COLS + col
}

export function cellAt(board: Uint8Array, row: number, col: number): number {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return 0
  return board[idx(row, col)] as number
}

/** True when a cell is occupied OR outside the walls/floor -- what wall kicks test. */
export function blocked(board: Uint8Array, row: number, col: number): boolean {
  if (col < 0 || col >= COLS) return true
  if (row >= ROWS) return true
  // Above the very top of the buffer is treated as open, so a piece can be nudged
  // upward by a kick without immediately failing.
  if (row < 0) return false
  return board[idx(row, col)] !== 0
}

/** Does this piece placement fit? The predicate every rotation and move goes through. */
export function fits(
  board: Uint8Array,
  kind: Kind,
  rot: Rot,
  col: number,
  row: number,
): boolean {
  const { cells } = shapeOf(kind, rot)
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i] as readonly [number, number]
    if (blocked(board, row + cell[1], col + cell[0])) return false
  }
  return true
}

export function lockPiece(board: Uint8Array, active: Active): void {
  const code = kindCode(active.kind)
  const { cells } = shapeOf(active.kind, active.rot)
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i] as readonly [number, number]
    const r = active.row + cell[1]
    const c = active.col + cell[0]
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[idx(r, c)] = code
  }
}

/** True when the piece's cells are ALL above the visible field -- lock-out (FR-12). */
export function entirelyAboveVisible(active: Active): boolean {
  const { cells } = shapeOf(active.kind, active.rot)
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i] as readonly [number, number]
    if (active.row + cell[1] >= TOP_VISIBLE_ROW) return false
  }
  return true
}

export function isRowFull(board: Uint8Array, row: number): boolean {
  const base = row * COLS
  for (let c = 0; c < COLS; c++) {
    if (board[base + c] === 0) return false
  }
  return true
}

/**
 * Rows that are completely filled, top-down. Writes into `out` and returns it so
 * the hot path does not allocate (NFR-PERF-03).
 */
export function findFullRows(board: Uint8Array, out: number[]): number[] {
  out.length = 0
  for (let r = 0; r < ROWS; r++) {
    if (isRowFull(board, r)) out.push(r)
  }
  return out
}

/**
 * Removes the given rows and drops everything above them down. `rows` must be
 * ascending, as `findFullRows` produces.
 */
export function clearRows(board: Uint8Array, rows: readonly number[]): void {
  if (rows.length === 0) return
  let write = ROWS - 1
  for (let read = ROWS - 1; read >= 0; read--) {
    if (rows.includes(read)) continue
    if (write !== read) {
      board.copyWithin(write * COLS, read * COLS, read * COLS + COLS)
    }
    write--
  }
  // Everything left at the top is now empty.
  for (let r = write; r >= 0; r--) {
    board.fill(0, r * COLS, r * COLS + COLS)
  }
}

/** Nothing left on the board at all -- a perfect clear (FR-22). */
export function isBoardEmpty(board: Uint8Array): boolean {
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] !== 0) return false
  }
  return true
}

/** How far this piece can fall from where it is. Used for the ghost and hard drop. */
export function dropDistance(board: Uint8Array, active: Active): number {
  let d = 0
  while (fits(board, active.kind, active.rot, active.col, active.row + d + 1)) d++
  return d
}
