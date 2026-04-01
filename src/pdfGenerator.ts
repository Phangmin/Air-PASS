import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'
import Handlebars from 'handlebars'
import { BrowserWindow } from 'electron'
import type { User } from './types/ipc'

XLSX.set_fs(fs)

export const EXCEL_FIELD_KEYS = {
  affiliation: ['소속', '소 속', '소속(주소)'],
  driverName: ['운전자'],
  birthDate: ['생년월일'],
  phone: ['전화번호'],
  passTime: ['통행시간', '통행 시간'],
  passLocation: ['통행 장소'],
  direction: ['진행 방향'],
  lane: ['차로'],
  regionRegNo: ['이동지역 등록번호'],
  vehicleType: ['차종'],
  speed: ['속도'],
  driveType: ['주행'],
  partyAddress: ['당사자 주소', '당사자주소'],
  partyEmail: ['메일주소', '이메일', 'Email'],
} as const

type ProfileInput = Partial<User> | null | undefined

type SubmissionInfo = {
  organizationName: string
  department: string
  officerName: string
  email: string
  phone: string
  fax: string
  address: string
}

type TemplateMeta = {
  issuedDate: string
  issuedDateText: string
  submissionDeadlineDate: string
  submissionDeadlineText: string
  year: number
  month: number
  day: number
}

const DEFAULT_SUBMISSION_DEPARTMENT = '공항안전과'
const WHITESPACE_REGEX = /\s+/g
const KOREAN_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
const PASS_LOCATION_CODE_REGEX = /(\d+)\s*번/

function normalizeText(value?: string | null) {
  if (value === undefined || value === null) return ''
  return String(value).replace(WHITESPACE_REGEX, ' ').trim()
}

function stripParenthetical(value?: string | null) {
  if (!value) return ''
  return String(value).replace(/\s*[(\uFF08].*$/, '').trim()
}

function fallback(value?: string | null, defaultValue = '미기재') {
  const normalized = normalizeText(value)
  return normalized || defaultValue
}

function formatPassLocationValue(value?: string | null) {
  const normalized = normalizeText(value)
  if (!normalized) return ''

  const match = normalized.match(PASS_LOCATION_CODE_REGEX)
  if (!match) return normalized

  const rawCode = match[1]
  const trimmedCode = rawCode.replace(/^0+(?=\d)/, '')
  const finalCode = trimmedCode || rawCode
  return `#${finalCode}, 주기장 부근 조업도로`
}

function normalizeProfile(profile?: ProfileInput): Required<User> {
  return {
    name: normalizeText(profile?.name),
    department: normalizeText(profile?.department),
    email: normalizeText(profile?.email),
    phone: normalizeText(profile?.phone),
    fax: normalizeText(profile?.fax),
    zipCode: normalizeText(profile?.zipCode),
    baseAddress: normalizeText(profile?.baseAddress),
    detailAddress: normalizeText(profile?.detailAddress),
  }
}

function buildSubmissionInfo(profile: Required<User>): SubmissionInfo {
  const addressParts: string[] = []
  if (profile.zipCode) addressParts.push(`(${profile.zipCode})`)
  if (profile.baseAddress) addressParts.push(profile.baseAddress)
  if (profile.detailAddress) addressParts.push(profile.detailAddress)
  const address = addressParts.join(' ').trim()

  return {
    organizationName: '부산지방항공청',
    department: fallback(profile.department, DEFAULT_SUBMISSION_DEPARTMENT),
    officerName: fallback(profile.name),
    email: fallback(profile.email),
    phone: fallback(profile.phone),
    fax: fallback(profile.fax),
    address: fallback(address, '미기재'),
  }
}

function formatKoreanDate(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

function formatDotDate(date: Date) {
  return `${padNumber(date.getFullYear(), 4)}.${padNumber(date.getMonth() + 1)}.${padNumber(date.getDate())}`
}

function calculateSubmissionDeadline(baseDate: Date) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0)
}

function buildMeta(baseDate: Date): TemplateMeta {
  const issuedDate = formatDotDate(baseDate)
  const issuedDateText = formatKoreanDate(baseDate)
  const submissionDeadline = calculateSubmissionDeadline(baseDate)
  return {
    issuedDate,
    issuedDateText,
    submissionDeadlineDate: formatDotDate(submissionDeadline),
    submissionDeadlineText: `${formatKoreanDate(submissionDeadline)}까지`,
    year: baseDate.getFullYear(),
    month: baseDate.getMonth() + 1,
    day: baseDate.getDate(),
  }
}

