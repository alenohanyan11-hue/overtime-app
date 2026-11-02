import { useCallback, useState } from 'react'
import { loadState, saveState, type AppState } from './storage'

export function useAppState(): [AppState, (next: AppState) => void] {
  const [state, setState] = useState<AppState>(() => loadState())
  const update = useCallback((next: AppState) => {
    saveState(next)
    setState(next)
  }, [])
  return [state, update]
}
