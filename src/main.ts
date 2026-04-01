import { app, BrowserWindow, ipcMain, dialog, Menu, shell, Tray } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import started from 'electron-squirrel-startup'
import { initializeAlertToastService, syncAlertToasts } from './main/alertToastService'
import { getResourceAssetPath } from './main/resourcePaths'
import {
  generatePdfs,
  generatePdfFromPreview,
  loadExcelPreview,
  buildDocumentFileBase,
  buildDocumentFileBaseByKind,
  inferDocumentKindFromFilePath,
  sanitizeFileName,
} from './pdfGenerator'
import {
  initDatabase,
  addPdfHistoryBulk,
  listPdfHistory,
  closeDatabase,
  deletePdfHistory,
  getUserProfile,
  saveUserProfile,
  getDefaultOutputDir,
  setDefaultOutputDir,
  getPdfHistoryById,
  getLatestPdfHistoryByViolationRecordId,
  updatePdfHistory,
  upsertCaseDocument,
  clearPdfHistory,
  clearAppSettings,
  clearUserProfile,
  getQuickMenuSettings,
  setQuickMenuSettings,
  listAlerts,
  getUnreadAlertCount,
  markAlertAsRead,
  markAlertAsUnread,
  deleteAlert,
  deleteAlerts,
  createGenerationAlert,
} from './db'
import type {
  AlertRow,
  ExcelPreviewRow,
  GenerateDocumentKind,
  HistoryDocumentType,
  HistoryEditFields,
  QuickMenuId,
  QuickMenuSetting,
} from './types/ipc'

const FIRST_RUN_MARKER = '.packaged-first-run-complete'
const APP_DISPLAY_NAME = 'Air-PASS'
const WINDOWS_APP_ID = 'com.squirrel.air_pass.Air-PASS'
const STARTUP_LAUNCH_ARG = '--startup'
const squirrelEvent = process.argv[1]
const defaultQuickMenuSettings: QuickMenuSetting[] = [
  { id: 'generate', visible: true },
  { id: 'payermanagement', visible: true },
  { id: 'payertargetmanagement', visible: false },
  { id: 'companypaymentmanagement', visible: false },
  { id: 'history', visible: true },
  { id: 'settings', visible: true },
]

function normalizeQuickMenuSettings(value: QuickMenuSetting[] | null | undefined): QuickMenuSetting[] {
  if (!Array.isArray(value)) {
    return defaultQuickMenuSettings
  }

  const validIds = new Set<QuickMenuId>([
    'generate',
    'payermanagement',
    'payertargetmanagement',
    'companypaymentmanagement',
    'history',
    'settings',
  ])
  const normalized = value
    .filter((item): item is QuickMenuSetting => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        validIds.has(item.id as QuickMenuId) &&
        typeof item.visible === 'boolean'
      )
    })
    .map((item) => ({
      id: item.id as QuickMenuId,
      visible: item.visible,
    }))

  const existingIds = new Set(normalized.map((item) => item.id))
  const missing = defaultQuickMenuSettings.filter((item) => !existingIds.has(item.id))
  return [...normalized, ...missing]
}