function buildFactStatement(preview: ExcelPreviewRow) {
  const affiliation = normalizeText(preview.affiliation)
  const driver = normalizeText(preview.driverName)
  const passTime = normalizeText(preview.passTime)
  const passLocation = normalizeText(formatPassLocationValue(preview.passLocation))
  const vehicleType = normalizeText(preview.vehicleType)
  const regionRegNo = normalizeText(preview.regionRegNo)
  const speed = fallback(preview.speed, '-')

  const actor = `${affiliation ? `${affiliation} 소속 ` : ''}${
    driver ? `${driver}님은` : '당사자는'
  }`.trim()
  const timeSegment = passTime ? `${passTime}경` : ''
  const locationSegment = `김해공항 이동지역${passLocation ? `(${passLocation})` : ''}`
  const vehicleSegment = `${vehicleType}${regionRegNo ? `(${regionRegNo})` : ''}`.trim()

  const segments = [
    actor,
    timeSegment,
    `${locationSegment}에서`,
    vehicleSegment ? `${vehicleSegment}를` : '차량을',
    '운행하는 과정 중 지상안전관리기준(제한속도 준수)을 위반함',
    `(속도 ${speed})`,
  ]

  return segments
    .filter((segment) => segment && segment.trim().length)
    .join(' ')
    .replace(WHITESPACE_REGEX, ' ')
    .trim()
}

export function sanitizeFileName(name: unknown) {
  return String(name ?? '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

export function buildDocumentFileBase(driverName?: string | null) {
  const cleanName = sanitizeFileName(driverName ?? '')
  const finalName = cleanName || '미기재'
  return `1. 행정처분(과태료) 사전통지서 및 의견제출서(${finalName})`
}

export type DocumentKind = 'fine' | 'suspension' | 'final'

export function buildDocumentFileBaseByKind(
  driverName?: string | null,
  kind: DocumentKind = 'fine',
) {
  const cleanName = sanitizeFileName(driverName ?? '')
  const finalName = cleanName || '미기재'
  if (kind === 'suspension') {
    return `2. 행정처분(운전업무정지) 사전통지서(${finalName})`
  }
  if (kind === 'final') {
    return `3. 행정처분(과태료) 확정통지서(${finalName})`
  }
  return buildDocumentFileBase(driverName)
}

export function inferDocumentKindFromFilePath(filePath?: string | null): DocumentKind {
  const baseName = path.basename(filePath ?? '')
  if (/^2\.\s*행정처분\(운전업무정지\)\s*사전통지서/.test(baseName)) return 'suspension'
  if (/^3\.\s*행정처분\(과태료\)\s*확정통지서/.test(baseName)) return 'final'
  return 'fine'
}

function createUniqueFilePath(directory: string, baseName: string, extension = '.pdf') {
  const safeBase = baseName || 'document'
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const suffix = attempt > 0 ? `_${attempt}` : ''
    const candidate = path.join(directory, `${safeBase}${suffix}${extension}`)
    if (!fs.existsSync(candidate)) {
      return candidate
    }
  }
  return path.join(directory, `${safeBase}_${Date.now()}${extension}`)
}

type ExcelRowValue = string | number | boolean | Date | null
type ExcelRow = Record<string, ExcelRowValue>

function readExcelRows(excelPath: string): ExcelRow[] {
  const wb = XLSX.readFile(excelPath, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: '' })
}

function normalizeHeaderName(name: unknown) {
  return String(name ?? '')
    .replace(/(?:\(|\uFF08).*?(?:\)|\uFF09)/g, '')
    .replace(/[\s\u00A0]+/g, '')
    .trim()
    .toLowerCase()
}

function findFieldValue(row: ExcelRow, keys: readonly string[]): ExcelRowValue | undefined {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  const normalizedTargets = new Set(keys.map(normalizeHeaderName))
  for (const [rawKey, rawValue] of Object.entries(row)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') continue
    const normalizedKey = normalizeHeaderName(rawKey)
    if (normalizedTargets.has(normalizedKey)) {
      return rawValue
    }
  }

  return undefined
}

