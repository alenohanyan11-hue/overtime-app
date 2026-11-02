import { formatAmount } from '../i18n'

export function formatSignedAmount(n: number): string {
  return Math.round(n) > 0 ? `+${formatAmount(n)}` : formatAmount(n)
}
