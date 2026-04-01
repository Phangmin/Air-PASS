import { useEffect, useMemo, useState } from 'react'
import CompanyListPanel from '../company/CompanyListPanel'
import type { CompanyGroup, CompanyStatus } from '../company/companyPaymentTypes'
import type { PayerItem } from './payerTargetTypes'

type PayerAffiliationStatusPanelProps = {
  items: PayerItem[]
  isExpanded: boolean
  onToggleExpand: () => void
}

const buildAffiliationGroups = (items: PayerItem[]): CompanyGroup[] => {
  const summaryMap = new Map<string, CompanyGroup>()

  items.forEach((item) => {
    const current = summaryMap.get(item.affiliation)

    if (current) {
      current.members.push(item)
      current.totalAmount += item.amountValue
      current.paidAmount += item.paymentStatus === 'paid' ? item.amountValue : 0
      current.unpaidAmount += item.paymentStatus === 'unpaid' ? item.amountValue : 0
      current.paidCount += item.paymentStatus === 'paid' ? 1 : 0
      current.unpaidCount += item.paymentStatus === 'unpaid' ? 1 : 0
      current.advanceCount += item.status === 'advance' ? 1 : 0
      current.confirmedCount += item.status === 'confirmed' ? 1 : 0
      current.nearestDueDate =
        current.nearestDueDate < item.dueDate ? current.nearestDueDate : item.dueDate
      if (item.paymentStatus === 'unpaid') {
        current.nextUnpaidDueDate =
          current.nextUnpaidDueDate && current.nextUnpaidDueDate < item.dueDate
            ? current.nextUnpaidDueDate
            : item.dueDate
      }
      return
    }

    summaryMap.set(item.affiliation, {
      name: item.affiliation,
      members: [item],
      totalAmount: item.amountValue,
      paidAmount: item.paymentStatus === 'paid' ? item.amountValue : 0,
      unpaidAmount: item.paymentStatus === 'unpaid' ? item.amountValue : 0,
      paidCount: item.paymentStatus === 'paid' ? 1 : 0,
      unpaidCount: item.paymentStatus === 'unpaid' ? 1 : 0,
      latestNoticeGeneratedAt: item.dueDate,
      nearestDueDate: item.dueDate,
      nextUnpaidDueDate: item.paymentStatus === 'unpaid' ? item.dueDate : null,
      advanceCount: item.status === 'advance' ? 1 : 0,
      confirmedCount: item.status === 'confirmed' ? 1 : 0,
      completionRate: item.paymentStatus === 'paid' ? 100 : 0,
      status: item.paymentStatus === 'paid' ? 'paid' : 'unpaid',
    })
  })

  const resolveStatus = (group: CompanyGroup): CompanyStatus => {
    if (group.unpaidCount === 0) return 'paid'
    if (group.paidCount === 0) return 'unpaid'
    return 'partial'
  }

  return Array.from(summaryMap.values())
    .map((group) => ({
      ...group,
      completionRate:
        group.members.length === 0 ? 0 : Math.round((group.paidCount / group.members.length) * 100),
      status: resolveStatus(group),
    }))
    .sort((left, right) => {
      if (right.unpaidAmount !== left.unpaidAmount) {
        return right.unpaidAmount - left.unpaidAmount
      }

      return right.totalAmount - left.totalAmount
    })
}

export default function PayerAffiliationStatusPanel({
  items,
  isExpanded,
  onToggleExpand,
}: PayerAffiliationStatusPanelProps) {
  const [selectedAffiliationName, setSelectedAffiliationName] = useState<string | null>(null)
  const affiliationGroups = useMemo(() => buildAffiliationGroups(items), [items])

  useEffect(() => {
    if (!selectedAffiliationName) return
    if (affiliationGroups.some((group) => group.name === selectedAffiliationName)) return
    setSelectedAffiliationName(null)
  }, [affiliationGroups, selectedAffiliationName])

  return (
    <aside
      className={`relative h-full min-h-0 rounded-3xl border border-gray-200 bg-white p-0 pl-5 shadow-lg transition-[width,box-shadow] duration-300 ease-in-out xl:absolute xl:right-0 xl:inset-y-0 xl:overflow-visible ${
        isExpanded ? 'xl:z-20 xl:w-[calc(100%-1.5rem)] xl:shadow-2xl' : 'xl:z-10 xl:w-[320px]'
      }`}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="absolute -left-4 top-1/2 z-30 hidden h-12 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition hover:border-[#003764] hover:text-[#003764] xl:inline-flex"
        aria-label={isExpanded ? '소속별 현황 축소' : '소속별 현황 확장'}
        title={isExpanded ? '원래 크기로' : '왼쪽으로 확장'}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
          {isExpanded ? (
            <path
              d="M7.5 4.5 13 10l-5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M12.5 4.5 7 10l5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </button>
      <div className="h-full min-h-0 overflow-hidden rounded-tr-3xl rounded-br-3xl">
        <CompanyListPanel
          companies={affiliationGroups}
          onSelectCompany={setSelectedAffiliationName}
          title="소속별 위반 및 납부 현황"
          description="미납 금액이 큰 순서대로 정렬됩니다."
          emptyMessage="표시할 소속 데이터가 없습니다."
          className="h-full rounded-none border-0 bg-transparent p-0 pl-5 shadow-none"
          layout={isExpanded ? 'default' : 'stacked'}
        />
      </div>
    </aside>
  )
}
