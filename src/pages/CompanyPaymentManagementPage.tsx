import { useMemo, useState } from 'react'
import type {
  CompanyGroup,
  CompanyStatus,
} from '../components/company/companyPaymentTypes'
import CompanyListPanel from '../components/company/CompanyListPanel'
import CompanyPaymentDetailModal from '../components/modals/CompanyPaymentDetailModal'
import { formatPayerCurrency } from '../components/payer/payerTargetData'
import type { PayerItem } from '../components/payer/payerTargetTypes'
import SearchBar from '../components/searches/SearchBar'
import { usePaymentDashboardData } from '../hooks/usePaymentDashboardData'

function resolveCompanyStatus(paidCount: number, unpaidCount: number): CompanyStatus {
  if (unpaidCount === 0) return 'paid'
  if (paidCount === 0) return 'unpaid'
  return 'partial'
}

function buildCompanyGroups(items: PayerItem[]): CompanyGroup[] {
  const grouped = new Map<string, CompanyGroup>()

  items.forEach((item) => {
    const existing = grouped.get(item.affiliation)

    if (!existing) {
      grouped.set(item.affiliation, {
        name: item.affiliation,
        members: [item],
        totalAmount: item.amountValue,
        paidAmount: item.paymentStatus === 'paid' ? item.amountValue : 0,
        unpaidAmount: item.paymentStatus === 'unpaid' ? item.amountValue : 0,
        paidCount: item.paymentStatus === 'paid' ? 1 : 0,
        unpaidCount: item.paymentStatus === 'unpaid' ? 1 : 0,
        advanceCount: item.status === 'advance' ? 1 : 0,
        confirmedCount: item.status === 'confirmed' ? 1 : 0,
        latestNoticeGeneratedAt: item.noticeGeneratedAt,
        nearestDueDate: item.dueDate,
        nextUnpaidDueDate: item.paymentStatus === 'unpaid' ? item.dueDate : null,
        completionRate: item.paymentStatus === 'paid' ? 100 : 0,
        status: item.paymentStatus === 'paid' ? 'paid' : 'unpaid',
      })
      return
    }

    existing.members.push(item)
    existing.totalAmount += item.amountValue
    existing.paidAmount += item.paymentStatus === 'paid' ? item.amountValue : 0
    existing.unpaidAmount += item.paymentStatus === 'unpaid' ? item.amountValue : 0
    existing.paidCount += item.paymentStatus === 'paid' ? 1 : 0
    existing.unpaidCount += item.paymentStatus === 'unpaid' ? 1 : 0
    existing.advanceCount += item.status === 'advance' ? 1 : 0
    existing.confirmedCount += item.status === 'confirmed' ? 1 : 0
    existing.latestNoticeGeneratedAt =
      existing.latestNoticeGeneratedAt > item.noticeGeneratedAt
        ? existing.latestNoticeGeneratedAt
        : item.noticeGeneratedAt
    existing.nearestDueDate =
      existing.nearestDueDate < item.dueDate ? existing.nearestDueDate : item.dueDate

    if (item.paymentStatus === 'unpaid') {
      existing.nextUnpaidDueDate =
        existing.nextUnpaidDueDate && existing.nextUnpaidDueDate < item.dueDate
          ? existing.nextUnpaidDueDate
          : item.dueDate
    }
  })

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      members: [...group.members].sort((left, right) => {
        if (left.paymentStatus !== right.paymentStatus) {
          return left.paymentStatus === 'unpaid' ? -1 : 1
        }
        return left.dueDate.localeCompare(right.dueDate)
      }),
      completionRate: Math.round((group.paidAmount / group.totalAmount) * 100),
      status: resolveCompanyStatus(group.paidCount, group.unpaidCount),
    }))
    .sort((left, right) => {
      if (left.unpaidAmount !== right.unpaidAmount) return right.unpaidAmount - left.unpaidAmount
      if (left.unpaidCount !== right.unpaidCount) return right.unpaidCount - left.unpaidCount
      return left.name.localeCompare(right.name, 'ko')
    })
}

function getRankToneClass(index: number, kind: 'violation' | 'payment') {
  const tones =
    kind === 'violation'
      ? [
          'border-rose-300 bg-rose-100',
          'border-rose-200 bg-rose-50',
          'border-pink-100 bg-pink-50',
          'border-slate-200 bg-slate-50',
          'border-gray-200 bg-white',
        ]
      : [
          'border-emerald-300 bg-emerald-100',
          'border-emerald-200 bg-emerald-50',
          'border-teal-100 bg-teal-50',
          'border-slate-200 bg-slate-50',
          'border-gray-200 bg-white',
        ]

  return tones[index] ?? tones[tones.length - 1]
}

