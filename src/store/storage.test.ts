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

describe('backup', () => {
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
