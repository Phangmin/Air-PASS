import { useMemo } from 'react'
import YearMonthPickerPopover from './YearMonthPickerPopover'

type MonthlyFilterButtonProps = {
  year: number
  month: number
  onChange: (year: number, month: number) => void
  className?: string
  navButtonClassName?: string
  labelButtonClassName?: string
}

function classNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function MonthlyFilterButton({
  year,
  month,
  onChange,
  className,
  navButtonClassName,
  labelButtonClassName,
}: MonthlyFilterButtonProps) {
  const displayLabel = useMemo(() => `${year}년 ${month}월`, [year, month])

  const shiftMonth = (delta: number) => {
    let targetYear = year
    let targetMonth = month + delta

    while (targetMonth < 1) {
      targetMonth += 12
      targetYear -= 1
    }

    while (targetMonth > 12) {
      targetMonth -= 12
      targetYear += 1
    }

    onChange(targetYear, targetMonth)
  }

  return (
    <YearMonthPickerPopover year={year} month={month} onChange={onChange}>
      {({ toggle }) => (
        <div
          className={classNames(
            'flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1 text-sm',
            className,
          )}
        >
          <button
            type="button"
            className={classNames(
              'cursor-pointer rounded-full px-2.5 py-1 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900',
              navButtonClassName,
            )}
            onClick={() => shiftMonth(-1)}
            aria-label="이전 월"
          >
            &lt;
          </button>
          <button
            type="button"
            className={classNames(
              'cursor-pointer px-2 py-1 font-semibold text-gray-900',
              labelButtonClassName,
            )}
            onClick={toggle}
          >
            {displayLabel}
          </button>
          <button
            type="button"
            className={classNames(
              'cursor-pointer rounded-full px-2.5 py-1 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900',
              navButtonClassName,
            )}
            onClick={() => shiftMonth(1)}
            aria-label="다음 월"
          >
            &gt;
          </button>
        </div>
      )}
    </YearMonthPickerPopover>
  )
}
