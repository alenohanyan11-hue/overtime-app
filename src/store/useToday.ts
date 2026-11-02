import { useEffect, useState } from 'react'
import { localISODate } from './storage'

// Phones keep a home-screen app in memory for days, so re-read the date whenever it comes back to the screen.
export function useToday(): string {
  const [today, setToday] = useState(() => localISODate())
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'hidden') setToday(localISODate())
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  return today
}
