type SettingsNoticeModalProps = {
  open: boolean
  message: string
  onClose: () => void
}

export default function SettingsNoticeModal({
  open,
  message,
  onClose,
}: SettingsNoticeModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-center text-sm leading-6 text-gray-700">{message}</p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="cursor-pointer rounded-full bg-[#003764] px-5 py-2 text-sm font-semibold text-white hover:bg-[#114a83]"
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
