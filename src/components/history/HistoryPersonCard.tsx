import PdfIcon from '../../assets/pdf_icon.svg'
import type { HistoryDocumentType, ViolationDocumentRecord } from '../../types/ipc'

type HistoryPersonCardProps = {
  row: ViolationDocumentRecord
  isSelected: boolean
  affiliationLabel: string
  onToggleSelect: () => void
  onDelete: () => void
  onOpenDocument: (filePath: string) => void
  onGenerateDocument: (
    violationRecordId: number,
    documentType: Extract<HistoryDocumentType, 'pre_notice' | 'suspension' | 'final_notice'>,
  ) => void
  formatDateTime: (value: string) => string
  documents: Array<{
    label: string
    row: ViolationDocumentRecord | null
    documentType: Extract<HistoryDocumentType, 'pre_notice' | 'suspension' | 'final_notice'>
  }>
}

function getPaymentTypeLabel(row: ViolationDocumentRecord) {
  return row.paymentType === 'confirmed' ? '확정납부' : '사전납부'
}

function getPaymentStatusLabel(row: ViolationDocumentRecord) {
  const status =
    row.paymentType === 'confirmed'
      ? row.confirmedPaymentStatus
      : row.advancePaymentStatus
  return status === 'paid' ? '완납' : '미납'
}

export default function HistoryPersonCard({
  row,
  isSelected,
  affiliationLabel,
  onToggleSelect,
  onDelete,
  onOpenDocument,
  onGenerateDocument,
  formatDateTime,
  documents,
}: HistoryPersonCardProps) {
  const isDimmed = documents.every((document) => !document.row?.exists)
  const paymentTypeLabel = getPaymentTypeLabel(row)
  const paymentStatusLabel = getPaymentStatusLabel(row)
  const paymentStatusClass =
    paymentStatusLabel === '완납'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
      : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-3xl border border-gray-200 bg-white p-3.5 shadow-sm transition ${
        isDimmed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-3.5 w-3.5 cursor-pointer"
          />
          <img src={PdfIcon} alt="PDF" className="h-6 w-6" />
          <div className="flex flex-row flex-wrap items-center gap-2.5">
            <span className="text-base font-semibold">{row.driverName?.trim() || '미기재'}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              {affiliationLabel}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {row.regionRegNo || '차량번호 미기재'}
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
              {paymentTypeLabel}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusClass}`}>
              {paymentStatusLabel}
            </span>
            <span className="text-sm text-gray-500">
              최근 수정 {formatDateTime(row.updatedAt ?? row.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-full border border-gray-300 px-4 py-2 text-sm text-red-600 transition hover:bg-[#e4032e] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onDelete}
          >
            삭제
          </button>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white px-3.5 py-3">
              <div className="text-[11px] font-medium text-gray-500">위반일시</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{row.passTime || '-'}</div>
            </div>
            <div className="rounded-2xl bg-white px-3.5 py-3">
              <div className="text-[11px] font-medium text-gray-500">위반장소</div>
              <div className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">
                {row.passLocation || '-'}
              </div>
            </div>
            <div className="rounded-2xl bg-white px-3.5 py-3">
              <div className="text-[11px] font-medium text-gray-500">이메일</div>
              <div className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">
                {row.partyEmail || '-'}
              </div>
            </div>
            <div className="rounded-2xl bg-white px-3.5 py-3">
              <div className="text-[11px] font-medium text-gray-500">주소</div>
              <div className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">
                {row.partyAddress || '-'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white px-3.5 py-3">
            <div className="text-sm font-semibold text-gray-900">문서 생성 현황</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {documents.map((document) => (
                <div
                  key={document.label}
                  className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{document.label}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {document.row?.exists
                        ? formatDateTime(document.row.updatedAt ?? document.row.createdAt)
                        : '생성 이력 없음'}
                    </div>
                  </div>
                  {document.row?.exists ? (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(document.row!.filePath)}
                      className="shrink-0 rounded-full border border-[#003764] bg-[#003764] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#114a83] cursor-pointer"
                    >
                      열기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onGenerateDocument(row.violationRecordId, document.documentType)}
                      className="shrink-0 rounded-full border border-[#003764] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#003764] transition hover:bg-[#003764] hover:text-white cursor-pointer"
                    >
                      생성하기
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isDimmed ? <p className="text-sm text-red-500">파일이 제거되어 열 수 없습니다.</p> : null}
    </div>
  )
}
