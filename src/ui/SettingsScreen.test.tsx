import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../calc/types'
import type { AppState } from '../store/storage'
import { SettingsScreen } from './SettingsScreen'

const base: AppState = {
  version: 1,
  language: 'ru',
  settingsHistory: [{ ...DEFAULT_SETTINGS, effectiveFrom: '2026-11-01', rateAmount: 300000 }],
  entries: {},
}

function setup(state: AppState = base) {
  const setState = vi.fn()
  const view = render(<SettingsScreen state={state} setState={setState} today="2026-11-20" />)
  return { setState, view }
}

describe('SettingsScreen', () => {
  it('shows the hourly rate for a monthly salary', () => {
    setup()
    expect(screen.getByLabelText('Сумма, ֏')).toHaveValue('300000')
    expect(screen.getByTestId('hourly-rate')).toHaveTextContent('1 442 ֏')
  })

  it('saves a raise from a date without touching earlier settings', () => {
    const { setState } = setup()
    fireEvent.change(screen.getByLabelText('Сумма, ֏'), { target: { value: '360000' } })
    fireEvent.change(screen.getByLabelText('Действует с'), { target: { value: '2026-11-16' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    const next: AppState = setState.mock.calls[0][0]
    expect(next.settingsHistory).toHaveLength(2)
    expect(next.settingsHistory[0]).toEqual(base.settingsHistory[0])
    expect(next.settingsHistory[1]).toMatchObject({ effectiveFrom: '2026-11-16', rateAmount: 360000 })
  })

  it('first setup edits the built-in default so earlier days get the real rate', () => {
    const fresh: AppState = { ...base, settingsHistory: [{ ...DEFAULT_SETTINGS }] }
    const { setState } = setup(fresh)
    expect(screen.queryByLabelText('Действует с')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Сумма, ֏'), { target: { value: '300000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    const next: AppState = setState.mock.calls[0][0]
    expect(next.settingsHistory).toEqual([{ ...DEFAULT_SETTINGS, rateAmount: 300000 }])
  })

  it('after the first setup, later changes ask for an effective date', () => {
    setup({ ...base, settingsHistory: [{ ...DEFAULT_SETTINGS, rateAmount: 300000 }] })
    expect(screen.getByLabelText('Действует с')).toHaveValue('2026-11-01')
  })

  it('switches the language right away', () => {
    const { setState } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Հայերեն' }))
    expect(setState).toHaveBeenCalledWith({ ...base, language: 'hy' })
  })

  it('after an import the form shows the imported settings', async () => {
    const fresh: AppState = { ...base, settingsHistory: [{ ...DEFAULT_SETTINGS }] }
    const imported: AppState = { ...base, settingsHistory: [{ ...DEFAULT_SETTINGS, rateAmount: 250000 }] }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { setState } = setup(fresh)
    const file = new File([JSON.stringify(imported)], 'b.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Загрузить копию'), { target: { files: [file] } })
    await waitFor(() => expect(setState).toHaveBeenCalledWith(imported))
    expect(screen.getByLabelText('Сумма, ֏')).toHaveValue('250000')
  })

  it('accepts a decimal hourly rate with a comma', () => {
    const { setState } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'В час' }))
    fireEvent.change(screen.getByLabelText('Сумма, ֏'), { target: { value: '1500,5' } })
    expect(screen.getByLabelText('Сумма, ֏')).toHaveValue('1500,5')
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(setState.mock.calls[0][0].settingsHistory).toEqual([
      expect.objectContaining({ effectiveFrom: '2026-11-01', rateType: 'hourly', rateAmount: 1500.5 }),
    ])
  })

  it('accepts an amount typed with spaces', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Сумма, ֏'), { target: { value: '320 000' } })
    expect(screen.getByTestId('hourly-rate')).toHaveTextContent('1 538 ֏')
  })

  it('shares the backup file when the phone supports it', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { canShare: () => true, share })
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить копию' }))
    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(share.mock.calls[0][0].files[0].name).toBe('overtime-backup-2026-11-20.json')
    Object.assign(navigator, { canShare: undefined, share: undefined })
  })

  it('downloads the backup and does not cancel the download immediately', () => {
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: revoke })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить копию' }))
    expect(revoke).not.toHaveBeenCalled()
  })

  it('rejects a file that is not a backup', async () => {
    const { setState } = setup()
    const file = new File(['{"foo":1}'], 'x.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Загрузить копию'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByText('Этот файл не является копией данных или повреждён')).toBeInTheDocument())
    expect(setState).not.toHaveBeenCalled()
  })
})
