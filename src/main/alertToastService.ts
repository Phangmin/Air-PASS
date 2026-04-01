import { BrowserWindow, Notification } from 'electron'
import {
  ALERTS_CHANGED_CHANNEL,
  ALERTS_OPEN_CENTER_CHANNEL,
  type OpenAlertCenterRequest,
} from '../alerts/events'
import { getResourceAssetPath } from './resourcePaths'
import type { AlertRow } from '../types/ipc'

type AlertToastServiceOptions = {
  getOrCreateMainWindow: () => BrowserWindow
  listAlerts: () => Promise<AlertRow[]>
}

const knownAlertIds = new Set<number>()
let initialized = false

function broadcast(channel: string, payload?: OpenAlertCenterRequest) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send(channel, payload)
  }
}

function focusWindow(window: BrowserWindow) {
  if (window.isMinimized()) {
    window.restore()
  }
  if (!window.isVisible()) {
    window.show()
  }
  window.focus()
}

function openAlertCenterFromToast(
  getOrCreateMainWindow: () => BrowserWindow,
  payload: OpenAlertCenterRequest,
) {
  const window = getOrCreateMainWindow()
  const sendOpenRequest = () => {
    if (window.isDestroyed()) return
    window.webContents.send(ALERTS_OPEN_CENTER_CHANNEL, payload)
  }

  if (window.webContents.isLoadingMainFrame()) {
    window.webContents.once('did-finish-load', sendOpenRequest)
  } else {
    sendOpenRequest()
  }

  focusWindow(window)
}

function getNotificationIconPath() {
  return getResourceAssetPath('korea_gov_logo.ico')
}

function showWindowsToast(
  alert: AlertRow,
  getOrCreateMainWindow: () => BrowserWindow,
) {
  if (process.platform !== 'win32' || !Notification.isSupported()) {
    return
  }

  const notification = new Notification({
    title: alert.title,
    body: alert.description,
    icon: getNotificationIconPath(),
  })

  notification.on('click', () => {
    openAlertCenterFromToast(getOrCreateMainWindow, {
      source: 'system-toast',
      alertId: alert.id,
      violationRecordId: alert.violationRecordId,
    })
  })

  notification.show()
}

function rememberAlerts(alerts: AlertRow[]) {
  for (const alert of alerts) {
    knownAlertIds.add(alert.id)
  }
}

export async function initializeAlertToastService(listAlerts: () => Promise<AlertRow[]>) {
  if (initialized) return
  rememberAlerts(await listAlerts())
  initialized = true
}

export async function syncAlertToasts({
  getOrCreateMainWindow,
  listAlerts,
}: AlertToastServiceOptions) {
  const alerts = await listAlerts()

  if (!initialized) {
    rememberAlerts(alerts)
    initialized = true
    return
  }

  const nextAlerts = alerts.filter((alert) => alert.status === 'unread' && !knownAlertIds.has(alert.id))
  if (!nextAlerts.length) return

  rememberAlerts(nextAlerts)
  broadcast(ALERTS_CHANGED_CHANNEL)

  for (const alert of nextAlerts) {
    showWindowsToast(alert, getOrCreateMainWindow)
  }
}
