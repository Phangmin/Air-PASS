import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ALERT_READ_STATE_EVENT,
  listAlerts,
  markAlertAsRead,
  type AlertItem,
} from '../alert/alertCenterData'
import PaymentCompletedDateModal from '../modals/PaymentCompletedDateModal'
import PayerTargetDetailModal from '../modals/PayerTargetDetailModal'
import {
  formatPayerCurrency,
  payerPaymentStatusMeta,
  payerStatusMeta,
} from '../payer/payerTargetData'
import type { PayerDocumentId, PayerItem, PaymentTab } from '../payer/payerTargetTypes'
import { usePaymentDashboardData } from '../../hooks/usePaymentDashboardData'
import type { HistoryDocumentType } from '../../types/ipc'

const statusMeta = {
  unread: {
    label: '읽지않음',
    className: 'bg-rose-100 text-rose-700',
  },
  read: {
    label: '읽음',
    className: 'bg-gray-100 text-gray-700',
  },
} as const

type HomeAlertCenterCardProps = {
  onOpenAlertCenter?: () => void
  onOpenHistory?: () => void
}

export default function HomeAlertCenterCard({ onOpenAlertCenter, onOpenHistory }: HomeAlertCenterCardProps) {
  const { payerItems, loading, updatePaymentStatus, updatePaymentType, attachDocument } = usePaymentDashboardData()
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [selectedDetailItemId, setSelectedDetailItemId] = useState<number | null>(null)
  const [paymentCompletedDateTargetId, setPaymentCompletedDateTargetId] = useState<number | null>(null)

  const reloadAlerts = useCallback(async () => {
    const nextAlerts = await listAlerts()
    setAlerts(nextAlerts)
  }, [])

  useEffect(() => {
    void reloadAlerts()
  }, [reloadAlerts])

  useEffect(() => {
    const syncAlerts = () => {
      void reloadAlerts()
    }

    window.addEventListener(ALERT_READ_STATE_EVENT, syncAlerts)
    return () => window.removeEventListener(ALERT_READ_STATE_EVENT, syncAlerts)
  }, [reloadAlerts])

  const alertItems = useMemo(
    () => alerts.filter((item) => item.status === 'unread').slice(0, 2),
    [alerts],
  )
  const selectedDetailItem = payerItems.find((item) => item.id === selectedDetailItemId) ?? null
  const paymentCompletedDateTarget =
    payerItems.find((item) => item.id === paymentCompletedDateTargetId) ?? null

  const handleStatusChange = async (id: number, nextStatus: Exclude<PaymentTab, 'all'>) => {
    const targetItem = payerItems.find((item) => item.id === id)
    if (!targetItem) return
    await updatePaymentType(targetItem, nextStatus)
  }

  const handleRequestPaymentStatusChange = async (
    id: number,
    nextPaymentStatus: PayerItem['paymentStatus'],
  ) => {
    const targetItem = payerItems.find((item) => item.id === id)
    if (!targetItem) return

    if (nextPaymentStatus === 'paid') {
      setPaymentCompletedDateTargetId(id)
      return
    }

    await updatePaymentStatus(targetItem, 'unpaid', null)
  }

  const handleConfirmPaymentCompletedDate = async (date: string) => {
    if (paymentCompletedDateTargetId === null) return
    const targetItem = payerItems.find((item) => item.id === paymentCompletedDateTargetId)
    if (!targetItem) return
    await updatePaymentStatus(targetItem, 'paid', date)
    setPaymentCompletedDateTargetId(null)
  }

  const handleOpenDocument = async (filePath: string) => {
    try {
      await window.electronAPI.history.open(filePath)
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const handleAttachDocument = async (item: PayerItem, documentType: HistoryDocumentType) => {
    try {
      await attachDocument(item.id, documentType)
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const mapDocumentType = (documentId: PayerDocumentId): HistoryDocumentType => {
    if (documentId === 'opinion-submit') return 'opinion_submit'
    if (documentId === 'final-notice') return 'final_notice'
    if (documentId === 'suspension') return 'suspension'
    return 'pre_notice'
  }

  const handleOpenAlertDetail = async (alert: AlertItem) => {
    await markAlertAsRead(alert.id)
    if (alert.targetPage === 'history') {
      onOpenHistory?.()
      return
    }
    if (alert.payerItemId === null) return
    setSelectedDetailItemId(alert.payerItemId)
  }

  return (
    <>
      <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-[#003764]">알림센터</div>
          <button
            type="button"
            onClick={onOpenAlertCenter}
            className="group inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-500 transition hover:border-[#003764] hover:bg-[#003764] hover:text-white"
            aria-label="알림센터 페이지로 이동"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none">
              <path
                d="M7 4l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
            알림을 불러오는 중입니다.
          </div>
        ) : alertItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {alertItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  void handleOpenAlertDetail(item)
                }}
                className="cursor-pointer rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-slate-100 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta[item.status].className}`}
                  >
                    {statusMeta[item.status].label}
                  </span>
                  <div className="text-xs text-gray-500">{item.createdAt}</div>
                </div>
                <div className="mt-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-inset ring-white">
                  <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-gray-600">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-sm text-gray-500">
            읽지않은 알림이 없습니다.
          </div>
        )}
      </article>

      <PayerTargetDetailModal
        open={selectedDetailItem !== null}
        item={selectedDetailItem}
        formatCurrency={formatPayerCurrency}
        statusMeta={selectedDetailItem ? payerStatusMeta[selectedDetailItem.status] : payerStatusMeta.advance}
        paymentStatusMeta={
          selectedDetailItem
            ? payerPaymentStatusMeta[selectedDetailItem.paymentStatus]
            : payerPaymentStatusMeta.unpaid
        }
        onClose={() => setSelectedDetailItemId(null)}
        onOpenDocument={handleOpenDocument}
        onAttachDocument={(id, documentId) => {
          const targetItem = payerItems.find((item) => item.id === id)
          if (!targetItem) return
          void handleAttachDocument(targetItem, mapDocumentType(documentId))
        }}
        onChangeStatus={(id, nextStatus) => {
          void handleStatusChange(id, nextStatus)
        }}
        onChangePaymentStatus={(id, nextPaymentStatus) => {
          void handleRequestPaymentStatusChange(id, nextPaymentStatus)
        }}
      />

      <PaymentCompletedDateModal
        open={paymentCompletedDateTarget !== null}
        payerName={paymentCompletedDateTarget?.name ?? ''}
        initialDate={paymentCompletedDateTarget?.paymentCompletedAt ?? null}
        onClose={() => setPaymentCompletedDateTargetId(null)}
        onConfirm={(date) => {
          void handleConfirmPaymentCompletedDate(date)
        }}
      />
    </>
  )
}
