// src/App.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import HomePage from './pages/HomePage'
import AlertCenterPage from './pages/AlertCenterPage'
import UserInfoUpdatePage from './pages/UserInfoUpdatePage'
import GeneratePage from './pages/GeneratePage'
import TemplatesPage from './pages/TemplatesPage'
import HistoryPage, { type HistoryTab } from './pages/HistoryPage'
import PayerManagementPage from './pages/PayerManagementPage'
import PayerTargetManagementPage from './pages/PayerTargetManagementPage'
import CompanyPaymentManagementPage from './pages/CompanyPaymentManagementPage'
import SettingsPage from './pages/SettingsPage'
import SidebarNav from './components/SidebarNav'
import TitleBar from './components/TitleBar'
import type { PayerManagementFilterValue } from './components/searches/PayerManagementFilter'
import type { QuickMenuSetting, User } from './types/ipc'
import MoveWarningModal from './components/modals/MoveWarningModal'
import type { PaymentTab } from './components/payer/payerTargetTypes'
import { useAlertCenterBridge } from './hooks/useAlertCenterBridge'
import { useAlertCenterState } from './hooks/useAlertCenterState'

export type PageKey =
  | 'home'
  | 'alertcenter'
  | 'userinfoupdate'
  | 'generate'
  | 'templates'
  | 'history'
  | 'payermanagement'
  | 'payertargetmanagement'
  | 'companypaymentmanagement'
  | 'settings'

function hasSavedUser(user: User | null) {
  if (!user) return false
  return Object.values(user).some((value) => value.trim().length > 0)
}

const defaultQuickMenuSettings: QuickMenuSetting[] = [
  { id: 'generate', visible: true },
  { id: 'payermanagement', visible: true },
  { id: 'payertargetmanagement', visible: false },
  { id: 'companypaymentmanagement', visible: false },
  { id: 'history', visible: true },
  { id: 'settings', visible: true },
]

