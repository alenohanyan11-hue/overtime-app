# Overtime App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable phone web app (PWA) where the user logs arrival/departure each day and sees overtime hours and the pay due for the current pay period, in Armenian dram.

**Architecture:** Pure calculation core in `src/calc/` (no React, fully unit-tested), a small persistence layer over `localStorage` in `src/store/`, a dictionary-based i18n in `src/i18n/`, and three React screens in `src/ui/`. All amounts are computed unrounded and rounded only when formatted.

**Tech Stack:** Vite + React 18 + TypeScript, Vitest + @testing-library/react (jsdom), vite-plugin-pwa.

**Spec:** `docs/superpowers/specs/2026-11-02-overtime-app-design.md`

## Global Constraints

- Project root: `C:\Project\OvertimeApp`. Node is at `C:\Program Files\nodejs` — in Git Bash prepend `export PATH="/c/Program Files/nodejs:$PATH"`.
- Currency: Armenian dram, symbol `֏`, whole drams, thousands separated by a space: `144 231 ֏`.
- Languages: Russian (`ru`, default), English (`en`), Armenian (`hy`). Every user-visible string goes through `t()`.
- Default schedule: 09:00–18:00, lunch 13:00–14:00 unpaid, day off Sunday (`dayOff: 0`), 6 working days a week.
- Monthly rate → hourly = amount ÷ `monthlyDivisor`, default `208`.
- Overtime and shortfall are both paid at the plain hourly rate; no multipliers.
- Pay periods: `monthly` = calendar month; `semimonthly` = 1–15 and 16–last day.
- Base pay for a period = (working days in period × day norm) × hourly rate, for both rate types and both period types.
- Day statuses: `worked` (times entered), `absent` ("Не работал": day pays 0 → deviation = −norm), `paidOff` ("Оплачиваемый выходной": deviation 0). A working day with no entry counts as a normal day (deviation 0).
- A worked day off (Sunday by default): all worked minutes are overtime.
- Time pickers: dropdowns, 15-minute step, 00:00–23:45. Defaults 09:00 / 18:00.
- Data lives only on the device; no accounts, no server.
- Settings are effective-dated: each day is computed with the settings in force on that date.

## Review Focus

1. Departure earlier than or equal to arrival (wrong pick in the dropdown) — the entry must be rejected with a visible error, never stored as negative hours. Test in Task 2 (`validateEntry`).
2. Late-night use near midnight in Yerevan (UTC+4): "today" must be the local date, not the UTC date from `toISOString()`. Test in Task 4 (`localISODate`).
3. February and month ends: the 16–last period must end on 28/29/30/31 correctly, including leap 2028-02-29. Test in Task 3 (`periodFor`).
4. Importing a broken or foreign backup file must fail with an error and leave current data untouched. Test in Task 4 (`importData`).
5. A day earlier than the first settings record (user logs past days after installing) must use the earliest settings, not crash. Test in Task 2 (`settingsAt`).

---

### Task 1: Project scaffold and time helpers

**Files:**
- Create: Vite React-TS project in `C:\Project\OvertimeApp` (keep existing `docs/`), `.gitignore` (add `node_modules`, `dist`)
- Create: `src/calc/time.ts`
- Test: `src/calc/time.test.ts`

**Interfaces:**
- Produces: `toMinutes(hhmm: string): number`, `fromMinutes(min: number): string`, `timeOptions(): string[]` (96 values `"00:00"`…`"23:45"`), `overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number`

- [ ] **Step 1:** `git init` in `C:\Project\OvertimeApp`; scaffold with `npm create vite@latest . -- --template react-ts` (answer to keep existing files), `npm i`, `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom`. Add `"test": "vitest run"` to `package.json`, `test: { environment: 'jsdom' }` in `vite.config.ts`. Remove the Vite demo content from `App.tsx`.
- [ ] **Step 2: Write failing tests**

```ts
expect(toMinutes('09:00')).toBe(540)
expect(toMinutes('20:15')).toBe(1215)
expect(fromMinutes(810)).toBe('13:30')
expect(timeOptions()).toHaveLength(96)
expect(timeOptions()[0]).toBe('00:00'); expect(timeOptions()[95]).toBe('23:45')
expect(overlapMinutes(540, 810, 780, 840)).toBe(30)   // 09:00–13:30 vs lunch
expect(overlapMinutes(540, 720, 780, 840)).toBe(0)
```

- [ ] **Step 3:** Run `npm test` → FAIL (module missing).
- [ ] **Step 4:** Implement `src/calc/time.ts`.
- [ ] **Step 5:** Run `npm test` → PASS.
- [ ] **Step 6:** Commit `feat: scaffold app and time helpers`.