function pickField(row: ExcelRow, keys: readonly string[], fallback = '') {
  const value = findFieldValue(row, keys)
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

function padNumber(value: number, length = 2) {
  return String(value).padStart(length, '0')
}

function formatPassTimeParts({
  year,
  month,
  day,
  hour,
  minute,
}: {
  year: number
  month: number
  day: number
  hour?: number
  minute?: number
  second?: number
}): string {
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ''

  const baseDatePart = `${y}.${m}.${d}.`
  const weekdayDate = new Date(y, m - 1, d)
  const weekday = Number.isNaN(weekdayDate.getTime()) ? '' : KOREAN_WEEKDAYS[weekdayDate.getDay()]
  const datePart = weekday ? `${baseDatePart}(${weekday})` : baseDatePart

  if (
    hour === undefined ||
    minute === undefined ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return datePart
  }

  const timePart = `${padNumber(hour)}:${padNumber(minute)}`
  return `${datePart} ${timePart}`
}

function formatPassTimeValue(value: ExcelRowValue | undefined, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback

  if (value instanceof Date) {
    const formatted = formatPassTimeParts({
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
      hour: value.getHours(),
      minute: value.getMinutes(),
      second: value.getSeconds(),
    })
    if (formatted) return formatted
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const formatted = formatPassTimeParts({
        year: parsed.y,
        month: parsed.m,
        day: parsed.d,
        hour: parsed.H ?? 0,
        minute: parsed.M ?? 0,
        second: parsed.S ? Math.round(parsed.S) : 0,
      })
      if (formatted) return formatted
    }
  }

  const str = String(value).trim()
  if (!str) return fallback

  const cleaned = str.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  const normalized = cleaned.replace(/[.]/g, '-')
  const match = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  )
  if (match) {
    const [, year, month, day, hour, minute, second] = match
    const formatted = formatPassTimeParts({
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: hour !== undefined ? Number(hour) : undefined,
      minute: minute !== undefined ? Number(minute) : undefined,
      second: second !== undefined ? Number(second) : undefined,
    })
    if (formatted) return formatted
  }

  return cleaned
}

export type ExcelPreviewRow = {
  index: number
  docNo: string
  affiliation: string
  driverName: string
  birthDate: string
  phone: string
  passTime: string
  passLocation: string
  direction: string
  lane: string
  regionRegNo: string
  vehicleType: string
  speed: string
  driveType: string
  partyAddress: string
  partyEmail: string
}

function mapRowToPreview(row: ExcelRow, index: number): ExcelPreviewRow {
  const passTimeRaw = findFieldValue(row, EXCEL_FIELD_KEYS.passTime)
  const affiliationRaw = pickField(row, EXCEL_FIELD_KEYS.affiliation)
  return {
    index,
    docNo: pickField(row, EXCEL_FIELD_KEYS.regionRegNo, `row-${index + 1}`),
    affiliation: stripParenthetical(affiliationRaw) || affiliationRaw,
    driverName: pickField(row, EXCEL_FIELD_KEYS.driverName),
    birthDate: pickField(row, EXCEL_FIELD_KEYS.birthDate),
    phone: pickField(row, EXCEL_FIELD_KEYS.phone),
    passTime: formatPassTimeValue(passTimeRaw),
    passLocation: pickField(row, EXCEL_FIELD_KEYS.passLocation),
    direction: pickField(row, EXCEL_FIELD_KEYS.direction),
    lane: pickField(row, EXCEL_FIELD_KEYS.lane),
    regionRegNo: pickField(row, EXCEL_FIELD_KEYS.regionRegNo),
    vehicleType: pickField(row, EXCEL_FIELD_KEYS.vehicleType),
    speed: pickField(row, EXCEL_FIELD_KEYS.speed),
    driveType: pickField(row, EXCEL_FIELD_KEYS.driveType),
    partyAddress: pickField(row, EXCEL_FIELD_KEYS.partyAddress),
    partyEmail: pickField(row, EXCEL_FIELD_KEYS.partyEmail),
  }
}

export function loadExcelPreview(excelPath: string): ExcelPreviewRow[] {
  const rows = readExcelRows(excelPath)
  return rows.map((row, index) => mapRowToPreview(row, index))
}

export type GeneratePdfResult = ExcelPreviewRow & {
  row: number
  file: string
}

function buildReceiverLine(preview: ExcelPreviewRow, kind: DocumentKind = 'fine') {
  const name = normalizeText(preview.driverName)
  const receiver = name ? `${name} 귀하` : '귀하'
  if (kind === 'suspension') {
    const affiliation = normalizeText(preview.affiliation)
    return affiliation ? `${receiver}(${affiliation})` : receiver
  }
  return receiver
}

function parseSpeedNumber(value?: string | null) {
  const normalized = normalizeText(value)
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : Number.NaN
}

function calculateSuspensionDays(speed?: string | null) {
  const speedValue = parseSpeedNumber(speed)
  if (!Number.isFinite(speedValue)) return 1
  return speedValue - 30 >= 10 ? 2 : 1
}

function isSuspensionOverTen(speed?: string | null) {
  const speedValue = parseSpeedNumber(speed)
  if (!Number.isFinite(speedValue)) return false
  return speedValue - 30 >= 10
}

