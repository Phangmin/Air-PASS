import { useCallback, useEffect, useMemo, useState } from 'react'
import ProgramDeleteButton from '../components/buttons/ProgramDeleteButton'
import SettingsNoticeModal from '../components/modals/SettingsNoticeModal'
import QuickMenuEditorCard from '../components/settings/QuickMenuEditorCard'
import type { QuickMenuSetting, User } from '../types/ipc'

type SettingsPageProps = {
  defaultPath: string | null
  onPathSaved: (path: string | null) => void
  user: User | null
  quickMenuSettings: QuickMenuSetting[]
  quickMenuEditorHighlightSignal: number
  onQuickMenuSettingsSaved: (value: QuickMenuSetting[]) => void
  missingUserInfo: boolean
  onOpenUserInfo: () => void
}

export default function SettingsPage({
  defaultPath,
  onPathSaved,
  user,
  quickMenuSettings,
  quickMenuEditorHighlightSignal,
  onQuickMenuSettingsSaved,
  missingUserInfo,
  onOpenUserInfo,
}: SettingsPageProps) {
  const [path, setPath] = useState<string>(defaultPath ?? '')
  const [dirty, setDirty] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  useEffect(() => {
    setPath(defaultPath ?? '')
    setDirty(false)
  }, [defaultPath])

  const openNotice = useCallback((message: string) => {
    setNoticeMessage(message)
  }, [])

  const closeNotice = useCallback(() => {
    setNoticeMessage(null)
  }, [])

  const persistPath = useCallback(
    async (nextPath: string) => {
      await window.electronAPI.settings.setDefaultOutputDir(nextPath)
      onPathSaved(nextPath || null)
      openNotice(
        nextPath
          ? '기본 저장 경로가 설정되었습니다.'
          : '기본 저장 경로가 초기화되었습니다.',
      )
      setDirty(false)
    },
    [onPathSaved, openNotice],
  )

  const handleChoosePath = useCallback(async () => {
    const picked = await window.electronAPI.pickOutputDir(path || undefined)
    if (picked) {
      setPath(picked)
      setDirty(true)
      openNotice('변경 사항을 저장하려면 저장 버튼을 눌러주세요.')
    }
  }, [openNotice, path])

  const handleClear = useCallback(() => {
    setPath('')
    setDirty(true)
    openNotice('변경 사항을 저장하려면 저장 버튼을 눌러주세요.')
  }, [openNotice])

  const handleSave = useCallback(async () => {
    await persistPath(path)
  }, [path, persistPath])

  const handleSaveQuickMenus = useCallback(
    async (items: QuickMenuSetting[]) => {
      const saved = await window.electronAPI.settings.setQuickMenuSettings(items)
      onQuickMenuSettingsSaved(saved)
      return saved
    },
    [onQuickMenuSettingsSaved],
  )

  const hasConfiguredPath = Boolean(path)
  const detailAddress = [user?.baseAddress, user?.detailAddress].filter(Boolean).join(' ')
  const userInfoRows = useMemo(
    () => [
      { label: '이름', value: user?.name || '미등록' },
      { label: '부서', value: user?.department || '미등록' },
      { label: '이메일', value: user?.email || '미등록' },
      { label: '전화번호', value: user?.phone || '미등록' },
      { label: '팩스번호', value: user?.fax || '미등록' },
      { label: '주소', value: detailAddress || '미등록' },
    ],
    [detailAddress, user],
  )

  return (
    <>
      <section className="flex h-full flex-col gap-6 overflow-y-auto pr-2">
        <div className="flex flex-col gap-2">
          <h2 className="flex border-l-4 border-[#003764] pl-4 text-2xl font-bold">설정</h2>
        </div>
        <div className="border border-gray-200" />

        {missingUserInfo ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium">입력된 담당자 정보가 없습니다. 입력해주세요.</p>
              <button
                type="button"
                className="cursor-pointer rounded-lg bg-[#003764] px-4 py-2 font-semibold text-white hover:bg-[#114a83]"
                onClick={onOpenUserInfo}
              >
                담당자 정보 입력
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <div className="flex flex-col gap-5">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">기본 저장 경로</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          hasConfiguredPath
                            ? 'bg-blue-50 text-[#003764]'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {hasConfiguredPath ? '경로 설정됨' : '경로 미설정'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="cursor-pointer rounded-full bg-[#003764] px-5 py-3 text-sm font-semibold text-white hover:bg-[#114a83]"
                        onClick={handleChoosePath}
                      >
                        폴더 선택
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                        onClick={handleClear}
                      >
                        초기화
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-full border border-[#003764] px-5 py-3 text-sm font-semibold text-[#003764] hover:bg-[#003764] hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                        onClick={handleSave}
                        disabled={!dirty}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      공문 PDF 생성 시 기본 저장 위치로 사용할 폴더를 설정합니다.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
                  <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-gray-400">
                    CURRENT PATH
                  </p>
                  <p className="break-all text-sm leading-6 text-gray-700">
                    {path || '지정된 경로가 없습니다.'}
                  </p>
                </div>
              </div>
            </div>

            <QuickMenuEditorCard
              items={quickMenuSettings}
              highlightSignal={quickMenuEditorHighlightSignal}
              onSave={handleSaveQuickMenus}
              onNotice={openNotice}
            />
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
              <div className="flex flex-col gap-5">
                <h3 className="text-lg font-semibold text-gray-900">담당자 정보</h3>
                <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-600">
                  담당자 정보는 공문 발신자 표기와 연락처 출력에 사용됩니다.
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="grid gap-3">
                    {userInfoRows.map((row) => (
                      <div
                        key={row.label}
                        className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 text-sm"
                      >
                        <div className="font-semibold text-gray-500">{row.label}</div>
                        <div className="break-all text-gray-800">{row.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="cursor-pointer rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#003764] hover:bg-gray-50 hover:text-[#003764]"
                  onClick={onOpenUserInfo}
                >
                  정보 수정
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
              <div className="flex flex-col gap-5">
                <h3 className="text-lg font-semibold text-gray-900">프로그램 삭제</h3>
                <ProgramDeleteButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      <SettingsNoticeModal
        open={noticeMessage !== null}
        message={noticeMessage ?? ''}
        onClose={closeNotice}
      />
    </>
  )
}
