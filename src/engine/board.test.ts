import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearRows,
  createBoard,
  dropDistance,
  entirelyAboveVisible,
  findFullRows,
  fits,
  isBoardEmpty,
  isRowFull,
  kindCode,
  kindOfCode,
} from './board'
import { COLS, ROWS, TOP_VISIBLE_ROW, VISIBLE_ROWS } from './config'
import { KINDS } from './types'

let board: Uint8Array
const out: number[] = []

beforeEach(() => {
  board = createBoard()
})

function fillRow(row: number, holes: readonly number[] = []): void {
  for (let c = 0; c < COLS; c++) {
    if (!holes.includes(c)) board[row * COLS + c] = kindCode('I')
  }
}

describe('board geometry', () => {
  it('is 10 wide and 40 tall, with 20 visible', () => {
    expect(COLS).toBe(10)
    expect(VISIBLE_ROWS).toBe(20)
    expect(ROWS).toBe(40)
    expect(TOP_VISIBLE_ROW).toBe(20)
    expect(board).toHaveLength(COLS * ROWS)
  })

  it('round-trips every kind through its cell code, and reserves 0 for empty', () => {
    for (const k of KINDS) {
      expect(kindCode(k)).toBeGreaterThan(0)
      expect(kindOfCode(kindCode(k))).toBe(k)
    }
    expect(kindOfCode(0)).toBeNull()
  })
})

describe('fits', () => {
  it('accepts an empty board', () => {
    expect(fits(board, 'T', 0, 3, 20)).toBe(true)
  })

  it('rejects past the left and right walls', () => {
    // T rotation 0 occupies columns 0..2 of its matrix.
    expect(fits(board, 'T', 0, -1, 20)).toBe(false)
    expect(fits(board, 'T', 0, COLS - 2, 20)).toBe(false)
    expect(fits(board, 'T', 0, 0, 20)).toBe(true)
    expect(fits(board, 'T', 0, COLS - 3, 20)).toBe(true)
  })

  it('rejects through the floor', () => {
    expect(fits(board, 'T', 0, 3, ROWS - 2)).toBe(true)
    expect(fits(board, 'T', 0, 3, ROWS - 1)).toBe(false)
  })

  it('treats above the buffer as open so a kick can nudge a piece upward', () => {
    expect(fits(board, 'I', 1, 3, -1)).toBe(true)
  })

  it('rejects overlap with a locked cell', () => {
    board[21 * COLS + 4] = kindCode('Z')
    expect(fits(board, 'T', 0, 3, 20)).toBe(false)
  })
})

describe('row scanning', () => {
  it('finds only completely full rows', () => {
    fillRow(30)
    fillRow(31, [4])
    fillRow(32)
    expect(isRowFull(board, 30)).toBe(true)
    expect(isRowFull(board, 31)).toBe(false)
    expect(findFullRows(board, out)).toEqual([30, 32])
  })

  it('reuses the output array instead of allocating', () => {
    fillRow(30)
    const first = findFullRows(board, out)
    fillRow(31)
    const second = findFullRows(board, out)
    expect(second).toBe(first)
    expect(second).toEqual([30, 31])
  })

  it('leaves a row with a single hole alone', () => {
    fillRow(39, [0])
    expect(findFullRows(board, out)).toEqual([])
  })
})

describe('clearRows', () => {
  it('clears one row and drops what was above it', () => {
    board[38 * COLS + 0] = kindCode('S')
    fillRow(39)
    clearRows(board, [39])
    expect(board[39 * COLS + 0]).toBe(kindCode('S'))
    expect(isRowFull(board, 39)).toBe(false)
  })

  it.each([
    [[39]],
    [[38, 39]],
    [[37, 38, 39]],
    [[36, 37, 38, 39]],
  ])('clears %s and leaves the board empty when nothing else is on it', (rows) => {
    for (const r of rows) fillRow(r)
    clearRows(board, rows)
    expect(isBoardEmpty(board)).toBe(true)
  })

  it('does not disturb rows with holes', () => {
    fillRow(37, [5])
    fillRow(38)
    fillRow(39, [2])
    clearRows(board, [38])
    // The holed rows survive, shifted down by one.
    expect(board[38 * COLS + 5]).toBe(0)
    expect(board[38 * COLS + 4]).toBe(kindCode('I'))
    expect(board[39 * COLS + 2]).toBe(0)
  })

  it('is a no-op for an empty row list', () => {
    fillRow(39, [3])
    const before = board.slice()
    clearRows(board, [])
    expect(board).toEqual(before)
  })
})

describe('lock-out geometry', () => {
  it('is true only when every cell sits above the visible field', () => {
    expect(entirelyAboveVisible({ kind: 'O', rot: 0, col: 4, row: TOP_VISIBLE_ROW - 2 })).toBe(true)
    // One cell reaching the first visible row is enough to survive.
    expect(entirelyAboveVisible({ kind: 'O', rot: 0, col: 4, row: TOP_VISIBLE_ROW - 1 })).toBe(false)
    expect(entirelyAboveVisible({ kind: 'O', rot: 0, col: 4, row: TOP_VISIBLE_ROW })).toBe(false)
  })
})

describe('dropDistance', () => {
  it('measures to the floor on an empty board', () => {
    const d = dropDistance(board, { kind: 'O', rot: 0, col: 4, row: 20 })
    // O occupies matrix rows 0..1, so its lowest cell ends on the last row.
    expect(20 + d + 1).toBe(ROWS - 1)
    expect(fits(board, 'O', 0, 4, 20 + d)).toBe(true)
    expect(fits(board, 'O', 0, 4, 20 + d + 1)).toBe(false)
  })

  it('stops on top of the stack', () => {
    fillRow(39)
    const d = dropDistance(board, { kind: 'O', rot: 0, col: 4, row: 20 })
    expect(fits(board, 'O', 0, 4, 20 + d)).toBe(true)
    expect(fits(board, 'O', 0, 4, 20 + d + 1)).toBe(false)
  })

  it('is zero when already resting', () => {
    fillRow(39)
    expect(dropDistance(board, { kind: 'O', rot: 0, col: 4, row: 37 })).toBe(0)
  })
})
