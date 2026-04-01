import type { PayerItem } from '../payer/payerTargetTypes'

export type CompanyPaymentState = 'all' | 'paid' | 'unpaid' | 'partial'
export type CompanyStatus = Exclude<CompanyPaymentState, 'all'>

export type CompanyGroup = {
  name: string
  members: PayerItem[]
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
  paidCount: number
  unpaidCount: number
  advanceCount: number
  confirmedCount: number
  latestNoticeGeneratedAt: string
  nearestDueDate: string
  nextUnpaidDueDate: string | null
  completionRate: number
  status: CompanyStatus
}
