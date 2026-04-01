import { useId, useMemo, useState } from 'react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import YearMonthPickerPopover from '../buttons/YearMonthPickerPopover'
import DropdownSelect, { type DropdownOption } from './DropdownSelect'
import SearchBar from './SearchBar'

type PaymentDivision = 'all' | 'advance' | 'confirmed'
type PaymentStatus = 'all' | 'unpaid' | 'paid'

type PayerManagementFilterValue = {
  division: PaymentDivision
  payerName: string
  affiliation: string
  paymentStatus: PaymentStatus
  paymentMonth: string
}

type PayerManagementFilterProps = {
  value: PayerManagementFilterValue
  onChange: (value: PayerManagementFilterValue) => void
}

const sectionLabelClass = 'mb-2 block text-xs font-semibold tracking-[0.04em] text-gray-500'
const inputFieldClass =
  'flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left text-sm text-gray-900 outline-none transition hover:border-gray-400 focus-visible:border-[#003764] focus-visible:ring-2 focus-visible:ring-[#003764]/10'

const divisionOptions: DropdownOption<PaymentDivision>[] = [
  { value: 'all', label: '전체' },
  { value: 'advance', label: '사전납부' },
  { value: 'confirmed', label: '확정납부' },
]

const paymentStatusOptions: DropdownOption<PaymentStatus>[] = [
  { value: 'all', label: '전체' },
  { value: 'unpaid', label: '미납' },
  { value: 'paid', label: '납부완료' },
]

function formatPaymentMonthLabel(value: string) {
  if (!value) return '납부 월 선택'

  const [yearText, monthText] = value.split('-')
  const year = Number.parseInt(yearText ?? '', 10)
  const month = Number.parseInt(monthText ?? '', 10)

  if (Number.isNaN(year) || Number.isNaN(month)) {
    return '납부 월 선택'
  }

  return `${year}년 ${month}월`
}

export type { PayerManagementFilterValue, PaymentDivision, PaymentStatus }

export default function PayerManagementFilter({ value, onChange }: PayerManagementFilterProps) {
  const divisionId = useId()
  const payerNameId = useId()
  const affiliationId = useId()
  const paymentStatusId = useId()
  const paymentMonthId = useId()
  const [isExpanded, setIsExpanded] = useState(false)

  const today = useMemo(() => new Date(), [])
  const selectedYear = value.paymentMonth
    ? Number.parseInt(value.paymentMonth.slice(0, 4), 10)
    : today.getFullYear()
  const selectedMonth = value.paymentMonth
    ? Number.parseInt(value.paymentMonth.slice(5, 7), 10)
    : today.getMonth() + 1

  const updateField = <K extends keyof PayerManagementFilterValue>(
    key: K,
    nextValue: PayerManagementFilterValue[K],
  ) => {
    onChange({ ...value, [key]: nextValue })
  }

  const handleReset = () => {
    onChange({
      division: 'all',
      payerName: '',
      affiliation: '',
      paymentStatus: 'all',
      paymentMonth: '',
    })
  }

  const hasActiveFilter =
    value.division !== 'all' ||
    value.payerName.length > 0 ||
    value.affiliation.length > 0 ||
    value.paymentStatus !== 'all' ||
    value.paymentMonth.length > 0

  return (
    <div className="mt-5 rounded-3xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-base font-semibold text-gray-900">대상자 필터</div>
          <div className="mt-1 text-xs text-gray-500">
            이름, 소속, 상태, 납부 월로 필터를 적용합니다.
          </div>
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
            aria-label={isExpanded ? '필터 접기' : '필터 펼치기'}
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
        className={`grid transition-[grid-template-rows,margin] duration-200 ${
          isExpanded ? 'mt-4 grid-rows-[1fr] overflow-visible' : 'mt-0 grid-rows-[0fr] overflow-hidden'
        }`}
      >
        <div className="min-h-0 overflow-visible">
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="relative z-20">
              <label htmlFor={divisionId} className={sectionLabelClass}>
                구분
              </label>
              <DropdownSelect
                id={divisionId}
                value={value.division}
                options={divisionOptions}
                onChange={(nextValue) => updateField('division', nextValue)}
              />
            </div>

            <div>
              <label htmlFor={payerNameId} className={sectionLabelClass}>
                대상자
              </label>
              <SearchBar
                id={payerNameId}
                value={value.payerName}
                onChange={(nextValue) => updateField('payerName', nextValue)}
                placeholder="대상자 이름 검색"
                className="bg-white"
              />
            </div>

            <div>
              <label htmlFor={affiliationId} className={sectionLabelClass}>
                소속
              </label>
              <SearchBar
                id={affiliationId}
                value={value.affiliation}
                onChange={(nextValue) => updateField('affiliation', nextValue)}
                placeholder="소속 검색"
                className="bg-white"
              />
            </div>

            <div className="relative z-20">
              <label htmlFor={paymentStatusId} className={sectionLabelClass}>
                납부 상태
              </label>
              <DropdownSelect
                id={paymentStatusId}
                value={value.paymentStatus}
                options={paymentStatusOptions}
                onChange={(nextValue) => updateField('paymentStatus', nextValue)}
              />
            </div>

            <div className="relative z-10">
              <label htmlFor={paymentMonthId} className={sectionLabelClass}>
                납부 월
              </label>
              <YearMonthPickerPopover
                year={selectedYear}
                month={selectedMonth}
                onChange={(year, month) => updateField('paymentMonth', `${year}-${String(month).padStart(2, '0')}`)}
                panelClassName="left-0"
              >
                {({ toggle }) => (
                  <button
                    id={paymentMonthId}
                    type="button"
                    onClick={toggle}
                    className={inputFieldClass}
                  >
                    <span className={value.paymentMonth ? 'text-gray-900' : 'text-gray-400'}>
                      {formatPaymentMonthLabel(value.paymentMonth)}
                    </span>
                    <CalendarDaysIcon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                  </button>
                )}
              </YearMonthPickerPopover>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
