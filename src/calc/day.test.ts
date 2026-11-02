import { describe, expect, it } from 'vitest'
import {
  dayDeviationMinutes,
  hourlyRate,
  isWorkingDay,
  normMinutes,
  settingsAt,
  validateEntry,
  workedMinutes,
} from './day'
import { DEFAULT_SETTINGS, type WorkSettings } from './types'

const s: WorkSettings = { ...DEFAULT_SETTINGS, rateAmount: 300000 }

describe('day norm and rate', () => {
  it('norm is work time minus lunch', () => {
    expect(normMinutes(s)).toBe(480)
  })

  it('monthly rate is divided by 208', () => {
    expect(hourlyRate(s)).toBeCloseTo(1442.3077, 3)
  })

  it('hourly rate is used as is', () => {
    expect(hourlyRate({ ...s, rateType: 'hourly', rateAmount: 1500 })).toBe(1500)
  })

  it('Sunday is the day off by default', () => {
    expect(isWorkingDay('2026-11-01', s)).toBe(false)
    expect(isWorkingDay('2026-11-02', s)).toBe(true)
  })
})

describe('worked minutes', () => {
  it('subtracts the full lunch hour', () => {
    expect(workedMinutes('09:00', '20:00', s)).toBe(600)
  })

  it('subtracts only the part of lunch that was inside the shift', () => {
    expect(workedMinutes('09:00', '13:30', s)).toBe(240)
  })
})

describe('day deviation', () => {
  it('staying until 20:00 is +2 h', () => {
    expect(dayDeviationMinutes('2026-11-02', { date: '2026-11-02', status: 'worked', start: '09:00', end: '20:00' }, s)).toBe(120)
  })

  it('leaving at 17:00 is -1 h', () => {
    expect(dayDeviationMinutes('2026-11-03', { date: '2026-11-03', status: 'worked', start: '09:00', end: '17:00' }, s)).toBe(-60)
  })

  it('absent on a working day loses the whole norm', () => {
    expect(dayDeviationMinutes('2026-11-03', { date: '2026-11-03', status: 'absent' }, s)).toBe(-480)
  })

  it('paid day off counts as a normal day', () => {
    expect(dayDeviationMinutes('2026-11-03', { date: '2026-11-03', status: 'paidOff' }, s)).toBe(0)
  })

  it('a working day with no entry counts as a normal day', () => {
    expect(dayDeviationMinutes('2026-11-03', undefined, s)).toBe(0)
  })

  it('all hours worked on the day off are overtime', () => {
    expect(dayDeviationMinutes('2026-11-08', { date: '2026-11-08', status: 'worked', start: '10:00', end: '12:00' }, s)).toBe(120)
  })

  it('absent on the day off loses nothing', () => {
    expect(dayDeviationMinutes('2026-11-08', { date: '2026-11-08', status: 'absent' }, s)).toBe(0)
  })
})

describe('validateEntry', () => {
  it('rejects leaving before or at arrival', () => {
    expect(validateEntry({ date: '2026-11-02', status: 'worked', start: '18:00', end: '09:00' })).toBe('endBeforeStart')
    expect(validateEntry({ date: '2026-11-02', status: 'worked', start: '09:00', end: '09:00' })).toBe('endBeforeStart')
  })

  it('accepts a normal day and non-worked statuses', () => {
    expect(validateEntry({ date: '2026-11-02', status: 'worked', start: '09:00', end: '18:00' })).toBeNull()
    expect(validateEntry({ date: '2026-11-02', status: 'absent' })).toBeNull()
  })
})

describe('settingsAt', () => {
  const a = { ...s, effectiveFrom: '2026-11-01' }
  const b = { ...s, effectiveFrom: '2026-11-16', rateAmount: 360000 }

  it('picks the settings in force on the date', () => {
    expect(settingsAt([a, b], '2026-11-15')).toBe(a)
    expect(settingsAt([b, a], '2026-11-16')).toBe(b)
  })

  it('uses the earliest settings for dates before the first record', () => {
    expect(settingsAt([a, b], '2026-10-01')).toBe(a)
  })
})
