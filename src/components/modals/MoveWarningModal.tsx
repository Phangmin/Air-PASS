type MoveWarningModalProps = {
  open: boolean
  message: string
  onCancel: () => void
  onConfirm: () => void
}

export default function MoveWarningModal({
  open,
  message,
  onCancel,
  onConfirm,
}: MoveWarningModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="mb-6 break-keep text-left text-sm leading-6 text-gray-700">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="cursor-pointer rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-full bg-[#003764] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002b4d]"
            onClick={onConfirm}
          >
            이동
          </button>
        </div>
      </div>
    </div>
  )
}
