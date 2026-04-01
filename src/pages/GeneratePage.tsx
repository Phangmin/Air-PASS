import { useCallback, useEffect, useMemo, useState } from 'react'
import GenerateDocumentSelectionCard from '../components/generate/GenerateDocumentSelectionCard'
import GenerateCompleteModal from '../components/generate/GenerateCompleteModal'
import GenerateDocumentRequiredModal from '../components/generate/GenerateDocumentRequiredModal'
import GenerateExcelPickerCard from '../components/generate/GenerateExcelPickerCard'
import GenerateOutputDirectoryBar from '../components/generate/GenerateOutputDirectoryBar'
import GenerateOutputDirRequiredModal from '../components/generate/GenerateOutputDirRequiredModal'
import GenerateProgressModal from '../components/generate/GenerateProgressModal'
import GeneratePreviewTable from '../components/generate/GeneratePreviewTable'
import GenerateStatusMessage from '../components/generate/GenerateStatusMessage'
import {
  ALL_DOCUMENT_OPTIONS,
  type GenerateDocumentOption,
} from '../components/generate/generateDocumentSelectionData'
import type { ExcelPreviewRow, GenerateDocumentKind, GenerateResult } from '../types/ipc'

type StatusMessage = { type: 'success' | 'error' | 'info'; text: string }

type GeneratePageProps = {
  defaultOutputDir: string | null
  onMoveWarningChange?: (message: string | null) => void
}

