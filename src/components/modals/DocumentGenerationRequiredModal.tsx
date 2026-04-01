import type { PayerDocumentId } from '../payer/payerTargetTypes'

type DocumentGenerationRequiredModalProps = {
  open: boolean
  documentId: Extract<PayerDocumentId, 'pre-notice' | 'suspension' | 'final-notice'> | null
  outputDir: string | null
  onClose: () => void
  onPickOutputDir: () => void
  onCreate: () => void
}

const DOCUMENT_LABELS: Record<
  Extract<PayerDocumentId, 'pre-notice' | 'suspension' | 'final-notice'>,
  string
> = {
  'pre-notice': '사전통지서',
  suspension: '운전업무정지 통지서',
  'final-notice': '확정통지서',
}

export default function DocumentGenerationRequiredModal({
  open,
  documentId,
  outputDir,
  onClose,
  onPickOutputDir,
  onCreate,
}: DocumentGenerationRequiredModalProps) {
  if (!open || !documentId) return null

  const documentLabel = DOCUMENT_LABELS[documentId]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">{documentLabel} 생성</h2>
        <p className="mt-3 text-sm leading-6 text-gray-700">
          {documentLabel}가 아직 없어 먼저 생성이 필요합니다.<br />저장할 폴더를 선택한 뒤 바로 생성할 수
          있습니다.
        </p>
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-[11px] font-medium text-gray-500">저장 폴더</div>
          <div className="mt-1 break-all text-sm font-semibold text-gray-900">
            {outputDir || '저장 폴더를 선택해 주세요.'}
          </div>
          <button
            type="button"
            onClick={onPickOutputDir}
            className="mt-3 cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#003764] hover:text-[#003764]"
          >
            저장 폴더 선택
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={!outputDir}
            className="cursor-pointer rounded-full bg-[#003764] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#114a83] disabled:cursor-not-allowed disabled:bg-[#7a9ab8]"
          >
            {documentLabel} 생성
          </button>
        </div>
      </div>
    </div>
  )
}
