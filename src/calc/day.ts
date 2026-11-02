import { overlapMinutes, toMinutes } from './time'
import type { DayEntry, WorkSettings } from './types'

export function parseISODate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function normMinutes(s: WorkSettings): number {
  return workedMinutes(s.workStart, s.workEnd, s)
}

export function hourlyRate(s: WorkSettings): number {
  return s.rateType === 'monthly' ? s.rateAmount / s.monthlyDivisor : s.rateAmount
}

export function isWorkingDay(date: string, s: WorkSettings): boolean {
  return parseISODate(date).getDay() !== s.dayOff
}

export function workedMinutes(start: string, end: string, s: WorkSettings): number {
  const a = toMinutes(start)
  const b = toMinutes(end)
  if (b <= a) return 0
  return b - a - overlapMinutes(a, b, toMinutes(s.lunchStart), toMinutes(s.lunchEnd))
}

export function dayDeviationMinutes(date: string, entry: DayEntry | undefined, s: WorkSettings): number {
  const norm = isWorkingDay(date, s) ? normMinutes(s) : 0
  if (!entry || entry.status === 'paidOff') return 0
  if (entry.status === 'absent') return norm === 0 ? 0 : -norm
  return workedMinutes(entry.start ?? s.workStart, entry.end ?? s.workEnd, s) - norm
}

export function validateEntry(e: DayEntry): 'endBeforeStart' | null {
  if (e.status !== 'worked' || !e.start || !e.end) return null
  return toMinutes(e.end) <= toMinutes(e.start) ? 'endBeforeStart' : null
}

export function settingsAt(history: WorkSettings[], date: string): WorkSettings {
  const sorted = [...history].sort((x, y) => x.effectiveFrom.localeCompare(y.effectiveFrom))
  let current = sorted[0]
  for (const s of sorted) if (s.effectiveFrom <= date) current = s
  return current
}
