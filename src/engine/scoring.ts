import { blocked } from './board'
import type { Active, LastMove, Rot, SpinKind } from './types'

/**
 * Scoring (FR-10, FR-19 -- FR-22). Values follow the Guideline table in
 * docs/specs/core-gameplay/design.md §8; that document is the source, this file is
 * the implementation, and the test locks them together.
 */

/** The four corners of the T piece's 3x3 matrix, as [col, row] offsets. */
const T_CORNERS: readonly (readonly [number, number])[] = [
  [0, 0],
  [2, 0],
  [0, 2],
  [2, 2],
]

/**
 * Which two corners are in FRONT of the T's nub, per rotation. Indices into
 * `T_CORNERS`. Rotation 0 points up, 1 right, 2 down, 3 left.
 */
const T_FRONT: Readonly<Record<Rot, readonly [number, number]>> = {
  0: [0, 1],
  1: [1, 3],
  2: [2, 3],
  3: [0, 2],
}

/**
 * T-spin detection (FR-19).
 *
 * Three conditions, all necessary: the piece is a T, the last thing it did was
 * ROTATE, and at least three of the four corners around its centre are occupied
 * (a wall or the floor counts as occupied).
 *
 * It is a MINI when the two corners in front of the nub are not both occupied --
 * unless the rotation only fitted on the LAST kick offset, which is the classic
 * T-spin triple and counts as a full spin.
 *
 * This cannot be derived from the board alone, which is why `lastMove` and
 * `lastKickIndex` are part of the game state (invariant #7).
 */
export function detectSpin(
  board: Uint8Array,
  active: Active,
  lastMove: LastMove,
  lastKickIndex: number,
): SpinKind {
  if (active.kind !== 'T') return 'none'
  if (lastMove !== 'rotate') return 'none'

  let occupied = 0
  const filled: boolean[] = [false, false, false, false]
  for (let i = 0; i < T_CORNERS.length; i++) {
    const corner = T_CORNERS[i] as readonly [number, number]
    const isBlocked = blocked(board, active.row + corner[1], active.col + corner[0])
    filled[i] = isBlocked
    if (isBlocked) occupied++
  }
  if (occupied < 3) return 'none'

  const front = T_FRONT[active.rot]
  const bothFront = filled[front[0]] === true && filled[front[1]] === true
  if (bothFront) return 'tspin'
  // The fifth offset (index 4) is the T-spin-triple kick.
  return lastKickIndex === 4 ? 'tspin' : 'mini'
}

/** Base points for a clear, before the back-to-back multiplier. */
export function basePoints(rows: number, spin: SpinKind): number {
  if (spin === 'tspin') {
    switch (rows) {
      case 0:
        return 400
      case 1:
        return 800
      case 2:
        return 1200
      default:
        return 1600
    }
  }
  if (spin === 'mini') {
    return rows === 0 ? 100 : 200
  }
  switch (rows) {
    case 0:
      return 0
    case 1:
      return 100
    case 2:
      return 300
    case 3:
      return 500
    default:
      return 800
  }
}

/** Perfect clear bonus (FR-22), added on top of the clear itself. */
export function perfectClearBonus(rows: number): number {
  switch (rows) {
    case 1:
      return 800
    case 2:
      return 1200
    case 3:
      return 1800
    default:
      return 2000
  }
}

/**
 * A clear is back-to-back eligible when it is a tetris or any T-spin. Two eligible
 * clears in a row multiply the second by 1.5.
 */
export function isB2BEligible(rows: number, spin: SpinKind): boolean {
  return rows === 4 || spin === 'tspin' || spin === 'mini'
}

export interface ScoreInput {
  rows: number
  spin: SpinKind
  level: number
  /** Was the PREVIOUS eligible clear also back-to-back eligible? */
  b2bActive: boolean
  perfect: boolean
  /** -1 when no combo is running. */
  combo: number
}

/** Total points for one lock, including combo and perfect-clear bonuses. */
export function scoreForClear(input: ScoreInput): number {
  const { rows, spin, level, b2bActive, perfect, combo } = input
  let points = basePoints(rows, spin)
  if (b2bActive && isB2BEligible(rows, spin)) points = Math.floor(points * 1.5)
  if (perfect && rows > 0) points += perfectClearBonus(rows)
  let total = points * level
  if (combo > 0 && rows > 0) total += 50 * combo * level
  return total
}

/** Soft drop scores 1 per cell, hard drop 2 (FR-07). Not multiplied by level. */
export function dropPoints(cells: number, hard: boolean): number {
  return cells * (hard ? 2 : 1)
}
