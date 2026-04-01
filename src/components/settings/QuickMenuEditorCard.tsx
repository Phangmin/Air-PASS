import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import type { QuickMenuSetting } from '../../types/ipc'

type QuickMenuSection = 'used' | 'unused'

type QuickMenuEditorCardProps = {
  items: QuickMenuSetting[]
  highlightSignal?: number
  onSave: (items: QuickMenuSetting[]) => Promise<QuickMenuSetting[]>
  onNotice: (message: string) => void
}

function moveQuickMenuSetting(
  items: QuickMenuSetting[],
  draggedId: QuickMenuSetting['id'],
  targetSection: QuickMenuSection,
  targetId: QuickMenuSetting['id'] | null,
) {
  const usedItems = items.filter((item) => item.visible).map((item) => ({ ...item }))
  const unusedItems = items.filter((item) => !item.visible).map((item) => ({ ...item }))

  const sourceList =
    usedItems.find((item) => item.id === draggedId) !== undefined ? usedItems : unusedItems
  const draggedIndex = sourceList.findIndex((item) => item.id === draggedId)

  if (draggedIndex < 0) {
    return items
  }

  const [draggedItem] = sourceList.splice(draggedIndex, 1)
  const nextDraggedItem = {
    ...draggedItem,
    visible: targetSection === 'used',
  }
  const targetList = targetSection === 'used' ? usedItems : unusedItems
  const targetIndex = targetId ? targetList.findIndex((item) => item.id === targetId) : -1

  if (targetIndex < 0) {
    targetList.push(nextDraggedItem)
  } else {
    targetList.splice(targetIndex, 0, nextDraggedItem)
  }

  return [...usedItems, ...unusedItems]
}

const quickMenuMeta = {
  generate: { title: '통지서 생성' },
  payermanagement: { title: '납부 상태 리포트' },
  payertargetmanagement: { title: '대상자별 관리' },
  companypaymentmanagement: { title: '기업별 납부 관리' },
  history: { title: '생성 이력' },
  settings: { title: '환경 설정' },
} as const

