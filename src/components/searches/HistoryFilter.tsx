import { useId, useState } from 'react'
import SearchBar from './SearchBar'

export type HistoryFilterValue = {
  driverName: string
  affiliation: string
  regionRegNo: string
}

type HistoryFilterProps = {
  value: HistoryFilterValue
  onChange: (value: HistoryFilterValue) => void
}

const sectionLabelClass = 'mb-2 block text-xs font-semibold tracking-[0.04em] text-gray-500'

export default function HistoryFilter({ value, onChange }: HistoryFilterProps) {
  const driverNameId = useId()
  const affiliationId = useId()
  const regionRegNoId = useId()
  const [isExpanded, setIsExpanded] = useState(false)

  const updateField = <K extends keyof HistoryFilterValue>(key: K, nextValue: HistoryFilterValue[K]) => {
    onChange({ ...value, [key]: nextValue })
  }

  const handleReset = () => {
    onChange({
      driverName: '',
      affiliation: '',
      regionRegNo: '',
    })
  }

  const hasActiveFilter =
    value.driverName.length > 0 || value.affiliation.length > 0 || value.regionRegNo.length > 0

  return (
    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">생성 이력 검색</div>
          <div className="mt-1 text-xs text-gray-500">운전자명, 소속, 차량번호로 생성 이력을 빠르게 찾습니다.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasActiveFilter}
            className="cursor-pointer rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#003764] hover:text-[#003764] disabled:cursor-not-allowed disabled:opacity-50"
          >
            필터 초기화
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? '검색 영역 접기' : '검색 영역 펼치기'}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition hover:border-[#003764] hover:text-[#003764]"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path
                d="M5 7.5 10 12.5l5-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows,margin] duration-200 ${
          isExpanded ? 'mt-4 grid-rows-[1fr]' : 'mt-0 grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0">
          <div className="grid gap-4 xl:grid-cols-3">
            <div>
              <label htmlFor={driverNameId} className={sectionLabelClass}>
                운전자명
              </label>
              <SearchBar
                value={value.driverName}
                onChange={(nextValue) => updateField('driverName', nextValue)}
                placeholder="운전자명 검색"
                className="bg-white"
              />
            </div>

            <div>
              <label htmlFor={affiliationId} className={sectionLabelClass}>
                소속
              </label>
              <SearchBar
                value={value.affiliation}
                onChange={(nextValue) => updateField('affiliation', nextValue)}
                placeholder="소속 검색"
                className="bg-white"
              />
            </div>

            <div>
              <label htmlFor={regionRegNoId} className={sectionLabelClass}>
                차량번호
              </label>
              <SearchBar
                value={value.regionRegNo}
                onChange={(nextValue) => updateField('regionRegNo', nextValue)}
                placeholder="차량번호 검색"
                className="bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
