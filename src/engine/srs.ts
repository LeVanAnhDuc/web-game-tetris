import type { Kind, Rot } from './types'

/**
 * SRS wall kick data.
 *
 * CONVENTION: `dy` is POSITIVE UP, as in the published tables. The board indexes
 * rows downward, so the sign is flipped at exactly ONE place -- `applyKick` below.
 * Flipping it anywhere else is how half the kicks end up silently mirrored.
 *
 * PROVENANCE: `tetris.wiki` and `harddrop.com` both returned HTTP 403 and
 * `tetris.fandom.com` returned 402 on 2026-09-03, so these tables were checked
 * line-by-line against an independent implementation instead
 * (`github.com/jasonbai2014/Tetris`, `src/model/WallKick.java`) -- all 16 rows
 * matched. That is a SECOND SOURCE, not the Tetris Company specification. If the
 * original spec ever becomes readable and disagrees, fix this file and its test.
 */

export type Offset = readonly [number, number]

/** Key is `${from}${to}`, e.g. '01' for spawn -> clockwise. */
type KickTable = Readonly<Record<string, readonly Offset[]>>

export const JLSTZ_KICKS: KickTable = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}

/** The I piece rotates around a different centre, so its kicks are their own table. */
export const I_KICKS: KickTable = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

export const EMPTY_KICKS: readonly Offset[] = [[0, 0]]

/** O never kicks: it has no rotation to speak of. */
export function kicksFor(kind: Kind, from: Rot, to: Rot): readonly Offset[] {
  if (kind === 'O') return EMPTY_KICKS
  const table = kind === 'I' ? I_KICKS : JLSTZ_KICKS
  return table[`${from}${to}`] ?? EMPTY_KICKS
}

export function rotateCW(rot: Rot): Rot {
  return ((rot + 1) % 4) as Rot
}

export function rotateCCW(rot: Rot): Rot {
  return ((rot + 3) % 4) as Rot
}

/**
 * Converts one table offset into a board delta. THE ONLY place the y sign flips.
 */
export function applyKick(offset: Offset): { dCol: number; dRow: number } {
  const dy = offset[1]
  // `-0` would be numerically fine but compares unequal to `0` under Object.is,
  // which is the kind of thing that only bites much later.
  return { dCol: offset[0], dRow: dy === 0 ? 0 : -dy }
}

export interface KickResult {
  col: number
  row: number
  /** Index into the kick list. Needed to tell a full T-spin from a mini. */
  kick: number
}

/**
 * Tries each offset IN TABLE ORDER and returns the FIRST one that fits
 * (invariant #5). Returns null when every offset collides.
 *
 * `fits` is injected so this module stays free of board knowledge.
 */
export function tryKicks(
  kind: Kind,
  from: Rot,
  to: Rot,
  col: number,
  row: number,
  fits: (kind: Kind, rot: Rot, col: number, row: number) => boolean,
): KickResult | null {
  const kicks = kicksFor(kind, from, to)
  for (let i = 0; i < kicks.length; i++) {
    const { dCol, dRow } = applyKick(kicks[i] as Offset)
    const c = col + dCol
    const r = row + dRow
    if (fits(kind, to, c, r)) return { col: c, row: r, kick: i }
  }
  return null
}
