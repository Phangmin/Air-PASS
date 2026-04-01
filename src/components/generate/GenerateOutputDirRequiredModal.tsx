type GenerateOutputDirRequiredModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function GenerateOutputDirRequiredModal({
  open,
  onClose,
  onConfirm,
}: GenerateOutputDirRequiredModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="저장 폴더 선택 필요"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-[0.12em] text-[#003764]">OUTPUT DIRECTORY</div>
            <h3 className="mt-2 text-xl font-bold text-gray-900">저장 폴더를 선택하세요</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              PDF를 생성하려면 먼저 저장할 폴더를 지정해야 합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-[#003764] hover:text-[#003764]"
            aria-label="저장 폴더 선택 안내 닫기"
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
          기본 저장 폴더가 없거나 아직 선택되지 않았습니다. 아래 버튼을 눌러 바로 설정할 수 있습니다.
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
            className="rounded-full bg-[#003764] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002b4d]"
          >
            저장 폴더 선택
          </button>
        </div>
      </div>
    </div>
  )
}
