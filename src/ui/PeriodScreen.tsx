import { useState } from 'react'
import { parseISODate, settingsAt } from '../calc/day'
import { periodFor, periodSummary, shiftPeriod, type DayLine, type Period } from '../calc/period'
import { dayMonth, formatAmount, formatHours, periodTitle, t, weekdayName, type DictKey } from '../i18n'
import type { AppState, Lang } from '../store/storage'
import { formatSignedAmount } from './format'

interface Props {
  state: AppState
  today: string
  onOpenDay: (date: string) => void
}

// Monday first, as in the user's week
const WEEK = [1, 2, 3, 4, 5, 6, 0]

// Red in the calendar: days off nobody worked, and days marked "didn't work".
function isOff(line: DayLine): boolean {
  if (line.entry?.status === 'absent') return true
  return !line.working && line.entry?.status !== 'worked'
}

function formatShortHours(minutes: number, lang: Lang): string {
  if (minutes === 0) return ''
  const sign = minutes > 0 ? '+' : '−'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `${sign}${h}${t(lang, 'hourUnit')}` : `${sign}${h}:${String(m).padStart(2, '0')}`
}

export function PeriodScreen({ state, today, onOpenDay }: Props) {
  const lang = state.language
  const payPeriodAt = (date: string) => settingsAt(state.settingsHistory, date).payPeriod
  const [period, setPeriod] = useState<Period>(() => periodFor(today, payPeriodAt(today)))
  const summary = periodSummary(period, state.entries, state.settingsHistory)
  const leadingBlanks = (parseISODate(period.start).getDay() + 6) % 7

  function shift(delta: number) {
    setPeriod(shiftPeriod(period, state.settingsHistory, delta))
  }

  return (
    <section className="screen">
      <header className="period-nav">
        <button className="icon-btn" aria-label={t(lang, 'prevPeriod')} onClick={() => shift(-1)}>
          ‹
        </button>
        <span className="period-title" data-testid="period-title">
          {periodTitle(lang, period.start, period.end)}
        </span>
        <button className="icon-btn" aria-label={t(lang, 'nextPeriod')} onClick={() => shift(1)}>
          ›
        </button>
      </header>

      <div className="card">
        <p className="total-label">{t(lang, 'toReceive')}</p>
        <p className="total" data-testid="total">
          {formatAmount(summary.total)}
        </p>
      </div>

      <ul className="rows card">
        <li>
          <span>{t(lang, 'base')}</span>
          <span>{formatAmount(summary.baseAmount)}</span>
        </li>
        <li>
          <span>{t(lang, 'workingDays')}</span>
          <span data-testid="working-days">{summary.workingDays}</span>
        </li>
        <li>
          <span>{t(lang, 'overtime')}</span>
          <span className="plus" data-testid="overtime">
            {formatHours(summary.overtimeMinutes, lang)}
          </span>
        </li>
        <li>
          <span>{t(lang, 'shortfall')}</span>
          <span className="minus" data-testid="shortfall">
            {formatHours(-summary.shortfallMinutes, lang)}
          </span>
        </li>
        <li>
          <strong>{t(lang, 'total')}</strong>
          <strong data-testid="net" className={summary.netMinutes > 0 ? 'plus' : summary.netMinutes < 0 ? 'minus' : ''}>
            {formatHours(summary.netMinutes, lang)} · {formatSignedAmount(summary.deviationAmount)}
          </strong>
        </li>
      </ul>

      <div className="card">
        <h2>{t(lang, 'days')}</h2>
        <div className="calendar" data-testid="calendar">
          {WEEK.map((d) => (
            <span key={d} className="cal-head">
              {t(lang, `d${d}` as DictKey)}
            </span>
          ))}
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <span key={`blank-${i}`} className="cal-blank" />
          ))}
          {summary.days.map((line) => {
            const off = isOff(line)
            const classes = ['cal-day', off && 'off', line.date === today && 'today'].filter(Boolean).join(' ')
            return (
              <button
                key={line.date}
                className={classes}
                data-testid={`day-${line.date}`}
                aria-label={`${dayMonth(lang, line.date)}, ${weekdayName(lang, line.date)}`}
                onClick={() => onOpenDay(line.date)}
              >
                <span className="cal-num">{Number(line.date.slice(8))}</span>
                <span className={line.deviationMinutes > 0 ? 'cal-hours plus' : 'cal-hours minus'}>
                  {off ? '' : formatShortHours(line.deviationMinutes, lang)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
