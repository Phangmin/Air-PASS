import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ViolationDocumentRecord } from '../types/ipc'
import PdfIcon from '../assets/pdf_icon.svg'
import DocumentGenerationRequiredModal from '../components/modals/DocumentGenerationRequiredModal'
import { FIELD_LABELS, stripParentheses } from '../constants/excelFields'
import MonthlyFilterButton from '../components/buttons/MonthlyFilterButton'
import HistoryFilter, { type HistoryFilterValue } from '../components/searches/HistoryFilter'
import HistoryPersonCard from '../components/history/HistoryPersonCard'

function formatDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

type FieldKey = (typeof FIELD_LABELS)[number]['key']
export type HistoryTab = 'all' | 'preNotice' | 'suspension' | 'finalNotice'

type HistoryGroup = {
  key: string
  primary: ViolationDocumentRecord
  ids: number[]
  rows: ViolationDocumentRecord[]
  preNotice: ViolationDocumentRecord | null
  suspension: ViolationDocumentRecord | null
  finalNotice: ViolationDocumentRecord | null
}

function getRowTimestamp(row: ViolationDocumentRecord) {
  return row.updatedAt ?? row.createdAt ?? ''
}

function toModalDocumentId(
  documentType: Extract<
    ViolationDocumentRecord['documentType'],
    'pre_notice' | 'suspension' | 'final_notice'
  >,
) {
  if (documentType === 'suspension') return 'suspension' as const
  if (documentType === 'final_notice') return 'final-notice' as const
  return 'pre-notice' as const
}

function inferHistoryTab(filePath: string): HistoryTab {
  const baseName = filePath.split(/[\\/]/).pop() ?? filePath
  if (/운전업무정지/.test(baseName)) return 'suspension'
  if (/확정통지서/.test(baseName)) return 'finalNotice'
  return 'preNotice'
}

function buildHistoryGroupKey(row: ViolationDocumentRecord) {
  const timestamp = (row.updatedAt ?? row.createdAt ?? '').slice(0, 16)
  return [
    timestamp,
    row.rowIndex ?? '',
    row.docNo ?? '',
    row.driverName ?? '',
    row.passTime ?? '',
    row.regionRegNo ?? '',
  ].join('|')
}

function buildPersonGroupKey(row: ViolationDocumentRecord) {
  return [row.driverName ?? '', row.birthDate ?? '', row.regionRegNo ?? '', row.affiliation ?? ''].join('|')
}

function getPaymentTypeLabel(row: ViolationDocumentRecord) {
  return row.paymentType === 'confirmed' ? '확정납부' : '사전납부'
}

function getPaymentStatusLabel(row: ViolationDocumentRecord) {
  const status =
    row.paymentType === 'confirmed'
      ? row.confirmedPaymentStatus
      : row.advancePaymentStatus
  return status === 'paid' ? '완납' : '미납'
}

const getDisplayName = (row: ViolationDocumentRecord) => {
  const fileName = row.filePath.split(/[\\/]/).pop()
  return fileName || row.driverName?.trim() || '미기재'
}

const HISTORY_FIELD_RENDERERS: Record<FieldKey, (row: ViolationDocumentRecord) => string> = {
  affiliation: (row) => {
    const trimmed = stripParentheses(row.affiliation ?? '')
    return trimmed || row.affiliation || '-'
  },
  driverName: (row) => row.driverName || '-',
  passTime: (row) => row.passTime || '-',
  passLocation: (row) => row.passLocation || '-',
  regionRegNo: (row) => row.regionRegNo || '-',
  vehicleType: (row) => row.vehicleType || '-',
  speed: (row) => row.speed || '-',
  partyAddress: (row) => row.partyAddress || '-',
  partyEmail: (row) => row.partyEmail || '-',
}

type HistoryPageProps = {
  initialTab?: HistoryTab
  onMoveWarningChange?: (message: string | null) => void
}

