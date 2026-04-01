import PdfIcon from '../../assets/pdf_icon.svg'

type GenerateProgressModalProps = {
  open: boolean
}

export default function GenerateProgressModal({ open }: GenerateProgressModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="PDF 생성 중"
    >
      <div className="w-full max-w-sm rounded-[28px] bg-white px-8 py-9 text-center shadow-2xl">
        <div className="mx-auto flex h-28 w-28 items-center justify-center">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 rounded-full border-[6px] border-[#f6d1d1]" />
            <div className="absolute inset-0 animate-spin rounded-full border-[6px] border-transparent border-t-[#c62828] border-r-[#ef5350]" />
            <div className="absolute inset-[16px] animate-pulse rounded-full bg-[#fff1f1] shadow-[inset_0_0_0_1px_rgba(198,40,40,0.08)]" />
            <div className="absolute inset-[25px] flex items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(198,40,40,0.12)]">
              <img src={PdfIcon} alt="" className="h-8 w-8 object-contain" />
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs font-semibold tracking-[0.16em] text-[#c62828]">GENERATING PDF</div>
        <h3 className="mt-3 text-2xl font-bold text-slate-900">PDF를 생성하고 있습니다</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          선택한 대상과 문서 정보를 정리해서 저장 중입니다.<br />생성이 끝나면 바로 안내해드리겠습니다.
        </p>
      </div>
    </div>
  )
}
