import type {
  PayerDocument,
  PayerDocumentId,
  PayerItem,
  PayerProcessStage,
} from '../components/payer/payerTargetTypes'
import type {
  HistoryDocumentType,
  ViolationDocumentRecord,
} from '../types/ipc'

const ADVANCE_AMOUNT = 40000
const CONFIRMED_AMOUNT = 50000

export type PaymentTrendItem = {
  monthKey: string
  month: string
  totalTargets: number
  totalPaidTargets: number
  amount: number
  advanceTargets: number
  advancePaidTargets: number
  confirmedTargets: number
  confirmedPaidTargets: number
  advanceAmount: number
  confirmedAmount: number
  paidAmount: number
  unpaidAmount: number
  advancePaidAmount: number
  advanceUnpaidAmount: number
  confirmedPaidAmount: number
  confirmedUnpaidAmount: number
}

export type PaymentMonthlyReportItem = {
  monthKey: string
  month: string
  paid: number
  unpaid: number
}

const documentDisplayMeta: Record<
  PayerDocumentId,
  { title: string; historyDocumentType: HistoryDocumentType }
> = {
  'pre-notice': { title: '사전통지서', historyDocumentType: 'pre_notice' },
  suspension: { title: '운전업무정지', historyDocumentType: 'suspension' },
  'opinion-submit': { title: '의견제출', historyDocumentType: 'opinion_submit' },
  'final-notice': { title: '확정통지서', historyDocumentType: 'final_notice' },
}

const orderedDocumentIds: PayerDocumentId[] = [
  'pre-notice',
  'suspension',
  'opinion-submit',
  'final-notice',
]

