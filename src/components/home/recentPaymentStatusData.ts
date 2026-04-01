export const paymentTrendData = [
  {
    month: '10월',
    totalTargets: 142,
    amount: 74800000,
    advanceTargets: 88,
    confirmedTargets: 54,
    advanceAmount: 46200000,
    confirmedAmount: 28600000,
  },
  {
    month: '11월',
    totalTargets: 149,
    amount: 77600000,
    advanceTargets: 94,
    confirmedTargets: 55,
    advanceAmount: 49100000,
    confirmedAmount: 28500000,
  },
  {
    month: '12월',
    totalTargets: 154,
    amount: 80200000,
    advanceTargets: 98,
    confirmedTargets: 56,
    advanceAmount: 51600000,
    confirmedAmount: 28600000,
  },
  {
    month: '1월',
    totalTargets: 158,
    amount: 82100000,
    advanceTargets: 102,
    confirmedTargets: 56,
    advanceAmount: 53400000,
    confirmedAmount: 28700000,
  },
  {
    month: '2월',
    totalTargets: 163,
    amount: 83700000,
    advanceTargets: 105,
    confirmedTargets: 58,
    advanceAmount: 54800000,
    confirmedAmount: 28900000,
  },
  {
    month: '3월',
    totalTargets: 168,
    amount: 84300000,
    advanceTargets: 104,
    confirmedTargets: 64,
    advanceAmount: 52100000,
    confirmedAmount: 32200000,
  },
] as const

export type TrendItem = (typeof paymentTrendData)[number]

export const latestPaymentTrend = paymentTrendData[paymentTrendData.length - 1]
export const latestAdvanceRate = Math.round((latestPaymentTrend.advanceTargets / latestPaymentTrend.totalTargets) * 1000) / 10
export const latestConfirmedRate =
  Math.round((latestPaymentTrend.confirmedTargets / latestPaymentTrend.totalTargets) * 1000) / 10

export function formatCurrency(value: number) {
  return `${Math.round(value / 10000).toLocaleString('ko-KR')}만원`
}
