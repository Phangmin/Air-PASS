import { useEffect, useMemo, useState } from 'react'
import PaymentTabSwitcher from '../components/payer/PaymentTabSwitcher'
import PayerAffiliationStatusPanel from '../components/payer/PayerAffiliationStatusPanel'
import PaymentRatioSummaryCard from '../components/payer/PaymentRatioSummaryCard'
import PaymentTrendSummaryCard from '../components/payer/PaymentTrendSummaryCard'
import type { PaymentTab } from '../components/payer/payerTargetTypes'
import type { PayerManagementFilterValue } from '../components/searches/PayerManagementFilter'
import type { ViolationDocumentRecord } from '../types/ipc'
import {
  buildPaymentDashboard,
  formatPaymentCurrency,
} from '../utils/paymentDashboard'

const formatCurrency = (value: number) => formatPaymentCurrency(value)

const buildSummary = <
  T extends {
    amountValue: number
    paymentStatus: 'unpaid' | 'paid'
  },
>(
  items: T[],
) => ({
  count: items.length,
  unpaidAmount: items
    .filter((item) => item.paymentStatus === 'unpaid')
    .reduce((sum, item) => sum + item.amountValue, 0),
  paidAmount: items
    .filter((item) => item.paymentStatus === 'paid')
    .reduce((sum, item) => sum + item.amountValue, 0),
})

type ReportGroup = {
  label: string
  summary: ReturnType<typeof buildSummary>
  tone: string
  tab?: PaymentTab | null
  paymentStatus?: 'all' | 'paid' | 'unpaid'
}

type PayerManagementPageProps = {
  initialTab?: PaymentTab
  onOpenPayerTargetManagement?: (options: {
    tab?: PaymentTab
    filterValue?: Partial<PayerManagementFilterValue>
  }) => void
}

const sectionTitles = {
  all: '전체 납부 상태 리포트',
  advance: '사전납부 상태 리포트',
  confirmed: '확정납부 상태 리포트',
} as const

