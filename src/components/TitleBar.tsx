// src/components/TitleBar.tsx
import KoreaGOVLogo from '../assets/korea_gov_logo.png'

export default function TitleBar() {
  const { windowControls } = window.electronAPI

  return (
    <header
      className="flex items-center justify-between w-full pl-5 h-12 bg-[#003764] text-md text-white"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center gap-3">
        <img src={KoreaGOVLogo} alt="Korea Goverment Logo" className="h-5 w-auto select-none" draggable={false} />
        <div className="font-semibold text-white">부산지방항공청 | 행정처분 업무 시스템 (Air-PASS)</div>
      </div>

      {/* 최소화, 최대화, 닫기 버튼 */}
      <div className="flex h-full text-white" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* 최소화 버튼 */}
        <button
          aria-label="Minimize window"
          onClick={windowControls.minimize}
          className="p-4 hover:bg-gray-300 hover:text-[#003764] cursor-pointer"
        >
          <svg viewBox="0 0 12 12" className="h-4 w-6" fill="none">
            <path d="M2 6h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </button>

        {/* 최대화 버튼 */}
        <button
          aria-label="Maximize window"
          onClick={windowControls.toggleMaximize}
          className="p-4 hover:bg-gray-300 hover:text-[#003764] cursor-pointer"
        >
          <svg viewBox="0 0 12 12" className="h-4 w-6" fill="none">
            <rect x="2.5" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1" rx="0.5" />
          </svg>
        </button>

        {/* 닫기 버튼 */}
        <button
          aria-label="Close window"
          onClick={windowControls.close}
          className="p-4 hover:bg-red-500 hover:text-white cursor-pointer"
        >
          <svg viewBox="0 0 12 12" className="h-4 w-6" fill="none">
            <path d="M3 3l6 6m0-6L3 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}

