import { useEffect, useMemo, useState } from 'react'
import type { CompanyGroup } from './companyPaymentTypes'
import CompanyPaymentDetailModal from '../modals/CompanyPaymentDetailModal'
import { formatPayerCurrency } from '../payer/payerTargetData'

type CompanyListPanelProps = {
  companies: CompanyGroup[]
  onSelectCompany: (companyName: string) => void
  title?: string
  description?: string
  emptyMessage?: string
  className?: string
  layout?: 'default' | 'stacked'
}

function CompanyPaymentDonut({
  paidAmount,
  unpaidAmount,
  completionRate,
}: Pick<CompanyGroup, 'paidAmount' | 'unpaidAmount' | 'completionRate'>) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const totalAmount = paidAmount + unpaidAmount
  const paidRatio = totalAmount === 0 ? 0 : paidAmount / totalAmount

  return (
    <div className="flex shrink-0 items-center justify-center self-center rounded-2xl bg-gray-50">
      <div className="relative aspect-square h-40 w-auto sm:h-44">
        <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="10"
            strokeDasharray={`${circumference * paidRatio} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-semibold tracking-[0.12em] text-gray-400">납부율</div>
          <div className="text-sm font-bold text-gray-900">{completionRate}%</div>
        </div>
      </div>
    </div>
  )
}

export default function CompanyListPanel({
  companies,
  onSelectCompany,
  title = '기업 목록',
  description = '미납 금액이 큰 순서로 정렬됩니다.',
  emptyMessage = '조건에 맞는 기업이 없습니다.',
  className,
  layout = 'default',
}: CompanyListPanelProps) {
  const isStacked = layout === 'stacked'
  const [openedCompanyName, setOpenedCompanyName] = useState<string | null>(null)

  const openedCompany = useMemo(
    () => companies.find((company) => company.name === openedCompanyName) ?? null,
    [companies, openedCompanyName],
  )

  useEffect(() => {
    if (!openedCompanyName) return
    if (companies.some((company) => company.name === openedCompanyName)) return
    setOpenedCompanyName(null)
  }, [companies, openedCompanyName])

  return (
    <>
      <article
        className={`flex min-h-0 flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-lg ${className ?? ''}`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#003764]">{title}</div>
            <div className="mt-1 text-xs text-gray-500">{description}</div>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {companies.length}개
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-hidden pr-1 hover:overflow-y-auto focus-within:overflow-y-auto">
          {companies.length === 0 ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center text-sm text-gray-500">
              {emptyMessage}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {companies.map((company) => {
                return (
                  <button
                    key={company.name}
                    type="button"
                    onClick={() => {
                      onSelectCompany(company.name)
                      setOpenedCompanyName(company.name)
                    }}
                    className="cursor-pointer rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:outline-none"
                  >
                    <div
                      className={`flex gap-4 ${
                        isStacked
                          ? 'flex-col'
                          : 'flex-col lg:flex-row lg:items-center lg:justify-between'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate whitespace-nowrap text-base font-semibold text-gray-900">
                          {company.name}
                        </div>

                        <div
                          className={`mt-4 grid gap-2 ${isStacked ? 'grid-cols-2' : 'sm:grid-cols-2'}`}
                        >
                          <div className="rounded-2xl bg-slate-100 px-3.5 py-3">
                            <div className="whitespace-nowrap text-[11px] font-medium text-gray-500">
                              위반 건수
                            </div>
                            <div className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {company.members.length}건
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-100 px-3.5 py-3">
                            <div className="whitespace-nowrap text-[11px] font-medium text-gray-500">
                              납부완료건수
                            </div>
                            <div className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {company.paidCount}건
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-100 px-3.5 py-3">
                            <div className="whitespace-nowrap text-[11px] font-medium text-gray-500">
                              총 금액
                            </div>
                            <div className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatPayerCurrency(company.totalAmount)}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-100 px-3.5 py-3">
                            <div className="whitespace-nowrap text-[11px] font-medium text-gray-500">
                              미납 잔액
                            </div>
                            <div className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatPayerCurrency(company.unpaidAmount)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {!isStacked ? (
                        <CompanyPaymentDonut
                          paidAmount={company.paidAmount}
                          unpaidAmount={company.unpaidAmount}
                          completionRate={company.completionRate}
                        />
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </article>

      <CompanyPaymentDetailModal
        open={openedCompany !== null}
        company={openedCompany}
        onClose={() => setOpenedCompanyName(null)}
      />
    </>
  )
}
