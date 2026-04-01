import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import {
  payerPaymentStatusMeta,
  payerStatusMeta,
} from '../payer/payerTargetData'
import type { PayerDocumentId, PayerItem, PaymentTab } from '../payer/payerTargetTypes'
import PayerProcessWorkflow from './PayerProcessWorkflow'

type PayerTargetDetailModalProps = {
  open: boolean
  item: PayerItem | null
  formatCurrency: (value: number) => string
  statusMeta: {
    label: string
    badgeClass: string
  }
  paymentStatusMeta: {
    label: string
    badgeClass: string
  }
  onClose: () => void
  onOpenDocument: (filePath: string) => void
  onAttachDocument: (id: number, documentId: PayerDocumentId) => void
  onGenerateDocument?: (
    id: number,
    documentId: Extract<PayerDocumentId, 'pre-notice' | 'suspension' | 'final-notice'>,
  ) => void
  onChangeStatus: (id: number, nextStatus: Exclude<PaymentTab, 'all'>) => void
  onChangePaymentStatus: (id: number, nextPaymentStatus: PayerItem['paymentStatus']) => void
}

type InlineSelectOption<T extends string> = {
  value: T
  label: string
  buttonClass: string
}

const compactSelectClass =
  'flex w-full items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold leading-none outline-none transition focus-visible:border-[#003764] focus-visible:ring-2 focus-visible:ring-[#003764]/10'

const statusSelectOptions: InlineSelectOption<Exclude<PaymentTab, 'all'>>[] = [
  {
    value: 'advance',
    label: payerStatusMeta.advance.label,
    buttonClass: payerStatusMeta.advance.badgeClass,
  },
  {
    value: 'confirmed',
    label: payerStatusMeta.confirmed.label,
    buttonClass: payerStatusMeta.confirmed.badgeClass,
  },
]

