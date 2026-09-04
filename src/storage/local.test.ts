import { describe, expect, it } from 'vitest'
import { SETTINGS_KEY, createSettingsRepository, type StorageLike } from './local'
import { DEFAULT_BINDINGS, SETTINGS_SCHEMA_VERSION, defaultSettings } from '../settings/types'

function memory(initial?: string): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(SETTINGS_KEY, initial)
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v)
    },
  }
}

const throwing = (): StorageLike => ({
  getItem() {
    throw new DOMException('denied')
  },
  setItem() {
    throw new DOMException('quota')
  },
})

describe('settings repository', () => {
  it('returns defaults on a first run, and reports ok', async () => {
    const repo = createSettingsRepository(memory())
    const { settings, status } = await repo.load('en')
    expect(status).toBe('ok')
    expect(settings).toEqual(defaultSettings('en'))
  })

  it('round-trips what it saved', async () => {
    const store = memory()
    const repo = createSettingsRepository(store)
    const wanted = { ...defaultSettings('vi'), volume: 0.2, difficulty: 'hard' as const }
    expect(await repo.save(wanted)).toBe('ok')
    const { settings, status } = await repo.load('en')
    expect(status).toBe('ok')
    expect(settings.volume).toBe(0.2)
    expect(settings.difficulty).toBe('hard')
    // The saved locale wins over the browser's.
    expect(settings.locale).toBe('vi')
  })

  it('survives outright rubbish and says it recovered (NFR-REL-02)', async () => {
    for (const junk of ['not json at all', '{', 'null', '[]', '42', '"a string"']) {
      const repo = createSettingsRepository(memory(junk))
      const { settings, status } = await repo.load('en')
      expect(settings.schemaVersion, junk).toBe(SETTINGS_SCHEMA_VERSION)
      expect(settings.bindings, junk).toEqual({ ...DEFAULT_BINDINGS })
      expect(status, junk).toBe('recovered')
    }
  })

  it('keeps the good half of a partly broken object', async () => {
    const repo = createSettingsRepository(
      memory(JSON.stringify({ schemaVersion: 1, volume: 0.9, das: 'nonsense', ghost: 'yes' })),
    )
    const { settings } = await repo.load('en')
    expect(settings.volume).toBe(0.9)
    // Bad types fall back rather than propagating.
    expect(settings.das).toBe(defaultSettings('en').das)
    expect(settings.ghost).toBe(true)
  })

  it('clamps values that would make the game unplayable', async () => {
    const repo = createSettingsRepository(
      memory(JSON.stringify({ schemaVersion: 1, volume: 99, das: -5, customCellsPerSecond: 1e6 })),
    )
    const { settings } = await repo.load('en')
    expect(settings.volume).toBe(1)
    expect(settings.das).toBe(0)
    expect(settings.customCellsPerSecond).toBeLessThanOrEqual(20)
  })

  it('drops a binding for an action this version no longer has', async () => {
    const repo = createSettingsRepository(
      memory(JSON.stringify({ schemaVersion: 1, bindings: { KeyQ: 'timeTravel', KeyW: 'hold' } })),
    )
    const { settings } = await repo.load('en')
    expect(settings.bindings.KeyQ).toBeUndefined()
    expect(settings.bindings.KeyW).toBe('hold')
  })

  it('treats an older schema as recovered rather than as current', async () => {
    const repo = createSettingsRepository(memory(JSON.stringify({ schemaVersion: 0, volume: 0.1 })))
    const { settings, status } = await repo.load('en')
    expect(status).toBe('recovered')
    expect(settings.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
    expect(settings.volume).toBe(0.1)
  })

  it('still plays when storage is missing entirely (NFR-REL-03)', async () => {
    const repo = createSettingsRepository(null)
    const { settings, status } = await repo.load('vi')
    expect(status).toBe('unavailable')
    expect(settings).toEqual(defaultSettings('vi'))
    expect(await repo.save(settings)).toBe('unavailable')
  })

  it('still plays when storage throws on every call', async () => {
    const repo = createSettingsRepository(throwing())
    const { status } = await repo.load('en')
    expect(status).toBe('unavailable')
    expect(await repo.save(defaultSettings('en'))).toBe('unavailable')
  })
})
