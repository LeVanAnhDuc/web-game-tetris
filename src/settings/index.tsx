import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Config } from '../engine'
import { detectLocale } from '../i18n'
import { createSettingsRepository, type SettingsRepository, type StorageStatus } from '../storage/local'
import { DIFFICULTY_SCALE, defaultSettings, type Settings } from './types'

/**
 * Settings state for the whole app.
 *
 * Loading is async (ADR-0004) so the first render happens before storage answers.
 * It renders with the defaults rather than a spinner: a blank screen while a
 * synchronous-in-practice read completes is worse than a game that starts and then
 * adopts the saved values a frame later.
 */

interface SettingsValue {
  settings: Settings
  /** Whether storage worked, so the UI can say when it did not (NFR-REL-03). */
  status: StorageStatus
  update(patch: Partial<Settings>): void
  reset(): void
  /** True until the first load resolves. */
  loading: boolean
}

const SettingsContext = createContext<SettingsValue | null>(null)

export function SettingsProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository?: SettingsRepository
}) {
  // Lazily built: passing the call as the argument runs it on every render and
  // throws the result away, and building the default repository probes storage.
  const repoRef = useRef<SettingsRepository | null>(repository ?? null)
  if (repoRef.current === null) repoRef.current = createSettingsRepository()
  const initialLocale = useRef(detectLocale())
  const [settings, setSettings] = useState<Settings>(() => defaultSettings(initialLocale.current))
  const [status, setStatus] = useState<StorageStatus>('ok')
  const [loading, setLoading] = useState(true)

  /** Mirrors `settings` for callbacks that must not close over a stale render. */
  const latest = useRef(settings)
  latest.current = settings

  useEffect(() => {
    let alive = true
    void repoRef.current?.load(initialLocale.current).then((r) => {
      if (!alive) return
      latest.current = r.settings
      setSettings(r.settings)
      setStatus(r.status)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback((patch: Partial<Settings>) => {
    // Computed OUTSIDE the state updater. React may invoke an updater more than
    // once -- StrictMode always does -- and a write living inside it therefore hit
    // localStorage twice for every single change.
    const next = { ...latest.current, ...patch }
    latest.current = next
    setSettings(next)
    // Fire and forget: a failed write must not block the UI, and `status` is how
    // the player finds out (NFR-REL-05).
    void repoRef.current?.save(next).then(setStatus)
  }, [])

  const reset = useCallback(() => {
    const next = defaultSettings(initialLocale.current)
    latest.current = next
    setSettings(next)
    void repoRef.current?.save(next).then(setStatus)
  }, [])

  const value = useMemo<SettingsValue>(
    () => ({ settings, status, update, reset, loading }),
    [settings, status, update, reset, loading],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsValue {
  const v = useContext(SettingsContext)
  if (!v) throw new Error('useSettings used outside SettingsProvider')
  return v
}

/**
 * The part of the settings the engine cares about.
 *
 * Only these four fields reach the engine. Everything else -- sound, ghost, colour
 * mode, locale -- is presentation, and letting it near `Config` would put display
 * concerns inside the thing that has to stay deterministic.
 */
export function settingsToConfig(s: Settings): Partial<Config> {
  return {
    das: s.das,
    arr: s.arr,
    gravityScale: s.difficulty === 'custom' ? 1 : DIFFICULTY_SCALE[s.difficulty],
    fixedCellsPerSecond: s.difficulty === 'custom' ? s.customCellsPerSecond : null,
  }
}
