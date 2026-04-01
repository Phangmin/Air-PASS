import { Fragment, useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import MonthlyFilterButton from '../components/buttons/MonthlyFilterButton'
import DocumentGenerationRequiredModal from '../components/modals/DocumentGenerationRequiredModal'
import PaymentCompletedDateModal from '../components/modals/PaymentCompletedDateModal'
import PayerTargetDetailModal from '../components/modals/PayerTargetDetailModal'
import PaymentTabSwitcher from '../components/payer/PaymentTabSwitcher'
import {
  formatPayerCurrency,
  payerPaymentStatusMeta,
  payerStatusMeta,
} from '../components/payer/payerTargetData'
import type { PayerDocumentId, PayerItem, PaymentTab } from '../components/payer/payerTargetTypes'
import PayerManagementFilter, { type PayerManagementFilterValue } from '../components/searches/PayerManagementFilter'
import { usePaymentDashboardData } from '../hooks/usePaymentDashboardData'
import type { HistoryDocumentType } from '../types/ipc'

const statusMeta = payerStatusMeta
const paymentStatusMeta = payerPaymentStatusMeta
const formatCurrency = formatPayerCurrency

type SortOption = 'createdAtDesc' | 'nameAsc' | 'paymentCompletedAtDesc' | 'dueDateDesc'
type InlineSelectOption<T extends string> = {
  value: T
  label: string
  buttonClass: string
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'createdAtDesc', label: '최근 생성일순' },
  { value: 'nameAsc', label: '이름순' },
  { value: 'paymentCompletedAtDesc', label: '최근 납부일자순' },
  { value: 'dueDateDesc', label: '납부마감기한순' },
]

const compactSelectClass =
  'flex min-w-[92px] items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold leading-none outline-none transition focus-visible:border-[#003764] focus-visible:ring-2 focus-visible:ring-[#003764]/10'
