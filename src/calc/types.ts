export type RateType = 'monthly' | 'hourly'
export type PayPeriod = 'monthly' | 'semimonthly'
export type DayStatus = 'worked' | 'absent' | 'paidOff'

export interface DayEntry {
  date: string // YYYY-MM-DD
  status: DayStatus
  start?: string
  end?: string
  note?: string
}

export interface WorkSettings {
  effectiveFrom: string
  rateType: RateType
  rateAmount: number
  monthlyDivisor: number
  payPeriod: PayPeriod
  workStart: string
  workEnd: string
  lunchStart: string
  lunchEnd: string
  dayOff: number // 0 = Sunday … 6 = Saturday
}

export const DEFAULT_SETTINGS: WorkSettings = {
  effectiveFrom: '2000-01-01',
  rateType: 'monthly',
  rateAmount: 0,
  monthlyDivisor: 208,
  payPeriod: 'monthly',
  workStart: '09:00',
  workEnd: '18:00',
  lunchStart: '13:00',
  lunchEnd: '14:00',
  dayOff: 0,
}
