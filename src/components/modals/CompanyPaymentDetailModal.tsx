import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CompanyGroup, CompanyStatus } from '../company/companyPaymentTypes'
import PaymentCompletedDateModal from './PaymentCompletedDateModal'
import PayerTargetDetailModal from './PayerTargetDetailModal'
import {
  formatPayerCurrency,
  payerPaymentStatusMeta,
  payerStatusMeta,
} from '../payer/payerTargetData'
import type { PayerItem, PaymentTab } from '../payer/payerTargetTypes'

type CompanyPaymentDetailModalProps = {
  open: boolean
  company: CompanyGroup | null
  onClose: () => void
}

const companyStatusMeta: Record<
  CompanyStatus,
  {
    label: string
    badgeClass: string
  }
> = {
  paid: {
    label: '완납',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  },
  unpaid: {
    label: '미납',
    badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  },
  partial: {
    label: '부분납부',
    badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  },
}

const memberTableGridClass =
  'grid w-full grid-cols-[110px_minmax(0,1.3fr)_120px_140px_120px_120px] gap-3'

function resolveCompanyStatus(paidCount: number, unpaidCount: number): CompanyStatus {
  if (unpaidCount === 0) return 'paid'
  if (paidCount === 0) return 'unpaid'
  return 'partial'
}