function formatMonthLabel(date: Date) {
  return `${date.getMonth() + 1}월`
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function getEndOfNextMonth(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatDateOnly(new Date(date.getFullYear(), date.getMonth() + 2, 0).toISOString())
}

function getAdvanceDueDate(record: Pick<ViolationDocumentRecord, 'advanceDueDate' | 'violationCreatedAt'>) {
  return record.advanceDueDate || getEndOfNextMonth(record.violationCreatedAt)
}

function getConfirmedDueDate(
  record: Pick<ViolationDocumentRecord, 'confirmedDueDate'>,
  finalNoticeDocument: Pick<ViolationDocumentRecord, 'createdAt' | 'updatedAt'> | null,
) {
  if (record.confirmedDueDate) return record.confirmedDueDate
  if (!finalNoticeDocument) return null
  return getEndOfNextMonth(finalNoticeDocument.updatedAt ?? finalNoticeDocument.createdAt)
}

function getCurrentDueDate(
  record: Pick<ViolationDocumentRecord, 'paymentType' | 'advanceDueDate' | 'violationCreatedAt'>,
  confirmedDueDate: string | null,
) {
  return record.paymentType === 'confirmed' ? (confirmedDueDate ?? '') : getAdvanceDueDate(record)
}

function mapHistoryDocumentTypeToPayerDocumentId(documentType: HistoryDocumentType): PayerDocumentId {
  if (documentType === 'suspension') return 'suspension'
  if (documentType === 'opinion_submit') return 'opinion-submit'
  if (documentType === 'final_notice') return 'final-notice'
  return 'pre-notice'
}

function buildDocuments(records: ViolationDocumentRecord[]): PayerDocument[] {
  const documentMap = new Map<PayerDocumentId, PayerDocument>()

  records.forEach((record) => {
    const id = mapHistoryDocumentTypeToPayerDocumentId(record.documentType)
    const fileName = record.filePath.split(/[\\/]/).pop() ?? record.filePath

    documentMap.set(id, {
      id,
      title: documentDisplayMeta[id].title,
      fileName,
      filePath: record.filePath,
      historyDocumentId: record.id,
    })
  })

  return orderedDocumentIds.map((id) => {
    const existing = documentMap.get(id)
    if (existing) return existing

    return {
      id,
      title: documentDisplayMeta[id].title,
      fileName: '',
      filePath: null,
    }
  })
}

export function getCurrentPaymentStatus(
  record: Pick<ViolationDocumentRecord, 'paymentType' | 'advancePaymentStatus' | 'confirmedPaymentStatus'>,
) {
  return record.paymentType === 'confirmed'
    ? record.confirmedPaymentStatus
    : record.advancePaymentStatus
}

export function getPaymentAmount(record: Pick<ViolationDocumentRecord, 'paymentType'>) {
  return record.paymentType === 'confirmed' ? CONFIRMED_AMOUNT : ADVANCE_AMOUNT
}

function parseSpeedNumber(value?: string | null) {
  const normalized = String(value ?? '').trim()
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : Number.NaN
}

function formatExcessSpeed(speed?: string | null) {
  const speedValue = parseSpeedNumber(speed)
  if (!Number.isFinite(speedValue)) return '-'
  const excessSpeed = speedValue - 30
  return `${excessSpeed > 0 ? excessSpeed : 0}km/h`
}

function buildViolationDetail(record: ViolationDocumentRecord) {
  const paymentLabel = record.paymentType === 'confirmed' ? '확정납부' : '사전납부'
  const paymentStatusLabel = getCurrentPaymentStatus(record) === 'paid' ? '완납' : '미납'

  return {
    occurredAt: record.passTime ?? '-',
    location: record.passLocation ?? '-',
    vehicleNumber: record.regionRegNo ?? '-',
    vehicleType: record.vehicleType ?? '-',
    speed: record.speed ?? '-',
    excessSpeed: formatExcessSpeed(record.speed),
    email: record.partyEmail ?? '-',
    address: record.partyAddress ?? '-',
    detail: `${paymentLabel} 대상 위반건이며 현재 상태는 ${paymentStatusLabel}입니다.`,
  }
}

function getProcessStage(
  paymentType: 'advance' | 'confirmed',
  paymentStatus: 'unpaid' | 'paid',
  documents: PayerDocument[],
): PayerProcessStage {
  if (paymentStatus === 'paid') return 'completed'
  if (documents.some((document) => document.id === 'final-notice' && document.filePath)) return 'final-notice'
  if (documents.some((document) => document.id === 'opinion-submit' && document.filePath)) return 'opinion'
  return paymentType === 'confirmed' ? 'final-notice' : 'pre-notice'
}

function pickPrimaryRecord(records: ViolationDocumentRecord[]) {
  return [...records].sort((left, right) => {
    const leftTime = new Date(left.updatedAt ?? left.createdAt).getTime()
    const rightTime = new Date(right.updatedAt ?? right.createdAt).getTime()
    return rightTime - leftTime
  })[0]
}

export function buildPayerItems(records: ViolationDocumentRecord[]): PayerItem[] {
  const grouped = new Map<number, ViolationDocumentRecord[]>()

  records.forEach((record) => {
    const current = grouped.get(record.violationRecordId)
    if (current) {
      current.push(record)
      return
    }
    grouped.set(record.violationRecordId, [record])
  })

  return Array.from(grouped.entries())
    .map(([violationRecordId, groupedRecords]) => {
      const primary = pickPrimaryRecord(groupedRecords)
      const finalNoticeRecord =
        groupedRecords.find((record) => record.documentType === 'final_notice' && record.filePath) ?? null
      const effectivePaymentType: 'advance' | 'confirmed' = finalNoticeRecord ? 'confirmed' : primary.paymentType
      const displayRecord = { ...primary, paymentType: effectivePaymentType }
      const documents = buildDocuments(groupedRecords)
      const paymentStatus = getCurrentPaymentStatus(displayRecord)
      const noticeGeneratedAt = formatDateOnly(primary.violationCreatedAt)
      const advanceDueDate = getAdvanceDueDate(displayRecord)
      const confirmedDueDate = getConfirmedDueDate(displayRecord, finalNoticeRecord)
      const dueDate = getCurrentDueDate(displayRecord, confirmedDueDate)
      const processStage = getProcessStage(effectivePaymentType, paymentStatus, documents)

      return {
        id: violationRecordId,
        historyId: primary.id,
        name: primary.driverName?.trim() || '미기재',
        affiliation: primary.affiliation?.trim() || '소속 미기재',
        amountValue: getPaymentAmount(primary),
        noticeGeneratedAt,
        advanceDueDate,
        confirmedDueDate,
        dueDate,
        paymentCompletedAt:
          paymentStatus === 'paid' ? formatDateOnly(primary.violationUpdatedAt ?? primary.updatedAt) : null,
        paymentStatus,
        status: effectivePaymentType,
        processStage,
        violation: buildViolationDetail(displayRecord),
        documents,
      }
    })
    .sort((left, right) => right.noticeGeneratedAt.localeCompare(left.noticeGeneratedAt))
}

export function buildPaymentTrend(items: PayerItem[], now = new Date()): PaymentTrendItem[] {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return {
      monthKey: key,
      month: formatMonthLabel(date),
      totalTargets: 0,
      totalPaidTargets: 0,
      amount: 0,
      advanceTargets: 0,
      advancePaidTargets: 0,
      confirmedTargets: 0,
      confirmedPaidTargets: 0,
      advanceAmount: 0,
      confirmedAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      advancePaidAmount: 0,
      advanceUnpaidAmount: 0,
      confirmedPaidAmount: 0,
      confirmedUnpaidAmount: 0,
    }
  })

  const monthMap = new Map(months.map((item) => [item.monthKey, item]))

  items.forEach((item) => {
    if (!item.noticeGeneratedAt) return
    const date = new Date(item.noticeGeneratedAt)
    if (Number.isNaN(date.getTime())) return
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const target = monthMap.get(key)
    if (!target) return

    target.totalTargets += 1
    target.amount += item.amountValue
    if (item.status === 'advance') {
      target.advanceTargets += 1
      target.advanceAmount += item.amountValue
      if (item.paymentStatus === 'paid') {
        target.advancePaidTargets += 1
        target.advancePaidAmount += item.amountValue
      } else {
        target.advanceUnpaidAmount += item.amountValue
      }
    } else {
      target.confirmedTargets += 1
      target.confirmedAmount += item.amountValue
      if (item.paymentStatus === 'paid') {
        target.confirmedPaidTargets += 1
        target.confirmedPaidAmount += item.amountValue
      } else {
        target.confirmedUnpaidAmount += item.amountValue
      }
    }

    if (item.paymentStatus === 'paid') {
      target.totalPaidTargets += 1
      target.paidAmount += item.amountValue
    } else {
      target.unpaidAmount += item.amountValue
    }
  })

  return months
}

