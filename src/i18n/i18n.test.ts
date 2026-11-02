import { describe, expect, it } from 'vitest'
import { en } from './en'
import { hy } from './hy'
import { formatAmount, formatHours, t, weekdayName } from './index'
import { ru } from './ru'

describe('formatAmount', () => {
  it('rounds to whole drams with space separators', () => {
    expect(formatAmount(144230.77)).toBe('144 231 ֏')
    expect(formatAmount(-5769.2)).toBe('−5 769 ֏')
    expect(formatAmount(0)).toBe('0 ֏')
  })
})

describe('formatHours', () => {
  it('shows signed hours and minutes', () => {
    expect(formatHours(120, 'ru')).toBe('+2 ч')
    expect(formatHours(-90, 'ru')).toBe('−1 ч 30 мин')
    expect(formatHours(0, 'ru')).toBe('0 ч')
    expect(formatHours(45, 'en')).toBe('+45 min')
  })
})

describe('dictionaries', () => {
  it('every language has every key', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
    expect(Object.keys(hy).sort()).toEqual(Object.keys(ru).sort())
  })

  it('translates a key', () => {
    expect(t('ru', 'save')).toBe('Сохранить')
    expect(t('hy', 'save')).toBeTruthy()
  })

  it('names weekdays', () => {
    expect(weekdayName('ru', '2026-11-02')).toBe('Понедельник')
  })
})
