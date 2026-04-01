import { useState } from 'react'
import ExcelIcon from '../../assets/excel-icon.svg'

type GenerateExcelPickerCardProps = {
  excelPath: string | null
  loadingPreview: boolean
  onPickExcel: () => void
}

function getActionCta(loadingPreview: boolean) {
  return loadingPreview ? 'Loading…' : 'Browse Excel'
}

export default function GenerateExcelPickerCard({
  excelPath,
  loadingPreview,
  onPickExcel,
}: GenerateExcelPickerCardProps) {
  const [isActionHovered, setIsActionHovered] = useState(false)
  const [actionGlowPosition, setActionGlowPosition] = useState({ x: 124, y: 96 })

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="grid w-full gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-left md:grid-cols-[minmax(0,1fr)_248px]">
        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-inset ring-emerald-100">
              <img src={ExcelIcon} alt="excelicon" className="h-10 w-10 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Source File
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {loadingPreview ? '엑셀 데이터를 불러오는 중입니다' : '생성할 엑셀 파일 선택'}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                원본 엑셀을 불러오면 우측에서 행별 데이터를 바로 검토하고 수정할 수 있습니다.
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Current File</div>
            <div className="mt-2 truncate text-sm text-slate-600">
              {excelPath ?? '선택된 파일이 없습니다. xlsx, xls 형식 파일을 선택하세요.'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onPickExcel}
          disabled={loadingPreview}
          onMouseEnter={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setActionGlowPosition({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            })
            setIsActionHovered(true)
          }}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setActionGlowPosition({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            })
          }}
          onMouseLeave={() => setIsActionHovered(false)}
          className={`group relative isolate flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 ${
            isActionHovered
              ? 'border-emerald-300 bg-[#255c34] text-white ring-2 ring-emerald-200/40'
              : 'border-slate-200 bg-white text-slate-900'
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
              isActionHovered ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `radial-gradient(circle at ${actionGlowPosition.x}px ${actionGlowPosition.y}px, rgba(160, 226, 136, 0.95) 0%, rgba(95, 190, 120, 0.82) 18%, rgba(63, 159, 95, 0.58) 42%, rgba(31, 109, 59, 0.2) 68%, rgba(31, 109, 59, 0) 100%)`,
            }}
          />

          <div className="relative z-10">
            <div
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                isActionHovered ? 'text-white/75' : 'text-emerald-700'
              }`}
            >
              Action
            </div>
            <div className="mt-3 text-base font-bold leading-relaxed">
              {loadingPreview ? '엑셀 불러오는 중' : excelPath ? '새 엑셀 선택' : '엑셀 선택'}
            </div>
            {loadingPreview || excelPath ? (
              <div className="text-base font-bold leading-relaxed">
                {loadingPreview ? '잠시만 기다려주세요.' : '미리보기 다시 불러오기'}
              </div>
            ) : null}
          </div>

          <div
            className={`relative z-10 mt-5 inline-flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
              isActionHovered
                ? 'bg-white text-[#1f6d3b] ring-1 ring-inset ring-white'
                : 'bg-[#3f9f5f] text-white ring-1 ring-inset ring-[#3f9f5f]'
            }`}
          >
            <span>{getActionCta(loadingPreview)}</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </button>
      </div>
    </div>
  )
}
