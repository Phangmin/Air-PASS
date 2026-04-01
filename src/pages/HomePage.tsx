import HomeAlertCenterCard from '../components/home/HomeAlertCenterCard'
import HomeGenerationStatsCard from '../components/home/HomeGenerationStatsCard'
import HomeNoticeCard from '../components/home/HomeNoticeCard'
import HomeQuickMenusCard from '../components/home/HomeQuickMenusCard'
import RecentPaymentStatusCard from '../components/home/RecentPaymentStatusCard'
import type { HistoryTab } from './HistoryPage'
import type { PaymentTab } from '../components/payer/payerTargetTypes'
import type { QuickMenuSetting } from '../types/ipc'

type HomePageProps = {
  onOpenAlertCenter?: () => void
  onOpenGenerate?: () => void
  onOpenHistory?: (tab?: HistoryTab) => void
  onOpenPayerManagement?: (tab?: PaymentTab) => void
  onOpenPayerTargetManagement?: () => void
  onOpenCompanyPaymentManagement?: () => void
  onOpenSettings?: () => void
  onOpenQuickMenuSettings?: () => void
  quickMenuSettings: QuickMenuSetting[]
}

export default function HomePage({
  onOpenAlertCenter,
  onOpenGenerate,
  onOpenHistory,
  onOpenPayerManagement,
  onOpenPayerTargetManagement,
  onOpenCompanyPaymentManagement,
  onOpenSettings,
  onOpenQuickMenuSettings,
  quickMenuSettings,
}: HomePageProps) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-3 md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <RecentPaymentStatusCard onOpenPayerManagement={onOpenPayerManagement} />
        <HomeQuickMenusCard
          onOpenGenerate={onOpenGenerate}
          onOpenHistory={onOpenHistory}
          onOpenPayerManagement={onOpenPayerManagement}
          onOpenPayerTargetManagement={onOpenPayerTargetManagement}
          onOpenCompanyPaymentManagement={onOpenCompanyPaymentManagement}
          onOpenSettings={onOpenSettings}
          onOpenQuickMenuSettings={onOpenQuickMenuSettings}
          quickMenuSettings={quickMenuSettings}
        />
        <HomeNoticeCard />
        <HomeGenerationStatsCard onOpenHistory={onOpenHistory} />
        <HomeAlertCenterCard onOpenAlertCenter={onOpenAlertCenter} onOpenHistory={() => onOpenHistory?.('all')} />
      </div>
    </section>
  )
}