function removeUserDataDirectory() {
  try {
    closeDatabase()
  } catch {
    // ignore close errors during shutdown/uninstall
  }

  try {
    fs.rmSync(app.getPath('userData'), { recursive: true, force: true })
  } catch (error) {
    console.error('Failed to remove user data directory:', error)
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelEvent === '--squirrel-uninstall') {
  removeUserDataDirectory()
}

if (process.platform === 'win32') {
  app.setAppUserModelId(WINDOWS_APP_ID)
}

if (started) app.quit()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function getAppIconPath() {
  return getResourceAssetPath('korea_gov_logo.ico')
}

function getUpdateExePath() {
  return path.join(path.dirname(process.execPath), '..', 'Update.exe')
}

function getAutoLaunchSettings() {
  if (process.platform !== 'win32') {
    return null
  }

  if (!app.isPackaged) {
    return {
      openAtLogin: true,
      enabled: true,
      path: process.execPath,
      args: [STARTUP_LAUNCH_ARG],
    }
  }

  const updateExePath = getUpdateExePath()
  if (!fs.existsSync(updateExePath)) {
    return null
  }

  return {
    openAtLogin: true,
    enabled: true,
    path: updateExePath,
    args: [
      '--processStart',
      path.basename(process.execPath),
      '--process-start-args',
      STARTUP_LAUNCH_ARG,
    ],
  }
}

function configureAutoLaunch() {
  if (process.platform !== 'win32' || !app.isPackaged) {
    return
  }

  const autoLaunchSettings = getAutoLaunchSettings()
  if (!autoLaunchSettings) {
    console.warn('Failed to configure auto launch because Update.exe could not be found.')
    return
  }

  app.setLoginItemSettings(autoLaunchSettings)
}

function isStartupLaunch() {
  return process.argv.includes(STARTUP_LAUNCH_ARG)
}

function restoreMainWindow(window: BrowserWindow) {
  window.setSkipTaskbar(false)
  if (window.isMinimized()) {
    window.restore()
  }
  if (!window.isVisible()) {
    window.show()
  }
  window.focus()
}

function hideMainWindowToTray(window: BrowserWindow) {
  window.setSkipTaskbar(true)
  window.hide()
}

function createTray() {
  if (tray) return tray

  tray = new Tray(getAppIconPath())
  tray.setToolTip(APP_DISPLAY_NAME)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '열기',
        click: () => {
          restoreMainWindow(getOrCreateMainWindow())
        },
      },
      {
        label: '종료',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', () => {
    restoreMainWindow(getOrCreateMainWindow())
  })

  return tray
}

const createWindow = ({ startHidden = false }: { startHidden?: boolean } = {}) => {
  const window = new BrowserWindow({
    width: 1100,
    height: 700,
    frame: false,
    icon: getAppIconPath(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow = window

  window.once('ready-to-show', () => {
    if (startHidden) {
      hideMainWindowToTray(window)
      return
    }

    window.maximize()
    window.show()
  })

  window.setMenuBarVisibility(false)

  window.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    hideMainWindowToTray(window)
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    )
  }

  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key.toLowerCase() === 'i' && input.control && input.shift) {
      window.webContents.openDevTools({ mode: 'detach' })
      event.preventDefault()
    }
    if (input.type === 'keyDown' && input.key === 'F12') {
      window.webContents.openDevTools({ mode: 'detach' })
      event.preventDefault()
    }
  })

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
    }
  })

  return window
}

function getOrCreateMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }

  return createWindow()
}

async function syncSystemAlertToasts() {
  await syncAlertToasts({
    getOrCreateMainWindow,
    listAlerts,
  })
}

function buildEditedFilePath(
  originalFilePath: string,
  driverName: string,
  documentKind: GenerateDocumentKind,
) {
  const directory = path.dirname(originalFilePath)
  const ext = path.extname(originalFilePath) || '.pdf'
  const baseTitle =
    documentKind === 'fine'
      ? buildDocumentFileBase(driverName)
      : buildDocumentFileBaseByKind(driverName, documentKind)
  const safeBase = sanitizeFileName(baseTitle) || 'document'
  let counter = 1
  let candidate = path.join(directory, `${safeBase}_수정본(${counter})${ext}`)
  while (fs.existsSync(candidate)) {
    counter += 1
    candidate = path.join(directory, `${safeBase}_수정본(${counter})${ext}`)
  }
  return candidate
}

function buildGeneratedFilePath(outputDir: string, driverName: string, documentKind: GenerateDocumentKind) {
  const baseTitle = buildDocumentFileBaseByKind(driverName, documentKind)
  const safeBase = sanitizeFileName(baseTitle) || 'document'
  let counter = 0
  let candidate = path.join(outputDir, `${safeBase}.pdf`)
  while (fs.existsSync(candidate)) {
    counter += 1
    candidate = path.join(outputDir, `${safeBase} (${counter}).pdf`)
  }
  return candidate
}

function mapHistoryDocumentTypeToGenerateKind(
  documentType: Extract<HistoryDocumentType, 'pre_notice' | 'suspension' | 'final_notice'>,
): GenerateDocumentKind {
  if (documentType === 'suspension') {
    return 'suspension'
  }

  if (documentType === 'final_notice') {
    return 'final'
  }

  return 'fine'
}

