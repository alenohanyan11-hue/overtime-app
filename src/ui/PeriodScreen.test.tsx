import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../calc/types'
import type { AppState } from '../store/storage'
import { PeriodScreen } from './PeriodScreen'

const state: AppState = {
  version: 1,
  language: 'ru',
  settingsHistory: [{ ...DEFAULT_SETTINGS, rateAmount: 300000, payPeriod: 'semimonthly' }],
  entries: {
    '2026-11-02': { date: '2026-11-02', status: 'worked', start: '09:00', end: '20:00' },
    '2026-11-03': { date: '2026-11-03', status: 'worked', start: '09:00', end: '17:00' },
    '2026-11-04': { date: '2026-11-04', status: 'worked', start: '09:00', end: '22:00' },
    '2026-11-05': { date: '2026-11-05', status: 'worked', start: '09:00', end: '17:00' },
  },
}

describe('PeriodScreen', () => {
  it('shows the amount due and the hour breakdown', () => {
    render(<PeriodScreen state={state} today="2026-11-10" onOpenDay={() => {}} />)
    expect(screen.getByTestId('period-title')).toHaveTextContent('1–15 ноября 2026')
    expect(screen.getByTestId('total')).toHaveTextContent('144 231 ֏')
    expect(screen.getByTestId('working-days')).toHaveTextContent('12')
    expect(screen.getByTestId('overtime')).toHaveTextContent('+6 ч')
    expect(screen.getByTestId('shortfall')).toHaveTextContent('−2 ч')
    expect(screen.getByTestId('net')).toHaveTextContent('+4 ч')
    expect(screen.getByTestId('net')).toHaveTextContent('+5 769 ֏')
  })

  it('moves to the previous period', () => {
    render(<PeriodScreen state={state} today="2026-11-10" onOpenDay={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Предыдущий период' }))
    expect(screen.getByTestId('period-title')).toHaveTextContent('16–31 октября 2026')
  })

  it('shows a small calendar with hours on worked days and red days off', () => {
    const s: AppState = {
      ...state,
      entries: { ...state.entries, '2026-11-06': { date: '2026-11-06', status: 'absent' } },
    }
    render(<PeriodScreen state={s} today="2026-11-10" onOpenDay={() => {}} />)
    expect(screen.getAllByTestId(/^day-/)).toHaveLength(15)
    expect(screen.getByTestId('day-2026-11-02')).toHaveTextContent('+2ч')
    expect(screen.getByTestId('day-2026-11-03')).toHaveTextContent('−1ч')
    expect(screen.getByTestId('day-2026-11-07')).not.toHaveTextContent(/[+−]/)
    expect(screen.getByTestId('day-2026-11-01')).toHaveClass('off')
    expect(screen.getByTestId('day-2026-11-06')).toHaveClass('off')
    expect(screen.getByTestId('day-2026-11-02')).not.toHaveClass('off')
    expect(screen.getByTestId('day-2026-11-10')).toHaveClass('today')
  })

  it('marks days that have a comment', () => {
    const s: AppState = {
      ...state,
      entries: { ...state.entries, '2026-11-04': { ...state.entries['2026-11-04'], note: 'Склад' } },
    }
    render(<PeriodScreen state={s} today="2026-11-10" onOpenDay={() => {}} />)
    expect(screen.getByTestId('day-2026-11-04')).toHaveClass('has-note')
    expect(screen.getByTestId('day-2026-11-02')).not.toHaveClass('has-note')
  })

  it('starts the calendar on the right weekday', () => {
    render(<PeriodScreen state={state} today="2026-11-10" onOpenDay={() => {}} />)
    // 1 Nov 2026 is a Sunday: six empty cells come before it in a Monday-first week
    expect(screen.getByTestId('calendar').querySelectorAll('.cal-blank')).toHaveLength(6)
  })

  it('opens a day from the list', () => {
    const onOpenDay = vi.fn()
    render(<PeriodScreen state={state} today="2026-11-10" onOpenDay={onOpenDay} />)
    fireEvent.click(screen.getByRole('button', { name: /^2 ноября/ }))
    expect(onOpenDay).toHaveBeenCalledWith('2026-11-02')
  })
})