export default function GeneratePage({ defaultOutputDir, onMoveWarningChange }: GeneratePageProps) {
  const [excelPath, setExcelPath] = useState<string | null>(null)
  const [outputDir, setOutputDir] = useState<string | null>(defaultOutputDir)
  const [hasCustomOutputDir, setHasCustomOutputDir] = useState(false)
  const [previewRows, setPreviewRows] = useState<ExcelPreviewRow[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [selectedDocuments, setSelectedDocuments] = useState<Set<GenerateDocumentOption>>(new Set())
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [generatedCount, setGeneratedCount] = useState(0)
  const [isGenerateCompleteModalOpen, setIsGenerateCompleteModalOpen] = useState(false)
  const [isDocumentRequiredModalOpen, setIsDocumentRequiredModalOpen] = useState(false)
  const [isOutputDirRequiredModalOpen, setIsOutputDirRequiredModalOpen] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [lastSavedOutputDir, setLastSavedOutputDir] = useState<string | null>(null)
  const shouldWarnBeforeLeave = Boolean(excelPath && !generationComplete)

  useEffect(() => {
    if (!onMoveWarningChange) return
    if (shouldWarnBeforeLeave) {
      onMoveWarningChange('PDF 생성 전에 다른 페이지로 이동하면 현재 입력한 데이터가 초기화됩니다.')
    } else {
      onMoveWarningChange(null)
    }
  }, [onMoveWarningChange, shouldWarnBeforeLeave])

  useEffect(() => {
    if (!hasCustomOutputDir) {
      setOutputDir(defaultOutputDir ?? null)
    }
  }, [defaultOutputDir, hasCustomOutputDir])

  const handlePickExcel = useCallback(async () => {
    try {
      const picked = await window.electronAPI.pickExcel()
      if (!picked) return
      setExcelPath(picked)
      setStatus({ type: 'info', text: '엑셀 데이터를 불러오는 중입니다.' })
      setLoadingPreview(true)
      const rows = await window.electronAPI.loadExcelPreview(picked)
      setPreviewRows(rows)
      setSelectedRows(new Set(rows.map((row) => row.index)))
      setGeneratedCount(0)
      setIsGenerateCompleteModalOpen(false)
      setGenerationComplete(false)
      setLastSavedOutputDir(null)
      setStatus({ type: 'success', text: `${rows.length}개의 행을 불러왔습니다.` })
    } catch (error) {
      setStatus({ type: 'error', text: (error as Error).message })
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const handlePickOutputDir = useCallback(async () => {
    try {
      const picked = await window.electronAPI.pickOutputDir(
        outputDir ?? defaultOutputDir ?? undefined,
      )
      if (!picked) return
      setOutputDir(picked)
      setHasCustomOutputDir(true)
      setIsGenerateCompleteModalOpen(false)
      setGenerationComplete(false)
      setStatus({ type: 'success', text: '저장 폴더를 선택했습니다.' })
    } catch (error) {
      setStatus({ type: 'error', text: (error as Error).message })
    }
  }, [defaultOutputDir, outputDir])

  const toggleRow = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedRows(new Set(previewRows.map((row) => row.index)))
  }, [previewRows])

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set())
  }, [])

  const toggleDocument = useCallback((documentId: GenerateDocumentOption) => {
    setSelectedDocuments((prev) => {
      const next = new Set(prev)
      if (next.has(documentId)) {
        next.delete(documentId)
      } else {
        next.add(documentId)
      }
      return next
    })
  }, [])

  const toggleAllDocuments = useCallback(() => {
    setSelectedDocuments((prev) =>
      prev.size === ALL_DOCUMENT_OPTIONS.length ? new Set() : new Set(ALL_DOCUMENT_OPTIONS),
    )
  }, [])

  const selectedCount = selectedRows.size
  const hasPreview = previewRows.length > 0
  const selectedDocumentKinds = useMemo<GenerateDocumentKind[]>(() => {
    const next: GenerateDocumentKind[] = []
    if (selectedDocuments.has('preNotice')) {
      next.push('fine')
    }
    if (selectedDocuments.has('suspension')) {
      next.push('suspension')
    }
    if (selectedDocuments.has('finalNotice')) {
      next.push('final')
    }
    return next
  }, [selectedDocuments])
  const isAllDocumentsSelected = selectedDocuments.size === ALL_DOCUMENT_OPTIONS.length

  const handleFieldChange = useCallback(
    (index: number, key: keyof ExcelPreviewRow, value: string) => {
      setPreviewRows((prev) =>
        prev.map((row) => (row.index === index ? { ...row, [key]: value } : row)),
      )
      setIsGenerateCompleteModalOpen(false)
      setGenerationComplete(false)
    },
    [],
  )

  const handleOpenOutputDir = useCallback(async () => {
    const targetDir = lastSavedOutputDir ?? outputDir
    if (!targetDir) {
      setStatus({ type: 'error', text: '열 수 있는 저장 폴더 정보가 없습니다.' })
      return
    }
    try {
      await window.electronAPI.openDirectory(targetDir)
      setStatus({ type: 'info', text: '저장 폴더를 열었습니다.' })
    } catch (error) {
      setStatus({ type: 'error', text: (error as Error).message })
    }
  }, [lastSavedOutputDir, outputDir])

  const handleGenerate = useCallback(async () => {
    if (!excelPath) {
      setStatus({ type: 'error', text: '엑셀 파일을 먼저 선택해 주세요.' })
      return
    }
    if (!outputDir) {
      setIsOutputDirRequiredModalOpen(true)
      return
    }
    if (selectedDocuments.size === 0) {
      setIsDocumentRequiredModalOpen(true)
      return
    }
    if (selectedRows.size === 0) {
      setStatus({ type: 'error', text: '생성할 대상을 선택해 주세요.' })
      return
    }

    setGenerationComplete(false)
    setIsGenerateCompleteModalOpen(false)
    setIsGenerating(true)
    setStatus({ type: 'info', text: 'PDF를 생성하고 있습니다.' })
    try {
      const overrides = previewRows.filter((row) => selectedRows.has(row.index))
      const result: GenerateResult = await window.electronAPI.runGenerate({
        excelPath,
        outputDir,
        documentKinds: selectedDocumentKinds,
        selectedRows: Array.from(selectedRows),
        overrides,
      })
      if (result.ok) {
        setGeneratedCount(result.count)
        setLastSavedOutputDir(outputDir)
        setGenerationComplete(true)
        setIsGenerateCompleteModalOpen(true)
        setStatus({ type: 'success', text: `PDF ${result.count}건을 저장했습니다.` })
      } else {
        const errorMessage =
          'message' in result && result.message ? result.message : 'PDF 생성에 실패했습니다.'
        setStatus({ type: 'error', text: errorMessage })
      }
    } catch (error) {
      setStatus({ type: 'error', text: (error as Error).message })
    } finally {
      setIsGenerating(false)
    }
  }, [
    excelPath,
    outputDir,
    previewRows,
    selectedDocumentKinds,
    selectedDocuments,
    selectedRows,
  ])

  return (
    <section className="relative flex h-full flex-col gap-4">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="flex border-l-4 border-[#003764] pl-4 text-2xl font-bold">
            행정처분 과태료 통지서 생성
          </h2>
        </div>
      </div>
      <div className="border border-gray-200" />

      <div className="grid flex-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-4">
          <div className="flex h-full flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
            <GenerateExcelPickerCard
              excelPath={excelPath}
              loadingPreview={loadingPreview}
              onPickExcel={handlePickExcel}
            />
            <GenerateOutputDirectoryBar
              outputDir={outputDir}
              previewRowCount={previewRows.length}
              selectedCount={selectedCount}
              onPickOutputDir={handlePickOutputDir}
            />
            <GenerateStatusMessage status={status} />
            <GeneratePreviewTable
              previewRows={previewRows}
              selectedRows={selectedRows}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onToggleRow={toggleRow}
              onFieldChange={handleFieldChange}
            />
          </div>
        </div>

        <GenerateDocumentSelectionCard
          generationComplete={generationComplete}
          hasPreview={hasPreview}
          isAllDocumentsSelected={isAllDocumentsSelected}
          isGenerating={isGenerating}
          lastSavedOutputDir={lastSavedOutputDir}
          outputDir={outputDir}
          selectedDocuments={selectedDocuments}
          onToggleAllDocuments={toggleAllDocuments}
          onToggleDocument={toggleDocument}
          onSelectAllRows={selectAll}
          onClearSelection={clearSelection}
          onOpenOutputDir={handleOpenOutputDir}
          onGenerate={handleGenerate}
        />
      </div>

      <GenerateDocumentRequiredModal
        isAllDocumentsSelected={isAllDocumentsSelected}
        open={isDocumentRequiredModalOpen}
        onClose={() => setIsDocumentRequiredModalOpen(false)}
        onConfirm={() => setIsDocumentRequiredModalOpen(false)}
        onToggleAllDocuments={toggleAllDocuments}
        onToggleDocument={toggleDocument}
        selectedDocuments={selectedDocuments}
      />

      <GenerateProgressModal open={isGenerating} />

      <GenerateCompleteModal
        count={generatedCount}
        open={isGenerateCompleteModalOpen}
        onClose={() => setIsGenerateCompleteModalOpen(false)}
        onOpenOutputDir={() => {
          setIsGenerateCompleteModalOpen(false)
          void handleOpenOutputDir()
        }}
      />

      <GenerateOutputDirRequiredModal
        open={isOutputDirRequiredModalOpen}
        onClose={() => setIsOutputDirRequiredModalOpen(false)}
        onConfirm={() => {
          setIsOutputDirRequiredModalOpen(false)
          void handlePickOutputDir()
        }}
      />
    </section>
  )
}