function formatGeneratedDocumentKinds(documentKinds: GenerateDocumentKind[]) {
  const labelMap: Record<GenerateDocumentKind, string> = {
    fine: '사전통지서',
    suspension: '운전업무정지 통지서',
    final: '확정통지서',
  }
  return documentKinds.map((kind) => labelMap[kind]).join(', ')
}

function buildGenerationAlertTitle(rows: ExcelPreviewRow[], documentKinds: GenerateDocumentKind[]) {
  const targetCount = rows.length
  const firstName = rows[0]?.driverName?.trim() || '대상자'
  const targetText = targetCount > 1 ? `${firstName} 외 ${targetCount - 1}건의` : `${firstName}의`
  return `${targetText} ${formatGeneratedDocumentKinds(documentKinds)}가 생성되었습니다.`
}

function getTemplatePath(documentKind: GenerateDocumentKind = 'fine') {
  const templateName =
    documentKind === 'suspension'
      ? 'notice-suspension.hbs.html'
      : documentKind === 'final'
        ? 'notice-final.hbs.html'
        : 'notice.hbs.html'
  const devPath = path.join(process.cwd(), 'src', 'templates', templateName)
  if (!app.isPackaged) {
    return devPath
  }
  const productionPath = path.join(process.resourcesPath, 'templates', templateName)
  if (fs.existsSync(productionPath)) {
    return productionPath
  }
  return devPath
}

async function deleteGeneratedAssets() {
  try {
    const rows = await listPdfHistory(Number.MAX_SAFE_INTEGER)
    for (const row of rows) {
      if (!row.filePath) continue
      if (fs.existsSync(row.filePath)) {
        try {
          fs.unlinkSync(row.filePath)
        } catch (error) {
          console.error('Failed to delete generated file:', row.filePath, error)
        }
      }
    }
  } catch (error) {
    console.error('Failed to iterate generated files:', error)
  }

  try {
    removeUserDataDirectory()
  } catch {
    // ignore cleanup errors here, they are logged in removeUserDataDirectory
  }
}

