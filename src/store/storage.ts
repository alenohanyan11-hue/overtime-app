import { DEFAULT_SETTINGS, type DayEntry, type WorkSettings } from '../calc/types'

export type Lang = 'ru' | 'en' | 'hy'

export interface AppState {
  version: 1
  language: Lang
  settingsHistory: WorkSettings[]
  entries: Record<string, DayEntry>
}

export const STORAGE_KEY = 'overtime-app-v1'

export function defaultState(): AppState {
  return { version: 1, language: 'ru', settingsHistory: [{ ...DEFAULT_SETTINGS }], entries: {} }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isTime = (v: unknown) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

function isSettings(v: unknown): v is WorkSettings {
  if (!isObject(v)) return false
  return (
    isDate(v.effectiveFrom) &&
    (v.rateType === 'monthly' || v.rateType === 'hourly') &&
    typeof v.rateAmount === 'number' &&
    Number.isFinite(v.rateAmount) &&
    v.rateAmount >= 0 &&
    typeof v.monthlyDivisor === 'number' &&
    Number.isFinite(v.monthlyDivisor) &&
    v.monthlyDivisor > 0 &&
    (v.payPeriod === 'monthly' || v.payPeriod === 'semimonthly') &&
    ['workStart', 'workEnd', 'lunchStart', 'lunchEnd'].every((k) => isTime(v[k])) &&
    Number.isInteger(v.dayOff) &&
    (v.dayOff as number) >= 0 &&
    (v.dayOff as number) <= 6
  )
}

function isEntry(v: unknown): v is DayEntry {
  return (
    isObject(v) &&
    isDate(v.date) &&
    (v.status === 'worked' || v.status === 'absent' || v.status === 'paidOff') &&
    (v.start === undefined || isTime(v.start)) &&
    (v.end === undefined || isTime(v.end)) &&
    (v.note === undefined || typeof v.note === 'string')
  )
}

function parseState(json: string): AppState {
  const data: unknown = JSON.parse(json)
  if (
    !isObject(data) ||
    data.version !== 1 ||
    !(data.language === 'ru' || data.language === 'en' || data.language === 'hy') ||
    !Array.isArray(data.settingsHistory) ||
    data.settingsHistory.length === 0 ||
    !data.settingsHistory.every(isSettings) ||
    !isObject(data.entries) ||
    !Object.entries(data.entries).every(([key, e]) => isEntry(e) && e.date === key)
  ) {
    throw new Error('invalidBackup')
  }
  return data as unknown as AppState
}

export function loadState(storage: Storage = localStorage): AppState {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return defaultState()
  try {
    return parseState(raw)
  } catch {
    // Keep the unreadable data aside so the next save can't destroy it for good.
    storage.setItem(`${STORAGE_KEY}-damaged-${Date.now()}`, raw)
    return defaultState()
  }
}

export function saveState(state: AppState, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportData(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function importData(json: string): AppState {
  try {
    return parseState(json)
  } catch {
    throw new Error('invalidBackup')
  }
}

export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function upsertSettings(state: AppState, s: WorkSettings): AppState {
  const rest = state.settingsHistory.filter((x) => x.effectiveFrom !== s.effectiveFrom)
  return { ...state, settingsHistory: [...rest, s] }
}
