/* eslint-disable import/no-named-as-default, import/no-named-as-default-member */
import fs from 'node:fs'
import path from 'node:path'
// eslint-disable-next-line import/no-unresolved
import sqlite3 from 'sqlite3'
import { inferDocumentKindFromFilePath } from './pdfGenerator'

sqlite3.verbose()

let db: sqlite3.Database | null = null
let alertsSyncInFlight: Promise<void> | null = null

const PRIMARY_USER_ID = 1
type CaseDocumentType = 'pre_notice' | 'suspension' | 'opinion_submit' | 'final_notice'
type PaymentType = 'advance' | 'confirmed'
type PaymentStatus = 'unpaid' | 'paid'
type AlertStatus = 'unread' | 'read'
type AlertType = 'violation' | 'generation'
type AlertTargetPage = 'payer-detail' | 'history'

export interface ViolationDocumentRecord {
  id: number
  violationRecordId: number
  documentType: CaseDocumentType
  filePath: string
  rowIndex: number | null
  docNo: string | null
  affiliation: string | null
  driverName: string | null
  birthDate: string | null
  phone: string | null
  passTime: string | null
  passLocation: string | null
  direction: string | null
  lane: string | null
  regionRegNo: string | null
  vehicleType: string | null
  speed: string | null
  driveType: string | null
  partyAddress: string | null
  partyEmail: string | null
  paymentType: PaymentType
  advancePaymentStatus: PaymentStatus
  confirmedPaymentStatus: PaymentStatus
  advanceDueDate: string | null
  confirmedDueDate: string | null
  violationUpdatedAt: string | null
  violationCreatedAt: string
  updatedAt: string | null
  createdAt: string
  exists: boolean
}

export type PdfHistoryRow = ViolationDocumentRecord

