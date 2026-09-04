import { useEffect, useRef, useState } from 'react'
import type { Action } from '../engine'
import { useI18n, type MessageKey } from '../i18n'
import { useSettings } from '../settings'
import {
  BINDABLE_ACTIONS,
  MAX_CELLS_PER_SECOND,
  MIN_CELLS_PER_SECOND,
  type Difficulty,
} from '../settings/types'
import { Icon } from './Icon'

/**
 * The settings screen (US-02, FR-23 -- FR-30).
 *
 * A dialog over the game rather than a route: there is no router, and the player is
 * always coming back to the same board.
 */

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'custom']

/** Prettier than `event.code` without losing which physical key it is. */
function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Arrow')) return code.slice(5)
  if (code === 'Space') return 'Space'
  if (code.startsWith('Shift')) return `Shift ${code.endsWith('Right') ? 'R' : 'L'}`
  return code
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="setrow">
      <div className="setrow__text">
        <span className="setrow__label">{label}</span>
        {hint ? <span className="setrow__hint">{hint}</span> : null}
      </div>
      <div className="setrow__control">{children}</div>
    </div>
  )
}

function Bindings() {
  const { t } = useI18n()
  const { settings, update } = useSettings()
  const [capturing, setCapturing] = useState<Action | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Escape') {
        setCapturing(null)
        return
      }
      // Tab is how a keyboard user leaves this screen; binding it would lock them
      // inside it (NFR-A11Y-02).
      if (e.code === 'Tab') return

      const taken = settings.bindings[e.code]
      if (taken && taken !== capturing) {
        // Say so instead of silently stealing the key from the other action.
        setConflict(`${keyLabel(e.code)} → ${t(`action.${taken}` as MessageKey)}`)
        return
      }
      const next: Record<string, Action> = {}
      for (const [code, action] of Object.entries(settings.bindings)) {
        // Drop this action's previous keys, then give it the new one.
        if (action !== capturing) next[code] = action
      }
      next[e.code] = capturing
      update({ bindings: next })
      setCapturing(null)
      setConflict(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [capturing, settings.bindings, update, t])

  return (
    <div className="bindlist">
      {BINDABLE_ACTIONS.map((action) => {
        const codes = Object.entries(settings.bindings)
          .filter(([, a]) => a === action)
          .map(([code]) => code)
        return (
          <div className="bindrow" key={action}>
            <span className="setrow__label">{t(`action.${action}` as MessageKey)}</span>
            <button
              type="button"
              className="keycap"
              aria-label={t('settings.rebind', { action: t(`action.${action}` as MessageKey) })}
              data-capturing={capturing === action}
              onClick={() => {
                setConflict(null)
                setCapturing(action)
              }}
            >
              {capturing === action ? t('settings.pressKey') : codes.map(keyLabel).join(' / ') || '—'}
            </button>
          </div>
        )
      })}
      {conflict ? (
        <p className="setrow__hint" role="status">
          {t('settings.alreadyBound', { binding: conflict })}
        </p>
      ) : null}
    </div>
  )
}

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const { settings, update, reset, status } = useSettings()
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('action.settings')}>
      <div className="modal modal--wide">
        <div className="modal__head">
          <h2 className="modal__title">{t('action.settings')}</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label={t('settings.close')} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {status === 'unavailable' ? (
          <p className="modal__body" role="status">
            {t('settings.storageUnavailable')}
          </p>
        ) : null}
        {status === 'recovered' ? (
          <p className="modal__body" role="status">
            {t('settings.storageRecovered')}
          </p>
        ) : null}

        <div className="modal__scroll">
          <section className="setgroup">
            <h3 className="label">{t('settings.difficulty')}</h3>
            <Row label={t('settings.difficulty')} hint={t('settings.difficultyHint')}>
              <div className="segmented">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="segmented__btn"
                    aria-pressed={settings.difficulty === d}
                    onClick={() => update({ difficulty: d })}
                  >
                    {t(`settings.difficulty.${d}` as MessageKey)}
                  </button>
                ))}
              </div>
            </Row>
            {settings.difficulty === 'custom' ? (
              <Row
                label={t('settings.fallSpeed')}
                hint={t('settings.fallSpeedHint', { n: settings.customCellsPerSecond.toFixed(2) })}
              >
                <input
                  className="slider"
                  type="range"
                  min={MIN_CELLS_PER_SECOND}
                  max={MAX_CELLS_PER_SECOND}
                  step={0.25}
                  value={settings.customCellsPerSecond}
                  aria-label={t('settings.fallSpeed')}
                  onChange={(e) => update({ customCellsPerSecond: Number(e.target.value) })}
                />
              </Row>
            ) : null}
          </section>

          <section className="setgroup">
            <h3 className="label">{t('settings.handling')}</h3>
            <Row label="DAS" hint={t('settings.dasHint', { n: settings.das })}>
              <input
                className="slider"
                type="range"
                min={0}
                max={20}
                step={1}
                value={settings.das}
                aria-label="DAS"
                onChange={(e) => update({ das: Number(e.target.value) })}
              />
            </Row>
            <Row label="ARR" hint={t('settings.arrHint', { n: settings.arr })}>
              <input
                className="slider"
                type="range"
                min={0}
                max={10}
                step={1}
                value={settings.arr}
                aria-label="ARR"
                onChange={(e) => update({ arr: Number(e.target.value) })}
              />
            </Row>
          </section>

          <section className="setgroup">
            <h3 className="label">{t('settings.controls')}</h3>
            <Bindings />
          </section>

          <section className="setgroup">
            <h3 className="label">{t('settings.display')}</h3>
            <Row label={t('settings.ghost')}>
              <Toggle on={settings.ghost} onChange={(v) => update({ ghost: v })} label={t('settings.ghost')} />
            </Row>
            <Row label={t('settings.colorBlind')} hint={t('settings.colorBlindHint')}>
              <Toggle
                on={settings.colorBlindMode}
                onChange={(v) => update({ colorBlindMode: v })}
                label={t('settings.colorBlind')}
              />
            </Row>
            <Row label={t('settings.smoothHorizontal')} hint={t('settings.smoothHorizontalHint')}>
              <Toggle
                on={settings.smoothHorizontal}
                onChange={(v) => update({ smoothHorizontal: v })}
                label={t('settings.smoothHorizontal')}
              />
            </Row>
          </section>

          <section className="setgroup">
            <h3 className="label">{t('settings.sound')}</h3>
            <Row label={t('settings.sound')}>
              <Toggle on={settings.sound} onChange={(v) => update({ sound: v })} label={t('settings.sound')} />
            </Row>
            <Row label={t('settings.volume')} hint={`${Math.round(settings.volume * 100)}%`}>
              <input
                className="slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                disabled={!settings.sound}
                aria-label={t('settings.volume')}
                onChange={(e) => update({ volume: Number(e.target.value) })}
              />
            </Row>
          </section>

          <section className="setgroup">
            <h3 className="label">{t('action.language')}</h3>
            <Row label={t('action.language')}>
              <div className="segmented">
                {(['en', 'vi'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className="segmented__btn"
                    aria-pressed={settings.locale === l}
                    onClick={() => update({ locale: l })}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </Row>
          </section>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            {t('settings.done')}
          </button>
          <button type="button" className="btn btn--danger" onClick={reset}>
            {t('settings.reset')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className="toggle"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <span className="toggle__knob" />
    </button>
  )
}
