import { DEFAULT_CONFIG, type Action } from '../engine'
import type { Locale } from '../i18n'

/**
 * Everything the player can change, in one serialisable object (FR-23 -- FR-30).
 *
 * `schemaVersion` is not decoration. Settings outlive the code that wrote them: a
 * player rebinds a key, then a new action ships, and the saved object no longer
 * matches what the app expects. Without a version the choice is between crashing and
 * silently discarding their bindings (FR-30, NFR-REL-02).
 */

export const SETTINGS_SCHEMA_VERSION = 1

export type Difficulty = 'easy' | 'normal' | 'hard' | 'custom'

export interface Settings {
  schemaVersion: number

  /** Key code (`event.code`) -> action. Same shape the keyboard input already takes. */
  bindings: Record<string, Action>
  /** Ticks before auto-repeat starts. */
  das: number
  /** Ticks between auto-repeat steps. */
  arr: number

  difficulty: Difficulty
  /**
   * Cells per second, used only when `difficulty` is `custom`. The three presets are
   * multipliers on the Guideline curve instead, so they keep the level progression;
   * a custom speed replaces it with a flat rate, which is what "I want it this fast"
   * actually means.
   */
  customCellsPerSecond: number

  ghost: boolean
  /** FR-26: distinguish pieces without relying on colour. */
  colorBlindMode: boolean
  sound: boolean
  /** 0..1. */
  volume: number
  locale: Locale
  /** FR-36: the sideways tween. Competitive players may want the image to not lag. */
  smoothHorizontal: boolean
}

/** Multiplier on the level-based gravity curve. `custom` ignores this. */
export const DIFFICULTY_SCALE: Readonly<Record<Exclude<Difficulty, 'custom'>, number>> = {
  easy: 0.6,
  normal: 1,
  hard: 1.8,
}

export const MIN_CELLS_PER_SECOND = 0.25
export const MAX_CELLS_PER_SECOND = 20

export const DEFAULT_BINDINGS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'softDrop',
  Space: 'hardDrop',
  KeyZ: 'rotCCW',
  KeyX: 'rotCW',
  ArrowUp: 'rotCW',
  ShiftLeft: 'hold',
  ShiftRight: 'hold',
  KeyC: 'hold',
  Escape: 'pause',
  KeyP: 'pause',
}

export function defaultSettings(locale: Locale): Settings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    bindings: { ...DEFAULT_BINDINGS },
    das: DEFAULT_CONFIG.das,
    arr: DEFAULT_CONFIG.arr,
    difficulty: 'normal',
    customCellsPerSecond: 1,
    ghost: true,
    colorBlindMode: false,
    sound: true,
    volume: 0.6,
    locale,
    smoothHorizontal: true,
  }
}

/** Every action a player must be able to reach, for the rebinding screen. */
export const BINDABLE_ACTIONS: readonly Action[] = [
  'left',
  'right',
  'softDrop',
  'hardDrop',
  'rotCCW',
  'rotCW',
  'hold',
  'pause',
]

/**
 * Clamp, with the DEFAULT as the fallback for anything that is not a number.
 *
 * Falling back to the low bound looks tidier and is wrong: `das` would land on 0,
 * which means auto-repeat with no delay at all -- a completely different game from
 * the one the player had. Corrupt data should give back the default, not an extreme.
 */
function clamp(n: unknown, lo: number, hi: number, fallback: number): number {
  const v = Number(n)
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
}

/**
 * Brings anything read from storage up to the current shape.
 *
 * Written to survive rubbish, not just old versions: values are clamped and types
 * checked field by field, because the thing on the other side of `localStorage` is
 * whatever the browser happened to keep, and a half-valid object must not take the
 * game down with it (NFR-REL-02).
 */
export function migrateSettings(raw: unknown, locale: Locale): Settings {
  const base = defaultSettings(locale)
  if (typeof raw !== 'object' || raw === null) return base
  const r = raw as Partial<Settings> & Record<string, unknown>

  const bindings: Record<string, Action> = { ...base.bindings }
  if (typeof r.bindings === 'object' && r.bindings !== null) {
    const known = new Set<string>(BINDABLE_ACTIONS)
    for (const [code, action] of Object.entries(r.bindings as Record<string, unknown>)) {
      // A binding for an action this version no longer has is dropped, not kept:
      // keeping it would make the rebinding screen show a key that does nothing.
      if (typeof code === 'string' && typeof action === 'string' && known.has(action)) {
        bindings[code] = action as Action
      }
    }
  }

  const difficulty: Difficulty =
    r.difficulty === 'easy' || r.difficulty === 'hard' || r.difficulty === 'custom'
      ? r.difficulty
      : 'normal'

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    bindings,
    das: clamp(r.das ?? base.das, 0, 60, base.das),
    arr: clamp(r.arr ?? base.arr, 0, 30, base.arr),
    difficulty,
    customCellsPerSecond: clamp(
      r.customCellsPerSecond ?? base.customCellsPerSecond,
      MIN_CELLS_PER_SECOND,
      MAX_CELLS_PER_SECOND,
      base.customCellsPerSecond,
    ),
    ghost: typeof r.ghost === 'boolean' ? r.ghost : base.ghost,
    colorBlindMode: typeof r.colorBlindMode === 'boolean' ? r.colorBlindMode : base.colorBlindMode,
    sound: typeof r.sound === 'boolean' ? r.sound : base.sound,
    volume: clamp(r.volume ?? base.volume, 0, 1, base.volume),
    locale: r.locale === 'vi' || r.locale === 'en' ? r.locale : base.locale,
    smoothHorizontal:
      typeof r.smoothHorizontal === 'boolean' ? r.smoothHorizontal : base.smoothHorizontal,
  }
}
