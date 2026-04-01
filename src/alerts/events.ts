export const ALERTS_CHANGED_CHANNEL = 'alerts:changed'
export const ALERTS_OPEN_CENTER_CHANNEL = 'alerts:open-center'

export type OpenAlertCenterRequest = {
  source: 'system-toast'
  alertId: number
  violationRecordId: number
}
