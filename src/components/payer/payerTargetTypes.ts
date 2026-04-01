export type PaymentTab = 'all' | 'advance' | 'confirmed'
export type PayerProcessStage = 'pre-notice' | 'opinion' | 'final-notice' | 'completed'
export type PayerDocumentId = 'pre-notice' | 'suspension' | 'opinion-submit' | 'final-notice'

export type PayerDocument = {
  id: PayerDocumentId
  title: string
  fileName: string
  filePath: string | null
  historyDocumentId?: number
}

export type PayerViolation = {
  occurredAt: string
  location: string
  vehicleNumber: string
  vehicleType?: string
  speed?: string
  excessSpeed?: string
  email: string
  address: string
  detail: string
}

export type PayerItem = {
  id: number
  historyId: number
  name: string
  affiliation: string
  amountValue: number
  noticeGeneratedAt: string
  advanceDueDate: string
  confirmedDueDate: string | null
  dueDate: string
  paymentCompletedAt: string | null
  paymentStatus: 'unpaid' | 'paid'
  status: Exclude<PaymentTab, 'all'>
  processStage?: PayerProcessStage
  violation: PayerViolation
  documents: PayerDocument[]
}