export default function PayerManagementPage({
  initialTab = 'all',
  onOpenPayerTargetManagement,
}: PayerManagementPageProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>(initialTab)
  const [isListExpanded, setIsListExpanded] = useState(false)
  const [records, setRecords] = useState<ViolationDocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const nextRecords = await window.electronAPI.history.list()
        if (mounted) {
          setRecords(nextRecords)
        }
      } catch (nextError) {
        if (mounted) {
          setError((nextError as Error).message)
          setRecords([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const { payerItems, monthlyReports, trendItems } = useMemo(
    () => buildPaymentDashboard(records),
    [records],
  )

  const filteredItems = useMemo(
    () =>
      activeTab === 'all'
        ? payerItems
        : payerItems.filter((item) => item.status === activeTab),
    [activeTab, payerItems],
  )

  const allSummary = buildSummary(payerItems)
  const advanceSummary = buildSummary(payerItems.filter((item) => item.status === 'advance'))
  const confirmedSummary = buildSummary(payerItems.filter((item) => item.status === 'confirmed'))
  const currentMonthlyReport = monthlyReports[activeTab]
  const latestTrend = trendItems[trendItems.length - 1]

  const allTabReportGroups: ReportGroup[] = [
    { label: '전체', summary: allSummary, tone: 'border-gray-200 bg-gray-50', tab: null },
    {
      label: '사전납부',
      summary: advanceSummary,
      tone: 'border-sky-200 bg-sky-50',
      tab: 'advance',
    },
    {
      label: '확정납부',
      summary: confirmedSummary,
      tone: 'border-amber-200 bg-amber-50',
      tab: 'confirmed',
    },
  ]

  const currentTabReportGroups: ReportGroup[] = [
    {
      label: '전체',
      summary: buildSummary(filteredItems),
      tone: activeTab === 'advance' ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50',
      paymentStatus: 'all',
    },
    {
      label: '미납',
      summary: buildSummary(filteredItems.filter((item) => item.paymentStatus === 'unpaid')),
      tone: 'border-rose-200 bg-rose-50',
      paymentStatus: 'unpaid',
    },
    {
      label: '납부완료',
      summary: buildSummary(filteredItems.filter((item) => item.paymentStatus === 'paid')),
      tone: 'border-emerald-200 bg-emerald-50',
      paymentStatus: 'paid',
    },
  ]

  const latestMonthly = currentMonthlyReport[currentMonthlyReport.length - 1] ?? {
    monthKey: '',
    month: '',
    paid: 0,
    unpaid: 0,
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="flex border-l-4 border-[#003764] pl-4 text-2xl font-bold text-gray-900">
          납부 상태 리포트
        </h2>
        <PaymentTabSwitcher activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <div className="border border-gray-200" />

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="relative min-h-0 flex-1 gap-4 xl:grid xl:h-[calc(100vh-220px)] xl:grid-cols-[minmax(0,2fr)_320px]">
        <article className="flex h-full min-h-0 flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-lg xl:overflow-y-auto">
          <div className="mb-3 text-sm font-semibold text-[#003764]">{sectionTitles[activeTab]}</div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
              납부 리포트를 불러오는 중입니다.
            </div>
          ) : payerItems.length === 0 ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
              납부 대상 위반 기록이 없습니다.
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                {(activeTab === 'all' ? allTabReportGroups : currentTabReportGroups).map((group) => (
                  <button
                    key={group.label}
                    type="button"
                    onClick={
                      activeTab === 'all'
                        ? group.tab
                          ? () => setActiveTab(group.tab)
                          : undefined
                        : () =>
                            onOpenPayerTargetManagement?.({
                              tab: activeTab,
                              filterValue: {
                                paymentMonth: '',
                                paymentStatus: group.paymentStatus ?? 'all',
                              },
                            })
                    }
                    className={`flex h-full flex-col rounded-2xl border px-4 py-4 text-left ${
                      activeTab === 'all'
                        ? group.tab
                          ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md'
                          : 'cursor-default'
                        : 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md'
                    } ${group.tone}`}
                  >
                    <div className="mb-3 text-sm font-semibold text-gray-900">{group.label}</div>
                    <div className="flex flex-1 flex-col gap-2.5">
                      <div className="rounded-2xl bg-white px-3.5 py-3">
                        <div className="text-[11px] font-medium text-gray-500">건수</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">{group.summary.count}건</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3.5 py-3">
                        <div className="text-[11px] font-medium text-gray-500">미납금액</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">
                          {formatCurrency(group.summary.unpaidAmount)}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white px-3.5 py-3">
                        <div className="text-[11px] font-medium text-gray-500">납부금액</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">
                          {formatCurrency(group.summary.paidAmount)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid flex-1 gap-3 lg:min-h-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <PaymentTrendSummaryCard
                  activeTab={activeTab}
                  items={currentMonthlyReport}
                  formatCurrency={formatCurrency}
                  onOpenTargetManagement={({ tab, paymentMonth, paymentStatus }) =>
                    onOpenPayerTargetManagement?.({
                      tab,
                      filterValue: {
                        paymentMonth,
                        paymentStatus,
                      },
                    })
                  }
                />

                <PaymentRatioSummaryCard
                  activeTab={activeTab}
                  latestMonthly={latestMonthly}
                  latestTrend={latestTrend}
                  onOpenTargetManagement={({ tab, paymentMonth, paymentStatus }) =>
                    onOpenPayerTargetManagement?.({
                      tab,
                      filterValue: {
                        paymentMonth,
                        paymentStatus,
                      },
                    })
                  }
                />
              </div>
            </>
          )}
        </article>

        <div className="hidden h-full xl:block" aria-hidden="true" />

        <PayerAffiliationStatusPanel
          items={filteredItems}
          isExpanded={isListExpanded}
          onToggleExpand={() => setIsListExpanded((prev) => !prev)}
        />
      </div>
    </section>
  )
}
