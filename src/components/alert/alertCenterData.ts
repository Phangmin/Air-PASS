import type { AlertTargetPage, AlertType, AlertRow } from '../../types/ipc'

export type AlertStatus = 'read' | 'unread'

export type AlertItem = {
  id: number
  payerItemId: number | null
  alertType: AlertType
  targetPage: AlertTargetPage
  title: string
  description: string
  status: AlertStatus
  createdAt: string
}

export const ALERT_READ_STATE_EVENT = 'alert-center-read-state-change'

export function dispatchAlertStateChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ALERT_READ_STATE_EVENT))
}

function formatAlertDateTime(value: string) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

function normalizeAlertDescription(value: string) {
  return value.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g,
    (timestamp) => formatAlertDateTime(timestamp).slice(0, 10),
  )
}

function mapAlertRowToItem(row: AlertRow): AlertItem {
  return {
    id: row.id,
    payerItemId: row.violationRecordId,
    alertType: row.alertType,
    targetPage: row.targetPage,
    title: row.title,
    description: normalizeAlertDescription(row.description),
    status: row.status,
    createdAt: formatAlertDateTime(row.occurredAt),
  }
}

export async function listAlerts() {
  const rows = await window.electronAPI.alerts.list()
  return rows.map(mapAlertRowToItem)
}

export async function markAlertAsRead(alertId: number) {
  await window.electronAPI.alerts.markRead(alertId)
  dispatchAlertStateChange()
}

export async function markAlertAsUnread(alertId: number) {
  await window.electronAPI.alerts.markUnread(alertId)
  dispatchAlertStateChange()
}

export async function deleteAlert(alertId: number) {
  await window.electronAPI.alerts.remove(alertId)
  dispatchAlertStateChange()
}

export async function deleteAlerts(alertIds: Iterable<number>) {
  await window.electronAPI.alerts.removeMany(Array.from(new Set(alertIds)))
  dispatchAlertStateChange()
}

export async function getUnreadAlertCount() {
  return window.electronAPI.alerts.unreadCount()
}
