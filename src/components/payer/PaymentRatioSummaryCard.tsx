import { PAYMENT_TABS } from './PaymentTabSwitcher'
import type { PaymentTab } from './payerTargetTypes'
import type { PaymentMonthlyReportItem, PaymentTrendItem } from '../../utils/paymentDashboard'

const chartTitles = {
  all: '최근 6개월 이내 전체 납부 비중 요약',
  advance: '최근 6개월 이내 사전납부 비중 요약',
  confirmed: '최근 6개월 이내 확정납부 비중 요약',
} as const

type DonutSegment = {
  label: string
  color: string
  ratio: number
}

type PaymentRatioSummaryCardProps = {
  activeTab: PaymentTab
  latestMonthly: PaymentMonthlyReportItem
  latestTrend?: PaymentTrendItem
  onOpenTargetManagement: (options: {
    tab: PaymentTab
    paymentMonth: string
    paymentStatus: 'all' | 'paid' | 'unpaid'
  }) => void
}

function DonutRing({
  radius,
  strokeWidth,
  segments,
  onSelectSegment,
}: {
  radius: number
  strokeWidth: number
  segments: DonutSegment[]
  onSelectSegment?: (label: DonutSegment['label']) => void
}) {
  const circumference = 2 * Math.PI * radius
  let accumulatedRatio = 0

  return (
    <>
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      {segments.map((segment) => {
        const safeRatio = Number.isFinite(segment.ratio) ? Math.max(0, Math.min(1, segment.ratio)) : 0
        const dashoffset = -circumference * accumulatedRatio
        accumulatedRatio += safeRatio

        if (safeRatio <= 0) return null

        return (
          <circle
            key={`${segment.label}-${radius}`}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * safeRatio} ${circumference}`}
            strokeDashoffset={dashoffset}
            strokeLinecap="butt"
            className={onSelectSegment ? 'cursor-pointer' : undefined}
            onClick={() => onSelectSegment?.(segment.label)}
          />
        )
      })}
    </>
  )
}

export default function PaymentRatioSummaryCard({
  activeTab,
  latestMonthly,
  latestTrend,
  onOpenTargetManagement,
}: PaymentRatioSummaryCardProps) {
  const latestTotal = latestMonthly.paid + latestMonthly.unpaid
  const outerRadius = activeTab === 'all' ? 52 : 46
  const innerRadius = 34
  const paidRatio = latestTotal === 0 ? 0 : latestMonthly.paid / latestTotal
  const unpaidRatio = latestTotal === 0 ? 0 : latestMonthly.unpaid / latestTotal
  const advanceRatio =
    latestTrend && latestTrend.amount > 0 ? latestTrend.advanceAmount / latestTrend.amount : 0
  const confirmedRatio =
    latestTrend && latestTrend.amount > 0 ? latestTrend.confirmedAmount / latestTrend.amount : 0
  const donutTabLabel = PAYMENT_TABS.find((tab) => tab.id === activeTab)?.label

  const legendItems =
    activeTab === 'all'
      ? [
          { label: '납부완료', color: '#10b981', value: Math.round(paidRatio * 100) },
          { label: '미납', color: '#fb7185', value: Math.round(unpaidRatio * 100) },
          { label: '사전납부', color: '#0ea5e9', value: Math.round(advanceRatio * 100) },
          { label: '확정납부', color: '#f59e0b', value: Math.round(confirmedRatio * 100) },
        ]
      : [
          { label: '납부완료', color: '#10b981', value: Math.round(paidRatio * 100) },
          { label: '미납', color: '#fb7185', value: Math.round(unpaidRatio * 100) },
        ]

  const openTargetManagement = (label: string, paymentMonth: string) => {
    if (label === '납부완료') {
      onOpenTargetManagement({
        tab: activeTab,
        paymentMonth,
        paymentStatus: 'paid',
      })
      return
    }

    if (label === '미납') {
      onOpenTargetManagement({
        tab: activeTab,
        paymentMonth,
        paymentStatus: 'unpaid',
      })
      return
    }

    if (label === '사전납부') {
      onOpenTargetManagement({
        tab: 'advance',
        paymentMonth,
        paymentStatus: 'all',
      })
      return
    }

    if (label === '확정납부') {
      onOpenTargetManagement({
        tab: 'confirmed',
        paymentMonth,
        paymentStatus: 'all',
      })
    }
  }

  const handleSelectDonutSegment = (label: string) => {
    openTargetManagement(label, '')
  }

  const handleSelectLegendItem = (label: string) => {
    openTargetManagement(label, '')
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:min-h-0 lg:h-full">
      <div className="text-sm font-semibold text-gray-900">{chartTitles[activeTab]}</div>
      <div className="mt-4 flex justify-center">
        <div className="relative h-72 w-72">
          <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90 overflow-visible">
            <DonutRing
              radius={outerRadius}
              strokeWidth={12}
              segments={[
                { label: '납부완료', color: '#10b981', ratio: paidRatio },
                { label: '미납', color: '#fb7185', ratio: unpaidRatio },
              ]}
              onSelectSegment={handleSelectDonutSegment}
            />
            {activeTab === 'all' ? (
              <DonutRing
                radius={innerRadius}
                strokeWidth={12}
                segments={[
                  { label: '사전납부', color: '#0ea5e9', ratio: advanceRatio },
                  { label: '확정납부', color: '#f59e0b', ratio: confirmedRatio },
                ]}
                onSelectSegment={handleSelectDonutSegment}
              />
            ) : null}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-[10px] font-medium tracking-[0.18em] text-gray-400">{donutTabLabel}</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{Math.round(paidRatio * 100)}%</div>
            <div className="text-xs text-gray-500">납부율</div>
          </div>
        </div>
      </div>
      <div className={`mt-4 grid gap-2 ${activeTab === 'all' ? 'sm:grid-cols-2' : ''}`}>
        {legendItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex cursor-pointer items-center justify-between rounded-2xl bg-white px-3.5 py-3 text-left transition hover:border-[#003764] hover:text-[#003764]"
            onClick={() => handleSelectLegendItem(item.label)}
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-medium text-gray-600">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}