const statusSelectOptions: InlineSelectOption<Exclude<PaymentTab, 'all'>>[] = [
  { value: 'advance', label: '사전납부', buttonClass: statusMeta.advance.badgeClass },
  { value: 'confirmed', label: '확정납부', buttonClass: statusMeta.confirmed.badgeClass },
]
const paymentStatusSelectOptions: InlineSelectOption<PayerItem['paymentStatus']>[] = [
  { value: 'unpaid', label: '미납', buttonClass: paymentStatusMeta.unpaid.badgeClass },
  { value: 'paid', label: '납부완료', buttonClass: paymentStatusMeta.paid.badgeClass },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function SortSelect({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (value: SortOption) => void
}) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative w-full">
        <Listbox.Button className="flex h-12 w-full cursor-pointer items-center rounded-full border border-gray-300 bg-white pl-5 pr-4 text-left">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
            {sortOptions.find((option) => option.value === value)?.label ?? sortOptions[0].label}
          </span>
          <span className="ml-3 flex shrink-0 items-center pr-1">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-30 mt-2 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-xl ring-1 ring-black/5 focus:outline-none">
            {sortOptions.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  classNames(
                    active ? 'bg-[#003764] text-white' : 'text-gray-900',
                    'relative cursor-pointer select-none py-2 pl-3 pr-9',
                  )
                }
              >
                {({ selected }) => (
                  <span className={classNames(selected ? 'font-semibold' : 'font-normal', 'block truncate')}>
                    {option.label}
                  </span>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}

function InlineBadgeSelect<T extends string>({
  value,
  options,
  onChange,
  buttonClassName = '',
}: {
  value: T
  options: InlineSelectOption<T>[]
  onChange: (value: T) => void
  buttonClassName?: string
}) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative min-w-0" onClick={(event) => event.stopPropagation()}>
        <Listbox.Button
          className={`${compactSelectClass} cursor-pointer ${selectedOption.buttonClass} ${buttonClassName}`.trim()}
        >
          <span className="truncate">{selectedOption.label}</span>
          <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-current/70" aria-hidden="true" />
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute left-0 top-[calc(100%+0.5rem)] z-40 min-w-full overflow-hidden rounded-2xl border border-[#003764]/20 bg-white py-1 text-sm shadow-xl ring-1 ring-black/5 focus:outline-none">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  classNames(
                    active ? 'bg-[#003764] text-white' : 'text-gray-900',
                    'relative cursor-pointer select-none py-2 pl-3 pr-9',
                  )
                }
              >
                {({ selected }) => (
                  <span className={classNames(selected ? 'font-semibold' : 'font-normal', 'block truncate')}>
                    {option.label}
                  </span>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}

type PayerTargetManagementPageProps = {
  initialTab?: PaymentTab
  initialFilterValue?: Partial<PayerManagementFilterValue>
}

const defaultFilterValue: PayerManagementFilterValue = {
  division: 'all',
  payerName: '',
  affiliation: '',
  paymentStatus: 'all',
  paymentMonth: '',
}

type GeneratablePayerDocumentId = Extract<PayerDocumentId, 'pre-notice' | 'suspension' | 'final-notice'>

function toHistoryDocumentType(documentId: GeneratablePayerDocumentId): Extract<
  HistoryDocumentType,
  'pre_notice' | 'suspension' | 'final_notice'
> {
  if (documentId === 'suspension') {
    return 'suspension'
  }

  if (documentId === 'final-notice') {
    return 'final_notice'
  }

  return 'pre_notice'
}

export default function PayerTargetManagementPage({
  initialTab = 'all',
  initialFilterValue,
}: PayerTargetManagementPageProps) {
  const {
    payerItems,
    records,
    loading,
    error,
    updatePaymentStatus,
    updatePaymentType,
    attachDocument,
    generateDocument,
  } = usePaymentDashboardData()
  const [activeTab, setActiveTab] = useState<PaymentTab>(initialTab)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectedDetailItemId, setSelectedDetailItemId] = useState<number | null>(null)
  const [paymentCompletedDateTargetId, setPaymentCompletedDateTargetId] = useState<number | null>(null)
  const [documentGenerationTargetId, setDocumentGenerationTargetId] = useState<number | null>(null)
  const [documentGenerationType, setDocumentGenerationType] = useState<GeneratablePayerDocumentId | null>(null)
  const [documentGenerationOutputDir, setDocumentGenerationOutputDir] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('createdAtDesc')
  const [filterValue, setFilterValue] = useState<PayerManagementFilterValue>({
    ...defaultFilterValue,
    ...initialFilterValue,
  })

  useEffect(() => {
    setActiveTab(initialTab)
    setFilterValue({
      ...defaultFilterValue,
      ...initialFilterValue,
    })
    setSelectedIds([])
    setSelectedDetailItemId(null)
    setPaymentCompletedDateTargetId(null)
    setDocumentGenerationTargetId(null)
    setDocumentGenerationType(null)
    setDocumentGenerationOutputDir(null)
  }, [initialFilterValue, initialTab])

  useEffect(() => {
    if (!documentGenerationTargetId || !documentGenerationType) return

    let cancelled = false
    const loadDefaultOutputDir = async () => {
      try {
        const dir = await window.electronAPI.settings.getDefaultOutputDir()
        if (!cancelled) {
          setDocumentGenerationOutputDir(dir)
        }
      } catch {
        if (!cancelled) {
          setDocumentGenerationOutputDir(null)
        }
      }
    }

    void loadDefaultOutputDir()
    return () => {
      cancelled = true
    }
  }, [documentGenerationTargetId, documentGenerationType])

  const tabFilteredItems = useMemo(
    () => (activeTab === 'all' ? payerItems : payerItems.filter((item) => item.status === activeTab)),
    [activeTab, payerItems],
  )

  const summaryItems = useMemo(() => {
    const normalizedName = filterValue.payerName.trim().toLowerCase()
    const normalizedAffiliation = filterValue.affiliation.trim().toLowerCase()

    return payerItems.filter((item) => {
      if (filterValue.paymentMonth && !item.dueDate.startsWith(filterValue.paymentMonth)) return false
      if (normalizedName && !item.name.toLowerCase().includes(normalizedName)) return false
      if (normalizedAffiliation && !item.affiliation.toLowerCase().includes(normalizedAffiliation)) return false
      return true
    })
  }, [filterValue, payerItems])

  const filteredItems = useMemo(() => {
    const filtered = tabFilteredItems.filter((item) => {
      if (filterValue.division !== 'all' && item.status !== filterValue.division) return false
      if (filterValue.paymentStatus !== 'all' && item.paymentStatus !== filterValue.paymentStatus) return false
      if (filterValue.paymentMonth && !item.dueDate.startsWith(filterValue.paymentMonth)) return false
      if (filterValue.payerName.trim() && !item.name.toLowerCase().includes(filterValue.payerName.trim().toLowerCase())) {
        return false
      }
      if (
        filterValue.affiliation.trim() &&
        !item.affiliation.toLowerCase().includes(filterValue.affiliation.trim().toLowerCase())
      ) {
        return false
      }
      return true
    })

    const getDateSortValue = (value: string | null) => value ?? ''

    return [...filtered].sort((left, right) => {
      if (sortOption === 'nameAsc') {
        return left.name.localeCompare(right.name, 'ko-KR')
      }

      if (sortOption === 'paymentCompletedAtDesc') {
        return getDateSortValue(right.paymentCompletedAt).localeCompare(getDateSortValue(left.paymentCompletedAt))
      }

      if (sortOption === 'dueDateDesc') {
        return right.dueDate.localeCompare(left.dueDate)
      }

      return right.noticeGeneratedAt.localeCompare(left.noticeGeneratedAt)
    })
  }, [filterValue, sortOption, tabFilteredItems])

  const totalCount = summaryItems.length
  const advanceItems = summaryItems.filter((item) => item.status === 'advance')
  const confirmedItems = summaryItems.filter((item) => item.status === 'confirmed')
  const advanceUnpaidCount = advanceItems.filter((item) => item.paymentStatus === 'unpaid').length
  const advancePaidCount = advanceItems.length - advanceUnpaidCount
  const confirmedUnpaidCount = confirmedItems.filter((item) => item.paymentStatus === 'unpaid').length
  const confirmedPaidCount = confirmedItems.length - confirmedUnpaidCount
  const now = new Date()
  const selectedYear = filterValue.paymentMonth
    ? Number.parseInt(filterValue.paymentMonth.slice(0, 4), 10)
    : now.getFullYear()
  const selectedMonth = filterValue.paymentMonth
    ? Number.parseInt(filterValue.paymentMonth.slice(5, 7), 10)
    : now.getMonth() + 1
  const allVisibleSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id))
  const selectedDetailItem = payerItems.find((item) => item.id === selectedDetailItemId) ?? null
  const paymentCompletedDateTarget =
    payerItems.find((item) => item.id === paymentCompletedDateTargetId) ?? null
  const documentGenerationTarget =
    payerItems.find((item) => item.id === documentGenerationTargetId) ?? null
  const documentGenerationRecord =
    records.find((record) => record.violationRecordId === documentGenerationTargetId) ?? null

  const stopRowClick = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  const toggleItemSelection = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]))
  }

  const toggleAllVisibleSelection = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !filteredItems.some((item) => item.id === id))
      }

      const next = new Set(prev)
      filteredItems.forEach((item) => next.add(item.id))
      return Array.from(next)
    })
  }

  const openDocumentGenerationModal = (id: number, documentId: GeneratablePayerDocumentId) => {
    setDocumentGenerationTargetId(id)
    setDocumentGenerationType(documentId)
  }

  const handleStatusChange = async (id: number, nextStatus: Exclude<PaymentTab, 'all'>) => {
    const targetItem = payerItems.find((item) => item.id === id)
    if (!targetItem) return

    const finalNoticeDocument = targetItem.documents.find((document) => document.id === 'final-notice')
    if (nextStatus === 'confirmed' && !finalNoticeDocument?.filePath) {
      openDocumentGenerationModal(id, 'final-notice')
      return
    }

    await updatePaymentType(targetItem, nextStatus)
  }

  const handleRequestPaymentStatusChange = async (
    id: number,
    nextPaymentStatus: PayerItem['paymentStatus'],
  ) => {
    const targetItem = payerItems.find((item) => item.id === id)
    if (!targetItem) return

    if (nextPaymentStatus === 'paid') {
      setPaymentCompletedDateTargetId(id)
      return
    }

    await updatePaymentStatus(targetItem, 'unpaid', null)
  }

  const handleConfirmPaymentCompletedDate = async (date: string) => {
    if (paymentCompletedDateTargetId === null) return
    const targetItem = payerItems.find((item) => item.id === paymentCompletedDateTargetId)
    if (!targetItem) return
    await updatePaymentStatus(targetItem, 'paid', date)
    setPaymentCompletedDateTargetId(null)
  }

  const handleOpenDocument = async (filePath: string) => {
    try {
      await window.electronAPI.history.open(filePath)
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const handleAttachDocument = async (item: PayerItem, documentType: HistoryDocumentType) => {
    try {
      return await attachDocument(item.id, documentType)
    } catch (error) {
      alert((error as Error).message)
      return null
    }
  }

  const handleCreateDocument = async () => {
    if (!documentGenerationTarget || !documentGenerationRecord || !documentGenerationOutputDir || !documentGenerationType) {
      return
    }

    try {
      const result = await generateDocument(
        documentGenerationRecord.violationRecordId,
        documentGenerationOutputDir,
        toHistoryDocumentType(documentGenerationType),
      )

      if (result) {
        if (documentGenerationType === 'final-notice' && documentGenerationTarget.status !== 'confirmed') {
          await updatePaymentType(documentGenerationTarget, 'confirmed')
        }
        setDocumentGenerationTargetId(null)
        setDocumentGenerationType(null)
        setDocumentGenerationOutputDir(null)
      }
    } catch (error) {
      alert((error as Error).message)
      return
    }
  }

  const handlePickDocumentOutputDir = async () => {
    try {
      const picked = await window.electronAPI.pickOutputDir(documentGenerationOutputDir ?? undefined)
      if (!picked) return
      setDocumentGenerationOutputDir(picked)
      await window.electronAPI.settings.setDefaultOutputDir(picked)
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const handleCloseDocumentGenerationModal = () => {
    setDocumentGenerationTargetId(null)
    setDocumentGenerationType(null)
    setDocumentGenerationOutputDir(null)
  }

  const handleMonthChange = (year: number, month: number) => {
    setFilterValue((prev) => ({
      ...prev,
      paymentMonth: `${year}-${String(month).padStart(2, '0')}`,
    }))
  }

  const applySummaryFilter = (
    division: PayerManagementFilterValue['division'],
    paymentStatus: PayerManagementFilterValue['paymentStatus'],
  ) => {
    setFilterValue((prev) => ({
      ...prev,
      division,
      paymentStatus,
    }))
  }

  return (
    <section className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex border-l-4 border-[#003764] pl-4 text-2xl font-bold text-gray-900">대상자별 관리</h2>
        </div>
        <PaymentTabSwitcher activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="border border-gray-200" />

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-lg">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_220px_132px_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">조회 월</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilterValue((prev) => ({
                    ...prev,
                    paymentMonth: '',
                  }))
                }
                className={`h-12 cursor-pointer rounded-full border px-5 text-sm font-semibold transition ${
                  filterValue.paymentMonth
                    ? 'border-gray-200 bg-white text-gray-600 hover:border-[#003764] hover:text-[#003764]'
                    : 'border-[#003764] bg-[#003764] text-white'
                }`}
              >
                전체
              </button>
              <MonthlyFilterButton
                year={selectedYear}
                month={selectedMonth}
                onChange={handleMonthChange}
                className="h-12 gap-1 px-2 pr-3 text-sm"
                navButtonClassName="flex h-8 w-8 items-center justify-center px-0 py-0"
                labelButtonClassName="px-2 py-2 text-sm"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-xs font-medium text-gray-500">정렬</div>
            <div className="mt-3">
              <SortSelect value={sortOption} onChange={setSortOption} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => applySummaryFilter('all', 'all')}
            className="flex min-h-[96px] cursor-pointer flex-col rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition hover:border-[#003764]/30 hover:bg-gray-100"
          >
            <div className="text-xs font-medium text-gray-500">총원</div>
            <div className="mt-auto text-right text-lg font-bold text-gray-900">{totalCount}명</div>
          </button>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
            <div className="text-xs font-medium text-sky-700">사전납부</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applySummaryFilter('advance', 'all')}
                className="flex min-h-[64px] cursor-pointer flex-col rounded-2xl bg-white px-3 py-3 text-left transition hover:bg-sky-100/70"
              >
                <div className="text-left text-[11px] font-medium text-gray-900">총원</div>
                <div className="mt-auto text-right text-sm font-semibold text-gray-900">{advanceItems.length}명</div>
              </button>
              <button
                type="button"
                onClick={() => applySummaryFilter('advance', 'unpaid')}
                className="flex min-h-[64px] cursor-pointer flex-col rounded-2xl bg-white px-3 py-3 text-left transition hover:bg-sky-100/70"
              >
                <div className="text-left text-[11px] font-medium text-gray-900">미납</div>
                <div className="mt-auto text-right text-sm font-semibold text-gray-900">{advanceUnpaidCount}명</div>
              </button>
              <button
                type="button"
                onClick={() => applySummaryFilter('advance', 'paid')}
                className="flex min-h-[64px] cursor-pointer flex-col rounded-2xl bg-white px-3 py-3 text-left transition hover:bg-sky-100/70"
              >
                <div className="text-left text-[11px] font-medium text-gray-900">납부완료</div>
                <div className="mt-auto text-right text-sm font-semibold text-gray-900">{advancePaidCount}명</div>
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="text-xs font-medium text-amber-700">확정납부</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applySummaryFilter('confirmed', 'all')}
                className="flex min-h-[64px] cursor-pointer flex-col rounded-2xl bg-white px-3 py-3 text-left transition hover:bg-amber-100/70"
              >
                <div className="text-left text-[11px] font-medium text-gray-900">총원</div>
                <div className="mt-auto text-right text-sm font-semibold text-gray-900">{confirmedItems.length}명</div>
              </button>
              <button
                type="button"
                onClick={() => applySummaryFilter('confirmed', 'unpaid')}
                className="flex min-h-[64px] cursor-pointer flex-col rounded-2xl bg-white px-3 py-3 text-left transition hover:bg-amber-100/70"
              >
                <div className="text-left text-[11px] font-medium text-gray-900">미납</div>
                <div className="mt-auto text-right text-sm font-semibold text-gray-900">{confirmedUnpaidCount}명</div>
              </button>
              <button
                type="button"
                onClick={() => applySummaryFilter('confirmed', 'paid')}
                className="flex min-h-[64px] cursor-pointer flex-col rounded-2xl bg-white px-3 py-3 text-left transition hover:bg-amber-100/70"
              >
                <div className="text-left text-[11px] font-medium text-gray-900">납부완료</div>
                <div className="mt-auto text-right text-sm font-semibold text-gray-900">{confirmedPaidCount}명</div>
              </button>
            </div>
          </div>
        </div>

        <PayerManagementFilter value={filterValue} onChange={setFilterValue} />

        {loading ? (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
            납부 대상자 목록을 불러오는 중입니다.
          </div>
        ) : (
          <>
            <div className="mt-5 hidden overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 xl:block">
              <div className="grid grid-cols-[max-content_120px_1.15fr_1fr_140px_120px_120px_128px_128px] gap-3 bg-gray-50 px-5 py-3 text-xs font-semibold tracking-[0.04em] text-gray-500">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisibleSelection}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#003764] focus:ring-[#003764]"
                  />
                </label>
                <div>구분</div>
                <div>대상자</div>
                <div>소속</div>
                <div>납부 예정 금액</div>
                <div>납부 상태</div>
                <div>통지서 생성일</div>
                <div>납부마감기한</div>
                <div>납부완료일자</div>
              </div>
              <div className="divide-y divide-gray-200 bg-white">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid cursor-pointer grid-cols-[max-content_120px_1.15fr_1fr_140px_120px_120px_128px_128px] gap-3 px-5 py-4 text-sm text-gray-700 transition hover:bg-gray-50"
                    onClick={() => setSelectedDetailItemId(item.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        onClick={stopRowClick}
                        aria-label={`${item.name} 선택`}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#003764] focus:ring-[#003764]"
                      />
                    </div>
                    <div className="flex items-center">
                      <InlineBadgeSelect
                        value={item.status}
                        options={statusSelectOptions}
                        onChange={(nextValue) => {
                          void handleStatusChange(item.id, nextValue)
                        }}
                      />
                    </div>
                    <div className="flex items-center">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                    </div>
                    <div className="flex items-center text-gray-600">{item.affiliation}</div>
                    <div className="flex items-center font-semibold text-gray-900">{formatCurrency(item.amountValue)}</div>
                    <div className="flex items-center">
                      <InlineBadgeSelect
                        value={item.paymentStatus}
                        options={paymentStatusSelectOptions}
                        onChange={(nextValue) => {
                          void handleRequestPaymentStatusChange(item.id, nextValue)
                        }}
                      />
                    </div>
                    <div className="flex items-center text-gray-600">{item.noticeGeneratedAt}</div>
                    <div className="flex items-center text-gray-600">{item.dueDate}</div>
                    <div className="flex items-center text-gray-600">{item.paymentCompletedAt || '미완료'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:hidden">
              {filteredItems.map((item) => {
                const status = statusMeta[item.status]

                return (
                  <div
                    key={`card-${item.id}`}
                    className={`cursor-pointer rounded-2xl border border-gray-200 px-4 py-4 shadow-sm ${status.toneClass}`}
                    onClick={() => setSelectedDetailItemId(item.id)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-gray-900">{item.name}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        onClick={stopRowClick}
                        aria-label={`${item.name} 선택`}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#003764] focus:ring-[#003764]"
                      />
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <InlineBadgeSelect
                        value={item.status}
                        options={statusSelectOptions}
                        onChange={(nextValue) => {
                          void handleStatusChange(item.id, nextValue)
                        }}
                        buttonClassName="w-full min-w-0"
                      />
                      <InlineBadgeSelect
                        value={item.paymentStatus}
                        options={paymentStatusSelectOptions}
                        onChange={(nextValue) => {
                          void handleRequestPaymentStatusChange(item.id, nextValue)
                        }}
                        buttonClassName="w-full min-w-0"
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">{item.affiliation}</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/90 px-3.5 py-3">
                        <div className="text-[11px] font-medium text-gray-500">납부 예정 금액</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(item.amountValue)}</div>
                      </div>
                      <div className="rounded-2xl bg-white/90 px-3.5 py-3">
                        <div className="text-[11px] font-medium text-gray-500">통지서 생성일</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">{item.noticeGeneratedAt}</div>
                      </div>
                      <div className="rounded-2xl bg-white/90 px-3.5 py-3">
                        <div className="text-[11px] font-medium text-gray-500">납부마감기한</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">{item.dueDate}</div>
                      </div>
                      <div className="rounded-2xl bg-white/90 px-3.5 py-3 sm:col-span-2">
                        <div className="text-[11px] font-medium text-gray-500">납부완료일자</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">{item.paymentCompletedAt || '미완료'}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </article>

      <PayerTargetDetailModal
        open={selectedDetailItem !== null}
        item={selectedDetailItem}
        formatCurrency={formatCurrency}
        statusMeta={selectedDetailItem ? statusMeta[selectedDetailItem.status] : statusMeta.advance}
        paymentStatusMeta={
          selectedDetailItem ? paymentStatusMeta[selectedDetailItem.paymentStatus] : paymentStatusMeta.unpaid
        }
        onClose={() => setSelectedDetailItemId(null)}
        onOpenDocument={handleOpenDocument}
        onAttachDocument={(id, documentId) => {
          const targetItem = payerItems.find((item) => item.id === id)
          if (!targetItem) return

          const historyDocumentType: HistoryDocumentType =
            documentId === 'opinion-submit'
              ? 'opinion_submit'
              : documentId === 'final-notice'
                ? 'final_notice'
                : documentId === 'suspension'
                  ? 'suspension'
                  : 'pre_notice'

          void handleAttachDocument(targetItem, historyDocumentType)
        }}
        onGenerateDocument={(id, documentId) => {
          setSelectedDetailItemId(null)
          openDocumentGenerationModal(id, documentId)
        }}
        onChangeStatus={(id, nextStatus) => {
          void handleStatusChange(id, nextStatus)
        }}
        onChangePaymentStatus={(id, nextPaymentStatus) => {
          void handleRequestPaymentStatusChange(id, nextPaymentStatus)
        }}
      />

      <PaymentCompletedDateModal
        open={paymentCompletedDateTarget !== null}
        payerName={paymentCompletedDateTarget?.name ?? ''}
        initialDate={paymentCompletedDateTarget?.paymentCompletedAt ?? null}
        onClose={() => setPaymentCompletedDateTargetId(null)}
        onConfirm={(date) => {
          void handleConfirmPaymentCompletedDate(date)
        }}
      />

      <DocumentGenerationRequiredModal
        open={documentGenerationTarget !== null && documentGenerationType !== null}
        documentId={documentGenerationType}
        outputDir={documentGenerationOutputDir}
        onClose={handleCloseDocumentGenerationModal}
        onPickOutputDir={() => {
          void handlePickDocumentOutputDir()
        }}
        onCreate={() => {
          void handleCreateDocument()
        }}
      />
    </section>
  )
}
