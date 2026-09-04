import { KINDS, type Kind } from '../engine'

/**
 * Pre-rendered cell sprites (ADR-0009).
 *
 * Every cell is bevelled -- light edge top-left, dark edge bottom-right -- because
 * flat fills separated by a one-pixel grid line make two same-coloured cells read as
 * one shape, and the seven hues cannot carry that separation themselves (T vs Z
 * measures 1.20:1).
 *
 * ADR-0009 also fixes HOW: drawing the fill plus two bevel edges every frame would
 * be three operations per cell, 600 instead of 200, against the 8ms budget of
 * NFR-PERF-01. So each sprite is rendered ONCE per cell size and blitted with a
 * single `drawImage` per cell.
 */

/** Piece colours, from MASTER.md §2. The only saturated colour in the product. */
export const PIECE_COLORS: Readonly<Record<Kind, string>> = {
  I: '#3BC9DB',
  J: '#4C6EF5',
  L: '#FF922B',
  O: '#FCC419',
  S: '#51CF66',
  T: '#CC5DE8',
  Z: '#FF6B6B',
}

export const BEVEL_LIGHT = 'rgba(255,255,255,0.34)'
export const BEVEL_DARK = 'rgba(0,0,0,0.34)'
export const GHOST_LINE = 'rgba(244,245,247,0.34)'
export const GHOST_FILL = 'rgba(244,245,247,0.05)'
export const BOARD_WELL = '#0A0B0E'
export const BOARD_GRID = 'rgba(255,255,255,0.05)'
export const BOARD_FRAME = 'rgba(255,255,255,0.14)'

const CELL_RADIUS = 2

/** 2px at cell sizes of 20 and up, 1px below -- MASTER.md §2. */
export function bevelWidth(cell: number): number {
  return cell >= 20 ? 2 : 1
}

export interface SpriteSheet {
  readonly cell: number
  readonly dpr: number
  readonly colorBlind: boolean
  /** Sprite for a board cell code (1..7), or null for empty. */
  forCode(code: number): CanvasImageSource | null
  readonly ghost: CanvasImageSource
}

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.beginPath()
  ctx.rect(x, y, w, h)
}

function drawCellSprite(size: number, bevel: number, fill: string, radius: number): HTMLCanvasElement {
  const canvas = makeCanvas(size)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  roundedPath(ctx, 0, 0, size, size, radius)
  ctx.fillStyle = fill
  ctx.fill()

  // Light edge: top and left.
  ctx.fillStyle = BEVEL_LIGHT
  ctx.fillRect(0, 0, size, bevel)
  ctx.fillRect(0, 0, bevel, size)

  // Dark edge: bottom and right.
  ctx.fillStyle = BEVEL_DARK
  ctx.fillRect(0, size - bevel, size, bevel)
  ctx.fillRect(size - bevel, 0, bevel, size)

  return canvas
}

function drawGhostSprite(size: number, bevel: number, radius: number): HTMLCanvasElement {
  const canvas = makeCanvas(size)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  roundedPath(ctx, 0, 0, size, size, radius)
  ctx.fillStyle = GHOST_FILL
  ctx.fill()
  // An outline, not a fill: a translucent filled ghost reads as a locked block.
  ctx.strokeStyle = GHOST_LINE
  ctx.lineWidth = bevel
  roundedPath(ctx, bevel / 2, bevel / 2, size - bevel, size - bevel, radius)
  ctx.stroke()
  return canvas
}

/**
 * Builds the whole sheet. Call this only when the cell size or DPR changes --
 * forgetting to rebuild is how cells go blurry on a high-DPR screen (ADR-0009 §4).
 */
/**
 * FR-26 / NFR-A11Y-06. ADR-0008 measured the piece hues against each other and found
 * T vs Z at 1.20:1 and S vs O at 1.25:1 -- for a player who cannot separate those,
 * they are the same piece. So this is not a preference toggle, it is the mode that
 * makes the game playable at all for them: each cell carries its letter, and the
 * fills desaturate so the letter is what carries the meaning.
 */
const CB_FILL = '#4A5160'

export function buildSprites(cell: number, dpr: number, colorBlind = false): SpriteSheet {
  const px = Math.max(1, Math.round(cell * dpr))
  const bevel = Math.max(1, Math.round(bevelWidth(cell) * dpr))
  const radius = Math.max(1, Math.round(CELL_RADIUS * dpr))

  const byCode: (CanvasImageSource | null)[] = [null]
  for (const kind of KINDS) {
    const sprite = drawCellSprite(px, bevel, colorBlind ? CB_FILL : PIECE_COLORS[kind], radius)
    if (colorBlind) stampLetter(sprite, kind, px)
    byCode.push(sprite)
  }
  const ghost = drawGhostSprite(px, bevel, radius)

  return {
    cell,
    dpr,
    colorBlind,
    forCode: (code) => byCode[code] ?? null,
    ghost,
  }
}

function stampLetter(canvas: HTMLCanvasElement, kind: Kind, px: number): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#F4F5F7'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${Math.max(8, Math.round(px * 0.6))}px ui-monospace, monospace`
  ctx.fillText(kind, px / 2, px / 2 + px * 0.02)
}
