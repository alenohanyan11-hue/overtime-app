import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

function setPageVisible() {
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('App', () => {
  it('moves to the new day when the app is reopened the next evening', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 2, 22, 0))
    render(<App />)
    expect(screen.getByText('2 ноября')).toBeInTheDocument()

    vi.setSystemTime(new Date(2026, 10, 3, 22, 0))
    setPageVisible()
    expect(screen.getByText('3 ноября')).toBeInTheDocument()
  })

  it('keeps a day the user chose by hand', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 3, 22, 0))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Предыдущий день' }))
    expect(screen.getByText('2 ноября')).toBeInTheDocument()

    vi.setSystemTime(new Date(2026, 10, 3, 22, 30))
    setPageVisible()
    expect(screen.getByText('2 ноября')).toBeInTheDocument()
  })

  it('the period screen follows the new day too', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 30, 22, 0))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Период' }))
    expect(screen.getByTestId('period-title')).toHaveTextContent('1–30 ноября 2026')

    vi.setSystemTime(new Date(2026, 11, 1, 9, 0))
    setPageVisible()
    expect(screen.getByTestId('period-title')).toHaveTextContent('1–31 декабря 2026')
  })
})