export function buildMonthlyReports(items: PayerItem[], now = new Date()) {
  const trend = buildPaymentTrend(items, now)
  const all: PaymentMonthlyReportItem[] = trend.map((item) => ({
    monthKey: item.monthKey,
    month: item.month,
    paid: item.paidAmount,
    unpaid: item.unpaidAmount,
  }))

  const advance: PaymentMonthlyReportItem[] = trend.map((item) => ({
    monthKey: item.monthKey,
    month: item.month,
    paid: item.advancePaidAmount,
    unpaid: item.advanceUnpaidAmount,
  }))

  const confirmed: PaymentMonthlyReportItem[] = trend.map((item) => ({
    monthKey: item.monthKey,
    month: item.month,
    paid: item.confirmedPaidAmount,
    unpaid: item.confirmedUnpaidAmount,
  }))

  return { all, advance, confirmed }
}

export function buildPaymentDashboard(records: ViolationDocumentRecord[], now = new Date()) {
  const payerItems = buildPayerItems(records)
  const trendItems = buildPaymentTrend(payerItems, now)
  const monthlyReports = buildMonthlyReports(payerItems, now)

  return {
    payerItems,
    trendItems,
    monthlyReports,
  }
}

export function formatPaymentCurrency(value: number) {
  return `${Math.round(value / 10000).toLocaleString('ko-KR')}만원`
}
