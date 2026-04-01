type GenerateOutputDirectoryBarProps = {
  outputDir: string | null
  previewRowCount: number
  selectedCount: number
  onPickOutputDir: () => void
}

export default function GenerateOutputDirectoryBar({
  outputDir,
  previewRowCount,
  selectedCount,
  onPickOutputDir,
}: GenerateOutputDirectoryBarProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-row flex-wrap items-center gap-3">
        <button
          className="cursor-pointer select-none rounded-full bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600"
          onClick={onPickOutputDir}
        >
          저장 폴더 선택
        </button>
        <span className="text-sm text-gray-600">
          {outputDir ?? '기본 저장 폴더가 없으므로 저장 폴더를 선택해 주세요.'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span>총 {previewRowCount}건</span>
        <span>/</span>
        <span>선택 {selectedCount}건</span>
      </div>
    </div>
  )
}
