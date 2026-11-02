import { parseISODate } from '../calc/day'
import type { Lang } from '../store/storage'
import { en } from './en'
import { hy } from './hy'
import { ru, type DictKey } from './ru'

const dictionaries: Record<Lang, Record<DictKey, string>> = { ru, en, hy }

export function t(lang: Lang, key: DictKey): string {
  return dictionaries[lang][key]
}

const MINUS = '−'

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatAmount(n: number): string {
  const rounded = Math.round(n)
  const sign = rounded < 0 ? MINUS : ''
  return `${sign}${groupThousands(Math.abs(rounded))} ֏`
}

export function formatHours(minutes: number, lang: Lang): string {
  if (minutes === 0) return `0 ${t(lang, 'hourUnit')}`
  const sign = minutes > 0 ? '+' : MINUS
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} ${t(lang, 'hourUnit')}`)
  if (m > 0) parts.push(`${m} ${t(lang, 'minuteUnit')}`)
  return sign + parts.join(' ')
}

export function weekdayName(lang: Lang, date: string): string {
  return t(lang, `w${parseISODate(date).getDay()}` as DictKey)
}

export function dayMonth(lang: Lang, date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${d} ${t(lang, `m${m}` as DictKey)}`
}

export function periodTitle(lang: Lang, start: string, end: string): string {
  const [y, m, d1] = start.split('-').map(Number)
  const d2 = Number(end.split('-')[2])
  return `${d1}–${d2} ${t(lang, `m${m}` as DictKey)} ${y}`
}

export type { DictKey }