export interface AlertRow {
  id: number
  violationRecordId: number | null
  alertType: AlertType
  targetPage: AlertTargetPage
  status: AlertStatus
  title: string
  description: string
  occurredAt: string
  readAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export type HistoryEntryInput = {
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
  paymentType?: PaymentType | null
  advancePaymentStatus?: PaymentStatus | null
  confirmedPaymentStatus?: PaymentStatus | null
  advanceDueDate?: string | null
  confirmedDueDate?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type HistoryUpdateInput = Partial<
  Pick<
    ViolationDocumentRecord,
    | 'filePath'
    | 'rowIndex'
    | 'docNo'
    | 'affiliation'
    | 'driverName'
    | 'birthDate'
    | 'phone'
    | 'passTime'
    | 'passLocation'
    | 'direction'
    | 'lane'
    | 'regionRegNo'
    | 'vehicleType'
    | 'speed'
    | 'driveType'
    | 'partyAddress'
    | 'partyEmail'
    | 'paymentType'
    | 'advancePaymentStatus'
    | 'confirmedPaymentStatus'
    | 'advanceDueDate'
    | 'confirmedDueDate'
    | 'updatedAt'
  >
>

export type UserRow = {
  name: string
  department: string
  email: string
  phone: string
  fax: string
  zipCode: string
  baseAddress: string
  detailAddress: string
}

export type UserProfileRow = UserRow

const defaultProfile: UserRow = {
  name: '',
  department: '',
  email: '',
  phone: '',
  fax: '',
  zipCode: '',
  baseAddress: '',
  detailAddress: '',
}

type RunResult = {
  lastID: number
  changes: number
}

function getDb() {
  if (!db) throw new Error('Database not initialized')
  return db
}

function runAsync(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<RunResult>((resolve, reject) => {
    database.run(sql, params, function runCallback(err) {
      if (err) return reject(err)
      resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

function getAsync<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    database.get<T>(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })
}

function allAsync<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all<T>(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

async function tableExists(database: sqlite3.Database, name: string) {
  const row = await getAsync<{ name: string }>(
    database,
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [name],
  )
  return Boolean(row)
}

async function columnExists(database: sqlite3.Database, tableName: string, columnName: string) {
  const rows = await allAsync<{ name: string }>(database, `PRAGMA table_info(${tableName})`)
  return rows.some((row) => row.name === columnName)
}

function normalizeOptionalString(value?: string | null) {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed.length ? trimmed : null
}

function endOfNextMonth(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const deadline = new Date(date.getFullYear(), date.getMonth() + 2, 0)
  return `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(
    deadline.getDate(),
  ).padStart(2, '0')}`
}

function buildViolationKey(entry: HistoryEntryInput) {
  return JSON.stringify([
    entry.rowIndex ?? null,
    normalizeOptionalString(entry.affiliation),
    normalizeOptionalString(entry.driverName),
    normalizeOptionalString(entry.birthDate),
    normalizeOptionalString(entry.phone),
    normalizeOptionalString(entry.passTime),
    normalizeOptionalString(entry.passLocation),
    normalizeOptionalString(entry.direction),
    normalizeOptionalString(entry.lane),
    normalizeOptionalString(entry.regionRegNo ?? entry.docNo),
    normalizeOptionalString(entry.vehicleType),
    normalizeOptionalString(entry.speed),
    normalizeOptionalString(entry.driveType),
    normalizeOptionalString(entry.partyAddress),
    normalizeOptionalString(entry.partyEmail),
  ])
}

function toCaseDocumentType(filePath: string): CaseDocumentType {
  const kind = inferDocumentKindFromFilePath(filePath)
  if (kind === 'suspension') return 'suspension'
  if (kind === 'final') return 'final_notice'
  return 'pre_notice'
}

function normalizeCaseDocumentType(value?: string | null): CaseDocumentType {
  if (value === 'suspension') return 'suspension'
  if (value === 'opinion_submit') return 'opinion_submit'
  if (value === 'final_notice') return 'final_notice'
  return 'pre_notice'
}

function normalizePaymentType(value?: string | null): PaymentType {
  return value === 'confirmed' ? 'confirmed' : 'advance'
}

function normalizePaymentStatus(value?: string | null): PaymentStatus {
  return value === 'paid' ? 'paid' : 'unpaid'
}

function getDefaultAdvanceDueDate(baseDate?: string | null) {
  return endOfNextMonth(baseDate)
}

function getDefaultConfirmedDueDate(baseDate?: string | null) {
  return endOfNextMonth(baseDate)
}

async function ensurePrimaryUserRow() {
  const database = getDb()
  await runAsync(
    database,
    `INSERT INTO users (
      id,
      name,
      department,
      email,
      phone,
      fax,
      zip_code,
      base_address,
      detail_address
    ) VALUES (1, '', '', '', '', '', '', '', '')
    ON CONFLICT(id) DO NOTHING`,
  )
}

async function createSchema(database: sqlite3.Database) {
  await runAsync(database, 'PRAGMA foreign_keys = ON')

  await runAsync(
    database,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      fax TEXT,
      zip_code TEXT NOT NULL,
      base_address TEXT NOT NULL,
      detail_address TEXT NOT NULL
    )`,
  )

  await runAsync(
    database,
    `CREATE TABLE IF NOT EXISTS violation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      row_index INTEGER,
      affiliation TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      birth_date TEXT,
      phone TEXT,
      pass_time TEXT NOT NULL,
      pass_location TEXT NOT NULL,
      direction TEXT,
      lane TEXT,
      region_reg_no TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      speed TEXT NOT NULL,
      drive_type TEXT,
      party_address TEXT,
      party_email TEXT,
      payment_type TEXT NOT NULL DEFAULT 'advance' CHECK (payment_type IN ('advance', 'confirmed')),
      advance_payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (advance_payment_status IN ('unpaid', 'paid')),
      confirmed_payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (confirmed_payment_status IN ('unpaid', 'paid')),
      advance_due_date TEXT,
      confirmed_due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
  )

  await runAsync(
    database,
    `CREATE TABLE IF NOT EXISTS case_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_type TEXT NOT NULL CHECK (document_type IN ('pre_notice', 'suspension', 'opinion_submit', 'final_notice')),
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT,
      violation_record_id INTEGER NOT NULL,
      FOREIGN KEY (violation_record_id) REFERENCES violation_records(id),
      UNIQUE (violation_record_id, document_type)
    )`,
  )

  await runAsync(
    database,
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`,
  )

  await runAsync(
    database,
    `CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      violation_record_id INTEGER UNIQUE,
      alert_type TEXT NOT NULL DEFAULT 'violation' CHECK (alert_type IN ('violation', 'generation')),
      target_page TEXT NOT NULL DEFAULT 'payer-detail' CHECK (target_page IN ('payer-detail', 'history')),
      status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      read_at TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (violation_record_id) REFERENCES violation_records(id) ON DELETE CASCADE
    )`,
  )

  await runAsync(
    database,
    `CREATE INDEX IF NOT EXISTS idx_violation_records_user_id
      ON violation_records (user_id)`,
  )
  await runAsync(
    database,
    `CREATE INDEX IF NOT EXISTS idx_case_documents_violation_record_id
      ON case_documents (violation_record_id)`,
  )
  await runAsync(
    database,
    `CREATE INDEX IF NOT EXISTS idx_alerts_violation_record_id
      ON alerts (violation_record_id)`,
  )
}

async function ensureCaseDocumentOpinionType(database: sqlite3.Database) {
  const row = await getAsync<{ sql: string }>(
    database,
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'case_documents'`,
  )
  const createSql = row?.sql ?? ''

  if (createSql.includes('opinion_submit')) return

  await runAsync(database, 'BEGIN TRANSACTION')
  try {
    await runAsync(database, `ALTER TABLE case_documents RENAME TO case_documents_legacy`)
    await runAsync(
      database,
      `CREATE TABLE case_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_type TEXT NOT NULL CHECK (document_type IN ('pre_notice', 'suspension', 'opinion_submit', 'final_notice')),
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        violation_record_id INTEGER NOT NULL,
        FOREIGN KEY (violation_record_id) REFERENCES violation_records(id),
        UNIQUE (violation_record_id, document_type)
      )`,
    )
    await runAsync(
      database,
      `INSERT INTO case_documents (
        id,
        document_type,
        file_path,
        created_at,
        updated_at,
        violation_record_id
      )
      SELECT
        id,
        document_type,
        file_path,
        created_at,
        updated_at,
        violation_record_id
      FROM case_documents_legacy`,
    )
    await runAsync(database, `DROP TABLE case_documents_legacy`)
    await runAsync(
      database,
      `CREATE INDEX IF NOT EXISTS idx_case_documents_violation_record_id
        ON case_documents (violation_record_id)`,
    )
    await runAsync(database, 'COMMIT')
  } catch (error) {
    await runAsync(database, 'ROLLBACK')
    throw error
  }
}

async function ensureViolationRecordColumns(database: sqlite3.Database) {
  const paymentTypeExists = await columnExists(database, 'violation_records', 'payment_type')
  if (!paymentTypeExists) {
    await runAsync(
      database,
      `ALTER TABLE violation_records
        ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'advance'
        CHECK (payment_type IN ('advance', 'confirmed'))`,
    )
  }

  const advanceStatusExists = await columnExists(
    database,
    'violation_records',
    'advance_payment_status',
  )
  if (!advanceStatusExists) {
    await runAsync(
      database,
      `ALTER TABLE violation_records
        ADD COLUMN advance_payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (advance_payment_status IN ('unpaid', 'paid'))`,
    )
  }

  const confirmedStatusExists = await columnExists(
    database,
    'violation_records',
    'confirmed_payment_status',
  )
  if (!confirmedStatusExists) {
    await runAsync(
      database,
      `ALTER TABLE violation_records
        ADD COLUMN confirmed_payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (confirmed_payment_status IN ('unpaid', 'paid'))`,
    )
  }

  const advanceDueDateExists = await columnExists(database, 'violation_records', 'advance_due_date')
  if (!advanceDueDateExists) {
    await runAsync(database, `ALTER TABLE violation_records ADD COLUMN advance_due_date TEXT`)
    await runAsync(
      database,
      `UPDATE violation_records
        SET advance_due_date = date(created_at, 'localtime', 'start of month', '+2 month', '-1 day')
        WHERE advance_due_date IS NULL`,
    )
  }

  const confirmedDueDateExists = await columnExists(database, 'violation_records', 'confirmed_due_date')
  if (!confirmedDueDateExists) {
    await runAsync(database, `ALTER TABLE violation_records ADD COLUMN confirmed_due_date TEXT`)
  }
}

async function normalizeViolationRecordDueDates(database: sqlite3.Database) {
  await runAsync(
    database,
    `UPDATE violation_records
      SET advance_due_date = COALESCE(
        (
          SELECT date(COALESCE(cd.updated_at, cd.created_at), 'localtime', 'start of month', '+2 month', '-1 day')
          FROM case_documents cd
          WHERE cd.violation_record_id = violation_records.id
            AND cd.document_type = 'pre_notice'
            AND cd.file_path IS NOT NULL
            AND LENGTH(cd.file_path) > 0
          ORDER BY COALESCE(cd.updated_at, cd.created_at) DESC
          LIMIT 1
        ),
        date(created_at, 'localtime', 'start of month', '+2 month', '-1 day')
      )`,
  )

  await runAsync(
    database,
    `UPDATE violation_records
      SET confirmed_due_date = (
        SELECT date(COALESCE(cd.updated_at, cd.created_at), 'localtime', 'start of month', '+2 month', '-1 day')
        FROM case_documents cd
        WHERE cd.violation_record_id = violation_records.id
          AND cd.document_type = 'final_notice'
          AND cd.file_path IS NOT NULL
          AND LENGTH(cd.file_path) > 0
        ORDER BY COALESCE(cd.updated_at, cd.created_at) DESC
        LIMIT 1
      )`,
  )
}

async function ensureAlertsSchema(database: sqlite3.Database) {
  const row = await getAsync<{ sql: string }>(
    database,
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'alerts'`,
  )

  if (
    row?.sql?.includes('alert_type TEXT') &&
    row.sql.includes('target_page TEXT') &&
    !row.sql.includes('violation_record_id INTEGER NOT NULL UNIQUE')
  ) {
    return
  }

  if (!(await tableExists(database, 'alerts'))) {
    return
  }

  await runAsync(database, 'BEGIN TRANSACTION')
  try {
    await runAsync(database, 'ALTER TABLE alerts RENAME TO alerts_legacy')
    await runAsync(
      database,
      `CREATE TABLE alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        violation_record_id INTEGER UNIQUE,
        alert_type TEXT NOT NULL DEFAULT 'violation' CHECK (alert_type IN ('violation', 'generation')),
        target_page TEXT NOT NULL DEFAULT 'payer-detail' CHECK (target_page IN ('payer-detail', 'history')),
        status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        read_at TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        FOREIGN KEY (violation_record_id) REFERENCES violation_records(id) ON DELETE CASCADE
      )`,
    )
    await runAsync(
      database,
      `INSERT INTO alerts (
        id,
        violation_record_id,
        alert_type,
        target_page,
        status,
        title,
        description,
        occurred_at,
        read_at,
        deleted_at,
        created_at,
        updated_at
      )
      SELECT
        id,
        violation_record_id,
        'violation',
        'payer-detail',
        status,
        title,
        description,
        occurred_at,
        read_at,
        deleted_at,
        created_at,
        updated_at
      FROM alerts_legacy`,
    )
    await runAsync(database, 'DROP TABLE alerts_legacy')
    await runAsync(
      database,
      `CREATE INDEX IF NOT EXISTS idx_alerts_violation_record_id
        ON alerts (violation_record_id)`,
    )
    await runAsync(database, 'COMMIT')
  } catch (error) {
    await runAsync(database, 'ROLLBACK')
    throw error
  }
}

async function migrateLegacyUserProfile(database: sqlite3.Database) {
  if (!(await tableExists(database, 'user_profile'))) return

  await runAsync(
    database,
    `INSERT INTO users (
      id,
      name,
      department,
      email,
      phone,
      fax,
      zip_code,
      base_address,
      detail_address
    )
    SELECT
      COALESCE(id, 1),
      COALESCE(name, ''),
      COALESCE(department, ''),
      COALESCE(email, ''),
      COALESCE(phone, ''),
      fax,
      COALESCE(zip_code, ''),
      COALESCE(base_address, ''),
      COALESCE(detail_address, '')
    FROM user_profile
    WHERE id = 1
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      department = excluded.department,
      email = excluded.email,
      phone = excluded.phone,
      fax = excluded.fax,
      zip_code = excluded.zip_code,
      base_address = excluded.base_address,
      detail_address = excluded.detail_address`,
  )
}

async function migrateLegacyPdfHistory(database: sqlite3.Database) {
  if (!(await tableExists(database, 'pdf_history'))) return

  await runAsync(
    database,
    `INSERT OR IGNORE INTO violation_records (
      id,
      row_index,
      affiliation,
      driver_name,
      birth_date,
      phone,
      pass_time,
      pass_location,
      direction,
      lane,
      region_reg_no,
      vehicle_type,
      speed,
      drive_type,
      party_address,
      party_email,
      advance_due_date,
      confirmed_due_date,
      created_at,
      updated_at,
      user_id
    )
    SELECT
      id,
      row_index,
      COALESCE(affiliation, ''),
      COALESCE(driver_name, ''),
      birth_date,
      phone,
      COALESCE(pass_time, ''),
      COALESCE(pass_location, ''),
      direction,
      lane,
      COALESCE(region_reg_no, COALESCE(doc_no, '')),
      COALESCE(vehicle_type, ''),
      COALESCE(speed, ''),
      drive_type,
      party_address,
      party_email,
      date(COALESCE(created_at, datetime('now')), '+10 day'),
      date(COALESCE(created_at, datetime('now')), '+20 day'),
      COALESCE(created_at, datetime('now')),
      updated_at,
      1
    FROM pdf_history`,
  )

  await runAsync(
    database,
    `INSERT OR IGNORE INTO case_documents (
      id,
      document_type,
      file_path,
      created_at,
      updated_at,
      violation_record_id
    )
    SELECT
      id,
      CASE
        WHEN file_path LIKE '%운전업무정지%' THEN 'suspension'
        WHEN file_path LIKE '%확정통지서%' THEN 'final_notice'
        ELSE 'pre_notice'
      END,
      file_path,
      COALESCE(created_at, datetime('now')),
      updated_at,
      id
    FROM pdf_history
    WHERE file_path IS NOT NULL AND LENGTH(file_path) > 0`,
  )
}

export async function initDatabase(userDataPath: string) {
  if (db) return db

  const dbPath = path.join(userDataPath, 'notice-generator.db')
  db = new sqlite3.Database(dbPath)
  const database = db

  await createSchema(database)
  await ensureCaseDocumentOpinionType(database)
  await ensureViolationRecordColumns(database)
  await ensureAlertsSchema(database)
  await repairBrokenAlerts(database)
  await normalizeViolationRecordDueDates(database)
  await migrateLegacyUserProfile(database)
  await ensurePrimaryUserRow()
  await migrateLegacyPdfHistory(database)
  await normalizeViolationRecordDueDates(database)

  return database
}

type AlertSyncSourceRow = {
  violationRecordId: number
  affiliation: string | null
  driverName: string | null
  advanceDueDate: string | null
  occurredAt: string
}

type DbAlertRow = {
  id: number
  violationRecordId: number | null
  alertType: AlertType
  targetPage: AlertTargetPage
  status: AlertStatus
  title: string
  description: string
  occurredAt: string
  readAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string | null
}

type GenerationAlertInput = {
  title: string
  description: string
  occurredAt?: string | null
}

function buildAlertTitle(row: AlertSyncSourceRow) {
  const affiliation = normalizeOptionalString(row.affiliation) ?? '소속 미기재'
  const driverName = normalizeOptionalString(row.driverName) ?? '대상자'
  const advanceDueDate = normalizeOptionalString(row.advanceDueDate) ?? '-'
  return `${affiliation}의 ${driverName}님이 사전납부 일자(${advanceDueDate})까지 납부하지 않아 확정통지서가 발급되었습니다.`
}

function buildAlertDescription(row: AlertSyncSourceRow) {
  return `확정통지서 생성일자 ${row.occurredAt}`
}

function repairAlertText(value: string) {
  return value
    .replaceAll('?앹꽦 ?대젰 ?섏씠吏?먯꽌 寃곌낵瑜??뺤씤?????덉뒿?덈떎.', '생성 이력 페이지에서 결과를 확인할 수 있습니다.')
    .replaceAll('?뺤젙?듭????앹꽦?쇱옄 ', '확정통지서 생성일자 ')
    .replaceAll('?뚯냽 誘멸린??', '소속 미기재')
    .replaceAll('??곸옄', '대상자')
}

async function repairBrokenAlerts(database: sqlite3.Database) {
  const rows = await allAsync<Pick<AlertRow, 'id' | 'title' | 'description'>>(
    database,
    `SELECT id, title, description FROM alerts`,
  )
  const timestamp = new Date().toISOString()

  for (const row of rows) {
    const nextTitle = repairAlertText(row.title)
    const nextDescription = repairAlertText(row.description)
    if (nextTitle === row.title && nextDescription === row.description) continue

    await runAsync(
      database,
      `UPDATE alerts
          SET title = ?,
              description = ?,
              updated_at = ?
        WHERE id = ?`,
      [nextTitle, nextDescription, timestamp, row.id],
    )
  }
}

export async function createGenerationAlert(input: GenerationAlertInput) {
  const database = getDb()
  const timestamp = input.occurredAt ?? new Date().toISOString()
  await runAsync(
    database,
    `INSERT INTO alerts (
      violation_record_id,
      alert_type,
      target_page,
      status,
      title,
      description,
      occurred_at,
      created_at,
      updated_at
    ) VALUES (NULL, 'generation', 'history', 'unread', ?, ?, ?, ?, ?)`,
    [input.title, input.description, timestamp, timestamp, timestamp],
  )
}

async function syncAlerts(database = getDb()) {
  const rows = await allAsync<AlertSyncSourceRow>(
    database,
    `SELECT
      vr.id as violationRecordId,
      vr.affiliation as affiliation,
      vr.driver_name as driverName,
      vr.advance_due_date as advanceDueDate,
      COALESCE(cd.updated_at, cd.created_at, vr.updated_at, vr.created_at) as occurredAt
    FROM violation_records vr
    INNER JOIN case_documents cd
      ON cd.violation_record_id = vr.id
    WHERE cd.document_type = 'final_notice'
      AND cd.file_path IS NOT NULL
      AND LENGTH(cd.file_path) > 0`,
  )

  const timestamp = new Date().toISOString()

  await runAsync(database, 'BEGIN TRANSACTION')
  try {
    for (const row of rows) {
      await runAsync(
        database,
        `INSERT INTO alerts (
          violation_record_id,
          alert_type,
          target_page,
          status,
          title,
          description,
          occurred_at,
          created_at,
          updated_at
        ) VALUES (?, 'violation', 'payer-detail', 'unread', ?, ?, ?, ?, ?)
        ON CONFLICT(violation_record_id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          occurred_at = excluded.occurred_at,
          updated_at = excluded.updated_at`,
        [
          row.violationRecordId,
          buildAlertTitle(row),
          buildAlertDescription(row),
          row.occurredAt,
          timestamp,
          timestamp,
        ],
      )
    }
    await runAsync(database, 'COMMIT')
  } catch (error) {
    await runAsync(database, 'ROLLBACK')
    throw error
  }
}

async function ensureAlertsSynced(database = getDb()) {
  if (!alertsSyncInFlight) {
    alertsSyncInFlight = syncAlerts(database).finally(() => {
      alertsSyncInFlight = null
    })
  }

  return alertsSyncInFlight
}

export async function listAlerts(): Promise<AlertRow[]> {
  const database = getDb()
  await ensureAlertsSynced(database)

  const rows = await allAsync<DbAlertRow>(
    database,
    `SELECT DISTINCT
      a.id as id,
      a.violation_record_id as violationRecordId,
      a.alert_type as alertType,
      a.target_page as targetPage,
      a.status as status,
      a.title as title,
      a.description as description,
      a.occurred_at as occurredAt,
      a.read_at as readAt,
      a.deleted_at as deletedAt,
      a.created_at as createdAt,
      a.updated_at as updatedAt
    FROM alerts a
    WHERE a.deleted_at IS NULL
      AND (
        a.alert_type = 'generation'
        OR EXISTS (
          SELECT 1
          FROM case_documents cd
          WHERE cd.violation_record_id = a.violation_record_id
            AND cd.document_type = 'final_notice'
            AND cd.file_path IS NOT NULL
            AND LENGTH(cd.file_path) > 0
        )
      )
    ORDER BY a.occurred_at DESC, a.created_at DESC`,
  )

  return rows
}

export async function getUnreadAlertCount() {
  const database = getDb()
  await ensureAlertsSynced(database)

  const row = await getAsync<{ count: number }>(
    database,
    `SELECT COUNT(DISTINCT a.id) as count
    FROM alerts a
    WHERE a.deleted_at IS NULL
      AND (
        a.alert_type = 'generation'
        OR EXISTS (
          SELECT 1
          FROM case_documents cd
          WHERE cd.violation_record_id = a.violation_record_id
            AND cd.document_type = 'final_notice'
            AND cd.file_path IS NOT NULL
            AND LENGTH(cd.file_path) > 0
        )
      )
      AND a.status = 'unread'`,
  )

  return row?.count ?? 0
}

export async function markAlertAsRead(id: number) {
  const database = getDb()
  await runAsync(
    database,
    `UPDATE alerts
      SET status = 'read',
          read_at = COALESCE(read_at, ?),
          updated_at = ?
      WHERE id = ?`,
    [new Date().toISOString(), new Date().toISOString(), id],
  )
}

export async function markAlertAsUnread(id: number) {
  const database = getDb()
  await runAsync(
    database,
    `UPDATE alerts
      SET status = 'unread',
          read_at = NULL,
          updated_at = ?
      WHERE id = ?`,
    [new Date().toISOString(), id],
  )
}

export async function deleteAlert(id: number) {
  const database = getDb()
  const timestamp = new Date().toISOString()
  await runAsync(
    database,
    `UPDATE alerts
      SET deleted_at = ?,
          updated_at = ?
      WHERE id = ?`,
    [timestamp, timestamp, id],
  )
}

export async function deleteAlerts(ids: number[]) {
  const database = getDb()
  if (!ids.length) return
  const placeholders = ids.map(() => '?').join(', ')
  const timestamp = new Date().toISOString()
  await runAsync(
    database,
    `UPDATE alerts
      SET deleted_at = ?,
          updated_at = ?
      WHERE id IN (${placeholders})`,
    [timestamp, timestamp, ...ids],
  )
}

export async function addPdfHistory(entry: HistoryEntryInput) {
  const [id] = await addPdfHistoryBulk([entry])
  if (!id) throw new Error('Failed to save case document')
  return id
}

export async function addPdfHistoryBulk(entries: HistoryEntryInput[]) {
  const database = getDb()
  if (!entries.length) return []

  await ensurePrimaryUserRow()

  const groupedEntries = new Map<
    string,
    {
      record: HistoryEntryInput
      documents: Map<CaseDocumentType, HistoryEntryInput>
    }
  >()

  entries.forEach((entry) => {
    const key = buildViolationKey(entry)
    const documentType = toCaseDocumentType(entry.filePath)
    const existing = groupedEntries.get(key)
    if (existing) {
      existing.documents.set(documentType, entry)
      return
    }
    groupedEntries.set(key, {
      record: entry,
      documents: new Map([[documentType, entry]]),
    })
  })

  const insertedIds: number[] = []

  await runAsync(database, 'BEGIN TRANSACTION')
  try {
    for (const group of groupedEntries.values()) {
      const baseTimestamp = group.record.createdAt ?? new Date().toISOString()
      const baseUpdatedAt = group.record.updatedAt ?? null
      const finalNoticeDocument = group.documents.get('final_notice')
      const confirmedDueDateBase = finalNoticeDocument?.updatedAt ?? finalNoticeDocument?.createdAt ?? baseTimestamp

      const recordInsert = await runAsync(
        database,
        `INSERT INTO violation_records (
          row_index,
          affiliation,
          driver_name,
          birth_date,
          phone,
          pass_time,
          pass_location,
          direction,
          lane,
          region_reg_no,
          vehicle_type,
          speed,
          drive_type,
          party_address,
          party_email,
          payment_type,
          advance_payment_status,
          confirmed_payment_status,
          advance_due_date,
          confirmed_due_date,
          created_at,
          updated_at,
          user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          group.record.rowIndex ?? null,
          normalizeOptionalString(group.record.affiliation) ?? '',
          normalizeOptionalString(group.record.driverName) ?? '',
          normalizeOptionalString(group.record.birthDate),
          normalizeOptionalString(group.record.phone),
          normalizeOptionalString(group.record.passTime) ?? '',
          normalizeOptionalString(group.record.passLocation) ?? '',
          normalizeOptionalString(group.record.direction),
          normalizeOptionalString(group.record.lane),
          normalizeOptionalString(group.record.regionRegNo ?? group.record.docNo) ?? '',
          normalizeOptionalString(group.record.vehicleType) ?? '',
          normalizeOptionalString(group.record.speed) ?? '',
          normalizeOptionalString(group.record.driveType),
          normalizeOptionalString(group.record.partyAddress),
          normalizeOptionalString(group.record.partyEmail),
          normalizePaymentType(group.record.paymentType),
          normalizePaymentStatus(group.record.advancePaymentStatus),
          normalizePaymentStatus(group.record.confirmedPaymentStatus),
          normalizeOptionalString(group.record.advanceDueDate) ?? getDefaultAdvanceDueDate(baseTimestamp),
          normalizeOptionalString(group.record.confirmedDueDate) ??
            (finalNoticeDocument ? getDefaultConfirmedDueDate(confirmedDueDateBase) : null),
          baseTimestamp,
          baseUpdatedAt,
          PRIMARY_USER_ID,
        ],
      )

      for (const [documentType, document] of group.documents.entries()) {
        const documentInsert = await runAsync(
          database,
          `INSERT INTO case_documents (
            document_type,
            file_path,
            created_at,
            updated_at,
            violation_record_id
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            documentType,
            document.filePath,
            document.createdAt ?? baseTimestamp,
            document.updatedAt ?? baseUpdatedAt,
            recordInsert.lastID,
          ],
        )
        insertedIds.push(documentInsert.lastID)
      }
    }

    await runAsync(database, 'COMMIT')
    return insertedIds
  } catch (error) {
    await runAsync(database, 'ROLLBACK')
    throw error
  }
}

type DbHistoryRow = Omit<ViolationDocumentRecord, 'exists'>

function enrichHistoryRows(rows: DbHistoryRow[]) {
  return rows.map((row) => ({
    ...row,
    exists: fs.existsSync(row.filePath),
  }))
}

export async function listPdfHistory(limit?: number): Promise<PdfHistoryRow[]> {
  const database = getDb()
  const limitClause = typeof limit === 'number' && limit > 0 ? 'LIMIT ?' : ''
  const params = typeof limit === 'number' && limit > 0 ? [limit] : []
  const rows = await allAsync<DbHistoryRow>(
    database,
    `SELECT
      cd.id as id,
      cd.violation_record_id as violationRecordId,
      cd.document_type as documentType,
      cd.file_path as filePath,
      vr.row_index as rowIndex,
      vr.region_reg_no as docNo,
      vr.affiliation as affiliation,
      vr.driver_name as driverName,
      vr.birth_date as birthDate,
      vr.phone as phone,
      vr.pass_time as passTime,
      vr.pass_location as passLocation,
      vr.direction as direction,
      vr.lane as lane,
      vr.region_reg_no as regionRegNo,
      vr.vehicle_type as vehicleType,
      vr.speed as speed,
      vr.drive_type as driveType,
      vr.party_address as partyAddress,
      vr.party_email as partyEmail,
      vr.payment_type as paymentType,
      vr.advance_payment_status as advancePaymentStatus,
      vr.confirmed_payment_status as confirmedPaymentStatus,
      vr.advance_due_date as advanceDueDate,
      vr.confirmed_due_date as confirmedDueDate,
      vr.updated_at as violationUpdatedAt,
      vr.created_at as violationCreatedAt,
      COALESCE(cd.updated_at, vr.updated_at) as updatedAt,
      COALESCE(cd.created_at, vr.created_at) as createdAt
    FROM case_documents cd
    INNER JOIN violation_records vr
      ON vr.id = cd.violation_record_id
    ORDER BY COALESCE(cd.updated_at, vr.updated_at, cd.created_at, vr.created_at) DESC
    ${limitClause}`,
    params,
  )
  return enrichHistoryRows(rows)
}

export async function getPdfHistoryById(id: number): Promise<PdfHistoryRow | null> {
  const database = getDb()
  const row = await getAsync<DbHistoryRow>(
    database,
    `SELECT
      cd.id as id,
      cd.violation_record_id as violationRecordId,
      cd.document_type as documentType,
      cd.file_path as filePath,
      vr.row_index as rowIndex,
      vr.region_reg_no as docNo,
      vr.affiliation as affiliation,
      vr.driver_name as driverName,
      vr.birth_date as birthDate,
      vr.phone as phone,
      vr.pass_time as passTime,
      vr.pass_location as passLocation,
      vr.direction as direction,
      vr.lane as lane,
      vr.region_reg_no as regionRegNo,
      vr.vehicle_type as vehicleType,
      vr.speed as speed,
      vr.drive_type as driveType,
      vr.party_address as partyAddress,
      vr.party_email as partyEmail,
      vr.payment_type as paymentType,
      vr.advance_payment_status as advancePaymentStatus,
      vr.confirmed_payment_status as confirmedPaymentStatus,
      vr.advance_due_date as advanceDueDate,
      vr.confirmed_due_date as confirmedDueDate,
      vr.updated_at as violationUpdatedAt,
      vr.created_at as violationCreatedAt,
      COALESCE(cd.updated_at, vr.updated_at) as updatedAt,
      COALESCE(cd.created_at, vr.created_at) as createdAt
    FROM case_documents cd
    INNER JOIN violation_records vr
      ON vr.id = cd.violation_record_id
    WHERE cd.id = ?`,
    [id],
  )

  if (!row) return null
  return enrichHistoryRows([row])[0]
}

export async function getLatestPdfHistoryByViolationRecordId(
  violationRecordId: number,
): Promise<PdfHistoryRow | null> {
  const database = getDb()
  const row = await getAsync<DbHistoryRow>(
    database,
    `SELECT
      cd.id as id,
      cd.violation_record_id as violationRecordId,
      cd.document_type as documentType,
      cd.file_path as filePath,
      vr.row_index as rowIndex,
      vr.region_reg_no as docNo,
      vr.affiliation as affiliation,
      vr.driver_name as driverName,
      vr.birth_date as birthDate,
      vr.phone as phone,
      vr.pass_time as passTime,
      vr.pass_location as passLocation,
      vr.direction as direction,
      vr.lane as lane,
      vr.region_reg_no as regionRegNo,
      vr.vehicle_type as vehicleType,
      vr.speed as speed,
      vr.drive_type as driveType,
      vr.party_address as partyAddress,
      vr.party_email as partyEmail,
      vr.payment_type as paymentType,
      vr.advance_payment_status as advancePaymentStatus,
      vr.confirmed_payment_status as confirmedPaymentStatus,
      vr.advance_due_date as advanceDueDate,
      vr.confirmed_due_date as confirmedDueDate,
      vr.updated_at as violationUpdatedAt,
      vr.created_at as violationCreatedAt,
      COALESCE(cd.updated_at, vr.updated_at) as updatedAt,
      COALESCE(cd.created_at, vr.created_at) as createdAt
    FROM case_documents cd
    INNER JOIN violation_records vr
      ON vr.id = cd.violation_record_id
    WHERE cd.violation_record_id = ?
    ORDER BY COALESCE(cd.updated_at, vr.updated_at, cd.created_at, vr.created_at) DESC
    LIMIT 1`,
    [violationRecordId],
  )

  if (!row) return null
  return enrichHistoryRows([row])[0]
}

const VIOLATION_COLUMN_MAP: Partial<Record<keyof HistoryUpdateInput, string>> = {
  rowIndex: 'row_index',
  affiliation: 'affiliation',
  driverName: 'driver_name',
  birthDate: 'birth_date',
  phone: 'phone',
  passTime: 'pass_time',
  passLocation: 'pass_location',
  direction: 'direction',
  lane: 'lane',
  regionRegNo: 'region_reg_no',
  vehicleType: 'vehicle_type',
  speed: 'speed',
  driveType: 'drive_type',
  partyAddress: 'party_address',
  partyEmail: 'party_email',
  paymentType: 'payment_type',
  advancePaymentStatus: 'advance_payment_status',
  confirmedPaymentStatus: 'confirmed_payment_status',
  advanceDueDate: 'advance_due_date',
  confirmedDueDate: 'confirmed_due_date',
  updatedAt: 'updated_at',
}

const CASE_DOCUMENT_COLUMN_MAP: Partial<Record<keyof HistoryUpdateInput, string>> = {
  filePath: 'file_path',
  updatedAt: 'updated_at',
}

export async function updatePdfHistory(id: number, fields: HistoryUpdateInput) {
  const database = getDb()
  const document = await getAsync<{ violationRecordId: number }>(
    database,
    `SELECT violation_record_id as violationRecordId
      FROM case_documents
      WHERE id = ?`,
    [id],
  )
  if (!document) throw new Error('기록을 찾을 수 없습니다.')

  const violationUpdates = Object.entries(fields).filter(
    (entry): entry is [keyof HistoryUpdateInput, HistoryUpdateInput[keyof HistoryUpdateInput]] =>
      entry[1] !== undefined && entry[0] in VIOLATION_COLUMN_MAP,
  )
  const caseDocumentUpdates = Object.entries(fields).filter(
    (entry): entry is [keyof HistoryUpdateInput, HistoryUpdateInput[keyof HistoryUpdateInput]] =>
      entry[1] !== undefined && entry[0] in CASE_DOCUMENT_COLUMN_MAP,
  )

  await runAsync(database, 'BEGIN TRANSACTION')
  try {
    if (violationUpdates.length) {
      const clauses = violationUpdates.map(([key]) => `${VIOLATION_COLUMN_MAP[key]} = ?`).join(', ')
      const params = violationUpdates.map(([key, value]) => {
        if (key === 'rowIndex') return value ?? null
        if (key === 'updatedAt') return value ?? null
        if (key === 'paymentType') return normalizePaymentType(value as string | null)
        if (key === 'advancePaymentStatus' || key === 'confirmedPaymentStatus') {
          return normalizePaymentStatus(value as string | null)
        }
        return normalizeOptionalString(value as string | null)
      })
      await runAsync(
        database,
        `UPDATE violation_records SET ${clauses} WHERE id = ?`,
        [...params, document.violationRecordId],
      )
    }

    if (caseDocumentUpdates.length) {
      const clauses = caseDocumentUpdates.map(([key]) => `${CASE_DOCUMENT_COLUMN_MAP[key]} = ?`).join(', ')
      const params = caseDocumentUpdates.map(([key, value]) => {
        if (key === 'updatedAt') return value ?? null
        if (key === 'filePath') return value ?? null
        return value ?? null
      })
      await runAsync(
        database,
        `UPDATE case_documents SET ${clauses} WHERE id = ?`,
        [...params, id],
      )
    }

    await runAsync(database, 'COMMIT')
  } catch (error) {
    await runAsync(database, 'ROLLBACK')
    throw error
  }
}

export async function upsertCaseDocument(
  violationRecordId: number,
  documentType: CaseDocumentType,
  filePath: string,
) {
  const database = getDb()
  const normalizedType = normalizeCaseDocumentType(documentType)
  const timestamp = new Date().toISOString()

  await runAsync(
    database,
    `INSERT INTO case_documents (
      document_type,
      file_path,
      created_at,
      updated_at,
      violation_record_id
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(violation_record_id, document_type) DO UPDATE SET
      file_path = excluded.file_path,
      updated_at = excluded.updated_at`,
    [normalizedType, filePath, timestamp, timestamp, violationRecordId],
  )

  const row = await getAsync<{ id: number }>(
    database,
    `SELECT id
      FROM case_documents
      WHERE violation_record_id = ? AND document_type = ?`,
    [violationRecordId, normalizedType],
  )

  if (!row) {
    throw new Error('문서 정보를 저장하지 못했습니다.')
  }

  if (normalizedType === 'pre_notice') {
    await runAsync(
      database,
      `UPDATE violation_records
        SET advance_due_date = ?,
            updated_at = ?
        WHERE id = ?`,
      [getDefaultAdvanceDueDate(timestamp), timestamp, violationRecordId],
    )
  }

  if (normalizedType === 'final_notice') {
    await runAsync(
      database,
      `UPDATE violation_records
        SET confirmed_due_date = ?,
            updated_at = ?
        WHERE id = ?`,
      [getDefaultConfirmedDueDate(timestamp), timestamp, violationRecordId],
    )
  }

  return row.id
}

export async function deletePdfHistory(ids: number[]) {
  const database = getDb()
  if (!ids.length) return

  const placeholders = ids.map(() => '?').join(', ')
  const rows = await allAsync<{ violationRecordId: number }>(
    database,
    `SELECT DISTINCT violation_record_id as violationRecordId
      FROM case_documents
      WHERE id IN (${placeholders})`,
    ids,
  )

  await runAsync(database, 'BEGIN TRANSACTION')
  try {
    await runAsync(database, `DELETE FROM case_documents WHERE id IN (${placeholders})`, ids)

    for (const row of rows) {
      await runAsync(
        database,
        `UPDATE violation_records
          SET advance_due_date = COALESCE(
                (
                  SELECT date(COALESCE(cd.updated_at, cd.created_at), 'localtime', 'start of month', '+2 month', '-1 day')
                  FROM case_documents cd
                  WHERE cd.violation_record_id = violation_records.id
                    AND cd.document_type = 'pre_notice'
                    AND cd.file_path IS NOT NULL
                    AND LENGTH(cd.file_path) > 0
                  ORDER BY COALESCE(cd.updated_at, cd.created_at) DESC
                  LIMIT 1
                ),
                date(created_at, 'localtime', 'start of month', '+2 month', '-1 day')
              ),
              confirmed_due_date = (
                SELECT date(COALESCE(cd.updated_at, cd.created_at), 'localtime', 'start of month', '+2 month', '-1 day')
                FROM case_documents cd
                WHERE cd.violation_record_id = violation_records.id
                  AND cd.document_type = 'final_notice'
                  AND cd.file_path IS NOT NULL
                  AND LENGTH(cd.file_path) > 0
                ORDER BY COALESCE(cd.updated_at, cd.created_at) DESC
                LIMIT 1
              )
          WHERE id = ?`,
        [row.violationRecordId],
      )

      await runAsync(
        database,
        `DELETE FROM violation_records
          WHERE id = ?
            AND NOT EXISTS (
              SELECT 1
              FROM case_documents
              WHERE violation_record_id = violation_records.id
            )`,
        [row.violationRecordId],
      )
    }

    await runAsync(database, 'COMMIT')
  } catch (error) {
    await runAsync(database, 'ROLLBACK')
    throw error
  }
}

function isBlankProfile(row: UserProfileRow) {
  return Object.values(row).every((value) => value.trim().length === 0)
}

export async function getUserProfile(): Promise<UserProfileRow | null> {
  const database = getDb()
  const row = await getAsync<UserProfileRow>(
    database,
    `SELECT
      name,
      department,
      email,
      phone,
      COALESCE(fax, '') as fax,
      zip_code as zipCode,
      base_address as baseAddress,
      detail_address as detailAddress
    FROM users
    WHERE id = ?`,
    [PRIMARY_USER_ID],
  )

  if (!row) return null
  const normalized = {
    name: row.name ?? '',
    department: row.department ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    fax: row.fax ?? '',
    zipCode: row.zipCode ?? '',
    baseAddress: row.baseAddress ?? '',
    detailAddress: row.detailAddress ?? '',
  }
  return isBlankProfile(normalized) ? null : normalized
}

export async function saveUserProfile(profile: UserProfileRow) {
  const database = getDb()
  const payload = { ...defaultProfile, ...profile }
  await runAsync(
    database,
    `INSERT INTO users (
      id,
      name,
      department,
      email,
      phone,
      fax,
      zip_code,
      base_address,
      detail_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      department = excluded.department,
      email = excluded.email,
      phone = excluded.phone,
      fax = excluded.fax,
      zip_code = excluded.zip_code,
      base_address = excluded.base_address,
      detail_address = excluded.detail_address`,
    [
      PRIMARY_USER_ID,
      payload.name,
      payload.department,
      payload.email,
      payload.phone,
      payload.fax || null,
      payload.zipCode,
      payload.baseAddress,
      payload.detailAddress,
    ],
  )
}

export async function getSettingValue(key: string): Promise<string | null> {
  const database = getDb()
  const row = await getAsync<{ value: string | null }>(
    database,
    `SELECT value FROM app_settings WHERE key = ?`,
    [key],
  )
  return row?.value ?? null
}

export async function setSettingValue(key: string, value: string) {
  const database = getDb()
  await runAsync(
    database,
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  )
}

export function getDefaultOutputDir() {
  return getSettingValue('defaultOutputDir')
}

export function setDefaultOutputDir(outputPath: string) {
  return setSettingValue('defaultOutputDir', outputPath)
}

export function getQuickMenuSettings() {
  return getSettingValue('quickMenuSettings')
}

export function setQuickMenuSettings(value: string) {
  return setSettingValue('quickMenuSettings', value)
}

export async function clearUserProfile() {
  const database = getDb()
  await runAsync(database, `DELETE FROM users`)
}

export async function clearPdfHistory() {
  const database = getDb()
  await runAsync(database, 'BEGIN TRANSACTION')
  try {
    await runAsync(database, `DELETE FROM case_documents`)
    await runAsync(database, `DELETE FROM violation_records`)
    await runAsync(database, 'COMMIT')
  } catch (error) {
    await runAsync(database, 'ROLLBACK')
    throw error
  }
}

export async function clearAppSettings() {
  const database = getDb()
  await runAsync(database, `DELETE FROM app_settings`)
}

export function closeDatabase() {
  if (!db) return
  db.close()
  db = null
}
