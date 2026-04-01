import {
  DOCUMENT_OPTIONS,
  type GenerateDocumentOption,
} from './generateDocumentSelectionData'

type GenerateDocumentRequiredModalProps = {
  isAllDocumentsSelected: boolean
  open: boolean
  onClose: () => void
  onConfirm: () => void
  onToggleAllDocuments: () => void
  onToggleDocument: (documentId: GenerateDocumentOption) => void
  selectedDocuments: Set<GenerateDocumentOption>
}

export default function GenerateDocumentRequiredModal({
  isAllDocumentsSelected,
  open,
  onClose,
  onConfirm,
  onToggleAllDocuments,
  onToggleDocument,
  selectedDocuments,
}: GenerateDocumentRequiredModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="생성 문서 선택 필요"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-[0.12em] text-[#003764]">
              DOCUMENT SELECTION
            </div>
            <h3 className="mt-2 text-xl font-bold text-gray-900">생성할 문서를 선택하세요.</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              PDF 생성 전에 아래 카드에서 최소 1개의 문서를 선택해야 합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-[#003764] hover:text-[#003764]"
            aria-label="생성 문서 선택 안내 닫기"
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

        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
          사전통지서, 운전업무정지, 확정통지서 중에서 생성할 문서를 선택한 뒤 다시 진행해 주세요.
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={onToggleAllDocuments}
            aria-pressed={isAllDocumentsSelected}
            className={`w-full rounded-2xl px-4 py-4 text-left transition ${
              isAllDocumentsSelected
                ? 'border border-[#3288FF] bg-[#3288FF] text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-semibold">전체</span>
          </button>

          {DOCUMENT_OPTIONS.map((document) => {
            const isSelected = selectedDocuments.has(document.id)
            return (
              <button
                key={document.id}
                type="button"
                onClick={() => onToggleDocument(document.id)}
                aria-pressed={isSelected}
                className={`w-full rounded-2xl px-4 py-4 text-left transition ${
                  isSelected
                    ? 'border border-[#3288FF] bg-[#3288FF] text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-semibold">{document.label}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          선택 문서 {selectedDocuments.size}건
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={selectedDocuments.size === 0}
            className="rounded-full bg-[#003764] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002b4d] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  )
}
