import { describe, expect, it } from 'vitest'
import { createBag, nextKind, refill } from './bag'
import { DEFAULT_CONFIG, TICK_HZ } from './config'
import { SHAPES, SPAWN, shapeOf } from './pieces'
import { next, nextInt, shuffle } from './rng'
import {
  basePoints,
  detectSpin,
  dropPoints,
  isB2BEligible,
  perfectClearBonus,
  scoreForClear,
} from './scoring'
import {
  gravityCellsPerTick,
  levelFromLines,
  secondsPerRow,
  softDropCellsPerTick,
} from './timing'
import { KINDS, type Kind, type Rot } from './types'
import { COLS, ROWS } from './config'
import { createBoard, kindCode } from './board'

describe('rng', () => {
  it('is a pure function of its state', () => {
    expect(next(12345)).toEqual(next(12345))
  })

  it('produces a different stream for a different seed', () => {
    const a = Array.from({ length: 8 }, (_, i) => next(1 + i).value)
    const b = Array.from({ length: 8 }, (_, i) => next(999 + i).value)
    expect(a).not.toEqual(b)
  })

  it('stays inside [0, 1)', () => {
    let s = 42
    for (let i = 0; i < 500; i++) {
      const r = next(s)
      s = r.state
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThan(1)
    }
  })

  it('bounds nextInt to [0, bound)', () => {
    let s = 7
    for (let i = 0; i < 200; i++) {
      const r = nextInt(s, 7)
      s = r.state
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThan(7)
    }
  })

  it('shuffles deterministically and keeps every element', () => {
    const a = [1, 2, 3, 4, 5, 6, 7]
    const b = [1, 2, 3, 4, 5, 6, 7]
    shuffle(a, 99)
    shuffle(b, 99)
    expect(a).toEqual(b)
    expect([...a].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('pieces', () => {
  it('gives every kind four rotation states of exactly four cells', () => {
    for (const kind of KINDS) {
      const rots = SHAPES[kind]
      expect(rots).toHaveLength(4)
      for (const rot of [0, 1, 2, 3] as Rot[]) {
        expect(shapeOf(kind, rot).cells, `${kind} rot ${rot}`).toHaveLength(4)
      }
    }
  })

  it('keeps O identical in all four states, because O does not rotate', () => {
    const [a, b, c, d] = SHAPES.O
    expect(b.cells).toEqual(a.cells)
    expect(c.cells).toEqual(a.cells)
    expect(d.cells).toEqual(a.cells)
  })

  it('uses a 4-wide matrix for I, 2 for O and 3 for the rest', () => {
    expect(shapeOf('I', 0).size).toBe(4)
    expect(shapeOf('O', 0).size).toBe(2)
    for (const kind of ['J', 'L', 'S', 'T', 'Z'] as Kind[]) {
      expect(shapeOf(kind, 0).size).toBe(3)
    }
  })

  it('spawns every piece inside the walls', () => {
    for (const kind of KINDS) {
      const at = SPAWN[kind]
      for (const [dc] of shapeOf(kind, 0).cells) {
        expect(at.col + dc).toBeGreaterThanOrEqual(0)
        expect(at.col + dc).toBeLessThan(COLS)
      }
    }
  })

  it('spawns in the buffer, with the lowest cell no deeper than the first visible row', () => {
    for (const kind of KINDS) {
      const at = SPAWN[kind]
      const rows = shapeOf(kind, 0).cells.map(([, dr]) => at.row + dr)
      const lowest = Math.max(...rows)
      expect(lowest, `${kind} lowest`).toBeLessThanOrEqual(20)
      expect(Math.min(...rows), `${kind} highest`).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('bag', () => {
  it('never repeats inside one group of seven', () => {
    const bag = createBag(2024)
    const seen = Array.from({ length: 7 }, () => nextKind(bag))
    expect(new Set(seen).size).toBe(7)
  })

  it('deals each kind exactly ten times over ten bags', () => {
    const bag = createBag(7)
    const counts = new Map<Kind, number>()
    for (let i = 0; i < 70; i++) {
      const k = nextKind(bag)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    for (const kind of KINDS) expect(counts.get(kind), kind).toBe(10)
  })

  it('is reproducible from the seed', () => {
    const a = Array.from({ length: 30 }, (() => { const b = createBag(555); return () => nextKind(b) })())
    const b = Array.from({ length: 30 }, (() => { const c = createBag(555); return () => nextKind(c) })())
    expect(a).toEqual(b)
  })

  it('refills with all seven kinds', () => {
    const bag = createBag(1)
    bag.remaining.length = 0
    refill(bag)
    expect([...bag.remaining].sort()).toEqual([...KINDS].sort())
  })
})

describe('timing', () => {
  it('takes exactly one second per row at level 1', () => {
    expect(secondsPerRow(1, 20)).toBe(1)
    expect(gravityCellsPerTick(1, 20)).toBeCloseTo(1 / TICK_HZ, 12)
  })

  it('gets strictly faster every level up to the cap', () => {
    let prev = 0
    for (let lvl = 1; lvl <= 20; lvl++) {
      const g = gravityCellsPerTick(lvl, 20)
      expect(g, `level ${lvl}`).toBeGreaterThan(prev)
      prev = g
    }
  })

  it('clamps at the cap instead of running away', () => {
    expect(gravityCellsPerTick(21, 20)).toBe(gravityCellsPerTick(20, 20))
    expect(gravityCellsPerTick(999, 20)).toBe(gravityCellsPerTick(20, 20))
  })

  it('treats level 0 and negatives as level 1 rather than dividing by nothing', () => {
    expect(gravityCellsPerTick(0, 20)).toBe(gravityCellsPerTick(1, 20))
    expect(gravityCellsPerTick(-5, 20)).toBe(gravityCellsPerTick(1, 20))
  })

  it('makes soft drop useful at level 1 and never slower than gravity', () => {
    for (let lvl = 1; lvl <= 20; lvl++) {
      const soft = softDropCellsPerTick(lvl, 20, DEFAULT_CONFIG.softDropFactor)
      expect(soft).toBeGreaterThanOrEqual(gravityCellsPerTick(lvl, 20))
    }
    expect(softDropCellsPerTick(1, 20, DEFAULT_CONFIG.softDropFactor)).toBeGreaterThanOrEqual(1 / 3)
  })

  it('raises the level every ten lines and stops at the cap', () => {
    expect(levelFromLines(0, 10, 20)).toBe(1)
    expect(levelFromLines(9, 10, 20)).toBe(1)
    expect(levelFromLines(10, 10, 20)).toBe(2)
    expect(levelFromLines(142, 10, 20)).toBe(15)
    expect(levelFromLines(10_000, 10, 20)).toBe(20)
  })

  it('does not use Math.pow, so replays cannot drift between engines', () => {
    const src = secondsPerRow.toString()
    expect(src).not.toContain('Math.pow')
    expect(src).not.toContain('**')
  })
})

describe('scoring', () => {
  it('scores the four plain clears', () => {
    expect(basePoints(1, 'none')).toBe(100)
    expect(basePoints(2, 'none')).toBe(300)
    expect(basePoints(3, 'none')).toBe(500)
    expect(basePoints(4, 'none')).toBe(800)
    expect(basePoints(0, 'none')).toBe(0)
  })

  it('scores all six T-spin shapes', () => {
    expect(basePoints(0, 'mini')).toBe(100)
    expect(basePoints(1, 'mini')).toBe(200)
    expect(basePoints(0, 'tspin')).toBe(400)
    expect(basePoints(1, 'tspin')).toBe(800)
    expect(basePoints(2, 'tspin')).toBe(1200)
    expect(basePoints(3, 'tspin')).toBe(1600)
  })

  it('counts a tetris and any T-spin as back-to-back eligible, and nothing else', () => {
    expect(isB2BEligible(4, 'none')).toBe(true)
    expect(isB2BEligible(1, 'tspin')).toBe(true)
    expect(isB2BEligible(1, 'mini')).toBe(true)
    expect(isB2BEligible(1, 'none')).toBe(false)
    expect(isB2BEligible(3, 'none')).toBe(false)
  })

  it('multiplies an eligible back-to-back by 1.5 and scales by level', () => {
    const plain = scoreForClear({ rows: 4, spin: 'none', level: 1, b2bActive: false, perfect: false, combo: -1 })
    const chained = scoreForClear({ rows: 4, spin: 'none', level: 1, b2bActive: true, perfect: false, combo: -1 })
    expect(plain).toBe(800)
    expect(chained).toBe(1200)
    expect(
      scoreForClear({ rows: 4, spin: 'none', level: 7, b2bActive: false, perfect: false, combo: -1 }),
    ).toBe(800 * 7)
  })

  it('does not apply back-to-back to an ineligible clear', () => {
    expect(
      scoreForClear({ rows: 1, spin: 'none', level: 1, b2bActive: true, perfect: false, combo: -1 }),
    ).toBe(100)
  })

  it('adds 50 per combo step per level, and nothing on the first clear of a chain', () => {
    expect(scoreForClear({ rows: 1, spin: 'none', level: 2, b2bActive: false, perfect: false, combo: 0 })).toBe(200)
    expect(scoreForClear({ rows: 1, spin: 'none', level: 2, b2bActive: false, perfect: false, combo: 3 })).toBe(200 + 50 * 3 * 2)
  })

  it('adds the perfect clear bonus only when rows actually went', () => {
    expect(perfectClearBonus(1)).toBe(800)
    expect(perfectClearBonus(2)).toBe(1200)
    expect(perfectClearBonus(3)).toBe(1800)
    expect(perfectClearBonus(4)).toBe(2000)
    expect(scoreForClear({ rows: 1, spin: 'none', level: 1, b2bActive: false, perfect: true, combo: -1 })).toBe(900)
    expect(scoreForClear({ rows: 0, spin: 'none', level: 1, b2bActive: false, perfect: true, combo: -1 })).toBe(0)
  })

  it('scores drops without a level multiplier', () => {
    expect(dropPoints(5, false)).toBe(5)
    expect(dropPoints(5, true)).toBe(10)
    expect(dropPoints(0, true)).toBe(0)
  })
})

describe('detectSpin', () => {
  /** Puts a T at (col,row) and blocks the given matrix corners. */
  function withCorners(corners: readonly (readonly [number, number])[]) {
    const board = createBoard()
    const col = 3
    const row = 30
    for (const [dc, dr] of corners) board[(row + dr) * COLS + (col + dc)] = kindCode('I')
    return { board, active: { kind: 'T' as const, rot: 0 as Rot, col, row } }
  }

  it('is none for anything that is not a T', () => {
    const board = createBoard()
    expect(detectSpin(board, { kind: 'S', rot: 0, col: 3, row: 30 }, 'rotate', 0)).toBe('none')
  })

  it('is none when the last move was not a rotation', () => {
    const { board, active } = withCorners([[0, 0], [2, 0], [0, 2]])
    expect(detectSpin(board, active, 'shift', 0)).toBe('none')
    expect(detectSpin(board, active, 'drop', 0)).toBe('none')
    expect(detectSpin(board, active, 'spawn', 0)).toBe('none')
  })

  it('is none with only two corners occupied', () => {
    const { board, active } = withCorners([[0, 0], [2, 0]])
    expect(detectSpin(board, active, 'rotate', 0)).toBe('none')
  })

  it('is a full spin when both front corners are occupied', () => {
    // Rotation 0 points up, so the front corners are the two upper ones.
    const { board, active } = withCorners([[0, 0], [2, 0], [0, 2]])
    expect(detectSpin(board, active, 'rotate', 0)).toBe('tspin')
  })

  it('is a mini when a front corner is open', () => {
    const { board, active } = withCorners([[0, 0], [0, 2], [2, 2]])
    expect(detectSpin(board, active, 'rotate', 0)).toBe('mini')
  })

  it('promotes a mini to a full spin when only the fifth kick fitted', () => {
    const { board, active } = withCorners([[0, 0], [0, 2], [2, 2]])
    expect(detectSpin(board, active, 'rotate', 4)).toBe('tspin')
  })

  it('counts the walls and the floor as occupied corners', () => {
    const board = createBoard()
    // In the bottom-left corner of an EMPTY board: the left wall blocks two
    // corners and the floor blocks a third, which is already enough.
    const active = { kind: 'T' as const, rot: 1 as Rot, col: -1, row: ROWS - 2 }
    expect(detectSpin(board, active, 'rotate', 0)).not.toBe('none')
  })

  it('still needs three corners -- two is not a spin even against a wall', () => {
    const board = createBoard()
    const active = { kind: 'T' as const, rot: 1 as Rot, col: -1, row: ROWS - 3 }
    expect(detectSpin(board, active, 'rotate', 0)).toBe('none')
  })
})
