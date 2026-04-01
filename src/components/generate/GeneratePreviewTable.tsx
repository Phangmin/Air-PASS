import { useMemo, useState } from 'react'
import type { ExcelPreviewRow } from '../../types/ipc'
import { FIELD_LABELS, stripParentheses } from '../../constants/excelFields'

type GeneratePreviewTableProps = {
  previewRows: ExcelPreviewRow[]
  selectedRows: Set<number>
  onSelectAll: () => void
  onClearSelection: () => void
  onToggleRow: (index: number) => void
  onFieldChange: (index: number, key: keyof ExcelPreviewRow, value: string) => void
}

export default function GeneratePreviewTable({
  previewRows,
  selectedRows,
  onSelectAll,
  onClearSelection,
  onToggleRow,
  onFieldChange,
}: GeneratePreviewTableProps) {
  const [editingRow, setEditingRow] = useState<number | null>(null)

  const previewTable = useMemo(() => {
    const resolveFieldValue = (field: (typeof FIELD_LABELS)[number], row: ExcelPreviewRow) => {
      if (field.key === 'affiliation') {
        const trimmed = stripParentheses(row.affiliation)
        return trimmed || row.affiliation
      }
      return row[field.key]
    }

    if (!previewRows.length) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          엑셀 파일을 선택하면 행 목록이 여기에 표시됩니다.
        </div>
      )
    }

    return (
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRows.size === previewRows.length}
                  onChange={(event) => (event.target.checked ? onSelectAll() : onClearSelection())}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-[#003764] focus:ring-[#003764]"
                />
              </th>
              {FIELD_LABELS.map((field) => (
                <th
                  key={field.key}
                  className="whitespace-nowrap px-3 py-2 text-center font-semibold text-gray-600"
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-center">
            {previewRows.map((row) => {
              const isEditing = editingRow === row.index
              return (
                <tr
                  key={row.index}
                  className={`${selectedRows.has(row.index) ? 'bg-blue-50' : ''} ${
                    isEditing ? 'ring-1 ring-[#003764]' : ''
                  } cursor-pointer`}
                  onClick={() => setEditingRow(row.index)}
                >
                  <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.index)}
                      onChange={() => onToggleRow(row.index)}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-[#003764] focus:ring-[#003764]"
                    />
                  </td>
                  {FIELD_LABELS.map((field) => {
                    const editable =
                      isEditing || field.key === 'partyAddress' || field.key === 'partyEmail'
                    const value = row[field.key]

                    return (
                      <td key={field.key} className="whitespace-nowrap px-3 py-2">
                        {editable ? (
                          <input
                            type={field.key === 'partyEmail' ? 'email' : 'text'}
                            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-sm"
                            value={value}
                            placeholder={
                              field.key === 'partyEmail'
                                ? '메일주소 입력'
                                : field.key === 'partyAddress'
                                  ? '당사자 주소 입력'
                                  : `${field.label} 수정`
                            }
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              onFieldChange(row.index, field.key, event.target.value)
                            }
                          />
                        ) : (
                          resolveFieldValue(field, row)
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }, [editingRow, onClearSelection, onFieldChange, onSelectAll, onToggleRow, previewRows, selectedRows])

  return previewTable
}
