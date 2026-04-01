import {
  DOCUMENT_OPTIONS,
  type GenerateDocumentOption,
} from './generateDocumentSelectionData'

type GenerateDocumentSelectionCardProps = {
  generationComplete: boolean
  hasPreview: boolean
  isAllDocumentsSelected: boolean
  isGenerating: boolean
  lastSavedOutputDir: string | null
  outputDir: string | null
  selectedDocuments: Set<GenerateDocumentOption>
  onToggleAllDocuments: () => void
  onToggleDocument: (documentId: GenerateDocumentOption) => void
  onSelectAllRows: () => void
  onClearSelection: () => void
  onOpenOutputDir: () => void
  onGenerate: () => void
}

export default function GenerateDocumentSelectionCard({
  generationComplete,
  hasPreview,
  isAllDocumentsSelected,
  isGenerating,
  lastSavedOutputDir,
  outputDir,
  selectedDocuments,
  onToggleAllDocuments,
  onToggleDocument,
  onSelectAllRows,
  onClearSelection,
  onOpenOutputDir,
  onGenerate,
}: GenerateDocumentSelectionCardProps) {
  return (
    <aside className="flex h-full flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-lg xl:col-span-1">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-gray-900">생성 문서 선택</h3>
        <p className="text-sm text-gray-500">사전통지서, 운전업무정지, 확정통지서를 복수 선택할 수 있습니다.</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onToggleAllDocuments}
          aria-pressed={isAllDocumentsSelected}
          className={`w-full cursor-pointer rounded-2xl px-4 py-4 text-left transition ${
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
              className={`w-full cursor-pointer rounded-2xl px-4 py-4 text-left transition ${
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

      <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
        선택 문서 {selectedDocuments.size}건
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button
          className="cursor-pointer rounded-2xl bg-gray-200 px-5 py-3 font-semibold text-gray-800 hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSelectAllRows}
          disabled={!hasPreview}
        >
          전체 선택
        </button>
        <button
          className="cursor-pointer rounded-2xl bg-gray-200 px-5 py-3 font-semibold text-gray-800 hover:bg-gray-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onClearSelection}
          disabled={!hasPreview}
        >
          선택 해제
        </button>
        <button
          className={`cursor-pointer rounded-2xl px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 ${
            generationComplete
              ? 'bg-[#003764] hover:bg-[#0a4f8f]'
              : 'bg-[#e4032e] hover:bg-red-500'
          }`}
          onClick={generationComplete ? onOpenOutputDir : onGenerate}
          disabled={generationComplete ? !(lastSavedOutputDir ?? outputDir) : isGenerating || !hasPreview}
        >
          {generationComplete ? '폴더 열기' : isGenerating ? '생성 중...' : 'PDF 생성'}
        </button>
      </div>
    </aside>
  )
}
