export type ExcelPreviewRow = {
  index: number
  docNo: string
  affiliation: string
  driverName: string
  birthDate: string
  phone: string
  passTime: string
  passLocation: string
  direction: string
  lane: string
  regionRegNo: string
  vehicleType: string
  speed: string
  driveType: string
  partyAddress: string
  partyEmail: string
}

export type GeneratePdfRow = ExcelPreviewRow & {
  row: number
  file: string
}

export type GenerateDocumentKind = 'fine' | 'suspension' | 'final'
export type HistoryDocumentType = 'pre_notice' | 'suspension' | 'opinion_submit' | 'final_notice'
export type AlertStatus = 'read' | 'unread'
export type AlertType = 'violation' | 'generation'
export type AlertTargetPage = 'payer-detail' | 'history'

export type HistoryEditFields = Partial<
  Pick<
    ExcelPreviewRow,
    | 'docNo'
    | 'affiliation'
    | 'driverName'
    | 'birthDate'
    | 'phone'
    | 'passTime'
    | 'passLocation'
    | 'direction'
    | 'lane'
    | 'regionRegNo'
    | 'vehicleType'
    | 'speed'
    | 'driveType'
    | 'partyAddress'
    | 'partyEmail'
  > & {
    paymentType: 'advance' | 'confirmed'
    advancePaymentStatus: 'unpaid' | 'paid'
    confirmedPaymentStatus: 'unpaid' | 'paid'
    advanceDueDate: string
    confirmedDueDate: string | null
    updatedAt: string
  }
>

export type GenerateResult =
  | { ok: true; count: number; results: GeneratePdfRow[] }
  | { ok: false; message?: string }

export type User = {
  name: string
  department: string
  email: string
  phone: string
  fax: string
  zipCode: string
  baseAddress: string
  detailAddress: string
}

export type QuickMenuId =
  | 'generate'
  | 'payermanagement'
  | 'payertargetmanagement'
  | 'companypaymentmanagement'
  | 'history'
  | 'settings'

export type QuickMenuSetting = {
  id: QuickMenuId
  visible: boolean
}

export type ViolationDocumentRecord = {
  id: number
  violationRecordId: number
  documentType: HistoryDocumentType
  filePath: string
  rowIndex: number | null
  docNo: string | null
  affiliation: string | null
  driverName: string | null
  birthDate: string | null
  phone: string | null
  passTime: string | null
  passLocation: string | null
  direction: string | null
  lane: string | null
  regionRegNo: string | null
  vehicleType: string | null
  speed: string | null
  driveType: string | null
  partyAddress: string | null
  partyEmail: string | null
  paymentType: 'advance' | 'confirmed'
  advancePaymentStatus: 'unpaid' | 'paid'
  confirmedPaymentStatus: 'unpaid' | 'paid'
  advanceDueDate: string | null
  confirmedDueDate: string | null
  violationUpdatedAt: string | null
  violationCreatedAt: string
  updatedAt: string | null
  createdAt: string
  exists: boolean
}

export type UserProfile = User
export type PdfHistoryRow = ViolationDocumentRecord

export type AlertRow = {
  id: number
  violationRecordId: number | null
  alertType: AlertType
  targetPage: AlertTargetPage
  status: AlertStatus
  title: string
  description: string
  occurredAt: string
  readAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string | null
}