const paymentStatusSelectOptions: InlineSelectOption<PayerItem['paymentStatus']>[] = [
  {
    value: 'unpaid',
    label: payerPaymentStatusMeta.unpaid.label,
    buttonClass: payerPaymentStatusMeta.unpaid.badgeClass,
  },
  {
    value: 'paid',
    label: payerPaymentStatusMeta.paid.label,
    buttonClass: payerPaymentStatusMeta.paid.badgeClass,
  },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function isDueWithinAWeek(dueDate: string) {
  const today = new Date()
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfDueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.floor((startOfDueDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))

  return diffDays >= 0 && diffDays <= 7
}

function InlineBadgeSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: InlineSelectOption<T>[]
  onChange: (value: T) => void
}) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative min-w-0">
        <Listbox.Button className={`${compactSelectClass} cursor-pointer ${selectedOption.buttonClass}`.trim()}>
          <span className="truncate">{selectedOption.label}</span>
          <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-current/70" aria-hidden="true" />
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute left-0 top-[calc(100%+0.5rem)] z-20 min-w-full overflow-hidden rounded-2xl border border-[#003764]/20 bg-white py-1 text-sm shadow-xl ring-1 ring-black/5 focus:outline-none">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  classNames(
                    active ? 'bg-[#003764] text-white' : 'text-gray-900',
                    'cursor-pointer select-none px-4 py-3 transition',
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

function getMissingDocumentMessage(documentId: PayerDocumentId) {
  if (documentId === 'opinion-submit') {
    return '의견제출 문서를 첨부해 주세요.'
  }

  if (documentId === 'pre-notice' || documentId === 'suspension' || documentId === 'final-notice') {
    return '생성하기 버튼으로 문서를 바로 만들 수 있습니다.'
  }

  return '파일이 아직 생성되지 않았습니다.'
}

function isGeneratableDocumentId(
  documentId: PayerDocumentId,
): documentId is Extract<PayerDocumentId, 'pre-notice' | 'suspension' | 'final-notice'> {
  return documentId === 'pre-notice' || documentId === 'suspension' || documentId === 'final-notice'
}

export default function PayerTargetDetailModal({
  open,
  item,
  formatCurrency,
  statusMeta,
  paymentStatusMeta,
  onClose,
  onOpenDocument,
  onAttachDocument,
  onGenerateDocument,
  onChangeStatus,
  onChangePaymentStatus,
}: PayerTargetDetailModalProps) {
  if (!open || !item) return null

  const showPaymentAlert =
    item.status === 'advance' &&
    item.paymentStatus === 'unpaid' &&
    isDueWithinAWeek(item.advanceDueDate)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="납부 대상자 상세조회"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold tracking-[0.12em] text-[#003764]">PAYER DETAIL</div>
            <h3 className="mt-2 text-2xl font-bold text-gray-900">납부 대상자 상세조회</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">{item.name}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {item.affiliation}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentStatusMeta.badgeClass}`}
              >
                {paymentStatusMeta.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-[#003764] hover:text-[#003764]"
            aria-label="상세보기 닫기"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path
                d="M5 5l10 10M15 5 5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <PayerProcessWorkflow item={item} />

        {showPaymentAlert ? (
          <div className="mt-4 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
            현재 <span className="font-semibold">{item.name}</span>님의 납부가 확인되지 않았습니다. 사전납부기한 이후
            자동으로 확정통지서가 생성됩니다.
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <div className="text-[11px] font-medium text-gray-500">구분</div>
            <div className="mt-2">
              <InlineBadgeSelect
                value={item.status}
                options={statusSelectOptions}
                onChange={(nextValue) => onChangeStatus(item.id, nextValue)}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <div className="text-[11px] font-medium text-gray-500">납부 상태</div>
            <div className="mt-2">
              <InlineBadgeSelect
                value={item.paymentStatus}
                options={paymentStatusSelectOptions}
                onChange={(nextValue) => onChangePaymentStatus(item.id, nextValue)}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <div className="text-[11px] font-medium text-gray-500">납부 예정 금액</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(item.amountValue)}</div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-700">
              <div className="text-[11px] font-medium text-gray-500">사전납부기한</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{item.advanceDueDate}</div>
            </div>
            <div className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-700">
              <div className="text-[11px] font-medium text-gray-500">확정납부기한</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{item.confirmedDueDate || '미생성'}</div>
            </div>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <div className="text-[11px] font-medium text-gray-500">납부 완료일자</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{item.paymentCompletedAt || '미완료'}</div>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <div className="text-[11px] font-medium text-gray-500">메일주소</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{item.violation.email}</div>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3 lg:col-span-3">
            <div className="text-[11px] font-medium text-gray-500">대상자 주소</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{item.violation.address}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">위반 내용</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-white px-3.5 py-3">
                <div className="text-[11px] font-medium text-gray-500">위반 일시</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{item.violation.occurredAt}</div>
              </div>
              <div className="rounded-2xl bg-white px-3.5 py-3">
                <div className="text-[11px] font-medium text-gray-500">위반 장소</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{item.violation.location}</div>
              </div>
              <div className="rounded-2xl bg-white px-3.5 py-3">
                <div className="text-[11px] font-medium text-gray-500">차종</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{item.violation.vehicleType || '-'}</div>
              </div>
              <div className="rounded-2xl bg-white px-3.5 py-3">
                <div className="text-[11px] font-medium text-gray-500">차량번호</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{item.violation.vehicleNumber}</div>
              </div>
              <div className="rounded-2xl bg-white px-3.5 py-3">
                <div className="text-[11px] font-medium text-gray-500">속도</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{item.violation.speed || '-'}</div>
              </div>
              <div className="rounded-2xl bg-white px-3.5 py-3">
                <div className="text-[11px] font-medium text-gray-500">초과속도</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{item.violation.excessSpeed || '-'}</div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">문서 파일</div>
            <div className="mt-3 grid gap-2">
              {item.documents.map((document) => (
                <div
                  key={document.id}
                  className="flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-sm font-semibold text-gray-900">{document.title}</div>
                    <div className="mt-1 truncate text-xs text-gray-500">
                      {document.filePath ? document.fileName : getMissingDocumentMessage(document.id)}
                    </div>
                  </div>
                  {document.filePath ? (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(document.filePath!)}
                      className="shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-[#003764] px-2.5 py-1 text-[11px] font-semibold text-white"
                    >
                      파일열기
                    </button>
                  ) : document.id === 'opinion-submit' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onAttachDocument(item.id, document.id)
                      }}
                      className="shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-[#003764] px-2.5 py-1 text-[11px] font-semibold text-white"
                    >
                      파일첨부
                    </button>
                  ) : isGeneratableDocumentId(document.id) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const generatableDocumentId: Extract<
                          PayerDocumentId,
                          'pre-notice' | 'suspension' | 'final-notice'
                        > = document.id as Extract<
                          PayerDocumentId,
                          'pre-notice' | 'suspension' | 'final-notice'
                        >
                        onGenerateDocument?.(item.id, generatableDocumentId)
                      }}
                      className="shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-[#003764] px-2.5 py-1 text-[11px] font-semibold text-white"
                    >
                      생성하기
                    </button>
                  ) : (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500 ring-1 ring-inset ring-gray-200">
                      미생성
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
