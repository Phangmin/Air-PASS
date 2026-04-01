import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PaymentTab, PayerItem } from '../components/payer/payerTargetTypes'
import type {
  HistoryDocumentType,
  HistoryEditFields,
  ViolationDocumentRecord,
} from '../types/ipc'
import { buildPaymentDashboard } from '../utils/paymentDashboard'

function buildPaymentStatusFields(
  item: PayerItem,
  nextPaymentStatus: PayerItem['paymentStatus'],
  paymentCompletedAt?: string | null,
): HistoryEditFields {
  const fields: HistoryEditFields = {
    updatedAt: paymentCompletedAt ?? new Date().toISOString(),
  }

  if (item.status === 'advance') {
    fields.advancePaymentStatus = nextPaymentStatus
  } else {
    fields.confirmedPaymentStatus = nextPaymentStatus
  }

  return fields
}

export function usePaymentDashboardData() {
  const [records, setRecords] = useState<ViolationDocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const nextRecords = await window.electronAPI.history.list()
      setRecords(nextRecords)
    } catch (nextError) {
      setError((nextError as Error).message)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const dashboard = useMemo(() => buildPaymentDashboard(records), [records])

  const updatePaymentType = useCallback(
    async (item: PayerItem, nextPaymentType: Exclude<PaymentTab, 'all'>) => {
      await window.electronAPI.history.edit({
        id: item.historyId,
        fields: {
          paymentType: nextPaymentType,
          updatedAt: new Date().toISOString(),
        },
      })
      await reload()
    },
    [reload],
  )

  const updatePaymentStatus = useCallback(
    async (
      item: PayerItem,
      nextPaymentStatus: PayerItem['paymentStatus'],
      paymentCompletedAt?: string | null,
    ) => {
      await window.electronAPI.history.edit({
        id: item.historyId,
        fields: buildPaymentStatusFields(item, nextPaymentStatus, paymentCompletedAt),
      })
      await reload()
    },
    [reload],
  )

  const attachDocument = useCallback(
    async (violationRecordId: number, documentType: HistoryDocumentType) => {
      const result = await window.electronAPI.history.attachDocument({
        violationRecordId,
        documentType,
      })
      if (result) {
        await reload()
      }
      return result
    },
    [reload],
  )

  const generateDocument = useCallback(
    async (
      violationRecordId: number,
      outputDir: string,
      documentType: Extract<HistoryDocumentType, 'pre_notice' | 'suspension' | 'final_notice'>,
    ) => {
      const result = await window.electronAPI.history.generateDocument({
        violationRecordId,
        documentType,
        outputDir,
      })
      await reload()
      return result
    },
    [reload],
  )

  return {
    records,
    loading,
    error,
    reload,
    ...dashboard,
    updatePaymentType,
    updatePaymentStatus,
    attachDocument,
    generateDocument,
  }
}