### Task 2: Settings and per-day calculation

**Files:**
- Create: `src/calc/types.ts`, `src/calc/day.ts`
- Test: `src/calc/day.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces (in `types.ts`):

```ts
export type RateType = 'monthly' | 'hourly'
export type PayPeriod = 'monthly' | 'semimonthly'
export type DayStatus = 'worked' | 'absent' | 'paidOff'
export interface DayEntry { date: string; status: DayStatus; start?: string; end?: string } // date 'YYYY-MM-DD'
export interface WorkSettings {
  effectiveFrom: string; rateType: RateType; rateAmount: number; monthlyDivisor: number
  payPeriod: PayPeriod; workStart: string; workEnd: string; lunchStart: string; lunchEnd: string
  dayOff: number // 0 = Sunday … 6 = Saturday
}
export const DEFAULT_SETTINGS: WorkSettings // effectiveFrom '2000-01-01', monthly, 0, 208, 'monthly', 09:00,18:00,13:00,14:00, 0
```

- Produces (in `day.ts`): `normMinutes(s: WorkSettings): number`, `hourlyRate(s: WorkSettings): number`, `isWorkingDay(date: string, s: WorkSettings): boolean`, `workedMinutes(start: string, end: string, s: WorkSettings): number`, `dayDeviationMinutes(date: string, entry: DayEntry | undefined, s: WorkSettings): number`, `validateEntry(e: DayEntry): 'endBeforeStart' | null`, `settingsAt(history: WorkSettings[], date: string): WorkSettings`

- [ ] **Step 1: Write failing tests** (`s = {...DEFAULT_SETTINGS, rateAmount: 300000}`)

```ts
expect(normMinutes(s)).toBe(480)
expect(hourlyRate(s)).toBeCloseTo(1442.3077, 3)
expect(hourlyRate({ ...s, rateType: 'hourly', rateAmount: 1500 })).toBe(1500)
expect(isWorkingDay('2026-11-01', s)).toBe(false) // Sunday
expect(isWorkingDay('2026-11-02', s)).toBe(true)
expect(workedMinutes('09:00', '20:00', s)).toBe(600)
expect(workedMinutes('09:00', '13:30', s)).toBe(240) // partial lunch
expect(dayDeviationMinutes('2026-11-02', { date: '2026-11-02', status: 'worked', start: '09:00', end: '20:00' }, s)).toBe(120)
expect(dayDeviationMinutes('2026-11-03', { date: '2026-11-03', status: 'worked', start: '09:00', end: '17:00' }, s)).toBe(-60)
expect(dayDeviationMinutes('2026-11-03', { date: '2026-11-03', status: 'absent' }, s)).toBe(-480)
expect(dayDeviationMinutes('2026-11-03', { date: '2026-11-03', status: 'paidOff' }, s)).toBe(0)
expect(dayDeviationMinutes('2026-11-03', undefined, s)).toBe(0)
expect(dayDeviationMinutes('2026-11-08', { date: '2026-11-08', status: 'worked', start: '10:00', end: '12:00' }, s)).toBe(120) // Sunday worked
expect(dayDeviationMinutes('2026-11-08', { date: '2026-11-08', status: 'absent' }, s)).toBe(0)       // day off, nothing lost
expect(validateEntry({ date: '2026-11-02', status: 'worked', start: '18:00', end: '09:00' })).toBe('endBeforeStart')
expect(validateEntry({ date: '2026-11-02', status: 'worked', start: '09:00', end: '09:00' })).toBe('endBeforeStart')
const a = { ...s, effectiveFrom: '2026-11-01' }, b = { ...s, effectiveFrom: '2026-11-16', rateAmount: 360000 }
expect(settingsAt([a, b], '2026-11-15')).toBe(a)
expect(settingsAt([a, b], '2026-11-16')).toBe(b)
expect(settingsAt([a, b], '2026-10-01')).toBe(a) // before first record → earliest
```

- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement. Parse dates as local (`new Date(y, m-1, d)`), never `new Date('YYYY-MM-DD')`. `settingsAt` sorts by `effectiveFrom` and picks the last with `effectiveFrom <= date`, else the earliest.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: per-day overtime calculation`.

### Task 3: Pay periods and period summary

**Files:**
- Create: `src/calc/period.ts`
- Test: `src/calc/period.test.ts`

**Interfaces:**
- Consumes: Task 2 types and functions.
- Produces:

