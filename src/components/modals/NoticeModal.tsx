type NoticeModalProps = {
  open: boolean
  title: string
  body: string
  date: string
  onClose: () => void
}

export default function NoticeModal({ open, title, body, date, onClose }: NoticeModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="공지사항 상세"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <div className="text-xs font-semibold tracking-[0.12em] text-[#003764]">NOTICE</div>
          <h3 className="mt-2 text-xl font-bold text-gray-900">{title}</h3>
        </div>
        <div className="mt-3 text-xs font-medium text-gray-500">{date}</div>
        <div className="mt-5 whitespace-pre-line rounded-2xl bg-gray-50 px-4 py-4 text-sm leading-7 text-gray-700">
          {body}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#003764] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002b4d] cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
