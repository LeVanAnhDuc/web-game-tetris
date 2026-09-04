import { TICK_HZ } from './config'
import type { Config } from './types'

/**
 * Gravity per level (FR-08).
 *
 * Guideline formula: secondsPerRow = (0.8 - (level - 1) * 0.007) ^ (level - 1).
 *
 * The exponent is applied by REPEATED MULTIPLICATION, not `Math.pow`. `Math.pow`
 * is not required to be bit-identical across JavaScript engines, and a replay that
 * reproduces on one browser but not another is not a replay (ADR-0002). Plain `*`
 * is exact per IEEE-754, so this is deterministic everywhere.
 */
export function secondsPerRow(level: number, maxLevel: number): number {
  const l = Math.max(1, Math.min(level, maxLevel))
  const base = 0.8 - (l - 1) * 0.007
  let out = 1
  for (let i = 0; i < l - 1; i++) out *= base
  return out
}

/** Cells the piece falls per tick at this level. Grows with level, never shrinks. */
export function gravityCellsPerTick(level: number, maxLevel: number): number {
  return 1 / (secondsPerRow(level, maxLevel) * TICK_HZ)
}

/**
 * Soft drop speed (FR-07): a multiple of gravity, with a floor so that soft drop is
 * still useful at level 1, where gravity is one cell per second.
 */
export function softDropCellsPerTick(
  level: number,
  maxLevel: number,
  factor: number,
): number {
  const gravity = gravityCellsPerTick(level, maxLevel)
  return Math.max(gravity * factor, 1 / 3)
}

/**
 * The fall speed actually in force: the Guideline curve scaled by difficulty, or a
 * flat player-chosen rate that replaces it.
 *
 * A flat rate replaces the curve rather than scaling it, because "I want it this
 * fast" means one speed, not a speed that keeps climbing.
 */
export function effectiveGravity(cfg: Config, level: number): number {
  if (cfg.fixedCellsPerSecond !== null) return cfg.fixedCellsPerSecond / TICK_HZ
  return gravityCellsPerTick(level, cfg.maxLevel) * cfg.gravityScale
}

/** Soft drop is a multiple of whatever gravity is in force, with a usable floor. */
export function effectiveSoftDrop(cfg: Config, level: number): number {
  return Math.max(effectiveGravity(cfg, level) * cfg.softDropFactor, 1 / 3)
}

/** Level from total lines cleared (FR-11), capped. */
export function levelFromLines(lines: number, linesPerLevel: number, maxLevel: number): number {
  return Math.min(maxLevel, 1 + Math.floor(lines / linesPerLevel))
}
