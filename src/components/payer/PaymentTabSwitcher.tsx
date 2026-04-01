import type { PaymentTab } from './payerTargetTypes'

export type PaymentTabOption = { id: PaymentTab; label: string }

export const PAYMENT_TABS: PaymentTabOption[] = [
  { id: 'all', label: '전체' },
  { id: 'advance', label: '사전납부' },
  { id: 'confirmed', label: '확정납부' },
]

type PaymentTabSwitcherProps = {
  activeTab: PaymentTab
  onChange: (tab: PaymentTab) => void
}

export default function PaymentTabSwitcher({
  activeTab,
  onChange,
}: PaymentTabSwitcherProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl bg-gray-100 p-1.5">
      {PAYMENT_TABS.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`cursor-pointer rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? 'bg-[#003764] text-white shadow-sm'
                : 'text-gray-600 hover:bg-white hover:text-[#003764]'
            }`}
            aria-pressed={isActive}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