export default function HistoryPage({ initialTab = 'all', onMoveWarningChange }: HistoryPageProps) {
  const [items, setItems] = useState<ViolationDocumentRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentGenerationRequest, setDocumentGenerationRequest] = useState<{
    violationRecordId: number
    documentType: Extract<ViolationDocumentRecord['documentType'], 'pre_notice' | 'suspension' | 'final_notice'>
  } | null>(null)
  const [documentGenerationOutputDir, setDocumentGenerationOutputDir] = useState<string | null>(null)
  const [editingRowId, setEditingRowId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Record<FieldKey, string>>>({})
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<number[] | null>(null)
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [activeTab, setActiveTab] = useState<HistoryTab>(initialTab)
  const [filterValue, setFilterValue] = useState<HistoryFilterValue>({
    driverName: '',
    affiliation: '',
    regionRegNo: '',
  })
  const shouldWarnBeforeLeave = editingRowId !== null
  const columnWidth = `${100 / FIELD_LABELS.length}%`

  const tabs: Array<{ id: HistoryTab; label: string }> = [
    { id: 'all', label: '전체' },
    { id: 'preNotice', label: '사전통지서' },
    { id: 'suspension', label: '운전업무정지' },
    { id: 'finalNotice', label: '확정통지서' },
  ]

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const rows = await window.electronAPI.history.list()
      setItems(rows)
      setSelectedIds(new Set())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (!documentGenerationRequest) return

    let cancelled = false
    const loadDefaultOutputDir = async () => {
      try {
        const dir = await window.electronAPI.settings.getDefaultOutputDir()
        if (!cancelled) {
          setDocumentGenerationOutputDir(dir)
        }
      } catch {
        if (!cancelled) {
          setDocumentGenerationOutputDir(null)
        }
      }
    }

    void loadDefaultOutputDir()
    return () => {
      cancelled = true
    }
  }, [documentGenerationRequest])

  useEffect(() => {
    if (!onMoveWarningChange) return
    if (shouldWarnBeforeLeave) {
      onMoveWarningChange('수정사항을 저장하지 않고 화면을 이동할 경우 수정 데이터가 초기화 됩니다.')
    } else {
      onMoveWarningChange(null)
    }
  }, [onMoveWarningChange, shouldWarnBeforeLeave])

  const filteredItems = useMemo(() => {
    const normalizedDriverName = filterValue.driverName.trim().toLowerCase()
    const normalizedAffiliation = filterValue.affiliation.trim().toLowerCase()
    const normalizedRegionRegNo = filterValue.regionRegNo.trim().toLowerCase()

    return items.filter((item) => {
      const timestamp = item.updatedAt ?? item.createdAt
      if (!timestamp) return false
      const date = new Date(timestamp)
      if (Number.isNaN(date.getTime())) return false
      const matchesBaseFilter =
        date.getFullYear() === selectedYear &&
        date.getMonth() + 1 === selectedMonth &&
        (activeTab === 'all' || inferHistoryTab(item.filePath) === activeTab)

      if (!matchesBaseFilter) return false
      if (normalizedDriverName && !item.driverName?.toLowerCase().includes(normalizedDriverName)) return false

      const rawAffiliation = item.affiliation ?? ''
      const normalizedRawAffiliation = rawAffiliation.toLowerCase()
      const normalizedTrimmedAffiliation = stripParentheses(rawAffiliation).toLowerCase()
      if (
        normalizedAffiliation &&
        !normalizedRawAffiliation.includes(normalizedAffiliation) &&
        !normalizedTrimmedAffiliation.includes(normalizedAffiliation)
      ) {
        return false
      }

      if (normalizedRegionRegNo && !item.regionRegNo?.toLowerCase().includes(normalizedRegionRegNo)) return false

      return true
    })
  }, [activeTab, filterValue, items, selectedYear, selectedMonth])

  const grouped = useMemo(() => {
    const map = new Map<string, HistoryGroup[]>()
    const groupMap = new Map<string, HistoryGroup>()

    filteredItems.forEach((item) => {
      const timestamp = item.updatedAt ?? item.createdAt
      const dateKey = (timestamp ?? '').slice(0, 10)
      const itemKey = activeTab === 'all' ? buildPersonGroupKey(item) : buildHistoryGroupKey(item)
      const kind = inferHistoryTab(item.filePath)
      let group = groupMap.get(itemKey)

      if (!group) {
        group = {
          key: itemKey,
          primary: item,
          ids: [],
          rows: [],
          preNotice: null,
          suspension: null,
          finalNotice: null,
        }
        groupMap.set(itemKey, group)
        if (!map.has(dateKey)) map.set(dateKey, [])
        map.get(dateKey)!.push(group)
      }

      group.ids.push(item.id)
      group.rows.push(item)
      if (kind === 'preNotice') {
        group.preNotice = item
      } else if (kind === 'suspension') {
        group.suspension = item
      } else {
        group.finalNotice = item
      }

      if (getRowTimestamp(item) >= getRowTimestamp(group.primary)) {
        group.primary = item
      }
    })

    return Array.from(map.entries())
  }, [activeTab, filteredItems])

  const toggleSelect = useCallback((ids: number[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((id) => next.has(id))
      ids.forEach((id) => {
        if (allSelected) next.delete(id)
        else next.add(id)
      })
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredItems.map((item) => item.id)))
  }, [filteredItems])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    try {
      setConfirmDeleteIds(Array.from(selectedIds))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [selectedIds])

  const handleDeleteSingle = useCallback(async (ids: number[]) => {
    setConfirmDeleteIds(ids)
  }, [])

  const handleOpen = useCallback(async (filePath: string) => {
    try {
      await window.electronAPI.history.open(filePath)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  const handleOpenFolder = useCallback(async (filePath: string) => {
    try {
      await window.electronAPI.history.openFolder(filePath)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  const handleRequestDocumentGeneration = useCallback(
    (
      violationRecordId: number,
      documentType: Extract<ViolationDocumentRecord['documentType'], 'pre_notice' | 'suspension' | 'final_notice'>,
    ) => {
      setDocumentGenerationRequest({ violationRecordId, documentType })
    },
    [],
  )

  const handlePickDocumentOutputDir = useCallback(async () => {
    try {
      const picked = await window.electronAPI.pickOutputDir(documentGenerationOutputDir ?? undefined)
      if (!picked) return
      setDocumentGenerationOutputDir(picked)
      await window.electronAPI.settings.setDefaultOutputDir(picked)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [documentGenerationOutputDir])

  const handleCreateDocument = useCallback(async () => {
    if (!documentGenerationRequest || !documentGenerationOutputDir) return

    try {
      await window.electronAPI.history.generateDocument({
        violationRecordId: documentGenerationRequest.violationRecordId,
        documentType: documentGenerationRequest.documentType,
        outputDir: documentGenerationOutputDir,
      })
      await fetchHistory()
      setDocumentGenerationRequest(null)
      setDocumentGenerationOutputDir(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [documentGenerationOutputDir, documentGenerationRequest, fetchHistory])

  const handleCloseDocumentGenerationModal = useCallback(() => {
    setDocumentGenerationRequest(null)
    setDocumentGenerationOutputDir(null)
  }, [])

  const startEditing = useCallback((row: ViolationDocumentRecord) => {
    const initial: Partial<Record<FieldKey, string>> = {}
    FIELD_LABELS.forEach((field) => {
      const raw = row[field.key as keyof ViolationDocumentRecord]
      initial[field.key] = (raw as string | null) ?? ''
    })
    setEditValues(initial)
    setEditingRowId(row.id)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingRowId(null)
    setEditValues({})
  }, [])

  const handleEditValueChange = useCallback((key: FieldKey, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSaveEdits = useCallback(
    async (rowId: number) => {
      if (!editValues) return
      try {
        setSavingRowId(rowId)
        const payload: Partial<Record<FieldKey, string>> = {}
        FIELD_LABELS.forEach((field) => {
          if (editValues[field.key] !== undefined) {
            payload[field.key] = editValues[field.key] ?? ''
          }
        })
        await window.electronAPI.history.edit({ id: rowId, fields: payload })
        await fetchHistory()
        cancelEditing()
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setSavingRowId(null)
      }
    },
    [editValues, fetchHistory, cancelEditing],
  )

  const confirmDeletion = useCallback(async () => {
    if (!confirmDeleteIds || !confirmDeleteIds.length) {
      setConfirmDeleteIds(null)
      return
    }
    try {
      await window.electronAPI.history.remove(confirmDeleteIds)
      await fetchHistory()
      setSelectedIds(new Set())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setConfirmDeleteIds(null)
    }
  }, [confirmDeleteIds, fetchHistory])

  const cancelDeletion = useCallback(() => {
    setConfirmDeleteIds(null)
  }, [])

  const handleMonthChange = useCallback((year: number, month: number) => {
    setSelectedYear(year)
    setSelectedMonth(month)
  }, [])

  return (
    <section className="relative flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="flex border-l-4 border-[#003764] pl-4 text-2xl font-bold">생성 이력</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <MonthlyFilterButton
            year={selectedYear}
            month={selectedMonth}
            onChange={handleMonthChange}
          />
          <button
            className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-blue-500 hover:text-white hover:border-blue-500 cursor-pointer"
            onClick={fetchHistory}
            disabled={loading}
          >
            새로고침
          </button>
          <button
            className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-900 hover:text-white hover:border-gray-900 cursor-pointer"
            onClick={selectAll}
          >
            전체 선택
          </button>
          <button
            className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-yellow-500 hover:border-yellow-500 hover:text-white cursor-pointer"
            onClick={clearSelection}
          >
            선택 해제
          </button>
          <button
            className="rounded-full bg-[#e4032e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c20226] disabled:bg-gray-300 cursor-pointer"
            onClick={handleDelete}
            disabled={!selectedIds.size}
          >
            선택 삭제
          </button>
          <div className="hidden h-8 w-px bg-gray-300 sm:block" aria-hidden="true" />
          <div className="flex flex-wrap gap-2 rounded-2xl bg-gray-100 p-1.5">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`cursor-pointer rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#003764] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-[#003764]'
                  }`}
                  aria-pressed={isActive}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="border border-gray-200" />
      <HistoryFilter value={filterValue} onChange={setFilterValue} />
      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          불러오는 중입니다…
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          선택한 월에 저장된 PDF가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-6 overflow-auto pr-1">
          {grouped.map(([date, rows]) => (
            <div key={date} className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold text-gray-700">
                {date || '기록되지 않은 날짜'}
              </h3>
              {rows.map((group) => {
                const row = group.primary
                const isSelected = group.ids.every((id) => selectedIds.has(id))
                const preNoticeRow = group.preNotice
                const suspensionRow = group.suspension
                const finalNoticeRow = group.finalNotice
                const allTabDocumentsWithActions = [
                  { label: '사전통지서', row: preNoticeRow, documentType: 'pre_notice' as const },
                  { label: '운전업무정지', row: suspensionRow, documentType: 'suspension' as const },
                  { label: '확정통지서', row: finalNoticeRow, documentType: 'final_notice' as const },
                ]
                const currentOpenButton =
                  activeTab === 'preNotice'
                    ? {
                        label: '사전통지서 열기',
                        row: preNoticeRow,
                      }
                    : activeTab === 'suspension'
                      ? {
                          label: '운전업무정지 열기',
                          row: suspensionRow,
                        }
                      : activeTab === 'finalNotice'
                        ? {
                            label: '확정통지서 열기',
                            row: finalNoticeRow,
                          }
                        : null
                return (
                  activeTab === 'all' ? (
                    <HistoryPersonCard
                      key={group.key}
                      row={row}
                      isSelected={isSelected}
                      affiliationLabel={stripParentheses(row.affiliation ?? '') || row.affiliation || '소속 미기재'}
                      onToggleSelect={() => toggleSelect(group.ids)}
                      onDelete={() => handleDeleteSingle(group.ids)}
                      onOpenDocument={handleOpen}
                      onGenerateDocument={handleRequestDocumentGeneration}
                      formatDateTime={formatDateTime}
                      documents={allTabDocumentsWithActions}
                    />
                  ) : (
                    <div
                      key={group.key}
                      className={`flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition ${
                        !row.exists && !(preNoticeRow?.exists || suspensionRow?.exists || finalNoticeRow?.exists)
                          ? 'opacity-60'
                          : ''
                      }`}
                    >
                    {/* 저장 내역 항목별 제목 Section */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* 저장 내역 항목별 제목 Section - 파일명 */}
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(group.ids)}
                          className='h-3.5 w-3.5 cursor-pointer'
                        />
                        <img src={PdfIcon} alt="PDF" className="h-6 w-6" />
                        <div className="flex flex-row gap-3 items-center">
                          <span className="text-base font-semibold">{getDisplayName(row)}</span>
                          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                            {getPaymentTypeLabel(row)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              getPaymentStatusLabel(row) === '완납'
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                                : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
                            }`}
                          >
                            {getPaymentStatusLabel(row)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {row.updatedAt ? '수정일시' : '저장일시'}: {formatDateTime(row.updatedAt ?? row.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* 저장 내역 항목별 제목 Section - 열기/삭제 버튼 */}
                      <div className="flex gap-2">
                        <button
                          className="rounded-full border border-gray-300 px-4 py-2 text-sm
                          hover:bg-gray-900 hover:border-gray-900 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => handleOpenFolder(row.filePath)}
                          disabled={!row.filePath}
                        >
                          폴더 열기
                        </button>
                        {currentOpenButton ? (
                          <button
                            className="rounded-full border border-gray-300 px-4 py-2 text-sm
                            hover:bg-gray-900 hover:border-gray-900 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => currentOpenButton.row && handleOpen(currentOpenButton.row.filePath)}
                            disabled={!currentOpenButton.row?.exists}
                          >
                            {currentOpenButton.label}
                          </button>
                        ) : null}
                        {editingRowId === row.id ? (
                          <>
                            <button
                              className="rounded-full border border-blue-500 px-4 py-2 text-sm text-blue-700
                              hover:bg-blue-500 hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                              onClick={() => handleSaveEdits(row.id)}
                              disabled={savingRowId === row.id}
                            >
                              저장
                            </button>
                            <button
                              className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={cancelEditing}
                              disabled={savingRowId === row.id}
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <button
                            className="rounded-full border border-gray-300 px-4 py-2 text-sm
                            hover:bg-green-700 hover:border-green-700 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => startEditing(row)}
                            disabled={!row.exists}
                          >
                            수정
                          </button>
                        )}
                        <button
                          className="rounded-full border border-gray-300 px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-[#e4032e] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => handleDeleteSingle(group.ids)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    
                    {/* 저장 내역 항목별 Excel 데이터 Section */}
                    <div className="overflow-auto rounded-2xl border border-gray-200 shadow-sm">
                      <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
                        <colgroup>
                          {FIELD_LABELS.map((field) => (
                            <col key={field.key} style={{ width: columnWidth }} />
                          ))}
                        </colgroup>
                        <thead className="bg-gray-50">
                          <tr>
                            {FIELD_LABELS.map((field) => (
                              <th
                                key={field.key}
                                className="px-3 py-2 text-center font-semibold text-gray-600 whitespace-nowrap"
                              >
                                {field.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-center">
                          <tr>
                            {FIELD_LABELS.map((field) => {
                              const isEditing = editingRowId === row.id
                              return (
                                <td key={field.key} className="px-3 py-2 whitespace-nowrap text-gray-700">
                                  {isEditing ? (
                                    <input
                                      type={field.key === 'partyEmail' ? 'email' : 'text'}
                                      className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm text-center"
                                      value={editValues[field.key] ?? ''}
                                      placeholder={`${field.label} 수정`}
                                      onChange={(e) => handleEditValueChange(field.key, e.target.value)}
                                      disabled={savingRowId === row.id}
                                    />
                                  ) : (
                                    HISTORY_FIELD_RENDERERS[field.key](row)
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {!preNoticeRow?.exists && !suspensionRow?.exists && !finalNoticeRow?.exists ? (
                      <p className="text-sm text-red-500">파일이 삭제되어 열 수 없습니다.</p>
                    ) : null}
                  </div>
                  )
                )
              })}
            </div>
          ))}
        </div>
      )}
      {confirmDeleteIds ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4"
          onClick={cancelDeletion}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* <h4 className="text-lg font-semibold text-gray-900 mb-2">삭제 확인</h4> */}
            <p className="text-sm text-gray-600 mb-6">
              파일을 삭제하시겠습니까?<br />삭제 후 파일을 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700
                hover:bg-gray-100 cursor-pointer"
                onClick={cancelDeletion}
              >
                취소
              </button>
              <button
                className="rounded-full bg-[#e4032e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c20226] cursor-pointer"
                onClick={confirmDeletion}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <DocumentGenerationRequiredModal
        open={documentGenerationRequest !== null}
        documentId={
          documentGenerationRequest ? toModalDocumentId(documentGenerationRequest.documentType) : null
        }
        outputDir={documentGenerationOutputDir}
        onClose={handleCloseDocumentGenerationModal}
        onPickOutputDir={() => {
          void handlePickDocumentOutputDir()
        }}
        onCreate={() => {
          void handleCreateDocument()
        }}
      />
    </section>
  )
}
