import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../calc/types'
import {
  STORAGE_KEY,
  defaultState,
  exportData,
  importData,
  loadState,
  localISODate,
  saveState,
  upsertSettings,
  type AppState,
} from './storage'

const st: AppState = {
  ...defaultState(),
  entries: { '2026-11-02': { date: '2026-11-02', status: 'worked', start: '09:00', end: '20:00' } },
}

beforeEach(() => localStorage.clear())

describe('load and save', () => {
  it('round-trips the state through localStorage', () => {
    saveState(st, localStorage)
    expect(loadState(localStorage)).toEqual(st)
  })

  it('falls back to defaults when stored data is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{oops')
    expect(loadState(localStorage)).toEqual(defaultState())
  })

  it('starts with Russian and default settings', () => {
    expect(defaultState()).toEqual({ version: 1, language: 'ru', settingsHistory: [DEFAULT_SETTINGS], entries: {} })
  })
})

describe('damaged stored data', () => {
  it('keeps a copy of data it could not read instead of losing it', () => {
    localStorage.setItem(STORAGE_KEY, '{oops')
    loadState(localStorage)
    const kept = Object.keys(localStorage).filter((k) => k.startsWith(`${STORAGE_KEY}-damaged-`))
    expect(kept).toHaveLength(1)
    expect(localStorage.getItem(kept[0])).toBe('{oops')
  })
})

describe('backup', () => {
  const good = JSON.parse(exportData(st))

  it.each([
    ['a time that is a number', { ...good, entries: { '2026-11-02': { date: '2026-11-02', status: 'worked', start: 900, end: '18:00' } } }],
    ['a time that is not HH:MM', { ...good, entries: { '2026-11-02': { date: '2026-11-02', status: 'worked', start: 'abc', end: '18:00' } } }],
    ['an entry stored under another date', { ...good, entries: { '2026-11-03': { date: '2026-11-02', status: 'absent' } } }],
    ['a comment that is not text', { ...good, entries: { '2026-11-02': { date: '2026-11-02', status: 'absent', note: 5 } } }],
    ['a day off outside 0–6', { ...good, settingsHistory: [{ ...DEFAULT_SETTINGS, dayOff: 9 }] }],
    ['a negative rate', { ...good, settingsHistory: [{ ...DEFAULT_SETTINGS, rateAmount: -5 }] }],
    ['a bad schedule time', { ...good, settingsHistory: [{ ...DEFAULT_SETTINGS, workStart: '9' }] }],
  ])('rejects %s', (_name, data) => {
    expect(() => importData(JSON.stringify(data))).toThrow('invalidBackup')
  })

  it('imports what it exported', () => {
    expect(importData(exportData(st))).toEqual(st)
  })

  it('rejects files that are not a backup', () => {
    expect(() => importData('not json')).toThrow('invalidBackup')
    expect(() => importData('{"foo":1}')).toThrow('invalidBackup')
    expect(() => importData('{"version":1,"language":"ru","settingsHistory":[],"entries":{}}')).toThrow('invalidBackup')
  })
})

describe('localISODate', () => {
  it('uses the local calendar date late in the evening', () => {
    expect(localISODate(new Date(2026, 10, 2, 23, 50))).toBe('2026-11-02')
  })
})

describe('upsertSettings', () => {
  it('appends a new effective date and replaces a same-date record', () => {
    const up = upsertSettings(defaultState(), { ...DEFAULT_SETTINGS, effectiveFrom: '2026-11-16', rateAmount: 360000 })
    expect(up.settingsHistory).toHaveLength(2)
    const again = upsertSettings(up, { ...DEFAULT_SETTINGS, effectiveFrom: '2026-11-16', rateAmount: 1 })
    expect(again.settingsHistory).toHaveLength(2)
    expect(again.settingsHistory.find((s) => s.effectiveFrom === '2026-11-16')?.rateAmount).toBe(1)
  })
})