export default function CompanyPaymentManagementPage() {
  const { payerItems, loading, error } = usePaymentDashboardData()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null)

  const companyGroups = useMemo(() => buildCompanyGroups(payerItems), [payerItems])

  const filteredCompanies = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase()

    return companyGroups.filter((company) => {
      if (normalizedKeyword && !company.name.toLowerCase().includes(normalizedKeyword)) return false
      return true
    })
  }, [companyGroups, searchKeyword])

  const violationRanking = useMemo(
    () =>
      [...companyGroups]
        .sort((left, right) => {
          if (left.members.length !== right.members.length) {
            return right.members.length - left.members.length
          }
          if (left.unpaidAmount !== right.unpaidAmount) return right.unpaidAmount - left.unpaidAmount
          return left.name.localeCompare(right.name, 'ko')
        })
        .slice(0, 5),
    [companyGroups],
  )

  const paymentRateRanking = useMemo(
    () =>
      [...companyGroups]
        .sort((left, right) => {
          if (left.completionRate !== right.completionRate) {
            return right.completionRate - left.completionRate
          }
          if (left.paidAmount !== right.paidAmount) return right.paidAmount - left.paidAmount
          return left.name.localeCompare(right.name, 'ko')
        })
        .slice(0, 5),
    [companyGroups],
  )

  const selectedCompany = useMemo(
    () => companyGroups.find((company) => company.name === selectedCompanyName) ?? null,
    [companyGroups, selectedCompanyName],
  )

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="flex border-l-4 border-[#003764] pl-4 text-2xl font-bold text-gray-900 lg:shrink-0">
          기업별 납부 관리
        </h2>
        <div className="w-full lg:ml-auto lg:w-1/4 lg:min-w-[280px] lg:flex-none">
          <SearchBar
            value={searchKeyword}
            onChange={setSearchKeyword}
            placeholder="기업명으로 검색"
            className="w-full bg-white"
          />
        </div>
      </div>

      <div className="border border-gray-200" />

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(420px,1.35fr)_minmax(280px,0.72fr)]">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
            기업별 납부 데이터를 불러오는 중입니다.
          </div>
        ) : (
          <CompanyListPanel
            companies={filteredCompanies}
            onSelectCompany={() => {}}
          />
        )}

        <div className="grid min-h-0 gap-4 xl:grid-rows-2">
          <article className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-lg">
            <div className="mb-4">
              <div className="text-sm font-semibold text-[#003764]">기업 위반건수 순위</div>
              <div className="mt-1 text-xs text-gray-500">현재 목록 기준 상위 5개 기업</div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-visible overflow-y-auto px-1 pt-1 pb-2">
              {violationRanking.length === 0 ? (
                <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-sm text-gray-500">
                  표시할 순위 데이터가 없습니다.
                </div>
              ) : (
                violationRanking.map((company, index) => (
                  <button
                    key={`violation-${company.name}`}
                    type="button"
                    onClick={() => setSelectedCompanyName(company.name)}
                    className={`cursor-pointer rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${getRankToneClass(index, 'violation')}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold tracking-[0.12em] text-gray-400">
                          NO. {index + 1}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-gray-900">
                          {company.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{company.members.length}건</div>
                        <div className="text-[11px] text-gray-500">
                          미납 {formatPayerCurrency(company.unpaidAmount)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-lg">
            <div className="mb-4">
              <div className="text-sm font-semibold text-[#003764]">기업 납부율 순위</div>
              <div className="mt-1 text-xs text-gray-500">현재 목록 기준 상위 5개 기업</div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-visible overflow-y-auto px-1 pt-1 pb-2">
              {paymentRateRanking.length === 0 ? (
                <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-sm text-gray-500">
                  표시할 순위 데이터가 없습니다.
                </div>
              ) : (
                paymentRateRanking.map((company, index) => (
                  <button
                    key={`rate-${company.name}`}
                    type="button"
                    onClick={() => setSelectedCompanyName(company.name)}
                    className={`cursor-pointer rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${getRankToneClass(index, 'payment')}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold tracking-[0.12em] text-gray-400">
                          NO. {index + 1}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-gray-900">
                          {company.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{company.completionRate}%</div>
                        <div className="text-[11px] text-gray-500">
                          완납 {formatPayerCurrency(company.paidAmount)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </article>
        </div>
      </div>

      <CompanyPaymentDetailModal
        open={selectedCompany !== null}
        company={selectedCompany}
        onClose={() => setSelectedCompanyName(null)}
      />
    </section>
  )
}