export default function QuickMenuEditorCard({
  items,
  highlightSignal = 0,
  onSave,
  onNotice,
}: QuickMenuEditorCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [menuItems, setMenuItems] = useState<QuickMenuSetting[]>(items)
  const [menuDirty, setMenuDirty] = useState(false)
  const [draggedMenuId, setDraggedMenuId] = useState<QuickMenuSetting['id'] | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    section: QuickMenuSection
    targetId: QuickMenuSetting['id'] | null
  } | null>(null)
  const [isHighlighted, setIsHighlighted] = useState(false)

  useEffect(() => {
    setMenuItems(items)
    setMenuDirty(false)
    setDraggedMenuId(null)
    setDropTarget(null)
  }, [items])

  useEffect(() => {
    if (highlightSignal <= 0) return

    setIsHighlighted(true)
    containerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })

    const timeoutId = window.setTimeout(() => {
      setIsHighlighted(false)
    }, 2200)

    return () => window.clearTimeout(timeoutId)
  }, [highlightSignal])

  const usedMenuItems = useMemo(() => menuItems.filter((item) => item.visible), [menuItems])
  const unusedMenuItems = useMemo(() => menuItems.filter((item) => !item.visible), [menuItems])

  const handleDragStart = useCallback(
    (
      event: DragEvent<HTMLDivElement>,
      id: QuickMenuSetting['id'],
      section: QuickMenuSection,
    ) => {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', id)
      setDraggedMenuId(id)
      setDropTarget({
        section,
        targetId: id,
      })
    },
    [],
  )

  const handleDragEnd = useCallback(() => {
    setDraggedMenuId(null)
    setDropTarget(null)
  }, [])

  const applyQuickMenuDrop = useCallback(
    (section: QuickMenuSection, targetId: QuickMenuSetting['id'] | null) => {
      if (!draggedMenuId) {
        return
      }

      const draggedItem = menuItems.find((item) => item.id === draggedMenuId)
      if (!draggedItem) {
        return
      }

      if (section === 'used' && !draggedItem.visible && usedMenuItems.length >= 4) {
        onNotice('사용 가능한 Quick Menu는 최대 4개까지 설정할 수 있습니다.')
        setDraggedMenuId(null)
        setDropTarget(null)
        return
      }

      setMenuItems((prev) => moveQuickMenuSetting(prev, draggedMenuId, section, targetId))
      setMenuDirty(true)
      setDraggedMenuId(null)
      setDropTarget(null)
    },
    [draggedMenuId, menuItems, onNotice, usedMenuItems.length],
  )

  const handleListDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, section: QuickMenuSection) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setDropTarget({
        section,
        targetId: null,
      })
    },
    [],
  )

  const handleItemDragOver = useCallback(
    (
      event: DragEvent<HTMLDivElement>,
      section: QuickMenuSection,
      targetId: QuickMenuSetting['id'],
    ) => {
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'move'
      setDropTarget({
        section,
        targetId,
      })
    },
    [],
  )

  const handleListDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, section: QuickMenuSection) => {
      event.preventDefault()
      applyQuickMenuDrop(section, null)
    },
    [applyQuickMenuDrop],
  )

  const handleItemDrop = useCallback(
    (
      event: DragEvent<HTMLDivElement>,
      section: QuickMenuSection,
      targetId: QuickMenuSetting['id'],
    ) => {
      event.preventDefault()
      event.stopPropagation()
      applyQuickMenuDrop(section, targetId)
    },
    [applyQuickMenuDrop],
  )

  const handleSave = useCallback(async () => {
    try {
      const saved = await onSave(menuItems)
      setMenuItems(saved)
      setMenuDirty(false)
      onNotice('Quick Menus 구성이 저장되었습니다.')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("No handler registered for 'settings:set-quick-menu-settings'")) {
        onNotice('Quick Menus 저장 기능을 적용하려면 프로그램을 한 번 다시 실행해 주세요.')
        return
      }
      onNotice('Quick Menus 저장에 실패했습니다. 다시 시도해 주세요.')
    }
  }, [menuItems, onNotice, onSave])

  return (
    <div
      ref={containerRef}
      className={`rounded-3xl border bg-white p-6 shadow-lg transition ${
        isHighlighted
          ? 'border-[#003764] ring-4 ring-[#003764]/20 animate-pulse'
          : 'border-gray-200'
      }`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Menus 편집</h3>
            <p className="mt-1 text-sm text-gray-500">
              미사용 항목을 사용 영역으로 드래그하면 홈에 표시되고, 사용 영역 안에서는 드래그로 순서를 바꿀 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-full border border-[#003764] px-5 py-3 text-sm font-semibold text-[#003764] transition hover:bg-[#003764] hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
            onClick={handleSave}
            disabled={!menuDirty}
          >
            저장
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {([
            {
              section: 'unused',
              title: '미사용',
              items: unusedMenuItems,
              tone: 'border-gray-200 bg-gray-50',
              badgeTone: 'bg-gray-200 text-gray-700',
            },
            {
              section: 'used',
              title: '사용',
              items: usedMenuItems,
              tone: 'border-blue-200 bg-blue-50',
              badgeTone: 'bg-blue-100 text-[#003764]',
              helperText: '최대 4개',
            },
          ] as const).map((group) => (
            <div
              key={group.section}
              className={`rounded-2xl border p-4 transition ${group.tone} ${
                dropTarget?.section === group.section ? 'ring-2 ring-[#003764]/15' : ''
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">{group.title}</h4>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${group.badgeTone}`}>
                    {group.items.length}개
                  </span>
                  {'helperText' in group ? (
                    <span className="text-[11px] font-medium text-gray-400">{group.helperText}</span>
                  ) : null}
                </div>
              </div>

              <div
                className={`flex min-h-[220px] flex-col gap-3 rounded-2xl border border-dashed p-3 transition ${
                  dropTarget?.section === group.section
                    ? 'border-[#003764]/40 bg-white/80'
                    : 'border-gray-200 bg-white/70'
                }`}
                onDragOver={(event) => handleListDragOver(event, group.section)}
                onDrop={(event) => handleListDrop(event, group.section)}
              >
                {group.items.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-2xl text-center text-sm text-gray-400">
                    항목을 이 영역으로 드래그하세요.
                  </div>
                ) : (
                  group.items.map((item) => {
                    const meta = quickMenuMeta[item.id]
                    const isDropTarget =
                      dropTarget?.section === group.section && dropTarget.targetId === item.id

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, item.id, group.section)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(event) => handleItemDragOver(event, group.section, item.id)}
                        onDrop={(event) => handleItemDrop(event, group.section, item.id)}
                        className={`cursor-grab rounded-2xl border bg-white px-4 py-4 text-left shadow-sm transition active:cursor-grabbing ${
                          isDropTarget
                            ? 'border-[#003764] ring-2 ring-[#003764]/10'
                            : 'border-gray-200 hover:border-[#003764]/35'
                        } ${draggedMenuId === item.id ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900">{meta.title}</div>
                          </div>
                          <div className="mt-0.5 shrink-0 text-gray-300" aria-hidden="true">
                            <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current">
                              <circle cx="7" cy="6" r="1.1" />
                              <circle cx="13" cy="6" r="1.1" />
                              <circle cx="7" cy="10" r="1.1" />
                              <circle cx="13" cy="10" r="1.1" />
                              <circle cx="7" cy="14" r="1.1" />
                              <circle cx="13" cy="14" r="1.1" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