function triggerProgramUninstall() {
  const updateExePath = getUpdateExePath()
  if (!fs.existsSync(updateExePath)) {
    throw new Error('Update.exe 파일을 찾을 수 없습니다.')
  }
  try {
    const child = spawn(updateExePath, ['--uninstall'], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
  } catch (error) {
    throw new Error(`프로그램 삭제를 실행할 수 없습니다: ${(error as Error).message}`)
  }

  setTimeout(() => {
    app.quit()
  }, 1000)
}

function registerIpc() {
  ipcMain.handle('pick-excel', async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('pick-output-dir', async (_event, defaultPath?: string) => {
    const res = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: defaultPath && defaultPath.length ? defaultPath : undefined,
    })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle(
    'history:attach-document',
    async (
      _event,
      payload: {
        violationRecordId: number
        documentType: HistoryDocumentType
      },
    ) => {
      if (!payload?.violationRecordId) throw new Error('잘못된 요청입니다.')

      const res = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['pdf', 'hwp', 'hwpx', 'doc', 'docx'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (res.canceled || !res.filePaths[0]) {
        return null
      }

      const filePath = res.filePaths[0]
      const id = await upsertCaseDocument(payload.violationRecordId, payload.documentType, filePath)
      if (payload.documentType === 'final_notice') {
        await syncSystemAlertToasts()
      }
      return { id, filePath }
    },
  )

  const generateHistoryDocument = async (payload: {
    violationRecordId: number
    documentType: Extract<HistoryDocumentType, 'pre_notice' | 'suspension' | 'final_notice'>
    outputDir: string
  }) => {
    if (!payload?.violationRecordId) {
      throw new Error('잘못된 요청입니다.')
    }
    if (!payload.outputDir) {
      throw new Error('저장 폴더를 먼저 선택해 주세요.')
    }

    const record = await getLatestPdfHistoryByViolationRecordId(payload.violationRecordId)
    if (!record) {
      throw new Error('생성할 대상 정보를 찾을 수 없습니다.')
    }

    const preview: ExcelPreviewRow = {
      index: record.rowIndex ?? 0,
      docNo: record.docNo ?? '',
      affiliation: record.affiliation ?? '',
      driverName: record.driverName ?? '',
      birthDate: record.birthDate ?? '',
      phone: record.phone ?? '',
      passTime: record.passTime ?? '',
      passLocation: record.passLocation ?? '',
      direction: record.direction ?? '',
      lane: record.lane ?? '',
      regionRegNo: record.regionRegNo ?? '',
      vehicleType: record.vehicleType ?? '',
      speed: record.speed ?? '',
      driveType: record.driveType ?? '',
      partyAddress: record.partyAddress ?? '',
      partyEmail: record.partyEmail ?? '',
    }

    const documentKind = mapHistoryDocumentTypeToGenerateKind(payload.documentType)
    const userProfile = await getUserProfile()
    const outputPath = buildGeneratedFilePath(payload.outputDir, preview.driverName, documentKind)
    await generatePdfFromPreview(preview, {
      templatePath: getTemplatePath(documentKind),
      outputPath,
      userProfile,
      documentKind,
    })

    const documentId = await upsertCaseDocument(payload.violationRecordId, payload.documentType, outputPath)
    if (payload.documentType === 'final_notice') {
      await syncSystemAlertToasts()
    }
    await createGenerationAlert({
      title: buildGenerationAlertTitle([preview], [documentKind]),
      description: '생성 이력 페이지에서 결과를 확인할 수 있습니다.',
    })
    await syncSystemAlertToasts()
    return { id: documentId, filePath: outputPath }
  }

  ipcMain.handle(
    'history:generate-document',
    async (
      _event,
      payload: {
        violationRecordId: number
        documentType: Extract<HistoryDocumentType, 'pre_notice' | 'suspension' | 'final_notice'>
        outputDir: string
      },
    ) => {
      return generateHistoryDocument(payload)
    },
  )

  ipcMain.handle(
    'history:generate-final-notice',
    async (
      _event,
      payload: {
        violationRecordId: number
        outputDir: string
      },
    ) => {
      if (!payload?.violationRecordId) {
        throw new Error('잘못된 요청입니다.')
      }
      if (!payload.outputDir) {
        throw new Error('저장 폴더를 먼저 선택해주세요.')
      }

      const record = await getLatestPdfHistoryByViolationRecordId(payload.violationRecordId)
      if (!record) {
        throw new Error('확정통지서를 생성할 대상 정보를 찾을 수 없습니다.')
      }

      const preview: ExcelPreviewRow = {
        index: record.rowIndex ?? 0,
        docNo: record.docNo ?? '',
        affiliation: record.affiliation ?? '',
        driverName: record.driverName ?? '',
        birthDate: record.birthDate ?? '',
        phone: record.phone ?? '',
        passTime: record.passTime ?? '',
        passLocation: record.passLocation ?? '',
        direction: record.direction ?? '',
        lane: record.lane ?? '',
        regionRegNo: record.regionRegNo ?? '',
        vehicleType: record.vehicleType ?? '',
        speed: record.speed ?? '',
        driveType: record.driveType ?? '',
        partyAddress: record.partyAddress ?? '',
        partyEmail: record.partyEmail ?? '',
      }

      const userProfile = await getUserProfile()
      const outputPath = buildGeneratedFilePath(payload.outputDir, preview.driverName, 'final')
      await generatePdfFromPreview(preview, {
        templatePath: getTemplatePath('final'),
        outputPath,
        userProfile,
        documentKind: 'final',
      })

      const documentId = await upsertCaseDocument(payload.violationRecordId, 'final_notice', outputPath)
      await syncSystemAlertToasts()
      await createGenerationAlert({
        title: buildGenerationAlertTitle([preview], ['final']),
        description: '생성 이력 페이지에서 결과를 확인할 수 있습니다.',
      })
      await syncSystemAlertToasts()
      return { id: documentId, filePath: outputPath }
    },
  )

  ipcMain.handle('excel:preview', async (_event, excelPath: string) => {
    if (!excelPath) return []
    return loadExcelPreview(excelPath)
  })

  ipcMain.handle(
    'run-generate',
    async (
      _event,
      payload: {
        excelPath: string
        outputDir: string
        documentKinds?: GenerateDocumentKind[]
        selectedRows?: number[]
        overrides?: ExcelPreviewRow[]
      },
    ) => {
      const templatePath = getTemplatePath('fine')
      const suspensionTemplatePath = getTemplatePath('suspension')
      const finalTemplatePath = getTemplatePath('final')
      const userProfile = await getUserProfile()
      const result = await generatePdfs({
        excelPath: payload.excelPath,
        outputDir: payload.outputDir,
        templatePath,
        suspensionTemplatePath,
        finalTemplatePath,
        documentKinds: payload.documentKinds,
        selectedRows: payload.selectedRows,
        userProfile,
        overrides: payload.overrides,
      })

      if (result?.ok && Array.isArray(result.results) && result.results.length > 0) {
        await addPdfHistoryBulk(
          result.results.map((item) => ({
            filePath: item.file,
            rowIndex: item.row,
            docNo: item.docNo,
            affiliation: item.affiliation,
            driverName: item.driverName,
            birthDate: item.birthDate,
            phone: item.phone,
            passTime: item.passTime,
            passLocation: item.passLocation,
            direction: item.direction,
            lane: item.lane,
            regionRegNo: item.regionRegNo,
            vehicleType: item.vehicleType,
            speed: item.speed,
            driveType: item.driveType,
            partyAddress: item.partyAddress,
            partyEmail: item.partyEmail,
          })),
        )

        const generationRows = Array.from(
          new Map(
            result.results.map((item) => [
              item.row,
              {
                index: item.row,
                docNo: item.docNo,
                affiliation: item.affiliation,
                driverName: item.driverName,
                birthDate: item.birthDate,
                phone: item.phone,
                passTime: item.passTime,
                passLocation: item.passLocation,
                direction: item.direction,
                lane: item.lane,
                regionRegNo: item.regionRegNo,
                vehicleType: item.vehicleType,
                speed: item.speed,
                driveType: item.driveType,
                partyAddress: item.partyAddress,
                partyEmail: item.partyEmail,
              } satisfies ExcelPreviewRow,
            ]),
          ).values(),
        )

        await createGenerationAlert({
          title: buildGenerationAlertTitle(
            generationRows,
            payload.documentKinds && payload.documentKinds.length
              ? payload.documentKinds
              : ['fine', 'suspension', 'final'],
          ),
          description: '생성 이력 페이지에서 결과를 확인할 수 있습니다.',
        })
        await syncSystemAlertToasts()
      }

      return result
    },
  )

  ipcMain.handle('history:list', async (_event, limit?: number) => {
    return listPdfHistory(limit ?? 100)
  })

  ipcMain.handle('history:delete', async (_event, ids: number[]) => {
    if (!Array.isArray(ids) || !ids.length) return
    const rows = await listPdfHistory(500)
    const targets = rows.filter((row) => ids.includes(row.id))
    for (const row of targets) {
      if (fs.existsSync(row.filePath)) {
        try {
          fs.unlinkSync(row.filePath)
        } catch {
          // ignore deletion errors
        }
      }
    }
    await deletePdfHistory(ids)
  })

  ipcMain.handle('history:open', async (_event, filePath: string) => {
    if (!filePath) return
    if (!fs.existsSync(filePath)) throw new Error('파일을 찾을 수 없습니다.')
    await shell.openPath(filePath)
  })

  ipcMain.handle('history:open-folder', async (_event, filePath: string) => {
    if (!filePath) return
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath)
      return
    }
    const directory = path.dirname(filePath)
    if (fs.existsSync(directory)) {
      await shell.openPath(directory)
    } else {
      throw new Error('폴더를 찾을 수 없습니다.')
    }
  })

  ipcMain.handle('alerts:list', async (): Promise<AlertRow[]> => {
    return listAlerts()
  })

  ipcMain.handle('alerts:unread-count', async () => {
    return getUnreadAlertCount()
  })

  ipcMain.handle('alerts:mark-read', async (_event, id: number) => {
    if (!id) throw new Error('잘못된 요청입니다.')
    await markAlertAsRead(id)
    return true
  })

  ipcMain.handle('alerts:mark-unread', async (_event, id: number) => {
    if (!id) throw new Error('잘못된 요청입니다.')
    await markAlertAsUnread(id)
    return true
  })

  ipcMain.handle('alerts:delete', async (_event, id: number) => {
    if (!id) throw new Error('잘못된 요청입니다.')
    await deleteAlert(id)
    return true
  })

  ipcMain.handle('alerts:delete-many', async (_event, ids: number[]) => {
    if (!Array.isArray(ids)) throw new Error('잘못된 요청입니다.')
    await deleteAlerts(ids)
    return true
  })

  ipcMain.handle('open-directory', async (_event, targetPath: string) => {
    if (!targetPath) return
    const resolved = path.resolve(targetPath)
    if (!fs.existsSync(resolved)) {
      throw new Error('폴더를 찾을 수 없습니다.')
    }
    const stats = fs.statSync(resolved)
    if (stats.isDirectory()) {
      await shell.openPath(resolved)
      return
    }
    shell.showItemInFolder(resolved)
  })

  ipcMain.handle(
    'history:edit',
    async (
      _event,
      payload: {
        id: number
        fields: HistoryEditFields
      },
    ) => {
      if (!payload || !payload.id) throw new Error('잘못된 요청입니다.')
      const record = await getPdfHistoryById(payload.id)
      if (!record) throw new Error('기록을 찾을 수 없습니다.')
      if (!record.filePath) throw new Error('기존 파일 경로가 없습니다.')

      const paymentFieldKeys: Array<keyof HistoryEditFields> = [
        'paymentType',
        'advancePaymentStatus',
        'confirmedPaymentStatus',
        'advanceDueDate',
        'confirmedDueDate',
        'updatedAt',
      ]
      const documentFieldKeys: Array<keyof HistoryEditFields> = [
        'docNo',
        'affiliation',
        'driverName',
        'birthDate',
        'phone',
        'passTime',
        'passLocation',
        'direction',
        'lane',
        'regionRegNo',
        'vehicleType',
        'speed',
        'driveType',
        'partyAddress',
        'partyEmail',
      ]
      const hasDocumentFieldUpdates = documentFieldKeys.some((key) => payload.fields[key] !== undefined)
      const hasPaymentFieldUpdates = paymentFieldKeys.some((key) => payload.fields[key] !== undefined)

      if (hasPaymentFieldUpdates && !hasDocumentFieldUpdates) {
        await updatePdfHistory(payload.id, payload.fields)
        return { ok: true }
      }

      const merged: ExcelPreviewRow = {
        index: record.rowIndex ?? 0,
        docNo: payload.fields.docNo ?? record.docNo ?? '',
        affiliation: payload.fields.affiliation ?? record.affiliation ?? '',
        driverName: payload.fields.driverName ?? record.driverName ?? '',
        birthDate: payload.fields.birthDate ?? record.birthDate ?? '',
        phone: payload.fields.phone ?? record.phone ?? '',
        passTime: payload.fields.passTime ?? record.passTime ?? '',
        passLocation: payload.fields.passLocation ?? record.passLocation ?? '',
        direction: payload.fields.direction ?? record.direction ?? '',
        lane: payload.fields.lane ?? record.lane ?? '',
        regionRegNo: payload.fields.regionRegNo ?? record.regionRegNo ?? '',
        vehicleType: payload.fields.vehicleType ?? record.vehicleType ?? '',
        speed: payload.fields.speed ?? record.speed ?? '',
        driveType: payload.fields.driveType ?? record.driveType ?? '',
        partyAddress: payload.fields.partyAddress ?? record.partyAddress ?? '',
        partyEmail: payload.fields.partyEmail ?? record.partyEmail ?? '',
      }

      const userProfile = await getUserProfile()
      const timestamp = new Date().toISOString()
      const documentKinds: GenerateDocumentKind[] = ['fine', 'suspension', 'final']
      const createdFilePaths: string[] = []
      const historyEntries: Array<{
        filePath: string
        rowIndex?: number | null
        docNo?: string | null
        affiliation?: string | null
        driverName?: string | null
        birthDate?: string | null
        phone?: string | null
        passTime?: string | null
        passLocation?: string | null
        direction?: string | null
        lane?: string | null
        regionRegNo?: string | null
        vehicleType?: string | null
        speed?: string | null
        driveType?: string | null
        partyAddress?: string | null
        partyEmail?: string | null
        createdAt?: string | null
        updatedAt?: string | null
      }> = []

      for (const documentKind of documentKinds) {
        const sourceFilePath =
          documentKind === inferDocumentKindFromFilePath(record.filePath)
            ? record.filePath
            : path.join(path.dirname(record.filePath), `${buildDocumentFileBaseByKind(merged.driverName, documentKind)}.pdf`)
        const templatePath = getTemplatePath(documentKind)
        const outputPath = buildEditedFilePath(sourceFilePath, merged.driverName, documentKind)

        await generatePdfFromPreview(merged, {
          templatePath,
          outputPath,
          userProfile,
          documentKind,
        })

        historyEntries.push({
          filePath: outputPath,
          rowIndex: record.rowIndex ?? undefined,
          docNo: merged.docNo,
          affiliation: merged.affiliation,
          driverName: merged.driverName,
          birthDate: merged.birthDate,
          phone: merged.phone,
          passTime: merged.passTime,
          passLocation: merged.passLocation,
          direction: merged.direction,
          lane: merged.lane,
          regionRegNo: merged.regionRegNo,
          vehicleType: merged.vehicleType,
          speed: merged.speed,
          driveType: merged.driveType,
          partyAddress: merged.partyAddress,
          partyEmail: merged.partyEmail,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        createdFilePaths.push(outputPath)
      }

      await addPdfHistoryBulk(historyEntries)

      return { filePath: createdFilePaths[0], filePaths: createdFilePaths }
    },
  )

  ipcMain.handle(
    'program:delete',
    async (_event, payload: { deleteGeneratedFiles?: boolean }) => {
      if (payload?.deleteGeneratedFiles) {
        await deleteGeneratedAssets()
      }
      triggerProgramUninstall()
      return { ok: true }
    },
  )

  ipcMain.handle('window:minimize', () => BrowserWindow.getFocusedWindow()?.minimize())
  ipcMain.handle('window:toggle-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })
  ipcMain.handle('window:close', () => BrowserWindow.getFocusedWindow()?.close())

  ipcMain.handle('user-info:get', async () => {
    return getUserProfile()
  })

  ipcMain.handle('user-info:save', async (_event, profile) => {
    await saveUserProfile(profile)
    return true
  })

  ipcMain.handle('settings:get-default-output-dir', async () => {
    return getDefaultOutputDir()
  })

  ipcMain.handle('settings:set-default-output-dir', async (_event, dir: string) => {
    await setDefaultOutputDir(dir)
    return true
  })

  ipcMain.handle('settings:get-quick-menu-settings', async () => {
    const raw = await getQuickMenuSettings()
    if (!raw) {
      return defaultQuickMenuSettings
    }

    try {
      return normalizeQuickMenuSettings(JSON.parse(raw) as QuickMenuSetting[])
    } catch {
      return defaultQuickMenuSettings
    }
  })

  ipcMain.handle('settings:set-quick-menu-settings', async (_event, value: QuickMenuSetting[]) => {
    const normalized = normalizeQuickMenuSettings(value)
    await setQuickMenuSettings(JSON.stringify(normalized))
    return normalized
  })
}

async function initializeFirstRunState() {
  if (!app.isPackaged) return

  const markerPath = path.join(app.getPath('userData'), FIRST_RUN_MARKER)
  if (fs.existsSync(markerPath)) return

  await clearPdfHistory()
  await clearAppSettings()
  await clearUserProfile()
  fs.writeFileSync(markerPath, new Date().toISOString(), 'utf8')
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  await initDatabase(app.getPath('userData'))
  await initializeFirstRunState()
  configureAutoLaunch()
  registerIpc()
  await initializeAlertToastService(listAlerts)
  createTray()
  createWindow({ startHidden: isStartupLaunch() })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
    return
  }

  restoreMainWindow(getOrCreateMainWindow())
})

app.on('before-quit', () => {
  isQuitting = true
  closeDatabase()
})
