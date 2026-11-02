import { useState } from 'react'
import { t } from './i18n'
import { useAppState } from './store/useAppState'
import { useToday } from './store/useToday'
import { PeriodScreen } from './ui/PeriodScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { TodayScreen } from './ui/TodayScreen'

type Tab = 'today' | 'period' | 'settings'

function App() {
  const [state, setState] = useAppState()
  const [tab, setTab] = useState<Tab>('today')
  const today = useToday()
  const [date, setDate] = useState(today)
  const [seenToday, setSeenToday] = useState(today)
  const lang = state.language

  // When the date rolls over, follow it — unless the user had moved to another day on purpose.
  if (today !== seenToday) {
    setSeenToday(today)
    if (date === seenToday) setDate(today)
  }

  return (
    <div className="app" lang={lang}>
      <main>
        {tab === 'today' && <TodayScreen key={date} state={state} setState={setState} date={date} onDateChange={setDate} />}
        {tab === 'period' && (
          <PeriodScreen
            key={today}
            state={state}
            today={today}
            onOpenDay={(d) => {
              setDate(d)
              setTab('today')
            }}
          />
        )}
        {tab === 'settings' && <SettingsScreen state={state} setState={setState} today={today} />}
      </main>
      <nav className="tabs">
        {(['today', 'period', 'settings'] as const).map((id) => (
          <button key={id} className={tab === id ? 'tab on' : 'tab'} onClick={() => setTab(id)}>
            {t(lang, id === 'today' ? 'tabToday' : id === 'period' ? 'tabPeriod' : 'tabSettings')}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
