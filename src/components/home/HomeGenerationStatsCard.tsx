import { useEffect, useMemo, useState } from 'react'
import type { HistoryTab } from '../../pages/HistoryPage'
import type { ViolationDocumentRecord } from '../../types/ipc'

const donutRadius = 66
const donutCircumference = 2 * Math.PI * donutRadius

type HomeGenerationStatsCardProps = {
  onOpenHistory?: (tab?: HistoryTab) => void
}

function inferHistoryTab(filePath: string): HistoryTab {
  const baseName = filePath.split(/[\\/]/).pop() ?? filePath
  if (/^2\.\s*행정처분\(운전업무정지\)\s*사전통지서/.test(baseName)) return 'suspension'
  if (/^3\.\s*행정처분\(과태료\)\s*확정통지서/.test(baseName)) return 'finalNotice'
  return 'preNotice'
}

export default function HomeGenerationStatsCard({ onOpenHistory }: HomeGenerationStatsCardProps) {
  const [records, setRecords] = useState<ViolationDocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredStatLabel, setHoveredStatLabel] = useState<string | null>(null)
  const [hoveredStatPosition, setHoveredStatPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const nextRecords = await window.electronAPI.history.list()
        if (mounted) {
          setRecords(nextRecords)
        }
      } catch {
        if (mounted) {
          setRecords([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const stats = useMemo(
    () => [
      {
        label: '사전통지서',
        value: records.filter((record) => inferHistoryTab(record.filePath) === 'preNotice').length,
        color: '#003764',
        tab: 'preNotice' as const,
      },
      {
        label: '운전업무정지 통지서',
        value: records.filter((record) => inferHistoryTab(record.filePath) === 'suspension').length,
        color: '#e4032e',
        tab: 'suspension' as const,
      },
      {
        label: '확정통지서',
        value: records.filter((record) => inferHistoryTab(record.filePath) === 'finalNotice').length,
        color: '#f59e0b',
        tab: 'finalNotice' as const,
      },
    ],
    [records],
  )

  const totalCount = stats.reduce((sum, item) => sum + item.value, 0)
  const hoveredStat = stats.find((item) => item.label === hoveredStatLabel) ?? null
  const handleOpenHistoryTab = (tab: HistoryTab = 'all') => onOpenHistory?.(tab)
  let accumulatedOffset = 0

  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#003764]">생성 이력</div>
        <button
          type="button"
          onClick={() => handleOpenHistoryTab('all')}
          className="group inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-500 transition hover:border-[#003764] hover:bg-[#003764] hover:text-white"
          aria-label="생성 이력 페이지로 이동"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none">
            <path
              d="M7 4l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {loading ? (
        <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
          생성 통계를 불러오는 중입니다.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex justify-center">
            <div className="relative h-[200px] w-[200px]">
              <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
                <circle cx="110" cy="110" r={donutRadius} fill="none" stroke="#e5e7eb" strokeWidth="24" />
                {stats.map((item) => {
                  const segmentLength =
                    totalCount === 0 ? 0 : (item.value / totalCount) * donutCircumference
                  const dashOffset = -accumulatedOffset
                  accumulatedOffset += segmentLength
                  return (
                    <circle
                      key={item.label}
                      cx="110"
                      cy="110"
                      r={donutRadius}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="24"
                      strokeLinecap="butt"
                      strokeDasharray={`${segmentLength} ${donutCircumference - segmentLength}`}
                      strokeDashoffset={dashOffset}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onClick={() => handleOpenHistoryTab(item.tab)}
                      onMouseEnter={(event) => {
                        const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                        if (bounds) {
                          setHoveredStatPosition({
                            x: event.clientX - bounds.left,
                            y: event.clientY - bounds.top,
                          })
                        }
                        setHoveredStatLabel(item.label)
                      }}
                      onMouseMove={(event) => {
                        const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                        if (bounds) {
                          setHoveredStatPosition({
                            x: event.clientX - bounds.left,
                            y: event.clientY - bounds.top,
                          })
                        }
                      }}
                      onMouseLeave={() => setHoveredStatLabel(null)}
                    />
                  )
                })}
              </svg>
              {hoveredStat ? (
                <div
                  className="pointer-events-none absolute z-20 whitespace-nowrap rounded-2xl bg-gray-900 px-3 py-2 text-center text-xs font-semibold text-white shadow-lg"
                  style={{
                    left: hoveredStatPosition.x + 12,
                    top: hoveredStatPosition.y - 12,
                    transform: 'translateY(-100%)',
                  }}
                >
                  <div className="whitespace-nowrap">{hoveredStat.label}</div>
                  <div className="mt-1 whitespace-nowrap text-[11px] font-medium text-gray-200">
                    {hoveredStat.value}건
                  </div>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Total</span>
                <strong className="text-3xl font-bold text-gray-900">{totalCount}</strong>
                <span className="text-sm text-gray-500">생성 문서</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {stats.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleOpenHistoryTab(item.tab)}
                className="flex cursor-pointer items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.value}건</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
