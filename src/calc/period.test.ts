import { describe, expect, it } from 'vitest'
import { periodFor, periodSummary, shiftPeriod } from './period'
import { DEFAULT_SETTINGS, type DayEntry, type WorkSettings } from './types'

const h: WorkSettings[] = [{ ...DEFAULT_SETTINGS, rateAmount: 300000 }]

const example: Record<string, DayEntry> = {
  '2026-11-02': { date: '2026-11-02', status: 'worked', start: '09:00', end: '20:00' },
  '2026-11-03': { date: '2026-11-03', status: 'worked', start: '09:00', end: '17:00' },
  '2026-11-04': { date: '2026-11-04', status: 'worked', start: '09:00', end: '22:00' },
  '2026-11-05': { date: '2026-11-05', status: 'worked', start: '09:00', end: '17:00' },
}

describe('periodFor', () => {
  it('splits the month at the 15th', () => {
    expect(periodFor('2026-11-10', 'semimonthly')).toEqual({ start: '2026-11-01', end: '2026-11-15' })
    expect(periodFor('2026-11-20', 'semimonthly')).toEqual({ start: '2026-11-16', end: '2026-11-30' })
  })

  it('ends the second half on the last day of a leap February', () => {
    expect(periodFor('2028-02-20', 'semimonthly')).toEqual({ start: '2028-02-16', end: '2028-02-29' })
  })

  it('monthly period is the calendar month', () => {
    expect(periodFor('2026-11-20', 'monthly')).toEqual({ start: '2026-11-01', end: '2026-11-30' })
  })
})

describe('shiftPeriod', () => {
  it('goes back across a month boundary', () => {
    expect(shiftPeriod({ start: '2026-11-01', end: '2026-11-15' }, 'semimonthly', -1)).toEqual({ start: '2026-10-16', end: '2026-10-31' })
  })

  it('goes forward across a year boundary', () => {
    expect(shiftPeriod({ start: '2026-12-01', end: '2026-12-31' }, 'monthly', 1)).toEqual({ start: '2027-01-01', end: '2027-01-31' })
  })
})

describe('periodSummary', () => {
  it('1–15 Nov 2026 has 12 working days worth 138 462', () => {
    const r = periodSummary({ start: '2026-11-01', end: '2026-11-15' }, {}, h)
    expect(r.workingDays).toBe(12)
    expect(Math.round(r.baseAmount)).toBe(138462)
  })

  it('16–30 Nov 2026 has 13 working days worth 150 000', () => {
    const r = periodSummary({ start: '2026-11-16', end: '2026-11-30' }, {}, h)
    expect(r.workingDays).toBe(13)
    expect(Math.round(r.baseAmount)).toBe(150000)
  })

  it('whole November pays 288 462', () => {
    const r = periodSummary({ start: '2026-11-01', end: '2026-11-30' }, {}, h)
    expect(r.workingDays).toBe(25)
    expect(Math.round(r.total)).toBe(288462)
  })

  it('adds overtime and subtracts shortfall at the hourly rate', () => {
    const r = periodSummary({ start: '2026-11-01', end: '2026-11-15' }, example, h)
    expect(r.overtimeMinutes).toBe(360)
    expect(r.shortfallMinutes).toBe(120)
    expect(r.netMinutes).toBe(240)
    expect(Math.round(r.deviationAmount)).toBe(5769)
    expect(Math.round(r.total)).toBe(144231)
    expect(r.days).toHaveLength(15)
  })

  it('hourly rate pays (norm hours + deviation) × rate', () => {
    const hourly: WorkSettings[] = [{ ...DEFAULT_SETTINGS, rateType: 'hourly', rateAmount: 1500 }]
    expect(Math.round(periodSummary({ start: '2026-11-01', end: '2026-11-15' }, example, hourly).total)).toBe(150000)
  })

  it('a rate change applies only from its effective date', () => {
    const changed = [h[0], { ...h[0], effectiveFrom: '2026-11-16', rateAmount: 360000 }]
    expect(Math.round(periodSummary({ start: '2026-11-16', end: '2026-11-30' }, {}, changed).baseAmount)).toBe(180000)
    expect(Math.round(periodSummary({ start: '2026-11-01', end: '2026-11-15' }, {}, changed).baseAmount)).toBe(138462)
  })
})
