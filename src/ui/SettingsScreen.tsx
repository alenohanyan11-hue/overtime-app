import { useState, type ChangeEvent } from 'react'
import { hourlyRate, settingsAt } from '../calc/day'
import { periodFor } from '../calc/period'
import { timeOptions, toMinutes } from '../calc/time'
import type { WorkSettings } from '../calc/types'
import { formatAmount, t, type DictKey } from '../i18n'
import { exportData, importData, upsertSettings, type AppState, type Lang } from '../store/storage'

interface Props {
  state: AppState
  setState: (next: AppState) => void
  today: string
}

const TIMES = timeOptions()
const LANGS: { id: Lang; label: string }[] = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
  { id: 'hy', label: 'Հայերեն' },
]
// Monday first, as in the user's week
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]
const INITIAL_EFFECTIVE_FROM = '2000-01-01'

function digits(value: string): number {
  return Number(value.replace(/\D/g, '')) || 0
}

// Keeps digits and one decimal separator ("1500,5" or "1500.5"); spaces between thousands are dropped.
function cleanAmount(value: string): string {
  const [whole, ...rest] = value.replace(/[^\d.,]/g, '').split(/[.,]/)
  return rest.length ? `${whole},${rest.join('')}` : whole
}

function parseAmount(text: string): number {
  return Number(text.replace(',', '.')) || 0
}

// Until a salary is entered, the only record is the built-in default: edit it in place so past days use the real rate too.
function isFirstSetup(state: AppState, current: WorkSettings): boolean {
  return state.settingsHistory.length === 1 && current.effectiveFrom === INITIAL_EFFECTIVE_FROM && current.rateAmount === 0
}

function draftFrom(state: AppState, today: string): WorkSettings {
  const current = settingsAt(state.settingsHistory, today)
  return {
    ...current,
    effectiveFrom: isFirstSetup(state, current) ? INITIAL_EFFECTIVE_FROM : periodFor(today, current.payPeriod).start,
  }
}

