import { useState } from 'react'
import { settingsAt } from '../calc/day'
import { periodFor, periodSummary, shiftPeriod, type DayLine, type Period } from '../calc/period'
import { dayMonth, formatAmount, formatHours, periodTitle, t, weekdayName } from '../i18n'
import type { AppState, Lang } from '../store/storage'
import { formatSignedAmount } from './format'

interface Props {
  state: AppState
  today: string
  onOpenDay: (date: string) => void
}

function dayDetail(line: DayLine, lang: Lang): string {
  const e = line.entry
  if (!e) return t(lang, 'dayOffBadge')
  if (e.status === 'absent') return t(lang, 'notWorked')
  if (e.status === 'paidOff') return t(lang, 'paidDayOff')
  return `${e.start}–${e.end}`
}

export function PeriodScreen({ state, today, onOpenDay }: Props) {
  const lang = state.language
  const payPeriodAt = (date: string) => settingsAt(state.settingsHistory, date).payPeriod
  const [period, setPeriod] = useState<Period>(() => periodFor(today, payPeriodAt(today)))
  const summary = periodSummary(period, state.entries, state.settingsHistory)
  const listed = summary.days.filter((d) => d.entry || !d.working)

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

      {listed.length > 0 && (
        <div className="card">
          <h2>{t(lang, 'days')}</h2>
          {listed.map((line) => (
            <button key={line.date} className="day-row" onClick={() => onOpenDay(line.date)}>
              <span>
                {dayMonth(lang, line.date)}, <span className="muted">{weekdayName(lang, line.date)}</span>
              </span>
              <span className={line.deviationMinutes > 0 ? 'plus' : line.deviationMinutes < 0 ? 'minus' : 'muted'}>
                {dayDetail(line, lang)} · {formatHours(line.deviationMinutes, lang)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
