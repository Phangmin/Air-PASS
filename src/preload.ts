// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import {
  ALERTS_CHANGED_CHANNEL,
  ALERTS_OPEN_CENTER_CHANNEL,
  type OpenAlertCenterRequest,
} from './alerts/events'
import type {
  AlertRow,
  ExcelPreviewRow,
  GenerateDocumentKind,
  HistoryEditFields,
  QuickMenuSetting,
} from './types/ipc'

contextBridge.exposeInMainWorld('electronAPI', {
  pickExcel: () => ipcRenderer.invoke('pick-excel'),
  pickOutputDir: (defaultPath?: string) => ipcRenderer.invoke('pick-output-dir', defaultPath),
  loadExcelPreview: (excelPath: string) => ipcRenderer.invoke('excel:preview', excelPath),
  runGenerate: (payload: {
    excelPath: string
    outputDir: string
    documentKinds?: GenerateDocumentKind[]
    selectedRows?: number[]
    overrides?: ExcelPreviewRow[]
  }) =>
    ipcRenderer.invoke('run-generate', payload),
  openDirectory: (dirPath: string) => ipcRenderer.invoke('open-directory', dirPath),
  history: {
    list: (limit?: number) => ipcRenderer.invoke('history:list', limit),
    remove: (ids: number[]) => ipcRenderer.invoke('history:delete', ids),
    open: (filePath: string) => ipcRenderer.invoke('history:open', filePath),
    openFolder: (filePath: string) => ipcRenderer.invoke('history:open-folder', filePath),
    attachDocument: (payload: {
      violationRecordId: number
      documentType: 'pre_notice' | 'suspension' | 'opinion_submit' | 'final_notice'
    }) => ipcRenderer.invoke('history:attach-document', payload),
    generateDocument: (payload: {
      violationRecordId: number
      documentType: 'pre_notice' | 'suspension' | 'final_notice'
      outputDir: string
    }) => ipcRenderer.invoke('history:generate-document', payload),
    edit: (payload: {
      id: number
      fields: HistoryEditFields
    }) => ipcRenderer.invoke('history:edit', payload),
  },
  alerts: {
    list: (): Promise<AlertRow[]> => ipcRenderer.invoke('alerts:list'),
    unreadCount: (): Promise<number> => ipcRenderer.invoke('alerts:unread-count'),
    markRead: (id: number) => ipcRenderer.invoke('alerts:mark-read', id),
    markUnread: (id: number) => ipcRenderer.invoke('alerts:mark-unread', id),
    remove: (id: number) => ipcRenderer.invoke('alerts:delete', id),
    removeMany: (ids: number[]) => ipcRenderer.invoke('alerts:delete-many', ids),
    onChanged: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on(ALERTS_CHANGED_CHANNEL, listener)
      return () => ipcRenderer.removeListener(ALERTS_CHANGED_CHANNEL, listener)
    },
    onOpenCenter: (callback: (payload: OpenAlertCenterRequest) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: OpenAlertCenterRequest) =>
        callback(payload)
      ipcRenderer.on(ALERTS_OPEN_CENTER_CHANNEL, listener)
      return () => ipcRenderer.removeListener(ALERTS_OPEN_CENTER_CHANNEL, listener)
    },
  },
  user: {
    get: () => ipcRenderer.invoke('user-info:get'),
    save: (user: {
      name: string
      department: string
      email: string
      phone: string
      fax: string
      zipCode: string
      baseAddress: string
      detailAddress: string
    }) => ipcRenderer.invoke('user-info:save', user),
  },
  userInfo: {
    get: () => ipcRenderer.invoke('user-info:get'),
    save: (user: {
      name: string
      department: string
      email: string
      phone: string
      fax: string
      zipCode: string
      baseAddress: string
      detailAddress: string
    }) => ipcRenderer.invoke('user-info:save', user),
  },
  settings: {
    getDefaultOutputDir: () => ipcRenderer.invoke('settings:get-default-output-dir'),
    setDefaultOutputDir: (dir: string) => ipcRenderer.invoke('settings:set-default-output-dir', dir),
    getQuickMenuSettings: () => ipcRenderer.invoke('settings:get-quick-menu-settings'),
    setQuickMenuSettings: (value: QuickMenuSetting[]) =>
      ipcRenderer.invoke('settings:set-quick-menu-settings', value),
  },
  program: {
    delete: (payload: { deleteGeneratedFiles: boolean }) =>
      ipcRenderer.invoke('program:delete', payload),
  },

  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
})