```ts
export interface Period { start: string; end: string }
export function periodFor(date: string, p: PayPeriod): Period
export function shiftPeriod(period: Period, p: PayPeriod, delta: number): Period // ±1 = next/previous
export interface DayLine { date: string; entry?: DayEntry; deviationMinutes: number; working: boolean }
export interface PeriodSummary {
  workingDays: number; baseAmount: number; overtimeMinutes: number; shortfallMinutes: number
  netMinutes: number; deviationAmount: number; total: number; days: DayLine[]
}
export function periodSummary(period: Period, entries: Record<string, DayEntry>, history: WorkSettings[]): PeriodSummary
```

Base and deviation amounts are summed per day using `settingsAt(history, day)`. `overtimeMinutes` = sum of positive deviations, `shortfallMinutes` = sum of |negative|. `days` lists every date in the period.

- [ ] **Step 1: Write failing tests** (`h = [{...DEFAULT_SETTINGS, rateAmount: 300000}]`)

```ts
expect(periodFor('2026-11-10', 'semimonthly')).toEqual({ start: '2026-11-01', end: '2026-11-15' })
expect(periodFor('2026-11-20', 'semimonthly')).toEqual({ start: '2026-11-16', end: '2026-11-30' })
expect(periodFor('2028-02-20', 'semimonthly')).toEqual({ start: '2028-02-16', end: '2028-02-29' })
expect(periodFor('2026-11-20', 'monthly')).toEqual({ start: '2026-11-01', end: '2026-11-30' })
expect(shiftPeriod({ start: '2026-11-01', end: '2026-11-15' }, 'semimonthly', -1)).toEqual({ start: '2026-10-16', end: '2026-10-31' })
expect(shiftPeriod({ start: '2026-12-01', end: '2026-12-31' }, 'monthly', 1)).toEqual({ start: '2027-01-01', end: '2027-01-31' })

const r1 = periodSummary({ start: '2026-11-01', end: '2026-11-15' }, {}, h)
expect(r1.workingDays).toBe(12); expect(Math.round(r1.baseAmount)).toBe(138462)
const r2 = periodSummary({ start: '2026-11-16', end: '2026-11-30' }, {}, h)
expect(r2.workingDays).toBe(13); expect(Math.round(r2.baseAmount)).toBe(150000)
const m = periodSummary({ start: '2026-11-01', end: '2026-11-30' }, {}, h)
expect(m.workingDays).toBe(25); expect(Math.round(m.total)).toBe(288462)

const e = { // spec example: +2, −1, +4, −1 → net +4 h
  '2026-11-02': { date: '2026-11-02', status: 'worked', start: '09:00', end: '20:00' },
  '2026-11-03': { date: '2026-11-03', status: 'worked', start: '09:00', end: '17:00' },
  '2026-11-04': { date: '2026-11-04', status: 'worked', start: '09:00', end: '22:00' },
  '2026-11-05': { date: '2026-11-05', status: 'worked', start: '09:00', end: '17:00' },
}
const r3 = periodSummary({ start: '2026-11-01', end: '2026-11-15' }, e, h)
expect(r3.overtimeMinutes).toBe(360); expect(r3.shortfallMinutes).toBe(120); expect(r3.netMinutes).toBe(240)
expect(Math.round(r3.deviationAmount)).toBe(5769); expect(Math.round(r3.total)).toBe(144231)

const hourly = [{ ...DEFAULT_SETTINGS, rateType: 'hourly', rateAmount: 1500 }]
expect(Math.round(periodSummary({ start: '2026-11-01', end: '2026-11-15' }, e, hourly).total)).toBe(150000) // (96+4)×1500

const changed = [h[0], { ...h[0], effectiveFrom: '2026-11-16', rateAmount: 360000 }]
expect(Math.round(periodSummary({ start: '2026-11-16', end: '2026-11-30' }, {}, changed).baseAmount)).toBe(180000)
expect(Math.round(periodSummary({ start: '2026-11-01', end: '2026-11-15' }, {}, changed).baseAmount)).toBe(138462)
```

- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement `src/calc/period.ts`.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: pay periods and period summary`.

### Task 4: Storage, backup and local date

**Files:**
- Create: `src/store/storage.ts`, `src/store/useAppState.ts`
- Test: `src/store/storage.test.ts`

**Interfaces:**
- Consumes: Task 2 types.
- Produces:

```ts
export type Lang = 'ru' | 'en' | 'hy'
export interface AppState { version: 1; language: Lang; settingsHistory: WorkSettings[]; entries: Record<string, DayEntry> }
export const STORAGE_KEY = 'overtime-app-v1'
export function defaultState(): AppState // language 'ru', settingsHistory [DEFAULT_SETTINGS], entries {}
export function loadState(storage?: Storage): AppState   // missing/corrupt → defaultState()
export function saveState(state: AppState, storage?: Storage): void
export function exportData(state: AppState): string      // pretty JSON
export function importData(json: string): AppState        // throws Error('invalidBackup') unless version === 1 and fields have the right shapes
export function localISODate(d?: Date): string            // local calendar date 'YYYY-MM-DD'
export function upsertSettings(state: AppState, s: WorkSettings): AppState // replaces a record with the same effectiveFrom, else appends
// useAppState.ts
export function useAppState(): [AppState, (next: AppState) => void] // loads once, saves on every update
```

- [ ] **Step 1: Write failing tests**

```ts
const st = { ...defaultState(), entries: { '2026-11-02': { date: '2026-11-02', status: 'worked', start: '09:00', end: '20:00' } } }
saveState(st, localStorage); expect(loadState(localStorage)).toEqual(st)
localStorage.setItem(STORAGE_KEY, '{oops'); expect(loadState(localStorage)).toEqual(defaultState())
expect(importData(exportData(st))).toEqual(st)
expect(() => importData('not json')).toThrow('invalidBackup')
expect(() => importData('{"foo":1}')).toThrow('invalidBackup')
expect(localISODate(new Date(2026, 10, 2, 23, 50))).toBe('2026-11-02') // late evening stays the same day
const up = upsertSettings(defaultState(), { ...DEFAULT_SETTINGS, effectiveFrom: '2026-11-16', rateAmount: 360000 })
expect(up.settingsHistory).toHaveLength(2)
expect(upsertSettings(up, { ...DEFAULT_SETTINGS, effectiveFrom: '2026-11-16', rateAmount: 1 }).settingsHistory).toHaveLength(2)
```

- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement both files.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: local storage and backup`.

### Task 5: Translations and money formatting

**Files:**
- Create: `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/hy.ts`, `src/i18n/index.ts`
- Test: `src/i18n/i18n.test.ts`

**Interfaces:**
- Consumes: `Lang` from Task 4.
- Produces: `ru` is the source dictionary (`export const ru = {...} as const`); `en` and `hy` are typed `Record<keyof typeof ru, string>` so a missing key is a compile error. `t(lang: Lang, key: keyof typeof ru): string`, `formatAmount(n: number): string`, `formatHours(minutes: number, lang: Lang): string` (signed, e.g. `+2 ч`, `−1 ч 30 мин` in ru, `0 ч` for zero; localized units), `weekdayName(lang: Lang, date: string): string`.
- Keys needed (at least): tab names (today, period, settings), arrived, left, save, saved, notWorked, paidDayOff, endBeforeStart, toReceive, base, overtime, shortfall, total, workingDays, salary, perMonth, perHour, monthlyDivisor, payout, payMonthly, paySemimonthly, schedule, workTime, lunch, dayOff, language, exportData, importData, invalidBackup, effectiveFrom, and weekday names.

- [ ] **Step 1: Write failing tests**

```ts
expect(formatAmount(144230.77)).toBe('144 231 ֏')
expect(formatAmount(-5769.2)).toBe('−5 769 ֏')
expect(formatHours(120, 'ru')).toBe('+2 ч')
expect(formatHours(-90, 'ru')).toBe('−1 ч 30 мин')
expect(t('hy', 'save')).toBeTruthy()
expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
expect(Object.keys(hy).sort()).toEqual(Object.keys(ru).sort())
```

(The separator in `formatAmount` is a regular space, implemented manually, not via `toLocaleString`, so output is identical on every phone.)

- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement. Write natural Armenian and English strings.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: translations ru/en/hy and formatting`.

### Task 6: App shell and Today screen

**Files:**
- Modify: `src/App.tsx`, `src/index.css`
- Create: `src/ui/TodayScreen.tsx`
- Test: `src/ui/TodayScreen.test.tsx`

**Interfaces:**
- Consumes: `useAppState`, `localISODate`, `timeOptions`, `validateEntry`, `dayDeviationMinutes`, `settingsAt`, `hourlyRate`, `t`, `formatAmount`, `formatHours`.
- Produces: `App` with a bottom tab bar (Сегодня / Период / Настройки) holding `selectedDate` state; `TodayScreen({ state, setState, date, onDateChange })`.

Screen: date header with ‹ › to move one day and a date input to jump; two `<select>` lists from `timeOptions()` (defaults from the day's settings: 09:00 / 18:00, or the saved entry); two toggle buttons «Не работал» / «Оплачиваемый выходной» (selecting one hides the time selects); live line with deviation hours and drams; «Сохранить» button. Large touch targets, mobile-first layout, max-width ~480px.

- [ ] **Step 1: Write failing tests** (render with state containing `rateAmount: 300000`, date `2026-11-02`)
  - selects default to `09:00` and `18:00`; deviation line shows `0 ч`.
  - choose end `20:00` → shows `+2 ч` and `+2 885 ֏`; click Save → `setState` receives entry `{ date: '2026-11-02', status: 'worked', start: '09:00', end: '20:00' }`.
  - choose start `18:00`, end `09:00`, Save → error text `t('ru','endBeforeStart')` visible, `setState` not called.
  - click «Не работал», Save → entry `{ status: 'absent' }` saved, line shows `−8 ч`.
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` → PASS; `npm run dev`, open in the browser pane at mobile size, enter a day, reload, confirm it persisted.
- [ ] **Step 5:** Commit `feat: today screen`.

### Task 7: Period screen

**Files:**
- Create: `src/ui/PeriodScreen.tsx`
- Test: `src/ui/PeriodScreen.test.tsx`

**Interfaces:**
- Consumes: `periodFor`, `shiftPeriod`, `periodSummary`, `settingsAt`, formatting from Task 5; `onOpenDay(date)` callback from `App` (switches to Today tab on that date).
- Produces: `PeriodScreen({ state, today, onOpenDay })`.

Screen: period title with ‹ › (uses `payPeriod` of the settings in force on the period's start); big «К получению» total; rows: base (with working-day count), overtime, shortfall, total hours and drams; list of days that have an entry or are non-working, each tappable.

- [ ] **Step 1: Write failing tests** with the four Task 3 example entries and `payPeriod: 'semimonthly'`, `today = '2026-11-10'`:
  - shows `144 231 ֏`, `12`, `+6 ч`, `−2 ч`, `+4 ч`, `+5 769 ֏`.
  - click ‹ → title shows 16–31 октября.
  - click the 02.11 row → `onOpenDay('2026-11-02')`.
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: period screen`.

### Task 8: Settings screen with backup

**Files:**
- Create: `src/ui/SettingsScreen.tsx`
- Test: `src/ui/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `upsertSettings`, `settingsAt`, `hourlyRate`, `exportData`, `importData`, `timeOptions`, `t`.
- Produces: `SettingsScreen({ state, setState, today })`.

Screen: language switch (applies immediately, not effective-dated); salary type toggle and amount input (digits only), divisor input (default 208) shown only for monthly, computed hourly rate line; payout toggle; schedule selects (work start/end, lunch start/end, day-off weekday); «Действует с» date input defaulting to the start of today's pay period; «Сохранить» → `upsertSettings`. Backup: «Сохранить копию» downloads `overtime-backup-YYYY-MM-DD.json`; «Загрузить копию» file input → `importData`, on error shows `t('invalidBackup')` and leaves state unchanged, on success asks `confirm()` before replacing.

- [ ] **Step 1: Write failing tests**
  - entering `300000` shows hourly `1 442 ֏`.
  - change amount to `360000`, effective `2026-11-16`, Save → `settingsHistory` has 2 records, earlier record unchanged.
  - switching language to `hy` re-renders labels from `hy`.
  - uploading a file with `{"foo":1}` shows the invalid-backup message and `setState` is not called.
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: settings screen and backup`.

### Task 9: Installable PWA

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` (simple clock + ֏ icon)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1:** `npm i -D vite-plugin-pwa`; configure `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Переработка', short_name: 'Переработка', display: 'standalone', start_url: '.', theme_color, background_color, icons } })`; set `base: './'` so it works under a sub-path (GitHub Pages). Add `<meta name="apple-mobile-web-app-capable" content="yes">` and the apple-touch-icon link.
- [ ] **Step 2:** `npm run build` → succeeds, `dist/manifest.webmanifest` and `dist/sw.js` exist.
- [ ] **Step 3:** `npm run preview`; in the browser pane at mobile size, check: no console errors, the manifest loads, and after one reload `navigator.serviceWorker.controller` is not null (the app works offline).
- [ ] **Step 4:** `npm test` → all PASS.
- [ ] **Step 5:** Commit `feat: installable PWA`.

Hosting (GitHub Pages / Netlify) is out of this plan: it needs the user's account and comes after they answer the open question in the spec.
