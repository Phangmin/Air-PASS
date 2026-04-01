import { useMemo, useRef, useState } from 'react'
import type { PaymentMonthlyReportItem } from '../../utils/paymentDashboard'

type MonthlyPaymentTrendChartProps = {
  items: PaymentMonthlyReportItem[]
  formatCurrency: (value: number) => string
  onSelectSegment?: (options: {
    paymentMonth: string
    paymentStatus: 'paid' | 'unpaid'
  }) => void
}

type TooltipState = {
  index: number
  x: number
  y: number
}

function roundUpToStep(value: number, step: number) {
  if (value <= 0) return step
  return Math.ceil(value / step) * step
}

export default function MonthlyPaymentTrendChart({
  items,
  formatCurrency,
  onSelectSegment,
}: MonthlyPaymentTrendChartProps) {
  const plotRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const amountScaleMax = useMemo(() => {
    const maxAmount = Math.max(...items.map((item) => item.paid + item.unpaid), 0)
    return roundUpToStep(maxAmount, 100000)
  }, [items])

  const amountTicks = useMemo(
    () => [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(amountScaleMax * ratio)),
    [amountScaleMax],
  )

  const ratioTicks = [100, 75, 50, 25, 0]

  const linePoints = useMemo(
    () =>
      items
        .map((item, index) => {
          const total = item.paid + item.unpaid
          const paidRatio = total === 0 ? 0 : (item.paid / total) * 100
          const x = ((index + 0.5) / items.length) * 100
          const y = 100 - paidRatio
          return `${x},${y}`
        })
        .join(' '),
    [items],
  )

  const pointPositions = useMemo(
    () =>
      items.map((item, index) => {
        const total = item.paid + item.unpaid
        const paidRatio = total === 0 ? 0 : (item.paid / total) * 100
        return {
          key: item.month,
          left: `${((index + 0.5) / items.length) * 100}%`,
          top: `${100 - paidRatio}%`,
        }
      }),
    [items],
  )

  const hoveredItem = tooltip ? items[tooltip.index] : null
  const hoveredRatio =
    hoveredItem && hoveredItem.paid + hoveredItem.unpaid > 0
      ? Math.round((hoveredItem.paid / (hoveredItem.paid + hoveredItem.unpaid)) * 100)
      : 0

  return (
    <div className="grid h-[clamp(12rem,24vh,16rem)] grid-cols-[72px_minmax(0,1fr)_56px] gap-3">
      <div className="grid grid-rows-[minmax(0,1fr)_20px] text-[10px] font-medium text-gray-500">
        <div className="flex flex-col justify-between text-left">
          {amountTicks.map((tick, index) => (
            <div key={`amount-tick-${index}`} className="whitespace-nowrap">
              {formatCurrency(tick)}
            </div>
          ))}
        </div>
        <div />
      </div>

      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_20px] gap-2">
        <div ref={plotRef} className="relative min-h-0">
          <div className="absolute inset-0 flex flex-col justify-between">
            {amountTicks.map((_, index) => (
              <div key={`grid-line-${index}`} className="border-t border-dashed border-gray-200" />
            ))}
          </div>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
          >
            <polyline
              fill="none"
              stroke="#111827"
              strokeWidth="0.7"
              strokeDasharray="0.4 1.2"
              strokeLinecap="butt"
              strokeLinejoin="round"
              points={linePoints}
            />
          </svg>

          <div className="pointer-events-none absolute inset-0 z-20">
            {pointPositions.map((point) => (
              <div
                key={`line-point-${point.key}`}
                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#111827]"
                style={{ left: point.left, top: point.top, border: '1px solid #111827' }}
              />
            ))}
          </div>

          <div className="relative z-0 grid h-full grid-cols-6 gap-3">
            {items.map((item, index) => {
              const total = item.paid + item.unpaid
              const totalHeight = amountScaleMax === 0 ? 0 : (total / amountScaleMax) * 100
              const unpaidHeight = total === 0 ? 0 : (item.unpaid / total) * 100
              const paidHeight = 100 - unpaidHeight

              return (
                <div
                  key={item.monthKey}
                  className="flex min-h-0 items-end justify-center"
                  onMouseEnter={(event) => {
                    if (!plotRef.current) return
                    const rect = plotRef.current.getBoundingClientRect()
                    setTooltip({
                      index,
                      x: event.clientX - rect.left,
                      y: event.clientY - rect.top,
                    })
                  }}
                  onMouseMove={(event) => {
                    if (!plotRef.current) return
                    const rect = plotRef.current.getBoundingClientRect()
                    setTooltip({
                      index,
                      x: event.clientX - rect.left,
                      y: event.clientY - rect.top,
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <div className="flex h-full w-full max-w-[2.75rem] flex-col justify-end shadow-sm">
                    <div
                      className="flex flex-col overflow-hidden"
                      style={{ height: `${totalHeight}%` }}
                    >
                      <button
                        type="button"
                        className="block w-full cursor-pointer bg-rose-400 transition hover:brightness-95"
                        style={{ height: `${unpaidHeight}%` }}
                        onClick={() =>
                          onSelectSegment?.({
                            paymentMonth: item.monthKey,
                            paymentStatus: 'unpaid',
                          })
                        }
                        aria-label={`${item.month} 미납 보기`}
                        disabled={item.unpaid <= 0}
                      />
                      <button
                        type="button"
                        className="block w-full cursor-pointer bg-emerald-500 transition hover:brightness-95"
                        style={{ height: `${paidHeight}%` }}
                        onClick={() =>
                          onSelectSegment?.({
                            paymentMonth: item.monthKey,
                            paymentStatus: 'paid',
                          })
                        }
                        aria-label={`${item.month} 납부 보기`}
                        disabled={item.paid <= 0}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {tooltip && hoveredItem ? (
            <div
              className="pointer-events-none absolute z-20 whitespace-nowrap rounded-2xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-lg"
              style={{
                left: `${tooltip.x + 12}px`,
                top: `${Math.max(8, tooltip.y - 52)}px`,
              }}
            >
              <div>{hoveredItem.month}</div>
              <div>납부 {formatCurrency(hoveredItem.paid)}</div>
              <div>미납 {formatCurrency(hoveredItem.unpaid)}</div>
              <div>납부율 {hoveredRatio}%</div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-6 gap-3">
          {items.map((item) => (
            <div key={`month-label-${item.month}`} className="text-center text-xs font-semibold text-gray-900">
              {item.month}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-rows-[minmax(0,1fr)_20px] text-[11px] font-medium text-gray-500">
        <div className="flex flex-col items-end justify-between text-right">
          {ratioTicks.map((tick) => (
            <div key={`ratio-tick-${tick}`}>{tick}%</div>
          ))}
        </div>
        <div />
      </div>
    </div>
  )
}
