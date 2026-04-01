type GenerateCompleteModalProps = {
  count: number
  open: boolean
  onClose: () => void
  onOpenOutputDir: () => void
}

const circleLength = 289
const checkLength = 72

export default function GenerateCompleteModal({
  count,
  open,
  onClose,
  onOpenOutputDir,
}: GenerateCompleteModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="PDF 생성 완료"
      onClick={onClose}
    >
      <style>
        {`
          @keyframes generate-complete-circle {
            from {
              stroke-dashoffset: ${circleLength};
            }
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes generate-complete-check {
            from {
              stroke-dashoffset: ${checkLength};
            }
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes generate-complete-badge {
            0% {
              opacity: 0;
              transform: scale(0.88);
            }
            70% {
              opacity: 1;
              transform: scale(1.04);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>

      <div
        className="w-full max-w-md rounded-[32px] bg-white px-8 py-9 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="mx-auto flex h-32 w-32 items-center justify-center"
          style={{ animation: 'generate-complete-badge 500ms ease-out both' }}
        >
          <svg viewBox="0 0 120 120" className="h-28 w-28">
            <circle cx="60" cy="60" r="46" fill="#fff1f1" />
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke="#c62828"
              strokeWidth="6"
              strokeLinecap="round"
              style={{
                strokeDasharray: circleLength,
                strokeDashoffset: circleLength,
                animation: 'generate-complete-circle 700ms ease-out forwards',
              }}
            />
            <path
              d="M38 62l15 15 30-34"
              fill="none"
              stroke="#c62828"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: checkLength,
                strokeDashoffset: checkLength,
                animation: 'generate-complete-check 380ms 480ms ease-out forwards',
              }}
            />
          </svg>
        </div>

        <div className="mt-2 text-center">
          <div className="text-xs font-semibold tracking-[0.16em] text-[#c62828]">GENERATION COMPLETE</div>
          <h3 className="mt-3 text-2xl font-bold text-slate-900">PDF 생성이 완료되었습니다</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            <span className="block">총 {count}건의 PDF를 저장했습니다.</span>
            <span className="block">바로 저장 폴더를 열어 결과를 확인할 수 있습니다.</span>
          </p>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
          >
            확인
          </button>
          <button
            type="button"
            onClick={onOpenOutputDir}
            className="rounded-full bg-[#003764] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002b4d] cursor-pointer"
          >
            저장 폴더 열기
          </button>
        </div>
      </div>
    </div>
  )
}
