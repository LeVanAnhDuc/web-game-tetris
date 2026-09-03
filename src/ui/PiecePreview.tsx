import { shapeOf, type Kind } from '../engine'
import { BEVEL_DARK, BEVEL_LIGHT, PIECE_COLORS } from '../render/sprites'

/**
 * The hold slot and the next queue (FR-04, FR-05).
 *
 * These are DOM rather than canvas: they change once per piece, not per frame, so
 * they belong to React. Same bevel as the board cells (ADR-0009), because a flat
 * swatch next to a bevelled board reads as a different material.
 */

const MATRIX = 4
const ROWS = 2

export function PiecePreview({ kind, cell }: { kind: Kind | null; cell: number }) {
  const bevel = cell >= 20 ? 2 : 1
  const cells = kind ? shapeOf(kind, 0).cells : []
  // Normalise so a 3-wide piece is not glued to the left edge of a 4-wide box.
  const cols = cells.map(([c]) => c)
  const rows = cells.map(([, r]) => r)
  const minCol = cols.length > 0 ? Math.min(...cols) : 0
  const minRow = rows.length > 0 ? Math.min(...rows) : 0
  const width = cols.length > 0 ? Math.max(...cols) - minCol + 1 : 0
  const offset = Math.floor((MATRIX - width) / 2)

  const filled = new Set(cells.map(([c, r]) => `${c - minCol + offset},${r - minRow}`))

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${MATRIX}, ${cell}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${cell}px)`,
        gap: 1,
      }}
    >
      {Array.from({ length: MATRIX * ROWS }, (_, i) => {
        const c = i % MATRIX
        const r = Math.floor(i / MATRIX)
        const on = kind !== null && filled.has(`${c},${r}`)
        return (
          <div
            key={i}
            style={
              on
                ? {
                    background: PIECE_COLORS[kind as Kind],
                    borderRadius: 2,
                    boxShadow: `inset ${bevel}px ${bevel}px 0 ${BEVEL_LIGHT}, inset -${bevel}px -${bevel}px 0 ${BEVEL_DARK}`,
                  }
                : undefined
            }
          />
        )
      })}
    </div>
  )
}
