import { describe, expect, it } from 'vitest'
import { I_KICKS, JLSTZ_KICKS, applyKick, kicksFor, rotateCCW, rotateCW, tryKicks } from './srs'
import type { Kind, Rot } from './types'

/**
 * These tables are the part of the engine that "works" while being subtly wrong:
 * get an offset order backwards and most rotations still succeed, only a handful of
 * kicks misbehave, and no amount of playing finds it. So every row is asserted
 * literally against docs/specs/core-gameplay/design.md §6.
 */

const TRANSITIONS = ['01', '10', '12', '21', '23', '32', '30', '03'] as const

describe('SRS kick tables', () => {
  it('has all eight transitions for both tables, five offsets each', () => {
    for (const t of TRANSITIONS) {
      expect(JLSTZ_KICKS[t], `JLSTZ ${t}`).toHaveLength(5)
      expect(I_KICKS[t], `I ${t}`).toHaveLength(5)
    }
    expect(Object.keys(JLSTZ_KICKS)).toHaveLength(8)
    expect(Object.keys(I_KICKS)).toHaveLength(8)
  })

  it('every first offset is the identity (0,0)', () => {
    for (const t of TRANSITIONS) {
      expect(JLSTZ_KICKS[t]?.[0]).toEqual([0, 0])
      expect(I_KICKS[t]?.[0]).toEqual([0, 0])
    }
  })

  it('matches the JLSTZ table line for line', () => {
    expect(JLSTZ_KICKS['01']).toEqual([[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]])
    expect(JLSTZ_KICKS['10']).toEqual([[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]])
    expect(JLSTZ_KICKS['12']).toEqual([[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]])
    expect(JLSTZ_KICKS['21']).toEqual([[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]])
    expect(JLSTZ_KICKS['23']).toEqual([[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]])
    expect(JLSTZ_KICKS['32']).toEqual([[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]])
    expect(JLSTZ_KICKS['30']).toEqual([[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]])
    expect(JLSTZ_KICKS['03']).toEqual([[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]])
  })

  it('matches the I table line for line', () => {
    expect(I_KICKS['01']).toEqual([[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]])
    expect(I_KICKS['10']).toEqual([[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]])
    expect(I_KICKS['12']).toEqual([[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]])
    expect(I_KICKS['21']).toEqual([[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]])
    expect(I_KICKS['23']).toEqual([[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]])
    expect(I_KICKS['32']).toEqual([[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]])
    expect(I_KICKS['30']).toEqual([[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]])
    expect(I_KICKS['03']).toEqual([[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]])
  })

  it('gives O no kicks at all', () => {
    expect(kicksFor('O', 0, 1)).toEqual([[0, 0]])
  })

  it('flips the y sign exactly once, in applyKick', () => {
    // The table says +1 meaning UP; the board indexes rows downward, so up is -1.
    expect(applyKick([0, 1])).toEqual({ dCol: 0, dRow: -1 })
    expect(applyKick([0, -2])).toEqual({ dCol: 0, dRow: 2 })
    expect(applyKick([-1, 0])).toEqual({ dCol: -1, dRow: 0 })
  })
})

describe('rotation arithmetic', () => {
  it('wraps in both directions', () => {
    expect([0, 1, 2, 3].map((r) => rotateCW(r as Rot))).toEqual([1, 2, 3, 0])
    expect([0, 1, 2, 3].map((r) => rotateCCW(r as Rot))).toEqual([3, 0, 1, 2])
  })
})

describe('tryKicks', () => {
  it('returns the FIRST offset that fits, not the best one', () => {
    // Reject the identity, accept everything else: the answer must be offset 1.
    const fits = (_k: Kind, _r: Rot, col: number, row: number) => !(col === 5 && row === 5)
    const got = tryKicks('T', 0, 1, 5, 5, fits)
    expect(got?.kick).toBe(1)
    // JLSTZ 0->1 offset 1 is (-1, 0) with y up, so column moves left and row stays.
    expect(got).toEqual({ col: 4, row: 5, kick: 1 })
  })

  it('reaches the fifth offset when only that one fits -- the T-spin triple kick', () => {
    const target = { col: 5 + -1, row: 5 - -2 }
    const fits = (_k: Kind, _r: Rot, col: number, row: number) =>
      col === target.col && row === target.row
    const got = tryKicks('T', 0, 1, 5, 5, fits)
    expect(got).toEqual({ col: 4, row: 7, kick: 4 })
  })

  it('returns null when nothing fits', () => {
    expect(tryKicks('T', 0, 1, 5, 5, () => false)).toBeNull()
  })

  it('never kicks O away from where it is', () => {
    const got = tryKicks('O', 0, 1, 4, 4, () => true)
    expect(got).toEqual({ col: 4, row: 4, kick: 0 })
  })
})
