import { useEffect, useState, type ReactNode } from 'react'

type YearMonthPickerPopoverProps = {
  year: number
  month: number
  onChange: (year: number, month: number) => void
  panelClassName?: string
  children: (controls: {
    isOpen: boolean
    open: () => void
    close: () => void
    toggle: () => void
  }) => ReactNode
}

const MONTH_VALUES = Array.from({ length: 12 }, (_, index) => index + 1)

function normalizeYearInput(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return parsed
}

export default function YearMonthPickerPopover({
  year,
  month,
  onChange,
  panelClassName = 'left-1/2 -translate-x-1/2',
  children,
}: YearMonthPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [yearInput, setYearInput] = useState(String(year))

  useEffect(() => {
    setYearInput(String(year))
  }, [year])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return

      const pickerRoot = target instanceof Element ? target.closest('[data-year-month-picker-root]') : null
      if (!pickerRoot) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSelectMonth = (monthValue: number) => {
    const targetYear = normalizeYearInput(yearInput, year)
    onChange(targetYear, monthValue)
    setYearInput(String(targetYear))
    setIsOpen(false)
  }

  return (
    <div className="relative" data-year-month-picker-root="">
      {children({
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
      })}

      {isOpen ? (
        <div
          className={`absolute top-full z-50 mt-3 w-64 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl ${panelClassName}`.trim()}
          data-year-month-picker-root=""
        >
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-gray-500">연도 선택</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003764] focus:ring-[#003764]"
              value={yearInput}
              min={1900}
              max={2100}
              onChange={(event) => setYearInput(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_VALUES.map((monthValue) => {
              const isActive = monthValue === month
              const activeClasses = isActive
                ? 'border-[#003764] bg-[#003764] text-white'
                : 'border-gray-200 text-gray-700 hover:border-[#003764] hover:text-[#003764]'

              return (
                <button
                  key={monthValue}
                  type="button"
                  className={`rounded-lg border px-2 py-2 text-center text-sm transition-colors focus:outline-none ${activeClasses}`.trim()}
                  onClick={() => handleSelectMonth(monthValue)}
                >
                  {monthValue}월
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
