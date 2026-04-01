import { useEffect, useState } from 'react'

type PaymentCompletedDateModalProps = {
  open: boolean
  payerName: string
  initialDate: string | null
  onClose: () => void
  onConfirm: (date: string) => void
}

function getTodayDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`
}

export default function PaymentCompletedDateModal({
  open,
  payerName,
  initialDate,
  onClose,
  onConfirm,
}: PaymentCompletedDateModalProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate ?? getTodayDate())

  useEffect(() => {
    if (!open) return
    setSelectedDate(initialDate ?? getTodayDate())
  }, [initialDate, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="납부완료일자 선택"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <div className="text-xs font-semibold tracking-[0.12em] text-[#003764]">PAYMENT DATE</div>
          <h3 className="mt-2 text-xl font-bold text-gray-900">납부완료일자 선택</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            <span className="font-semibold text-gray-900">{payerName}</span>
            님의 납부완료일자를 선택해 주세요.
          </p>
        </div>

        <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-4">
          <label className="block text-[11px] font-medium text-gray-500" htmlFor="payment-completed-date">
            납부완료일자
          </label>
          <input
            id="payment-completed-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="mt-2 w-full cursor-pointer rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#003764] focus:ring-2 focus:ring-[#003764]/10"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedDate)}
            disabled={!selectedDate}
            className="cursor-pointer rounded-full bg-[#003764] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002b4d] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  )
}
