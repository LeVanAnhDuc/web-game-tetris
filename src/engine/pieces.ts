import type { Kind, Rot } from './types'

/** A cell offset from the piece matrix's top-left corner: [col, row]. */
export type CellOffset = readonly [number, number]

export interface Shape {
  /** Matrix side length: 4 for I, 2 for O, 3 for the rest. Wall kicks depend on it. */
  readonly size: number
  readonly cells: readonly CellOffset[]
}

type Rotations = readonly [Shape, Shape, Shape, Shape]

const s3 = (cells: readonly CellOffset[]): Shape => ({ size: 3, cells })
const s4 = (cells: readonly CellOffset[]): Shape => ({ size: 4, cells })

/**
 * The seven tetrominoes in their four SRS rotation states, as [col, row] offsets.
 * Rotation 0 is the spawn state; 1 is one clockwise turn (R), 2 is two (2), 3 is
 * three (L).
 */
export const SHAPES: Readonly<Record<Kind, Rotations>> = {
  I: [
    s4([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ]),
    s4([
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ]),
    s4([
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ]),
    s4([
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ]),
  ],
  J: [
    s3([
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]),
    s3([
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ]),
    s3([
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ]),
    s3([
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ]),
  ],
  L: [
    s3([
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]),
    s3([
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ]),
    s3([
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ]),
    s3([
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ]),
  ],
  O: [
    { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  ],
  S: [
    s3([
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ]),
    s3([
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ]),
    s3([
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ]),
    s3([
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ]),
  ],
  T: [
    s3([
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]),
    s3([
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ]),
    s3([
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ]),
    s3([
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ]),
  ],
  Z: [
    s3([
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ]),
    s3([
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ]),
    s3([
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ]),
    s3([
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ]),
  ],
}

/**
 * Spawn position of the matrix's top-left corner.
 *
 * Pieces spawn in the BUFFER, one row above the visible field, for two reasons: it
 * is what makes lock-out reachable at all (a piece that comes to rest entirely above
 * the visible field ends the game -- FR-12), and it is how a piece slides into view
 * rather than appearing on top of the stack. The lowest cell of the spawn state sits
 * on the first visible row, so nothing is invisible for longer than one gravity step.
 */
export const SPAWN: Readonly<Record<Kind, { col: number; row: number }>> = {
  I: { col: 3, row: 18 },
  J: { col: 3, row: 19 },
  L: { col: 3, row: 19 },
  O: { col: 4, row: 19 },
  S: { col: 3, row: 19 },
  T: { col: 3, row: 19 },
  Z: { col: 3, row: 19 },
}

export function shapeOf(kind: Kind, rot: Rot): Shape {
  return SHAPES[kind][rot]
}
