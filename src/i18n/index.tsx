import { createContext, useContext, useMemo, type ReactNode } from 'react'
import en from './en.json'
import vi from './vi.json'

/**
 * A deliberately thin i18n layer (ADR-0006): two flat JSON files, one context and a
 * `t()` that interpolates `{name}` placeholders. No plural rules, no loader, no
 * namespaces -- this product has a few dozen strings and most Tetris terminology
 * (T-Spin, DAS, PPS) is not translated in either locale.
 *
 * The language switch itself is a later feature (FR-28); here the locale is detected
 * once from the browser and stays put.
 */

export type Locale = 'en' | 'vi'

export const LOCALES: readonly Locale[] = ['en', 'vi']

/** `en` is the reference: it defines the key set both files must share. */
export type MessageKey = keyof typeof en

const TABLES: Record<Locale, Record<string, string>> = { en, vi }

export type Translate = (key: MessageKey, params?: Readonly<Record<string, string | number>>) => string

function interpolate(template: string, params?: Readonly<Record<string, string | number>>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name]
    return value === undefined ? whole : String(value)
  })
}

export function makeTranslate(locale: Locale): Translate {
  const table = TABLES[locale]
  const fallback = TABLES.en
  return (key, params) => interpolate(table[key] ?? fallback[key] ?? key, params)
}

/** Picks a locale from the browser, defaulting to English for anything else. */
export function detectLocale(
  languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language],
): Locale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0]
    if (base === 'vi') return 'vi'
    if (base === 'en') return 'en'
  }
  return 'en'
}

interface I18nValue {
  locale: Locale
  t: Translate
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => ({ locale, t: makeTranslate(locale) }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n used outside I18nProvider')
  return value
}
