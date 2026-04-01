const XLSX = require('xlsx');
const path = require('path');
const workbook = XLSX.readFile(path.join(process.cwd(), 'sample.xlsx'), { cellDates: true });
const ws = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
const EXCEL_FIELD_KEYS = { affiliation: ['\uC18C\uC18D'], passTime: ['\uD1B5\uD589\uC2DC\uAC04'] };
function normalize(name) {
  return String(name ?? '')
    .replace(/(?:\(|\uFF08).*?(?:\)|\uFF09)/g, '')
    .replace(/[\s\u00A0]+/g, '')
    .trim()
    .toLowerCase();
}
function findFieldValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  const normalizedTargets = new Set(keys.map(normalize));
  for (const [rawKey, rawValue] of Object.entries(row)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    const normalizedKey = normalize(rawKey);
    if (normalizedTargets.has(normalizedKey)) return rawValue;
  }
}
for (const row of rows) {
  console.log('affiliation', findFieldValue(row, EXCEL_FIELD_KEYS.affiliation));
  console.log('passTime', findFieldValue(row, EXCEL_FIELD_KEYS.passTime));
}
