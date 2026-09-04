import type { Locale } from '../i18n'
import { migrateSettings, type Settings } from '../settings/types'

/**
 * Settings persistence (FR-30).
 *
 * Async even though `localStorage` is synchronous, and behind an interface with one
 * implementation, because ADR-0004 decided that before there was anything to store:
 * turning a sync call async later means touching every call site, while an `await`
 * that resolves immediately costs nothing today.
 *
 * The two failure modes here are not hypothetical. `localStorage` throws outright in
 * some privacy modes and when the quota is full (NFR-REL-03), and whatever is in it
 * was written by an older version of this code or by nothing at all (NFR-REL-02).
 * Neither may take the game down: the player came to play, not to store settings.
 */

export const SETTINGS_KEY = 'tetris.settings.v1'

export type StorageStatus = 'ok' | 'unavailable' | 'recovered'

export interface SettingsRepository {
  load(locale: Locale): Promise<{ settings: Settings; status: StorageStatus }>
  save(settings: Settings): Promise<StorageStatus>
}

/** A Storage-shaped thing. Injected so the failure paths are testable. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function browserStorage(): StorageLike | null {
  try {
    // Touching `localStorage` at all can throw, so the probe is inside the try.
    const s = globalThis.localStorage
    if (!s) return null
    const probe = '__tetris_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

export function createSettingsRepository(storage: StorageLike | null = browserStorage()): SettingsRepository {
  return {
    async load(locale) {
      if (!storage) return { settings: migrateSettings(null, locale), status: 'unavailable' }
      let text: string | null = null
      try {
        text = storage.getItem(SETTINGS_KEY)
      } catch {
        return { settings: migrateSettings(null, locale), status: 'unavailable' }
      }
      if (text === null) return { settings: migrateSettings(null, locale), status: 'ok' }

      try {
        const parsed: unknown = JSON.parse(text)
        const settings = migrateSettings(parsed, locale)
        // `recovered` is reported, not swallowed: the player's saved values were not
        // what came back, and the UI says so rather than pretending nothing happened.
        const wasCurrent =
          typeof parsed === 'object' &&
          parsed !== null &&
          (parsed as { schemaVersion?: unknown }).schemaVersion === settings.schemaVersion
        return { settings, status: wasCurrent ? 'ok' : 'recovered' }
      } catch {
        return { settings: migrateSettings(null, locale), status: 'recovered' }
      }
    },

    async save(settings) {
      if (!storage) return 'unavailable'
      try {
        storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
        return 'ok'
      } catch {
        // Quota exceeded, or storage disabled between load and save.
        return 'unavailable'
      }
    },
  }
}