export function SettingsScreen({ state, setState, today }: Props) {
  const lang = state.language
  const firstSetup = isFirstSetup(state, settingsAt(state.settingsHistory, today))
  const [draft, setDraft] = useState<WorkSettings>(() => draftFrom(state, today))
  const [amountText, setAmountText] = useState(() => String(draft.rateAmount).replace('.', ','))
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  function update(patch: Partial<WorkSettings>) {
    setDraft({ ...draft, ...patch })
    setMessage(null)
  }

  function save() {
    if (toMinutes(draft.workEnd) <= toMinutes(draft.workStart)) {
      setMessage({ text: t(lang, 'endBeforeStart'), error: true })
      return
    }
    setState(upsertSettings(state, { ...draft, monthlyDivisor: draft.monthlyDivisor || 208 }))
    setMessage({ text: t(lang, 'saved'), error: false })
  }

  async function download() {
    const name = `overtime-backup-${today}.json`
    const file = new File([exportData(state)], name, { type: 'application/json' })
    // iPhone home-screen apps can't download files, but they can share them (to Files, Telegram, mail…).
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name })
      } catch {
        // the user closed the share sheet
      }
      return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let next: AppState
    try {
      next = importData(await file.text())
    } catch {
      setMessage({ text: t(lang, 'invalidBackup'), error: true })
      return
    }
    if (!window.confirm(t(lang, 'importConfirm'))) return
    setState(next)
    const nextDraft = draftFrom(next, today)
    setDraft(nextDraft)
    setAmountText(String(nextDraft.rateAmount).replace('.', ','))
    setMessage({ text: t(next.language, 'imported'), error: false })
  }

  const timeSelect = (label: DictKey, key: 'workStart' | 'workEnd' | 'lunchStart' | 'lunchEnd', suffix: DictKey) => (
    <label className="field">
      <span>
        {t(lang, label)}: {t(lang, suffix)}
      </span>
      <select value={draft[key]} onChange={(e) => update({ [key]: e.target.value })}>
        {TIMES.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  )

  return (
    <section className="screen">
      <div className="group">
        <h2>{t(lang, 'language')}</h2>
        <div className="segmented">
          {LANGS.map((l) => (
            <button key={l.id} className={lang === l.id ? 'seg on' : 'seg'} onClick={() => setState({ ...state, language: l.id })}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <h2>{t(lang, 'salary')}</h2>
        <div className="segmented">
          <button className={draft.rateType === 'monthly' ? 'seg on' : 'seg'} onClick={() => update({ rateType: 'monthly' })}>
            {t(lang, 'perMonth')}
          </button>
          <button className={draft.rateType === 'hourly' ? 'seg on' : 'seg'} onClick={() => update({ rateType: 'hourly' })}>
            {t(lang, 'perHour')}
          </button>
        </div>
        <label className="field">
          <span>{t(lang, 'amount')}</span>
          <input
            inputMode="decimal"
            value={amountText}
            onChange={(e) => {
              const text = cleanAmount(e.target.value)
              setAmountText(text)
              update({ rateAmount: parseAmount(text) })
            }}
          />
        </label>
        {draft.rateType === 'monthly' && (
          <label className="field">
            <span>{t(lang, 'monthlyDivisor')}</span>
            <input inputMode="numeric" value={String(draft.monthlyDivisor)} onChange={(e) => update({ monthlyDivisor: digits(e.target.value) })} />
          </label>
        )}
        <p className="muted" style={{ margin: 0 }}>
          {t(lang, 'hourlyRate')}: <span data-testid="hourly-rate">{formatAmount(hourlyRate({ ...draft, monthlyDivisor: draft.monthlyDivisor || 208 }))}</span>
        </p>
      </div>

      <div className="group">
        <h2>{t(lang, 'payout')}</h2>
        <div className="segmented">
          <button className={draft.payPeriod === 'monthly' ? 'seg on' : 'seg'} onClick={() => update({ payPeriod: 'monthly' })}>
            {t(lang, 'payMonthly')}
          </button>
          <button className={draft.payPeriod === 'semimonthly' ? 'seg on' : 'seg'} onClick={() => update({ payPeriod: 'semimonthly' })}>
            {t(lang, 'paySemimonthly')}
          </button>
        </div>
      </div>

      <div className="group">
        <h2>{t(lang, 'schedule')}</h2>
        <div className="grid2">
          {timeSelect('workTime', 'workStart', 'from')}
          {timeSelect('workTime', 'workEnd', 'to')}
          {timeSelect('lunch', 'lunchStart', 'from')}
          {timeSelect('lunch', 'lunchEnd', 'to')}
        </div>
        <label className="field">
          <span>{t(lang, 'dayOff')}</span>
          <select value={draft.dayOff} onChange={(e) => update({ dayOff: Number(e.target.value) })}>
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {t(lang, `w${d}` as DictKey)}
              </option>
            ))}
          </select>
        </label>
        {!firstSetup && (
          <label className="field">
            <span>{t(lang, 'effectiveFrom')}</span>
            <input type="date" value={draft.effectiveFrom} onChange={(e) => e.target.value && update({ effectiveFrom: e.target.value })} />
          </label>
        )}
      </div>

      <button className="primary" onClick={save}>
        {t(lang, 'save')}
      </button>
      {message && <p className={message.error ? 'error' : 'hint'}>{message.text}</p>}

      <div className="group">
        <h2>{t(lang, 'backup')}</h2>
        <div className="grid2">
          <button className="secondary" onClick={download}>
            {t(lang, 'exportData')}
          </button>
          <label className="secondary file-btn">
            {t(lang, 'importData')}
            <input type="file" accept="application/json,.json" onChange={upload} />
          </label>
        </div>
      </div>
    </section>
  )
}
