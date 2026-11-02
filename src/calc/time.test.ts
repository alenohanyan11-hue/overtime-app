import { describe, expect, it } from 'vitest'
import { fromMinutes, overlapMinutes, timeOptions, toMinutes } from './time'

describe('time helpers', () => {
  it('converts HH:MM to minutes and back', () => {
    expect(toMinutes('09:00')).toBe(540)
    expect(toMinutes('20:15')).toBe(1215)
    expect(fromMinutes(810)).toBe('13:30')
  })

  it('lists times in 15-minute steps for the whole day', () => {
    const options = timeOptions()
    expect(options).toHaveLength(96)
    expect(options[0]).toBe('00:00')
    expect(options[95]).toBe('23:45')
  })

  it('measures how much two ranges overlap', () => {
    expect(overlapMinutes(540, 810, 780, 840)).toBe(30)
    expect(overlapMinutes(540, 720, 780, 840)).toBe(0)
  })
})
