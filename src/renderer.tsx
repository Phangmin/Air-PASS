import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import type { OpenAlertCenterRequest } from './alerts/events'
import type {
  AlertRow,
  ExcelPreviewRow,
  GenerateDocumentKind,
  GenerateResult,
  HistoryDocumentType,
  HistoryEditFields,
  QuickMenuSetting,
  User,
  ViolationDocumentRecord,
} from './types/ipc'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

declare global {
  interface Window {
    electronAPI: {
      pickExcel: () => Promise<string | null>
      pickOutputDir: (defaultPath?: string) => Promise<string | null>
      loadExcelPreview: (excelPath: string) => Promise<ExcelPreviewRow[]>
      runGenerate: (payload: {
        excelPath: string
        outputDir: string
        documentKinds?: GenerateDocumentKind[]
        selectedRows?: number[]
        overrides?: ExcelPreviewRow[]
      }) => Promise<GenerateResult>
      openDirectory: (dirPath: string) => Promise<void>
      history: {
        list: (limit?: number) => Promise<ViolationDocumentRecord[]>
        remove: (ids: number[]) => Promise<void>
        open: (filePath: string) => Promise<void>
        openFolder: (filePath: string) => Promise<void>
        attachDocument: (payload: {
          violationRecordId: number
          documentType: HistoryDocumentType
        }) => Promise<{ id: number; filePath: string } | null>
        generateDocument: (payload: {
          violationRecordId: number
          documentType: HistoryDocumentType
          outputDir: string
        }) => Promise<{ id: number; filePath: string }>
        edit: (payload: {
          id: number
          fields: HistoryEditFields
        }) => Promise<void>
      }
      alerts: {
        list: () => Promise<AlertRow[]>
        unreadCount: () => Promise<number>
        markRead: (id: number) => Promise<void>
        markUnread: (id: number) => Promise<void>
        remove: (id: number) => Promise<void>
        removeMany: (ids: number[]) => Promise<void>
        onChanged: (callback: () => void) => () => void
        onOpenCenter: (callback: (payload: OpenAlertCenterRequest) => void) => () => void
      }
      user: {
        get: () => Promise<User | null>
        save: (user: User) => Promise<void>
      }
      userInfo: {
        get: () => Promise<User | null>
        save: (user: User) => Promise<void>
      }
      settings: {
        getDefaultOutputDir: () => Promise<string | null>
        setDefaultOutputDir: (dir: string) => Promise<void>
        getQuickMenuSettings: () => Promise<QuickMenuSetting[]>
        setQuickMenuSettings: (value: QuickMenuSetting[]) => Promise<QuickMenuSetting[]>
      }
      program: {
        delete: (payload: { deleteGeneratedFiles: boolean }) => Promise<void>
      }
      windowControls: {
        minimize: () => Promise<void>
        toggleMaximize: () => Promise<void>
        close: () => Promise<void>
      }
    }
  }
}
