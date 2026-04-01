export type PaymentTab = 'all' | 'advance' | 'confirmed'

export type PayerItem = {
  id: number
  name: string
  affiliation: string
  amountValue: number
  advanceDueDate: string
  confirmedDueDate: string | null
  dueDate: string
  paymentStatus: 'unpaid' | 'paid'
  status: Exclude<PaymentTab, 'all'>
}
