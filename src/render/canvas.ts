import {
  COLS,
  TOP_VISIBLE_ROW,
  VISIBLE_ROWS,
  cellAt,
  dropDistance,
  kindCode,
  shapeOf,
  type GameState,
} from '../engine'
import { BOARD_GRID, BOARD_WELL, buildSprites, type SpriteSheet } from './sprites'

/**
 * Canvas renderer for the playfield (ADR-0003).
 *
 * It reads the game state and draws; it holds no state of its own beyond the sprite
 * sheet and the canvas size. `ui/` creates it and hands over the canvas element, but
 * only `runtime/` ever calls `draw` -- see architecture.md §3.
 *
 * The buffer rows are never drawn: rows below TOP_VISIBLE_ROW exist so pieces can
 * spawn and lock out, not to be looked at.
 */

/** 1px logical gap between cells, which is what shows the grid line through. */
const GAP = 1

export interface BoardRenderer {
  /** Sizes the canvas to its CSS box and rebuilds sprites when the cell size changed. */
  resize(cssWidth: number, cssHeight: number): void
  draw(state: GameState): void
  readonly cell: number
}

export function createBoardRenderer(canvas: HTMLCanvasElement): BoardRenderer {
  const ctx = canvas.getContext('2d')
  let sprites: SpriteSheet | null = null
  let cell = 0
  let dpr = 1

  function ensureSprites(): void {
    if (!sprites || sprites.cell !== cell || sprites.dpr !== dpr) {
      sprites = cell > 0 ? buildSprites(cell, dpr) : null
    }
  }

  function resize(cssWidth: number, cssHeight: number): void {
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
    // Largest cell size that fits both axes, leaving room for the gaps.
    const byWidth = Math.floor((cssWidth - GAP * (COLS + 1)) / COLS)
    const byHeight = Math.floor((cssHeight - GAP * (VISIBLE_ROWS + 1)) / VISIBLE_ROWS)
    cell = Math.max(4, Math.min(byWidth, byHeight))

    const w = cell * COLS + GAP * (COLS + 1)
    const h = cell * VISIBLE_ROWS + GAP * (VISIBLE_ROWS + 1)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ensureSprites()
  }

  function cellX(col: number): number {
    return (GAP + col * (cell + GAP)) * dpr
  }

  function cellY(visibleRow: number): number {
    return (GAP + visibleRow * (cell + GAP)) * dpr
  }

  function blit(img: CanvasImageSource, col: number, visibleRow: number): void {
    if (!ctx) return
    const size = Math.round(cell * dpr)
    ctx.drawImage(img, Math.round(cellX(col)), Math.round(cellY(visibleRow)), size, size)
  }

  function draw(state: GameState): void {
    if (!ctx || !sprites) return
    const sheet = sprites

    // The gap colour is painted once as the background; the cells sit on top, so the
    // grid appears in the gaps without drawing a single line.
    ctx.fillStyle = BOARD_GRID
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = BOARD_WELL
    const size = Math.round(cell * dpr)
    for (let r = 0; r < VISIBLE_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillRect(Math.round(cellX(c)), Math.round(cellY(r)), size, size)
      }
    }

    // Locked cells.
    for (let r = 0; r < VISIBLE_ROWS; r++) {
      const boardRow = r + TOP_VISIBLE_ROW
      for (let c = 0; c < COLS; c++) {
        const code = cellAt(state, boardRow, c)
        if (code === 0) continue
        const img = sheet.forCode(code)
        if (img) blit(img, c, r)
      }
    }

    const active = state.active
    if (!active || state.phase === 'gameOver') return

    // Ghost first, so the piece itself paints over it if they overlap.
    const drop = dropDistance(state.board, active)
    const shape = shapeOf(active.kind, active.rot)
    if (drop > 0) {
      for (const [dc, dr] of shape.cells) {
        const r = active.row + dr + drop - TOP_VISIBLE_ROW
        if (r < 0 || r >= VISIBLE_ROWS) continue
        blit(sheet.ghost, active.col + dc, r)
      }
    }

    const img = sheet.forCode(kindCode(active.kind))
    if (!img) return
    for (const [dc, dr] of shape.cells) {
      const r = active.row + dr - TOP_VISIBLE_ROW
      if (r < 0 || r >= VISIBLE_ROWS) continue
      blit(img, active.col + dc, r)
    }
  }

  return {
    resize,
    draw,
    get cell() {
      return cell
    },
  }
}
