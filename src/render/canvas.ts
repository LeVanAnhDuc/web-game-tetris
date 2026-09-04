import {
  COLS,
  ROWS,
  TICK_HZ,
  TOP_VISIBLE_ROW,
  VISIBLE_ROWS,
  cellAt,
  dropDistance,
  kindCode,
  shapeOf,
  type GameState,
} from '../engine'
import { clearPhase, type Cell, type ClearPhase, type Effects } from './effects'
import { BOARD_GRID, BOARD_WELL, buildSprites, type SpriteSheet } from './sprites'

/**
 * Canvas renderer for the playfield (ADR-0003).
 *
 * It reads the game state and draws. The only memory it has is `effects` (ADR-0012),
 * which holds where things were so motion can be interpolated -- the engine advances
 * in whole ticks and never in fractions (invariant #2), so smoothness is this
 * layer's job and only this layer's job.
 *
 * Nothing in `draw` allocates: no closures declared per call, no object literals, no
 * `for...of` over tuples (each of those makes an iterator per element). That is
 * NFR-PERF-03 read literally, on the one path where it matters.
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

  // Reused across frames rather than returned fresh from clearPhase.
  const cp: ClearPhase = { active: false, flash: 0, collapse: 0 }

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

  function stepPx(): number {
    return cell + GAP
  }

  function cellX(col: number): number {
    return (GAP + col * stepPx()) * dpr
  }

  function cellY(visibleRow: number): number {
    return (GAP + visibleRow * stepPx()) * dpr
  }

  /** Rows below `boardRow` that are about to go, for the collapse slide. */
  function rowsClearedBelow(pending: readonly number[], boardRow: number): number {
    let below = 0
    for (let i = 0; i < pending.length; i++) {
      if ((pending[i] as number) > boardRow) below++
    }
    return below
  }

  function fillCell(col: number, visibleRow: number, style: string, a: number, yOff: number): void {
    if (!ctx || a <= 0) return
    const size = Math.round(cell * dpr)
    const prev = ctx.globalAlpha
    ctx.globalAlpha = Math.min(1, a)
    ctx.fillStyle = style
    ctx.fillRect(cellX(col), cellY(visibleRow) + yOff, size, size)
    ctx.globalAlpha = prev
  }

  function draw(state: GameState, alpha: number, effects: Effects): void {
    if (!ctx || !sprites) return
    const sheet = sprites
    const size = Math.round(cell * dpr)
    const reduced = effects.reduced()

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Shake displaces the drawing, never the canvas element: resizing the element
    // would relayout the page sixty times a second.
    const sx = effects.shakeX() * dpr
    const sy = effects.shakeY() * dpr
    if (sx !== 0 || sy !== 0) ctx.setTransform(1, 0, 0, 1, sx, sy)

    const bleedX = Math.abs(sx)
    const bleedY = Math.abs(sy)
    ctx.fillStyle = BOARD_GRID
    ctx.fillRect(-bleedX, -bleedY, canvas.width + bleedX * 2, canvas.height + bleedY * 2)

    ctx.fillStyle = BOARD_WELL
    for (let r = 0; r < VISIBLE_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillRect(Math.round(cellX(c)), Math.round(cellY(r)), size, size)
      }
    }

    clearPhase(state, state.cfg.clearDelay, TICK_MS, cp, reduced)
    const pending = state.pendingRows

    // While rows collapse, cells from the buffer slide down into view. Starting the
    // scan above the fringe is what stops them popping into existence at the end.
    const overscan = cp.active ? pending.length : 0
    const firstRow = -overscan

    for (let r = firstRow; r < VISIBLE_ROWS; r++) {
      const boardRow = r + TOP_VISIBLE_ROW
      if (boardRow < 0 || boardRow >= ROWS) continue
      const clearing = cp.active && pending.includes(boardRow)
      const shift = clearing ? 0 : rowsClearedBelow(pending, boardRow) * stepPx() * cp.collapse * dpr
      for (let c = 0; c < COLS; c++) {
        const code = cellAt(state, boardRow, c)
        if (code === 0) continue
        const img = sheet.forCode(code)
        if (!img) continue
        const y = cellY(r) + shift
        if (y + size <= 0) continue
        if (clearing) {
          // Fade the doomed row out as the rest of the stack comes down.
          const prevA = ctx.globalAlpha
          ctx.globalAlpha = Math.max(0, 1 - cp.collapse)
          ctx.drawImage(img, cellX(c), y, size, size)
          ctx.globalAlpha = prevA
        } else {
          ctx.drawImage(img, cellX(c), y, size, size)
        }
      }
    }

    // The white flash over a completed row, before the collapse starts.
    if (cp.flash > 0) {
      for (let i = 0; i < pending.length; i++) {
        const r = (pending[i] as number) - TOP_VISIBLE_ROW
        if (r < 0 || r >= VISIBLE_ROWS) continue
        for (let c = 0; c < COLS; c++) fillCell(c, r, '#FFFFFF', cp.flash, 0)
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
        fillCell(t.col, r, '#F4F5F7', trailA * 0.35, 0)
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
        fillCell(f.col, r, '#FFFFFF', flashA * 0.85, 0)
      }
    }

    const active = state.active
    if (!active || state.phase === 'gameOver') return

    const cells = shapeOf(active.kind, active.rot).cells

    // The ghost snaps to the grid: it marks a landing square, and a ghost that
    // slides is a ghost that lies about where the piece will end up.
    const drop = dropDistance(state.board, active)
    if (drop > 0) {
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i] as readonly [number, number]
        const r = active.row + c[1] + drop - TOP_VISIBLE_ROW
        if (r < 0 || r >= VISIBLE_ROWS) continue
        ctx.drawImage(sheet.ghost, cellX(active.col + c[0]), cellY(r), size, size)
      }
    }

    const img = sheet.forCode(kindCode(active.kind))
    if (!img) return
    const pc = effects.pieceCol(state, alpha)
    const pr = effects.pieceRow(state, alpha)
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i] as readonly [number, number]
      const r = pr + c[1] - TOP_VISIBLE_ROW
      if (r < -1 || r >= VISIBLE_ROWS) continue
      ctx.drawImage(img, cellX(pc + c[0]), cellY(r), size, size)
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
