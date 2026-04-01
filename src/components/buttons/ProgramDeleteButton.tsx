import { useEffect, useState } from 'react'

export default function ProgramDeleteButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteFiles, setDeleteFiles] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isModalOpen) {
      setDeleteFiles(true)
      setErrorMessage(null)
      setStatusMessage(null)
      setIsDeleting(false)
    }
  }, [isModalOpen])

  const closeModal = () => {
    if (isDeleting) return
    setIsModalOpen(false)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    setErrorMessage(null)
    setStatusMessage(null)
    try {
      await window.electronAPI.program.delete({ deleteGeneratedFiles: deleteFiles })
      setStatusMessage('프로그램 삭제 절차가 시작되었습니다. 잠시 후 창이 닫힐 수 있습니다.')
      setTimeout(() => {
        setIsModalOpen(false)
      }, 1500)
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className='flex flex-col items-center gap-6'>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full rounded-full border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors
          hover:bg-[#e4032e] hover:text-white cursor-pointer"
        >
          프로그램 삭제
        </button>
      </div>
      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* <h4 className="text-lg font-semibold text-gray-900 mb-2">프로그램 삭제</h4> */}
            <p className="text-sm text-gray-600 mb-4 cursor-pointer">프로그램을 정말 삭제하시겠습니까?</p>
            <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-[#e4032e] focus:ring-[#e4032e] cursor-pointer"
                checked={deleteFiles}
                onChange={(event) => setDeleteFiles(event.target.checked)}
                disabled={isDeleting}
              />
              생성된 모든 파일을 프로그램과 함께 삭제합니다.
            </label>
            {statusMessage ? (
              <p className="mb-3 text-sm text-blue-600">{statusMessage}</p>
            ) : null}
            {errorMessage ? (
              <p className="mb-3 text-sm text-red-600">{errorMessage}</p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                onClick={closeModal}
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-full bg-[#e4032e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c20226] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
