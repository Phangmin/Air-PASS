import type { PaymentTab } from '../payer/payerTargetTypes'
import type { HistoryTab } from '../../pages/HistoryPage'
import type { QuickMenuSetting } from '../../types/ipc'

type HomeQuickMenusCardProps = {
  onOpenGenerate?: () => void
  onOpenHistory?: (tab?: HistoryTab) => void
  onOpenPayerManagement?: (tab?: PaymentTab) => void
  onOpenPayerTargetManagement?: () => void
  onOpenCompanyPaymentManagement?: () => void
  onOpenSettings?: () => void
  onOpenQuickMenuSettings?: () => void
  quickMenuSettings: QuickMenuSetting[]
}

export default function HomeQuickMenusCard({
  onOpenGenerate,
  onOpenHistory,
  onOpenPayerManagement,
  onOpenPayerTargetManagement,
  onOpenCompanyPaymentManagement,
  onOpenSettings,
  onOpenQuickMenuSettings,
  quickMenuSettings,
}: HomeQuickMenusCardProps) {
  const handleOpenHistoryTab = (tab: HistoryTab = 'all') => onOpenHistory?.(tab)

  const quickMenuMap = {
    generate: {
      title: '통지서 생성',
      description: '엑셀을 불러와 PDF 생성을 바로 시작합니다.',
      onClick: onOpenGenerate,
      tone: 'border-[#003764]/15 bg-[#003764] text-white',
    },
    payermanagement: {
      title: '납부 상태 리포트',
      description: '사전납부와 확정납부 현황을 확인합니다.',
      onClick: () => onOpenPayerManagement?.('all'),
      tone: 'border-sky-200 bg-sky-50 text-sky-950',
    },
    payertargetmanagement: {
      title: '대상자별 관리',
      description: '대상자별 납부 상태와 문서를 확인합니다.',
      onClick: onOpenPayerTargetManagement,
      tone: 'border-cyan-200 bg-cyan-50 text-cyan-950',
    },
    companypaymentmanagement: {
      title: '기업별 납부 관리',
      description: '소속별 위반 및 납부 현황을 확인합니다.',
      onClick: onOpenCompanyPaymentManagement,
      tone: 'border-violet-200 bg-violet-50 text-violet-950',
    },
    history: {
      title: '생성 이력',
      description: '최근 생성 문서와 처리 내역을 다시 봅니다.',
      onClick: () => handleOpenHistoryTab('all'),
      tone: 'border-orange-200 bg-orange-50 text-orange-950',
    },
    settings: {
      title: '환경 설정',
      description: '기본 저장 경로와 사용자 정보를 관리합니다.',
      onClick: onOpenSettings,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    },
  } as const

  const quickMenus = quickMenuSettings
    .filter((item) => item.visible)
    .map((item) => ({
      id: item.id,
      ...quickMenuMap[item.id],
    }))

  const gridRowCount = Math.max(quickMenus.length, 1)

  return (
    <article className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#003764]">Quick Menus</div>
        <button
          type="button"
          onClick={onOpenQuickMenuSettings}
          className="group inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-500 transition hover:border-[#003764] hover:bg-[#003764] hover:text-white"
          aria-label="Quick Menus 편집으로 이동"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:rotate-45" fill="none">
            <path
              d="M8.95 2.95h2.1l.42 1.8a5.53 5.53 0 0 1 1.18.49l1.57-.97 1.49 1.49-.97 1.57c.19.38.35.78.48 1.19l1.81.41v2.1l-1.8.42a5.46 5.46 0 0 1-.49 1.18l.97 1.57-1.49 1.49-1.57-.97c-.38.19-.78.35-1.19.48l-.41 1.81h-2.1l-.42-1.8a5.53 5.53 0 0 1-1.18-.49l-1.57.97-1.49-1.49.97-1.57a5.46 5.46 0 0 1-.48-1.19l-1.81-.41v-2.1l1.8-.42c.13-.41.3-.8.49-1.18l-.97-1.57 1.49-1.49 1.57.97c.38-.19.78-.35 1.19-.48l.41-1.81Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>

      <div
        className="grid flex-1 grid-cols-1 gap-2.5"
        style={{ gridTemplateRows: `repeat(${gridRowCount}, minmax(0, 1fr))` }}
      >
        {quickMenus.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            표시할 Quick Menu가 없습니다.
          </div>
        ) : null}

        {quickMenus.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`flex min-h-[76px] cursor-pointer flex-col justify-between rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}
          >
            <div className="text-sm font-semibold">{item.title}</div>
            <div className="mt-2 text-xs leading-5 opacity-80">{item.description}</div>
          </button>
        ))}
      </div>
    </article>
  )
}