function buildTemplateData(
  row: ExcelRow,
  preview: ExcelPreviewRow,
  normalizedProfile: Required<User>,
  submissionInfo: SubmissionInfo,
  meta: TemplateMeta,
  kind: DocumentKind,
) {
  return {
    ...row,
    ...preview,
    passLocation: formatPassLocationValue(preview.passLocation),
    receiverLine: buildReceiverLine(preview, kind),
    factStatement: buildFactStatement(preview),
    suspensionDays: calculateSuspensionDays(preview.speed),
    suspensionOverTen: isSuspensionOverTen(preview.speed),
    meta,
    submission: submissionInfo,
    userProfile: normalizedProfile,
  }
}

export async function generatePdfFromPreview(preview: ExcelPreviewRow, options: {
  templatePath: string
  outputPath: string
  userProfile?: ProfileInput
  documentKind?: DocumentKind
}) {
  const templateSrc = fs.readFileSync(options.templatePath, 'utf-8')
  const compile = Handlebars.compile(templateSrc)
  const normalizedProfile = normalizeProfile(options.userProfile)
  const submissionInfo = buildSubmissionInfo(normalizedProfile)
  const meta = buildMeta(new Date())
  const documentKind = options.documentKind ?? 'fine'

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const templateData = buildTemplateData(
    {} as ExcelRow,
    preview,
    normalizedProfile,
    submissionInfo,
    meta,
    documentKind,
  )

  const html = compile(templateData)
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
  })

  fs.writeFileSync(options.outputPath, pdfBuffer)
  win.close()
}

export async function generatePdfs(params: {
  excelPath: string
  templatePath: string
  suspensionTemplatePath: string
  finalTemplatePath: string
  outputDir: string
  documentKinds?: DocumentKind[]
  selectedRows?: number[]
  userProfile?: ProfileInput
  overrides?: ExcelPreviewRow[]
}) {
  const {
    excelPath,
    templatePath,
    suspensionTemplatePath,
    finalTemplatePath,
    outputDir,
    documentKinds,
    selectedRows,
    userProfile,
    overrides,
  } = params

  const rows = readExcelRows(excelPath)
  if (!rows.length) return { ok: false, message: '엑셀에 데이터가 없습니다.' }
  const requestedDocumentKinds = new Set<DocumentKind>(
    documentKinds && documentKinds.length ? documentKinds : ['fine', 'suspension', 'final'],
  )
  if (!requestedDocumentKinds.size) {
    return { ok: false, message: '생성할 문서를 선택하세요.' }
  }

  const selectedSet = selectedRows && selectedRows.length > 0 ? new Set(selectedRows) : null
  const overrideMap = new Map<number, ExcelPreviewRow>()
  overrides?.forEach((row) => {
    if (typeof row.index === 'number') {
      overrideMap.set(row.index, row)
    }
  })

  const templateSrc = fs.readFileSync(templatePath, 'utf-8')
  const suspensionTemplateSrc = fs.readFileSync(suspensionTemplatePath, 'utf-8')
  const finalTemplateSrc = fs.readFileSync(finalTemplatePath, 'utf-8')
  const compile = Handlebars.compile(templateSrc)
  const compileSuspension = Handlebars.compile(suspensionTemplateSrc)
  const compileFinal = Handlebars.compile(finalTemplateSrc)
  const normalizedProfile = normalizeProfile(userProfile)
  const submissionInfo = buildSubmissionInfo(normalizedProfile)
  const meta = buildMeta(new Date())

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const results: GeneratePdfResult[] = []

  for (let i = 0; i < rows.length; i++) {
    if (selectedSet && !selectedSet.has(i)) continue
    const row = rows[i]
    let preview = mapRowToPreview(row, i)
    const override = overrideMap.get(i)
    if (override) {
      preview = { ...preview, ...override }
    }

    const documents = [
      {
        kind: 'fine' as const,
        html: compile(
          buildTemplateData(row, preview, normalizedProfile, submissionInfo, meta, 'fine'),
        ),
      },
      {
        kind: 'suspension' as const,
        html: compileSuspension(
          buildTemplateData(row, preview, normalizedProfile, submissionInfo, meta, 'suspension'),
        ),
      },
      {
        kind: 'final' as const,
        html: compileFinal(
          buildTemplateData(row, preview, normalizedProfile, submissionInfo, meta, 'final'),
        ),
      },
    ].filter((document) => requestedDocumentKinds.has(document.kind))

    for (const document of documents) {
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(document.html))

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
      })

      const baseTitle = buildDocumentFileBaseByKind(preview.driverName, document.kind)
      const safeBase = sanitizeFileName(baseTitle) || `row-${i + 1}`
      const outPath = createUniqueFilePath(outputDir, safeBase)

      fs.writeFileSync(outPath, pdfBuffer)
      results.push({
        ...preview,
        row: i,
        file: outPath,
      })
    }
  }

  win.close()
  return { ok: true, count: results.length, results }
}
