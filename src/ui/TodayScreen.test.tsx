import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../calc/types'
import type { AppState } from '../store/storage'
import { TodayScreen } from './TodayScreen'

const state: AppState = {
  version: 1,
  language: 'ru',
  settingsHistory: [{ ...DEFAULT_SETTINGS, rateAmount: 300000 }],
  entries: {},
}

function setup(s: AppState = state) {
  const setState = vi.fn()
  render(<TodayScreen state={s} setState={setState} date="2026-11-02" onDateChange={() => {}} />)
  return setState
}

describe('TodayScreen', () => {
  it('defaults to the normal schedule with no deviation', () => {
    setup()
    expect(screen.getByLabelText('Пришёл')).toHaveValue('09:00')
    expect(screen.getByLabelText('Ушёл')).toHaveValue('18:00')
    expect(screen.getByTestId('deviation')).toHaveTextContent('0 ч')
  })

  it('shows overtime and saves the entry', () => {
    const setState = setup()
    fireEvent.change(screen.getByLabelText('Ушёл'), { target: { value: '20:00' } })
    expect(screen.getByTestId('deviation')).toHaveTextContent('+2 ч')
    expect(screen.getByTestId('deviation')).toHaveTextContent('+2 885 ֏')
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(setState).toHaveBeenCalledWith({
      ...state,
      entries: { '2026-11-02': { date: '2026-11-02', status: 'worked', start: '09:00', end: '20:00' } },
    })
  })

  it('refuses to save when leaving before arriving', () => {
    const setState = setup()
    fireEvent.change(screen.getByLabelText('Пришёл'), { target: { value: '18:00' } })
    fireEvent.change(screen.getByLabelText('Ушёл'), { target: { value: '09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(screen.getByText('Время ухода должно быть позже прихода')).toBeInTheDocument()
    expect(setState).not.toHaveBeenCalled()
  })

  it('saves an absent day as -8 h', () => {
    const setState = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Не работал' }))
    expect(screen.getByTestId('deviation')).toHaveTextContent('−8 ч')
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(setState).toHaveBeenCalledWith({
      ...state,
      entries: { '2026-11-02': { date: '2026-11-02', status: 'absent' } },
    })
  })

  it('a day off with no entry starts as not worked, not as +8 h', () => {
    const setState = vi.fn()
    render(<TodayScreen state={state} setState={setState} date="2026-11-08" onDateChange={() => {}} />)
    expect(screen.getByTestId('deviation')).toHaveTextContent('0 ч')
    expect(screen.getByRole('button', { name: 'Не работал' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('saves a comment with the day', () => {
    const setState = setup()
    fireEvent.change(screen.getByLabelText('Комментарий'), { target: { value: '  Инвентаризация  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(setState).toHaveBeenCalledWith({
      ...state,
      entries: { '2026-11-02': { date: '2026-11-02', status: 'worked', start: '09:00', end: '18:00', note: 'Инвентаризация' } },
    })
  })

  it('shows the saved comment', () => {
    setup({ ...state, entries: { '2026-11-02': { date: '2026-11-02', status: 'absent', note: 'Болел' } } })
    expect(screen.getByLabelText('Комментарий')).toHaveValue('Болел')
  })

  it('loads a saved entry', () => {
    setup({ ...state, entries: { '2026-11-02': { date: '2026-11-02', status: 'worked', start: '08:45', end: '19:15' } } })
    expect(screen.getByLabelText('Пришёл')).toHaveValue('08:45')
    expect(screen.getByLabelText('Ушёл')).toHaveValue('19:15')
  })
})
