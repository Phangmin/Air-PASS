import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ALERT_READ_STATE_EVENT,
  listAlerts,
  type AlertItem,
} from '../components/alert/alertCenterData'

export function useAlertCenterState() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [alertsLoaded, setAlertsLoaded] = useState(false)

  const reloadAlerts = useCallback(async () => {
    try {
      const nextAlerts = await listAlerts()
      setAlerts(nextAlerts)
      setAlertsLoaded(true)
    } catch {
      setAlertsLoaded(true)
    }
  }, [])

  useEffect(() => {
    void reloadAlerts()

    const unsubscribeChanged = window.electronAPI.alerts.onChanged(() => {
      void reloadAlerts()
    })
    const handleWindowFocus = () => {
      void reloadAlerts()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reloadAlerts()
      }
    }

    window.addEventListener(ALERT_READ_STATE_EVENT, handleWindowFocus)
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      unsubscribeChanged()
      window.removeEventListener(ALERT_READ_STATE_EVENT, handleWindowFocus)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [reloadAlerts])

  const unreadAlertCount = useMemo(
    () => alerts.filter((alert) => alert.status === 'unread').length,
    [alerts],
  )

  return {
    alerts,
    alertsLoaded,
    reloadAlerts,
    unreadAlertCount,
  }
}
