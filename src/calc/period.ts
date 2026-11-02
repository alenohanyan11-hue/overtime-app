import { dayDeviationMinutes, hourlyRate, isWorkingDay, normMinutes, parseISODate, settingsAt } from './day'
import type { DayEntry, PayPeriod, WorkSettings } from './types'

export interface Period {
  start: string
  end: string
}

export interface DayLine {
  date: string
  entry?: DayEntry
  deviationMinutes: number
  working: boolean
}

export interface PeriodSummary {
  workingDays: number
  baseAmount: number
  overtimeMinutes: number
  shortfallMinutes: number
  netMinutes: number
  deviationAmount: number
  total: number
  days: DayLine[]
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

export function periodFor(date: string, p: PayPeriod): Period {
  const [y, m, d] = date.split('-').map(Number)
  const last = lastDayOfMonth(y, m)
  if (p === 'monthly') return { start: iso(y, m, 1), end: iso(y, m, last) }
  return d <= 15 ? { start: iso(y, m, 1), end: iso(y, m, 15) } : { start: iso(y, m, 16), end: iso(y, m, last) }
}

function addDays(date: string, delta: number): string {
  const d = parseISODate(date)
  d.setDate(d.getDate() + delta)
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export function shiftPeriod(period: Period, history: WorkSettings[], delta: number): Period {
  let current = period
  for (let i = 0; i < Math.abs(delta); i++) {
    const target = delta > 0 ? addDays(current.end, 1) : addDays(current.start, -1)
    // The payout type can change over time: shape the period by the settings in force on the day it covers.
    current = periodFor(target, settingsAt(history, target).payPeriod)
  }
  return current
}

export function periodSummary(period: Period, entries: Record<string, DayEntry>, history: WorkSettings[]): PeriodSummary {
  const summary: PeriodSummary = {
    workingDays: 0,
    baseAmount: 0,
    overtimeMinutes: 0,
    shortfallMinutes: 0,
    netMinutes: 0,
    deviationAmount: 0,
    total: 0,
    days: [],
  }
  for (let date = period.start; date <= period.end; date = addDays(date, 1)) {
    const s = settingsAt(history, date)
    const rate = hourlyRate(s)
    const working = isWorkingDay(date, s)
    const entry = entries[date]
    const deviation = dayDeviationMinutes(date, entry, s)
    if (working) {
      summary.workingDays++
      summary.baseAmount += (normMinutes(s) / 60) * rate
    }
    if (deviation > 0) summary.overtimeMinutes += deviation
    else summary.shortfallMinutes -= deviation
    summary.netMinutes += deviation
    summary.deviationAmount += (deviation / 60) * rate
    summary.days.push({ date, entry, deviationMinutes: deviation, working })
  }
  summary.total = summary.baseAmount + summary.deviationAmount
  return summary
}