export default function App() {
  const [page, setPage] = useState<PageKey>('home')
  const [historyTab, setHistoryTab] = useState<HistoryTab>('all')
  const [payerManagementTab, setPayerManagementTab] = useState<PaymentTab>('all')
  const [payerTargetTab, setPayerTargetTab] = useState<PaymentTab>('all')
  const [payerTargetFilterValue, setPayerTargetFilterValue] = useState<Partial<PayerManagementFilterValue>>({})
  const [user, setUser] = useState<User | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [defaultOutputDir, setDefaultOutputDir] = useState<string | null>(null)
  const [quickMenuSettings, setQuickMenuSettings] = useState<QuickMenuSetting[]>(defaultQuickMenuSettings)
  const [quickMenuEditorHighlightSignal, setQuickMenuEditorHighlightSignal] = useState(0)
  const [pendingPage, setPendingPage] = useState<PageKey | null>(null)
  const [moveWarningMessage, setMoveWarningMessage] = useState<string | null>(null)
  const [warningOpen, setWarningOpen] = useState(false)
  const { alerts, alertsLoaded, unreadAlertCount } = useAlertCenterState()

  useEffect(() => {
    let mounted = true
    window.electronAPI.user
      .get()
      .then((savedUser) => {
        if (mounted) {
          setUser(savedUser)
          setUserLoaded(true)
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null)
          setUserLoaded(true)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!userLoaded) return
    if (hasSavedUser(user)) {
      return
    }

    setMoveWarningMessage(null)
    setPendingPage(null)
    setWarningOpen(false)
    setPage('userinfoupdate')
  }, [user, userLoaded])

  useEffect(() => {
    let mounted = true
    window.electronAPI.settings
      .getDefaultOutputDir()
      .then((dir) => {
        if (mounted) setDefaultOutputDir(dir)
      })
      .catch(() => {
        if (mounted) setDefaultOutputDir(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    window.electronAPI.settings
      .getQuickMenuSettings()
      .then((value) => {
        if (mounted) setQuickMenuSettings(value)
      })
      .catch(() => {
        if (mounted) setQuickMenuSettings(defaultQuickMenuSettings)
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleMoveWarningChange = useCallback((message: string | null) => {
    setMoveWarningMessage(message)
  }, [])

  const handlePageChange = useCallback(
    (nextPage: PageKey) => {
      if (nextPage === page) return
      if (!hasSavedUser(user) && nextPage !== 'userinfoupdate') {
        setMoveWarningMessage(null)
        setPendingPage(null)
        setWarningOpen(false)
        setPage('userinfoupdate')
        return
      }
      if (moveWarningMessage) {
        setPendingPage(nextPage)
        setWarningOpen(true)
        return
      }
      if (nextPage === 'history') {
        setHistoryTab('all')
      }
      if (nextPage === 'payermanagement') {
        setPayerManagementTab('all')
      }
      if (nextPage === 'payertargetmanagement') {
        setPayerTargetTab('all')
        setPayerTargetFilterValue({})
      }
      setMoveWarningMessage(null)
      setPage(nextPage)
    },
    [page, moveWarningMessage, user],
  )

  const handleUserSaved = useCallback((savedUser: User) => {
    setUser(savedUser)
    setPage('generate')
  }, [])

  const handleOpenHistory = useCallback((nextTab: HistoryTab = 'all') => {
    setHistoryTab(nextTab)
    setPage('history')
  }, [])

  const handleOpenPayerManagement = useCallback((nextTab: PaymentTab = 'all') => {
    setPayerManagementTab(nextTab)
    setPage('payermanagement')
  }, [])

  const handleOpenPayerTargetManagement = useCallback(
    ({
      tab = 'all',
      filterValue = {},
    }: {
      tab?: PaymentTab
      filterValue?: Partial<PayerManagementFilterValue>
    }) => {
      setPayerTargetTab(tab)
      setPayerTargetFilterValue(filterValue)
      setPage('payertargetmanagement')
    },
    [],
  )

  const handleOpenCompanyPaymentManagement = useCallback(() => {
    setPage('companypaymentmanagement')
  }, [])

  const handleOpenAlertCenter = useCallback(() => {
    handlePageChange('alertcenter')
  }, [handlePageChange])

  const handleOpenQuickMenuSettings = useCallback(() => {
    setQuickMenuEditorHighlightSignal((prev) => prev + 1)
    setPage('settings')
  }, [])

  useAlertCenterBridge({
    onOpenAlertCenter: handleOpenAlertCenter,
  })

  const handleConfirmMove = useCallback(() => {
    if (!pendingPage) {
      setWarningOpen(false)
      return
    }
    setWarningOpen(false)
    setMoveWarningMessage(null)
    setPage(pendingPage)
    setPendingPage(null)
  }, [pendingPage])

  const handleCancelMove = useCallback(() => {
    setWarningOpen(false)
    setPendingPage(null)
  }, [])

  const Page = useMemo(() => {
    switch (page) {
      case 'home':
        return (
          <HomePage
            onOpenAlertCenter={handleOpenAlertCenter}
            onOpenGenerate={() => setPage('generate')}
            onOpenHistory={handleOpenHistory}
            onOpenPayerManagement={handleOpenPayerManagement}
            onOpenPayerTargetManagement={() => handleOpenPayerTargetManagement({ tab: 'all' })}
            onOpenCompanyPaymentManagement={handleOpenCompanyPaymentManagement}
            onOpenSettings={() => setPage('settings')}
            onOpenQuickMenuSettings={handleOpenQuickMenuSettings}
            quickMenuSettings={quickMenuSettings}
          />
        )
      case 'alertcenter':
        return (
          <AlertCenterPage
            alerts={alerts}
            alertsLoaded={alertsLoaded}
            onOpenHistory={() => handleOpenHistory('all')}
          />
        )
      case 'userinfoupdate':
        return (
          <UserInfoUpdatePage
            user={user}
            onSaved={handleUserSaved}
            onCancel={() => setPage('settings')}
          />
        )
      case 'history':
        return <HistoryPage initialTab={historyTab} onMoveWarningChange={handleMoveWarningChange} />
      case 'payermanagement':
        return (
          <PayerManagementPage
            initialTab={payerManagementTab}
            onOpenPayerTargetManagement={handleOpenPayerTargetManagement}
          />
        )
      case 'payertargetmanagement':
        return (
          <PayerTargetManagementPage
            initialTab={payerTargetTab}
            initialFilterValue={payerTargetFilterValue}
          />
        )
      case 'companypaymentmanagement':
        return <CompanyPaymentManagementPage />
      case 'templates':
        return <TemplatesPage />
      case 'settings':
        return (
          <SettingsPage
            defaultPath={defaultOutputDir}
            onPathSaved={(dir) => setDefaultOutputDir(dir)}
            user={user}
            quickMenuSettings={quickMenuSettings}
            quickMenuEditorHighlightSignal={quickMenuEditorHighlightSignal}
            onQuickMenuSettingsSaved={setQuickMenuSettings}
            missingUserInfo={!hasSavedUser(user)}
            onOpenUserInfo={() => setPage('userinfoupdate')}
          />
        )
      default:
        return (
          <GeneratePage
            defaultOutputDir={defaultOutputDir}
            onMoveWarningChange={handleMoveWarningChange}
          />
        )
    }
  }, [
    page,
    user,
    alerts,
    alertsLoaded,
    defaultOutputDir,
    quickMenuSettings,
    handleMoveWarningChange,
    handleUserSaved,
    handleOpenAlertCenter,
    handleOpenHistory,
    handleOpenPayerManagement,
    handleOpenCompanyPaymentManagement,
    handleOpenPayerTargetManagement,
    handleOpenQuickMenuSettings,
    historyTab,
    payerManagementTab,
    payerTargetFilterValue,
    payerTargetTab,
  ])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TitleBar />
      <div className="grid min-h-0 flex-1 grid-cols-5 gap-5 p-5">
        <aside className="col-span-1 min-h-0">
          <SidebarNav
            active={page}
            onChange={handlePageChange}
            user={user}
            unreadAlertCount={unreadAlertCount}
          />
        </aside>
        <main className="col-span-4 min-h-0 overflow-visible">{Page}</main>
      </div>
      <MoveWarningModal
        open={warningOpen}
        message={moveWarningMessage ?? ''}
        onCancel={handleCancelMove}
        onConfirm={handleConfirmMove}
      />
    </div>
  )
}
