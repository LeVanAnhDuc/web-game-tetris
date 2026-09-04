import {
  COLS,
  TICK_HZ,
  TOP_VISIBLE_ROW,
  VISIBLE_ROWS,
  cellAt,
  dropDistance,
  kindCode,
  shapeOf,
  type GameState,
} from '../engine'
import { clearPhase, type Cell, type Effects } from './effects'
import { BOARD_GRID, BOARD_WELL, buildSprites, type SpriteSheet } from './sprites'

/**
 * Canvas renderer for the playfield (ADR-0003).
 *
 * It reads the game state and draws. The only memory it has is `effects` (ADR-0012),
 * which holds where things were so motion can be interpolated -- the engine advances
 * in whole ticks and never in fractions (invariant #2), so smoothness is this
 * layer's job and only this layer's job.
 *
 * The buffer rows are never drawn: rows below TOP_VISIBLE_ROW exist so pieces can
 * spawn and lock out, not to be looked at.
 */

/** 1px logical gap between cells, which is what shows the grid line through. */
const GAP = 1
const TICK_MS = 1000 / TICK_HZ

export interface BoardRenderer {
  resize(cssWidth: number, cssHeight: number): void
  /** `alpha` is progress toward the next tick, 0..1. */
  draw(state: GameState, alpha: number, effects: Effects): void
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

  const step = () => cell + GAP

  function cellX(col: number): number {
    return (GAP + col * step()) * dpr
  }

  function cellY(visibleRow: number): number {
    return (GAP + visibleRow * step()) * dpr
  }

  function blit(img: CanvasImageSource, col: number, visibleRow: number): void {
    if (!ctx) return
    const size = Math.round(cell * dpr)
    // Fractional positions are the whole point of interpolation, so these are NOT
    // rounded to whole pixels the way the static grid is.
    ctx.drawImage(img, cellX(col), cellY(visibleRow), size, size)
  }

  function fillCell(col: number, visibleRow: number, style: string, alpha: number): void {
    if (!ctx || alpha <= 0) return
    const size = Math.round(cell * dpr)
    const prev = ctx.globalAlpha
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.fillStyle = style
    ctx.fillRect(cellX(col), cellY(visibleRow), size, size)
    ctx.globalAlpha = prev
  }

  function draw(state: GameState, alpha: number, effects: Effects): void {
    if (!ctx || !sprites) return
    const sheet = sprites
    const size = Math.round(cell * dpr)

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Shake displaces the drawing, never the canvas element: resizing the element
    // would relayout the page sixty times a second.
    const sx = effects.shakeX() * dpr
    const sy = effects.shakeY() * dpr
    if (sx !== 0 || sy !== 0) ctx.setTransform(1, 0, 0, 1, sx, sy)

    ctx.fillStyle = BOARD_GRID
    ctx.fillRect(-Math.abs(sx), -Math.abs(sy), canvas.width + Math.abs(sx) * 2, canvas.height + Math.abs(sy) * 2)

    ctx.fillStyle = BOARD_WELL
    for (let r = 0; r < VISIBLE_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillRect(Math.round(cellX(c)), Math.round(cellY(r)), size, size)
      }
    }

    const cp = clearPhase(state, state.cfg.clearDelay, TICK_MS)
    const pending = state.pendingRows

    /** How far a surviving row slides down while the cleared rows collapse. */
    function collapseShift(boardRow: number): number {
      if (!cp.active || cp.collapse <= 0) return 0
      let below = 0
      for (let i = 0; i < pending.length; i++) {
        if ((pending[i] as number) > boardRow) below++
      }
      return below * step() * cp.collapse * dpr
    }

    // Locked cells.
    for (let r = 0; r < VISIBLE_ROWS; r++) {
      const boardRow = r + TOP_VISIBLE_ROW
      const clearing = cp.active && pending.includes(boardRow)
      const shift = clearing ? 0 : collapseShift(boardRow)
      for (let c = 0; c < COLS; c++) {
        const code = cellAt(state, boardRow, c)
        if (code === 0) continue
        const img = sheet.forCode(code)
        if (!img) continue
        const x = cellX(c)
        const y = cellY(r) + shift
        if (clearing) {
          // Fade the doomed row out as the rest of the stack comes down.
          const prevA = ctx.globalAlpha
          ctx.globalAlpha = Math.max(0, 1 - cp.collapse)
          ctx.drawImage(img, x, y, size, size)
          ctx.globalAlpha = prevA
        } else {
          ctx.drawImage(img, x, y, size, size)
        }
      }
    }

    // The white flash over a completed row, before the collapse starts.
    if (cp.flash > 0) {
      for (let i = 0; i < pending.length; i++) {
        const r = (pending[i] as number) - TOP_VISIBLE_ROW
        if (r < 0 || r >= VISIBLE_ROWS) continue
        for (let c = 0; c < COLS; c++) fillCell(c, r, '#FFFFFF', cp.flash)
      }
    }

    // Hard-drop trail: the piece has already locked, so this is the ghost of where
    // it came from, fading out behind it.
    const trailA = effects.trail()
    if (trailA > 0) {
      const n = effects.trailCount()
      for (let i = 0; i < n; i++) {
        const t = effects.trailCells[i] as Cell
        const r = t.row - TOP_VISIBLE_ROW
        if (r < 0 || r >= VISIBLE_ROWS) continue
        fillCell(t.col, r, '#F4F5F7', trailA * 0.35)
      }
    }

    // The flash that hides the snap: interpolation draws the piece between rows, so
    // locking pulls it onto the grid. Without this that pull is visible every time.
    const flashA = effects.flash()
    if (flashA > 0) {
      const n = effects.flashCount()
      for (let i = 0; i < n; i++) {
        const f = effects.flashCells[i] as Cell
        const r = f.row - TOP_VISIBLE_ROW
        if (r < 0 || r >= VISIBLE_ROWS) continue
        fillCell(f.col, r, '#FFFFFF', flashA * 0.85)
      }
    }

    const active = state.active
    if (!active || state.phase === 'gameOver') return

    const shape = shapeOf(active.kind, active.rot)

    // The ghost snaps to the grid: it marks a landing square, and a ghost that
    // slides is a ghost that lies about where the piece will end up.
    const drop = dropDistance(state.board, active)
    if (drop > 0) {
      for (const [dc, dr] of shape.cells) {
        const r = active.row + dr + drop - TOP_VISIBLE_ROW
        if (r < 0 || r >= VISIBLE_ROWS) continue
        blit(sheet.ghost, active.col + dc, r)
      }
    }

    const img = sheet.forCode(kindCode(active.kind))
    if (!img) return
    const pc = effects.pieceCol(state, alpha)
    const pr = effects.pieceRow(state, alpha)
    for (const [dc, dr] of shape.cells) {
      const r = pr + dr - TOP_VISIBLE_ROW
      if (r < -1 || r >= VISIBLE_ROWS) continue
      blit(img, pc + dc, r)
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
