import { useEffect } from 'react'
import { dispatchAlertStateChange } from '../components/alert/alertCenterData'

type UseAlertCenterBridgeOptions = {
  onOpenAlertCenter: () => void
}

export function useAlertCenterBridge({ onOpenAlertCenter }: UseAlertCenterBridgeOptions) {
  useEffect(() => {
    const unsubscribeChanged = window.electronAPI.alerts.onChanged(() => {
      dispatchAlertStateChange()
    })
    const unsubscribeOpenCenter = window.electronAPI.alerts.onOpenCenter(() => {
      onOpenAlertCenter()
    })

    return () => {
      unsubscribeChanged()
      unsubscribeOpenCenter()
    }
  }, [onOpenAlertCenter])
}
