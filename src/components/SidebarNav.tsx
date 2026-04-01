import type { PageKey } from '../App'
import KoreaGOVLogo from '../assets/korea_gov_logo.png'
import type { User } from '../types/ipc'

interface SidebarNavProps {
  active: PageKey
  onChange: (page: PageKey) => void
  user: User | null
  unreadAlertCount: number
}

const NAV_GROUPS: Array<{
  title: string
  items: Array<{ key: PageKey; label: string }>
}> = [
  {
    title: '통지서',
    items: [
      { key: 'generate', label: '통지서 생성' },
      { key: 'history', label: '생성 이력' },
      { key: 'templates', label: '템플릿' },
    ],
  },
  {
    title: '납부 관리',
    items: [
      { key: 'payermanagement', label: '납부 상태 리포트' },
      { key: 'payertargetmanagement', label: '대상자별 관리' },
      { key: 'companypaymentmanagement', label: '기업별 납부 관리' },
    ],
  },
]

export default function SidebarNav({ active, onChange, user, unreadAlertCount }: SidebarNavProps) {
  const navClass = (key: PageKey) =>
    [
      'w-full cursor-pointer rounded-2xl border px-4 py-3 text-center transition',
      active === key
        ? 'border-[#003764] bg-[#003764] font-semibold text-white shadow-sm'
        : 'border-gray-300 text-gray-900 hover:bg-gray-100 hover:text-gray-900',
    ].join(' ')

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-xl">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <img
            src={KoreaGOVLogo}
            alt="정부 로고"
            className="h-15 w-auto select-none"
            draggable={false}
          />
          <div className="flex select-none flex-col gap-1 text-gray-700">
            <span className="text-lg font-semibold text-gray-900">{user?.name || '담당자 미등록'}</span>
            <span className="text-sm text-gray-500">{user?.department || '부서를 등록해 주세요.'}</span>
            <span className="text-sm text-gray-500">{user?.email || '이메일을 등록해 주세요.'}</span>
          </div>
        </div>
        <div className="grid w-full">
          <button
            className={[
              'flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-gray-300 py-2 text-sm font-medium transition',
              active === 'alertcenter'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-200',
            ].join(' ')}
            onClick={() => onChange('alertcenter')}
          >
            {unreadAlertCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold leading-none text-white">
                {unreadAlertCount}
              </span>
            ) : null}
            <span>알림 센터</span>
          </button>
        </div>
        <div className="m-3 w-full border border-gray-200" />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex flex-col gap-4">
          <button className={navClass('home')} onClick={() => onChange('home')}>
            홈
          </button>

          {NAV_GROUPS.map((group) => (
            <section key={group.title}>
              <div className="mb-2 text-center text-xs font-semibold tracking-[0.08em] text-gray-500">
                {group.title}
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map(({ key, label }) => (
                  <button key={key} className={navClass(key)} onClick={() => onChange(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <button className={navClass('settings')} onClick={() => onChange('settings')}>
          환경 설정
        </button>
      </div>
    </aside>
  )
}
