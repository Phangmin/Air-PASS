import { useMemo, useState } from 'react'
import type { PaymentTrendItem } from '../../utils/paymentDashboard'

const rateAxisTicks = [0, 25, 50, 75, 100] as const

const countBarSeries = [
  { key: 'totalTargets', label: '전체 위반건수', color: '#64748b', offset: -24 },
  { key: 'advanceTargets', label: '사전납부 건수', color: '#0ea5e9', offset: -6 },
  { key: 'confirmedTargets', label: '확정납부 건수', color: '#f59e0b', offset: 12 },
] as const

const rateLineSeries = [
  { key: 'totalRate', label: '전체 납부율', color: '#111827' },
  { key: 'advanceRate', label: '사전 납부율', color: '#2563eb' },
  { key: 'confirmedRate', label: '확정 납부율', color: '#dc2626' },
] as const

type CountBarSeriesKey = (typeof countBarSeries)[number]['key']
type RateLineSeriesKey = (typeof rateLineSeries)[number]['key']

type RecentPaymentStatusChartProps = {
  items: PaymentTrendItem[]
  formatCurrency: (value: number) => string
}

function getRateValue(item: PaymentTrendItem, key: RateLineSeriesKey) {
  if (item.totalTargets === 0 || item.amount === 0) return 0
  if (key === 'totalRate') {
    return Math.round((item.paidAmount / item.amount) * 1000) / 10
  }
  if (key === 'advanceRate') {
    return item.advanceAmount === 0 ? 0 : Math.round((item.advancePaidAmount / item.advanceAmount) * 1000) / 10
  }
  return item.confirmedAmount === 0 ? 0 : Math.round((item.confirmedPaidAmount / item.confirmedAmount) * 1000) / 10
}

function getRateSeriesX(index: number, key: RateLineSeriesKey) {
  const groupX = 132 + index * 92

  if (key === 'totalRate') return groupX + countBarSeries[0].offset + 7
  if (key === 'advanceRate') return groupX + countBarSeries[1].offset + 7
  return groupX + countBarSeries[2].offset + 7
}

function getRateLinePath(items: readonly PaymentTrendItem[], key: RateLineSeriesKey) {
  const chartHeight = 168
  return items
    .map((item, index) => {
      const x = getRateSeriesX(index, key)
      const y = 220 - (getRateValue(item, key) / 100) * chartHeight
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

export default function RecentPaymentStatusChart({
  items,
  formatCurrency,
}: RecentPaymentStatusChartProps) {
  const [hoveredTrend, setHoveredTrend] = useState<{ item: PaymentTrendItem; x: number; y: number } | null>(null)

  const maxTotalTargets = useMemo(
    () => Math.max(...items.map((item) => item.totalTargets), 1),
    [items],
  )
  const countAxisTicks = useMemo(
    () => Array.from({ length: 5 }, (_, index) => Math.round((maxTotalTargets / 4) * index)),
    [maxTotalTargets],
  )

  if (items.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
        최근 6개월 납부 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-gray-50 px-4 pb-4 pt-2.5">
      <div className="overflow-x-auto">
        <svg viewBox="0 0 720 256" className="h-[216px] min-w-[680px] w-full">
          {countAxisTicks.map((tick) => {
            const y = 220 - (tick / maxTotalTargets) * 168

            return (
              <g key={tick}>
                <line x1="76" y1={y} x2="676" y2={y} stroke="#dbe4ee" strokeDasharray="4 6" />
                <text x="26" y={y + 4} fontSize="11" fill="#64748b">
                  {tick}건
                </text>
              </g>
            )
          })}

          {rateAxisTicks.map((tick) => {
            const y = 220 - (tick / 100) * 168

            return (
              <g key={tick}>
                <text x="694" y={y + 4} textAnchor="end" fontSize="11" fill="#1d4ed8">
                  {tick}%
                </text>
              </g>
            )
          })}

          {items.map((item, index) => {
            const groupX = 132 + index * 92

            return (
              <g key={item.month}>
                {countBarSeries.map((series) => {
                  const countHeight = (item[series.key as CountBarSeriesKey] / maxTotalTargets) * 168

                  return (
                    <rect
                      key={series.key}
                      x={groupX + series.offset}
                      y={220 - countHeight}
                      width="14"
                      height={countHeight}
                      rx="7"
                      fill={series.color}
                      opacity="0.9"
                    />
                  )
                })}
                <text x={groupX + 3} y="244" textAnchor="middle" fontSize="12" fill="#0f172a">
                  {item.month}
                </text>
              </g>
            )
          })}

          {rateLineSeries.map((series) => (
            <path
              key={series.key}
              d={getRateLinePath(items, series.key)}
              fill="none"
              stroke={series.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {items.map((item, index) =>
            rateLineSeries.map((series) => {
              const x = getRateSeriesX(index, series.key)
              const y = 220 - (getRateValue(item, series.key) / 100) * 168

              return (
                <g key={`${item.month}-${series.key}`}>
                  <circle cx={x} cy={y} r="4.5" fill="white" stroke={series.color} strokeWidth="3" />
                </g>
              )
            }),
          )}

          {items.map((item, index) => {
            const groupX = 132 + index * 92

            return (
              <rect
                key={`${item.month}-hover`}
                x={groupX - 38}
                y="20"
                width="82"
                height="208"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(event) => {
                  const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                  if (!bounds) return
                  setHoveredTrend({
                    item,
                    x: event.clientX - bounds.left,
                    y: event.clientY - bounds.top,
                  })
                }}
                onMouseMove={(event) => {
                  const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                  if (!bounds) return
                  setHoveredTrend({
                    item,
                    x: event.clientX - bounds.left,
                    y: event.clientY - bounds.top,
                  })
                }}
                onMouseLeave={() => setHoveredTrend(null)}
              />
            )
          })}

          <text x="18" y="18" fontSize="11" fill="#64748b">
            건수
          </text>
          <text x="694" y="18" textAnchor="end" fontSize="11" fill="#1d4ed8">
            납부율
          </text>
        </svg>
      </div>

      {hoveredTrend ? (
        <div
          className="pointer-events-none absolute z-20 whitespace-nowrap rounded-2xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-lg"
          style={{
            left: Math.min(hoveredTrend.x + 18, 560),
            top: Math.max(hoveredTrend.y - 12, 24),
            transform: 'translateY(-100%)',
          }}
        >
          <div>{hoveredTrend.item.month}</div>
          <div className="mt-1 text-[11px] font-medium text-gray-200">전체 위반건수 {hoveredTrend.item.totalTargets}건</div>
          <div className="text-[11px] font-medium text-gray-200">사전납부 건수 {hoveredTrend.item.advanceTargets}건</div>
          <div className="text-[11px] font-medium text-gray-200">확정납부 건수 {hoveredTrend.item.confirmedTargets}건</div>
          <div className="mt-1 text-[11px] font-medium text-gray-200">전체 납부율 {getRateValue(hoveredTrend.item, 'totalRate')}%</div>
          <div className="text-[11px] font-medium text-gray-200">사전 납부율 {getRateValue(hoveredTrend.item, 'advanceRate')}%</div>
          <div className="text-[11px] font-medium text-gray-200">확정 납부율 {getRateValue(hoveredTrend.item, 'confirmedRate')}%</div>
          <div className="mt-1 text-[11px] font-medium text-gray-200">총 금액 {formatCurrency(hoveredTrend.item.amount)}</div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-medium text-gray-600">
        {countBarSeries.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
        {rateLineSeries.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
