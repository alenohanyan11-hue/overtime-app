import { useState } from 'react'
import { dayDeviationMinutes, hourlyRate, isWorkingDay, parseISODate, settingsAt, validateEntry } from '../calc/day'
import { timeOptions } from '../calc/time'
import type { DayEntry, DayStatus } from '../calc/types'
import { dayMonth, formatHours, t, weekdayName } from '../i18n'
import { localISODate, type AppState } from '../store/storage'
import { formatSignedAmount } from './format'

interface Props {
  state: AppState
  setState: (next: AppState) => void
  date: string
  onDateChange: (date: string) => void
}

const TIMES = timeOptions()

function shiftDate(date: string, delta: number): string {
  const d = parseISODate(date)
  d.setDate(d.getDate() + delta)
  return localISODate(d)
}

export function TodayScreen({ state, setState, date, onDateChange }: Props) {
  const lang = state.language
  const s = settingsAt(state.settingsHistory, date)
  const saved = state.entries[date]
  // A day off starts as "didn't work", so a habitual Save there doesn't add 8 hours of overtime.
  const [status, setStatus] = useState<DayStatus>(saved?.status ?? (isWorkingDay(date, s) ? 'worked' : 'absent'))
  const [start, setStart] = useState(saved?.start ?? s.workStart)
  const [end, setEnd] = useState(saved?.end ?? s.workEnd)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const entry: DayEntry = status === 'worked' ? { date, status, start, end } : { date, status }
  const invalid = validateEntry(entry)
  const deviation = invalid ? 0 : dayDeviationMinutes(date, entry, s)
  const amount = (deviation / 60) * hourlyRate(s)

  function toggle(next: DayStatus) {
    setStatus(status === next ? 'worked' : next)
    setError(null)
    setJustSaved(false)
  }

  function save() {
    if (invalid) {
      setError(t(lang, invalid))
      return
    }
    setState({ ...state, entries: { ...state.entries, [date]: entry } })
    setJustSaved(true)
  }

  return (
    <section className="screen">
      <header className="day-nav">
        <button className="icon-btn" aria-label={t(lang, 'prevDay')} onClick={() => onDateChange(shiftDate(date, -1))}>
          ‹
        </button>
        <label className="day-title">
          <span>{weekdayName(lang, date)}</span>
          <strong>{dayMonth(lang, date)}</strong>
          <input type="date" value={date} onChange={(e) => e.target.value && onDateChange(e.target.value)} />
        </label>
        <button className="icon-btn" aria-label={t(lang, 'nextDay')} onClick={() => onDateChange(shiftDate(date, 1))}>
          ›
        </button>
      </header>
      {!isWorkingDay(date, s) && <p className="badge">{t(lang, 'dayOffBadge')}</p>}

      {status === 'worked' && (
        <div className="times">
          <label className="field">
            <span>{t(lang, 'arrived')}</span>
            <select
              value={start}
              onChange={(e) => {
                setStart(e.target.value)
                setError(null)
                setJustSaved(false)
              }}
            >
              {TIMES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t(lang, 'left')}</span>
            <select
              value={end}
              onChange={(e) => {
                setEnd(e.target.value)
                setError(null)
                setJustSaved(false)
              }}
            >
              {TIMES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="toggles">
        <button className={status === 'absent' ? 'toggle on' : 'toggle'} aria-pressed={status === 'absent'} onClick={() => toggle('absent')}>
          {t(lang, 'notWorked')}
        </button>
        <button className={status === 'paidOff' ? 'toggle on' : 'toggle'} aria-pressed={status === 'paidOff'} onClick={() => toggle('paidOff')}>
          {t(lang, 'paidDayOff')}
        </button>
      </div>

      <p data-testid="deviation" className={deviation > 0 ? 'deviation plus' : deviation < 0 ? 'deviation minus' : 'deviation'}>
        {formatHours(deviation, lang)} · {formatSignedAmount(amount)}
      </p>
      {error && <p className="error">{error}</p>}

      <button className="primary" onClick={save}>
        {t(lang, 'save')}
      </button>
      {justSaved && <p className="hint">{t(lang, 'saved')}</p>}
    </section>
  )
}
