import { useEffect, useMemo, useState } from 'react'
import RecentPaymentStatusChart from './RecentPaymentStatusChart'
import type { PaymentTab } from '../payer/payerTargetTypes'
import { buildPaymentDashboard, formatPaymentCurrency } from '../../utils/paymentDashboard'
import type { ViolationDocumentRecord } from '../../types/ipc'

type RecentPaymentStatusCardProps = {
  onOpenPayerManagement?: (tab: PaymentTab) => void
}

export default function RecentPaymentStatusCard({
  onOpenPayerManagement,
}: RecentPaymentStatusCardProps) {
  const [records, setRecords] = useState<ViolationDocumentRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const nextRecords = await window.electronAPI.history.list()
        if (mounted) {
          setRecords(nextRecords)
        }
      } catch {
        if (mounted) {
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

  const { trendItems } = useMemo(() => buildPaymentDashboard(records), [records])
  const latestPaymentTrend = trendItems[trendItems.length - 1] ?? {
    month: '',
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

  const latestAdvanceRate =
    latestPaymentTrend.advanceAmount === 0
      ? 0
      : Math.round((latestPaymentTrend.advancePaidAmount / latestPaymentTrend.advanceAmount) * 1000) / 10
  const latestConfirmedRate =
    latestPaymentTrend.confirmedAmount === 0
      ? 0
      : Math.round((latestPaymentTrend.confirmedPaidAmount / latestPaymentTrend.confirmedAmount) * 1000) / 10
  const latestTotalRate =
    latestPaymentTrend.amount === 0
      ? 0
      : Math.round((latestPaymentTrend.paidAmount / latestPaymentTrend.amount) * 1000) / 10

  const buildCardClassName = (toneClassName: string, clickable: boolean) =>
    `rounded-2xl border px-3 py-2 text-left ${
      clickable ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md' : ''
    } ${toneClassName}`

  const summaryCards = [
    {
      key: 'all',
      tab: 'all' as const,
      toneClassName: 'border-slate-200 bg-slate-50',
      badgeClassName: 'bg-slate-600',
      textClassName: 'text-gray-600',
      title: '전체 위반 건수',
      totalCount: latestPaymentTrend.totalTargets,
      amountLabel: '총 금액',
      amountValue: latestPaymentTrend.amount,
      rate: latestTotalRate,
      rateLabel: '평균 납부율',
    },
    {
      key: 'advance',
      tab: 'advance' as const,
      toneClassName: 'border-sky-200 bg-sky-50',
      badgeClassName: 'bg-sky-600',
      textClassName: 'text-sky-800',
      title: '사전납부 건수',
      totalCount: latestPaymentTrend.advanceTargets,
      amountLabel: '납부 금액',
      amountValue: latestPaymentTrend.advancePaidAmount,
      rate: latestAdvanceRate,
      rateLabel: '납부율',
    },
    {
      key: 'confirmed',
      tab: 'confirmed' as const,
      toneClassName: 'border-orange-200 bg-orange-50',
      badgeClassName: 'bg-orange-500',
      textClassName: 'text-orange-800',
      title: '확정납부 건수',
      totalCount: latestPaymentTrend.confirmedTargets,
      amountLabel: '납부 금액',
      amountValue: latestPaymentTrend.confirmedPaidAmount,
      rate: latestConfirmedRate,
      rateLabel: '납부율',
    },
    {
      key: 'completed',
      tab: 'all' as const,
      toneClassName: 'border-emerald-200 bg-emerald-50',
      badgeClassName: 'bg-emerald-600',
      textClassName: 'text-emerald-800',
      title: '완료 건수',
      totalCount: latestPaymentTrend.totalPaidTargets,
      amountLabel: '총 납부 금액',
      amountValue: latestPaymentTrend.paidAmount,
      rate: latestTotalRate,
      rateLabel: '평균 납부율',
    },
  ]

  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-lg md:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#003764]">최근 6개월 납부 상태</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {summaryCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={buildCardClassName(card.toneClassName, Boolean(onOpenPayerManagement))}
              onClick={() => onOpenPayerManagement?.(card.tab)}
            >
              <div
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${card.badgeClassName}`}
              >
                {card.title}
              </div>
              <div className="mt-1 flex items-start gap-4">
                <div className="text-2xl font-bold text-gray-900">{card.totalCount}건</div>
                <div className={`flex flex-col gap-1 pb-0.5 text-[11px] ${card.textClassName}`}>
                  <div>
                    {card.amountLabel} {formatPaymentCurrency(card.amountValue)}
                  </div>
                  <div>
                    {card.rateLabel} {card.rate}%
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
          납부 통계를 불러오는 중입니다.
        </div>
      ) : (
        <RecentPaymentStatusChart items={trendItems} formatCurrency={formatPaymentCurrency} />
      )}
    </article>
  )
}
