import type { ExcelPreviewRow } from '../types/ipc'

export const FIELD_LABELS = [
  { key: 'affiliation', label: '소속' },
  { key: 'driverName', label: '운전자' },
  { key: 'passTime', label: '통행시간' },
  { key: 'passLocation', label: '통행 장소' },
  { key: 'regionRegNo', label: '이동지역 등록번호' },
  { key: 'vehicleType', label: '차종' },
  { key: 'speed', label: '속도' },
  { key: 'partyAddress', label: '당사자 주소' },
  { key: 'partyEmail', label: '메일주소' },
] as const satisfies ReadonlyArray<{ key: keyof ExcelPreviewRow; label: string }>

export const stripParentheses = (value: string) => value.replace(/\s*[(（].*$/, '').trim()