export default function CompanyPaymentDetailModal({
  open,
  company,
  onClose,
}: CompanyPaymentDetailModalProps) {
  const [members, setMembers] = useState<PayerItem[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [paymentCompletedDateTargetId, setPaymentCompletedDateTargetId] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !company) return
    setMembers(company.members)
    setSelectedMemberId(null)
    setPaymentCompletedDateTargetId(null)
  }, [company, open])

  const companySummary = useMemo(() => {
    const totalAmount = members.reduce((sum, member) => sum + member.amountValue, 0)
    const paidAmount = members
      .filter((member) => member.paymentStatus === 'paid')
      .reduce((sum, member) => sum + member.amountValue, 0)
    const unpaidAmount = totalAmount - paidAmount
    const paidCount = members.filter((member) => member.paymentStatus === 'paid').length
    const unpaidCount = members.length - paidCount
    const advanceCount = members.filter((member) => member.status === 'advance').length
    const confirmedCount = members.length - advanceCount
    const latestNoticeGeneratedAt = members.reduce(
      (latest, member) => (latest > member.noticeGeneratedAt ? latest : member.noticeGeneratedAt),
      members[0]?.noticeGeneratedAt ?? '-',
    )
    const nearestDueDate = members.reduce(
      (nearest, member) => (nearest < member.dueDate ? nearest : member.dueDate),
      members[0]?.dueDate ?? '-',
    )
    const unpaidDueDates = members
      .filter((member) => member.paymentStatus === 'unpaid')
      .map((member) => member.dueDate)
      .sort((left, right) => left.localeCompare(right))
    const completionRate = totalAmount === 0 ? 0 : Math.round((paidAmount / totalAmount) * 100)
    const status = resolveCompanyStatus(paidCount, unpaidCount)

    return {
      totalAmount,
      paidAmount,
      unpaidAmount,
      paidCount,
      unpaidCount,
      advanceCount,
      confirmedCount,
      latestNoticeGeneratedAt,
      nearestDueDate,
      nextUnpaidDueDate: unpaidDueDates[0] ?? null,
      completionRate,
      status,
    }
  }, [members])

  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null
  const paymentCompletedDateTarget =
    members.find((member) => member.id === paymentCompletedDateTargetId) ?? null

  const handleStatusChange = (id: number, nextStatus: Exclude<PaymentTab, 'all'>) => {
    setMembers((prev) => prev.map((member) => (member.id === id ? { ...member, status: nextStatus } : member)))
  }

  const handlePaymentStatusChange = (id: number, nextPaymentStatus: PayerItem['paymentStatus']) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, paymentStatus: nextPaymentStatus } : member,
      ),
    )
  }

  const handlePaymentCompletedAtChange = (id: number, paymentCompletedAt: string | null) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, paymentCompletedAt } : member)),
    )
  }

  const handleRequestPaymentStatusChange = (
    id: number,
    nextPaymentStatus: PayerItem['paymentStatus'],
  ) => {
    const targetMember = members.find((member) => member.id === id)
    if (!targetMember) return

    if (nextPaymentStatus === 'paid') {
      setPaymentCompletedDateTargetId(id)
      return
    }

    handlePaymentStatusChange(id, 'unpaid')
    handlePaymentCompletedAtChange(id, null)
  }

  const handleConfirmPaymentCompletedDate = (date: string) => {
    if (paymentCompletedDateTargetId === null) return
    handlePaymentStatusChange(paymentCompletedDateTargetId, 'paid')
    handlePaymentCompletedAtChange(paymentCompletedDateTargetId, date)
    setPaymentCompletedDateTargetId(null)
  }

  const handleOpenDocument = async (filePath: string) => {
    try {
      await window.electronAPI.history.open(filePath)
    } catch (error) {
      alert((error as Error).message)
    }
  }

  if (!open || !company) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="기업 납부 상세"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold tracking-[0.12em] text-[#003764]">COMPANY DETAIL</div>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <h3 className="min-w-0 text-2xl font-bold text-gray-900">{company.name}</h3>
              <div className="flex flex-wrap items-end gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${companyStatusMeta[companySummary.status].badgeClass}`}
                >
                  {companyStatusMeta[companySummary.status].label}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                  위반 {members.length}건
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                  사전 {companySummary.advanceCount}건
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                  확정 {companySummary.confirmedCount}건
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-[#003764] hover:text-[#003764]"
            aria-label="기업 상세 닫기"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path
                d="M5 5l10 10M15 5 5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">총 예정 금액</div>
            <div className="mt-1 text-lg font-bold text-gray-900">
              {formatPayerCurrency(companySummary.totalAmount)}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">납부 완료 금액</div>
            <div className="mt-1 text-lg font-bold text-gray-900">
              {formatPayerCurrency(companySummary.paidAmount)}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">미납 금액</div>
            <div className="mt-1 text-lg font-bold text-gray-900">
              {formatPayerCurrency(companySummary.unpaidAmount)}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">납부율</div>
            <div className="mt-1 text-lg font-bold text-gray-900">{companySummary.completionRate}%</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">최근 통지서 생성일</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {companySummary.latestNoticeGeneratedAt}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">가장 빠른 납부기한</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{companySummary.nearestDueDate}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">다음 미납 기한</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {companySummary.nextUnpaidDueDate ?? '-'}
            </div>
          </div>
        </div>

        <div className="mt-5 hidden min-h-0 flex-1 overflow-hidden rounded-3xl border border-gray-200 xl:flex xl:flex-col">
          <div className={`${memberTableGridClass} bg-gray-50 px-5 py-3 text-xs font-semibold tracking-[0.04em] text-gray-500`}>
            <div>구분</div>
            <div>대상자</div>
            <div>납부 상태</div>
            <div>예정 금액</div>
            <div>납부기한</div>
            <div>완료일</div>
          </div>
          <div className="min-h-0 divide-y divide-gray-200 overflow-y-auto">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedMemberId(member.id)}
                className={`${memberTableGridClass} cursor-pointer px-5 py-4 text-left text-sm text-gray-700 transition hover:bg-gray-50`}
              >
                <div className="flex min-w-0 items-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${payerStatusMeta[member.status].badgeClass}`}
                  >
                    {payerStatusMeta[member.status].label}
                  </span>
                </div>
                <div className="flex items-center">
                  <div>
                    <div className="font-semibold text-gray-900">{member.name}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      통지서 생성 {member.noticeGeneratedAt}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${payerPaymentStatusMeta[member.paymentStatus].badgeClass}`}
                  >
                    {payerPaymentStatusMeta[member.paymentStatus].label}
                  </span>
                </div>
                <div className="flex items-center font-semibold text-gray-900">
                  {formatPayerCurrency(member.amountValue)}
                </div>
                <div className="flex items-center text-gray-600">{member.dueDate}</div>
                <div className="flex items-center text-gray-600">{member.paymentCompletedAt ?? '-'}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 overflow-y-auto xl:hidden">
          {members.map((member) => (
            <button
              key={`member-card-${member.id}`}
              type="button"
              onClick={() => setSelectedMemberId(member.id)}
              className="cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-gray-900">{member.name}</div>
                  <div className="mt-1 text-xs text-gray-500">통지서 생성 {member.noticeGeneratedAt}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${payerStatusMeta[member.status].badgeClass}`}
                  >
                    {payerStatusMeta[member.status].label}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${payerPaymentStatusMeta[member.paymentStatus].badgeClass}`}
                  >
                    {payerPaymentStatusMeta[member.paymentStatus].label}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-3.5 py-3">
                  <div className="text-[11px] font-medium text-gray-500">예정 금액</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {formatPayerCurrency(member.amountValue)}
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-3.5 py-3">
                  <div className="text-[11px] font-medium text-gray-500">납부기한</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{member.dueDate}</div>
                </div>
                <div className="rounded-2xl bg-white px-3.5 py-3">
                  <div className="text-[11px] font-medium text-gray-500">완료일</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {member.paymentCompletedAt ?? '-'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <PayerTargetDetailModal
        open={selectedMember !== null}
        item={selectedMember}
        formatCurrency={formatPayerCurrency}
        statusMeta={selectedMember ? payerStatusMeta[selectedMember.status] : payerStatusMeta.advance}
        paymentStatusMeta={
          selectedMember
            ? payerPaymentStatusMeta[selectedMember.paymentStatus]
            : payerPaymentStatusMeta.unpaid
        }
        onClose={() => setSelectedMemberId(null)}
        onOpenDocument={handleOpenDocument}
        onAttachDocument={() => {}}
        onChangeStatus={handleStatusChange}
        onChangePaymentStatus={handleRequestPaymentStatusChange}
      />

      <PaymentCompletedDateModal
        open={paymentCompletedDateTarget !== null}
        payerName={paymentCompletedDateTarget?.name ?? ''}
        initialDate={paymentCompletedDateTarget?.paymentCompletedAt ?? null}
        onClose={() => setPaymentCompletedDateTargetId(null)}
        onConfirm={handleConfirmPaymentCompletedDate}
      />
    </div>,
    document.body,
  )
}
