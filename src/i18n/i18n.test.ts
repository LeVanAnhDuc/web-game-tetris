import { describe, expect, it } from 'vitest'
import en from './en.json'
import vi from './vi.json'
import { LOCALES, detectLocale, makeTranslate } from './index'

describe('locale files (NFR-I18N-04)', () => {
  it('share exactly the same set of keys', () => {
    const a = Object.keys(en).sort()
    const b = Object.keys(vi).sort()
    // Reported as a diff rather than a bare inequality, so a failure names the key.
    expect(b.filter((k) => !a.includes(k)), 'keys only in vi').toEqual([])
    expect(a.filter((k) => !b.includes(k)), 'keys only in en').toEqual([])
    expect(a).toEqual(b)
  })

  it('has no empty string in either locale', () => {
    for (const [locale, table] of Object.entries({ en, vi })) {
      for (const [key, value] of Object.entries(table)) {
        expect(value.length, `${locale}.${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the same placeholders in both locales', () => {
    const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort()
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(vi[key]), key).toEqual(placeholders(en[key]))
    }
  })
})

describe('translate', () => {
  it('returns the string for the active locale', () => {
    expect(makeTranslate('en')('hud.score')).toBe('Score')
    expect(makeTranslate('vi')('hud.score')).toBe('Điểm')
  })

  it('interpolates named placeholders', () => {
    const t = makeTranslate('en')
    expect(t('board.label', { cols: 10, rows: 20 })).toBe('Playfield, 10 columns by 20 rows')
  })

  it('leaves an unknown placeholder alone rather than printing undefined', () => {
    const t = makeTranslate('en')
    expect(t('board.label', { cols: 10 })).toContain('{rows}')
  })

  it('falls back to the key itself instead of throwing', () => {
    const t = makeTranslate('en')
    expect(t('nope.not.a.key' as never)).toBe('nope.not.a.key')
  })
})

describe('detectLocale', () => {
  it('picks Vietnamese for any vi tag', () => {
    expect(detectLocale(['vi'])).toBe('vi')
    expect(detectLocale(['vi-VN'])).toBe('vi')
    expect(detectLocale(['VI-vn'])).toBe('vi')
  })

  it('picks English for en tags and for anything unsupported', () => {
    expect(detectLocale(['en-GB'])).toBe('en')
    expect(detectLocale(['ja', 'fr'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })

  it('honours the order the browser gave', () => {
    expect(detectLocale(['fr', 'vi', 'en'])).toBe('vi')
    expect(detectLocale(['fr', 'en', 'vi'])).toBe('en')
  })

  it('only ever returns a supported locale', () => {
    expect(LOCALES).toContain(detectLocale(['zz']))
  })
})
