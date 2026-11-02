import { useState } from 'react'
import { t } from './i18n'
import { localISODate } from './store/storage'
import { useAppState } from './store/useAppState'
import { TodayScreen } from './ui/TodayScreen'

type Tab = 'today' | 'period' | 'settings'

function App() {
  const [state, setState] = useAppState()
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(() => localISODate())
  const lang = state.language

  return (
    <div className="app" lang={lang}>
      <main>
        {tab === 'today' && <TodayScreen key={date} state={state} setState={setState} date={date} onDateChange={setDate} />}
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
