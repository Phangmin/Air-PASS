import { useMemo, useState, type KeyboardEvent } from 'react'
import {
  deleteAlert,
  deleteAlerts,
  markAlertAsRead,
  markAlertAsUnread,
  type AlertItem,
} from '../components/alert/alertCenterData'
import PaymentCompletedDateModal from '../components/modals/PaymentCompletedDateModal'
import PayerTargetDetailModal from '../components/modals/PayerTargetDetailModal'
import {
  formatPayerCurrency,
  payerPaymentStatusMeta,
  payerStatusMeta,
} from '../components/payer/payerTargetData'
import type { PayerDocumentId, PayerItem, PaymentTab } from '../components/payer/payerTargetTypes'
import { usePaymentDashboardData } from '../hooks/usePaymentDashboardData'
import type { HistoryDocumentType } from '../types/ipc'

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

function mapDocumentType(documentId: PayerDocumentId): HistoryDocumentType {
  if (documentId === 'opinion-submit') return 'opinion_submit'
  if (documentId === 'final-notice') return 'final_notice'
  if (documentId === 'suspension') return 'suspension'
  return 'pre_notice'
}

type AlertCenterPageProps = {
  alerts: AlertItem[]
  alertsLoaded: boolean
  onOpenHistory?: () => void
}

export default function AlertCenterPage({
  alerts,
  alertsLoaded,
  onOpenHistory,
}: AlertCenterPageProps) {
  const { payerItems, updatePaymentStatus, updatePaymentType, attachDocument } = usePaymentDashboardData()
  const [query, setQuery] = useState('')
  const [selectedDetailItemId, setSelectedDetailItemId] = useState<number | null>(null)
  const [paymentCompletedDateTargetId, setPaymentCompletedDateTargetId] = useState<number | null>(null)

  const filteredAlerts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return alerts

    return alerts.filter((alert) => {
      const sourceItem = payerItems.find((item) => item.id === alert.payerItemId)
      return [alert.title, alert.description, sourceItem?.name, sourceItem?.affiliation]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery))
    })
  }, [alerts, payerItems, query])

  const unreadCount = filteredAlerts.filter((alert) => alert.status === 'unread').length
  const readCount = filteredAlerts.length - unreadCount
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

  const handleOpenAlertDetail = async (alert: AlertItem) => {
    await markAlertAsRead(alert.id)
    if (alert.targetPage === 'history') {
      onOpenHistory?.()
      return
    }
    if (alert.payerItemId === null) return
    setSelectedDetailItemId(alert.payerItemId)
  }

  const handleAlertKeyDown = (event: KeyboardEvent<HTMLDivElement>, alert: AlertItem) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      void handleOpenAlertDetail(alert)
    }
  }

  const handleToggleAlertStatus = async (alert: AlertItem) => {
    if (alert.status === 'read') {
      await markAlertAsUnread(alert.id)
      return
    }
    await markAlertAsRead(alert.id)
  }

  const handleDeleteSingleAlert = async (alert: AlertItem) => {
    if (selectedDetailItemId === alert.payerItemId) {
      setSelectedDetailItemId(null)
    }
    await deleteAlert(alert.id)
  }

  const handleDeleteAllAlerts = async () => {
    if (filteredAlerts.length === 0) return

    if (selectedDetailItemId !== null && filteredAlerts.some((alert) => alert.payerItemId === selectedDetailItemId)) {
      setSelectedDetailItemId(null)
    }

    await deleteAlerts(filteredAlerts.map((alert) => alert.id))
  }

  return (
    <section className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="flex border-l-4 border-[#003764] pl-4 text-2xl font-bold text-gray-900">알림 센터</h2>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
          <button
            type="button"
            onClick={() => {
              void handleDeleteAllAlerts()
            }}
            disabled={filteredAlerts.length === 0}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:border-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            일괄삭제
          </button>
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            >
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="알림 검색"
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 pr-11 text-sm text-gray-700 outline-none transition focus:border-[#003764] focus:ring-2 focus:ring-[#003764]/10 sm:w-80"
            />
          </div>
        </div>
      </div>
      <div className="border border-gray-200" />

      <article className="flex flex-1 flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-lg">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_repeat(3,minmax(0,180px))]">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-sm font-semibold text-[#003764]">알림 운영 현황</div>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              알림을 누르면 상세 내용을 조회할 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">전체 알림</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{filteredAlerts.length}건</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">읽지않음</div>
            <div className="mt-1 text-2xl font-bold text-rose-600">{unreadCount}건</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">읽음</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{readCount}건</div>
          </div>
        </div>

        <div className="mt-4 hidden overflow-hidden rounded-3xl border border-gray-200 xl:block">
          <div className="grid grid-cols-[96px_minmax(0,1.8fr)_140px_88px] gap-3 bg-gray-50 px-5 py-3 text-xs font-semibold tracking-[0.04em] text-gray-500">
            <div>상태</div>
            <div>알림 내용</div>
            <div>발생 시각</div>
            <div className="text-right">관리</div>
          </div>
          {filteredAlerts.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    void handleOpenAlertDetail(alert)
                  }}
                  onKeyDown={(event) => handleAlertKeyDown(event, alert)}
                  className="grid w-full cursor-pointer grid-cols-[96px_minmax(0,1.8fr)_140px_88px] gap-3 px-5 py-4 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleToggleAlertStatus(alert)
                      }}
                      className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta[alert.status].className}`}
                    >
                      {statusMeta[alert.status].label}
                    </button>
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-2 font-semibold text-gray-900">{alert.title}</div>
                    <div className="mt-1 text-sm leading-6 text-gray-500">{alert.description}</div>
                  </div>
                  <div className="flex items-center text-gray-600">{alert.createdAt}</div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleDeleteSingleAlert(alert)
                      }}
                      className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-rose-200 px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-gray-500">
              {alertsLoaded ? '표시할 확정통지서 알림이 없습니다.' : '알림을 불러오는 중입니다.'}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 xl:hidden">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <div
                key={`mobile-${alert.id}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  void handleOpenAlertDetail(alert)
                }}
                onKeyDown={(event) => handleAlertKeyDown(event, alert)}
                className="cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left shadow-sm transition hover:bg-gray-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleToggleAlertStatus(alert)
                    }}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta[alert.status].className}`}
                  >
                    {statusMeta[alert.status].label}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDeleteSingleAlert(alert)
                    }}
                    className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-rose-200 px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    삭제
                  </button>
                </div>
                <h3 className="mt-3 text-sm font-semibold leading-6 text-gray-900">{alert.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{alert.description}</p>
                <div className="mt-3 rounded-2xl bg-white px-3.5 py-3">
                  <div className="text-[11px] font-medium text-gray-500">발생 시각</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{alert.createdAt}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              {alertsLoaded ? '표시할 확정통지서 알림이 없습니다.' : '알림을 불러오는 중입니다.'}
            </div>
          )}
        </div>
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
    </section>
  )
}
