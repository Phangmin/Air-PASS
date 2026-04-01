import { useState } from 'react'
import MonthlyPaymentTrendChart from './MonthlyPaymentTrendChart'
import type { PaymentTab } from './payerTargetTypes'
import type { PaymentMonthlyReportItem } from '../../utils/paymentDashboard'

type PaymentStatusFilter = 'all' | 'paid' | 'unpaid'

type PaymentTrendSummaryCardProps = {
  activeTab: PaymentTab
  items: PaymentMonthlyReportItem[]
  formatCurrency: (value: number) => string
  onOpenTargetManagement: (options: {
    tab: PaymentTab
    paymentMonth: string
    paymentStatus: PaymentStatusFilter
  }) => void
}

const sectionTitles = {
  all: '최근 6개월 이내 전체 납부 추이',
  advance: '최근 6개월 이내 사전납부 추이',
  confirmed: '최근 6개월 이내 확정납부 추이',
} as const

export default function PaymentTrendSummaryCard({
  activeTab,
  items,
  formatCurrency,
  onOpenTargetManagement,
}: PaymentTrendSummaryCardProps) {
  const [hoveredLegend, setHoveredLegend] = useState<'paid' | 'unpaid' | null>(null)
  const totalPaidAmount = items.reduce((sum, item) => sum + item.paid, 0)
  const totalUnpaidAmount = items.reduce((sum, item) => sum + item.unpaid, 0)

  return (
    <div className="flex rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:min-h-0 lg:h-full lg:flex-col lg:justify-between">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">{sectionTitles[activeTab]}</div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-gray-500">
          <div
            className="relative"
            onMouseEnter={() => setHoveredLegend('paid')}
            onMouseLeave={() => setHoveredLegend(null)}
          >
            <span className="flex cursor-default items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              납부
            </span>
            {hoveredLegend === 'paid' ? (
              <div className="absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-lg">
                납부금액 {formatCurrency(totalPaidAmount)}
              </div>
            ) : null}
          </div>
          <div
            className="relative"
            onMouseEnter={() => setHoveredLegend('unpaid')}
            onMouseLeave={() => setHoveredLegend(null)}
          >
            <span className="flex cursor-default items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              미납
            </span>
            {hoveredLegend === 'unpaid' ? (
              <div className="absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-lg">
                미납금액 {formatCurrency(totalUnpaidAmount)}
              </div>
            ) : null}
          </div>
          <span className="flex cursor-default items-center gap-1.5">
            <span
              className="h-px w-3"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to right, #111827 0 2px, transparent 2px 3px)',
              }}
            />
            납부율
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col justify-between lg:min-h-0">
        <MonthlyPaymentTrendChart
          items={[...items]}
          formatCurrency={formatCurrency}
          onSelectSegment={({ paymentMonth, paymentStatus }) =>
            onOpenTargetManagement({
              tab: activeTab,
              paymentMonth,
              paymentStatus,
            })
          }
        />
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500">
            <div>구분</div>
            {items.map((item) => (
              <button
                key={`month-${item.monthKey}`}
                type="button"
                className="cursor-pointer text-center hover:text-[#003764]"
                onClick={() =>
                  onOpenTargetManagement({
                    tab: activeTab,
                    paymentMonth: item.monthKey,
                    paymentStatus: 'all',
                  })
                }
              >
                {item.month}
              </button>
            ))}
          </div>
          <div className="divide-y divide-gray-100 text-[11px] text-gray-700">
            <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] px-3 py-2">
              <div className="font-semibold text-gray-900">납부</div>
              {items.map((item) => (
                <button
                  key={`paid-${item.monthKey}`}
                  type="button"
                  className="cursor-pointer truncate text-center hover:text-[#003764]"
                  onClick={() =>
                    onOpenTargetManagement({
                      tab: activeTab,
                      paymentMonth: item.monthKey,
                      paymentStatus: 'paid',
                    })
                  }
                >
                  {formatCurrency(item.paid)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] px-3 py-2">
              <div className="font-semibold text-gray-900">미납</div>
              {items.map((item) => (
                <button
                  key={`unpaid-${item.monthKey}`}
                  type="button"
                  className="cursor-pointer truncate text-center hover:text-[#003764]"
                  onClick={() =>
                    onOpenTargetManagement({
                      tab: activeTab,
                      paymentMonth: item.monthKey,
                      paymentStatus: 'unpaid',
                    })
                  }
                >
                  {formatCurrency(item.unpaid)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] px-3 py-2">
              <div className="font-semibold text-gray-900">납부율</div>
              {items.map((item) => {
                const total = item.paid + item.unpaid
                const monthlyPaidRatio = total === 0 ? 0 : Math.round((item.paid / total) * 100)

                return (
                  <div key={`ratio-${item.monthKey}`} className="text-center font-semibold text-gray-900">
                    {monthlyPaidRatio}%
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
