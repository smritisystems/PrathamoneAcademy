/**
 * @file        reportExport.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-12
 *
 * @description Universal client-side export utility supporting Excel (.xlsx), CSV (.csv), and JSON (.json) with formula injection protection.
 */

import writeXlsxFile, { type Row as ExcelRow } from 'write-excel-file/browser'
import { PRINT_SHARE_BRANDING } from '../config/branding'

export interface ExportColumn<T = any> {
  id: string
  header: string
  accessorKey?: keyof T | string
  accessorFn?: (row: T) => any
  type?: 'text' | 'number' | 'currency' | 'date' | 'select' | 'percentage'
  rawExportValue?: (row: T) => string | number | boolean | null | undefined
}

export interface ExportDataOptions<T = any> {
  filename: string
  title?: string
  sheetName?: string
  columns: ExportColumn<T>[]
  data: T[]
  format: 'xlsx' | 'csv' | 'json'
  calculationNotes?: string[]
}

/**
 * Resolves the raw underlying value for a given row and column definition.
 */
export function getRawCellValue<T>(row: T, col: ExportColumn<T>): any {
  if (col.rawExportValue) {
    return col.rawExportValue(row)
  }
  if (col.accessorFn) {
    return col.accessorFn(row)
  }
  if (col.accessorKey && typeof col.accessorKey === 'string') {
    const keys = col.accessorKey.split('.')
    let val: any = row
    for (const k of keys) {
      if (val === null || val === undefined) return ''
      val = val[k]
    }
    return val
  }
  return (row as any)[col.id] ?? ''
}

/**
 * Escapes values for CSV export and neutralizes spreadsheet formula injection risks.
 */
function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return ''
  let str = String(val)

  // Neutralize formula injection characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  // Quote if contains commas, quotes, or newlines
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Triggers a client-side file download with the given Blob and filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Neutralizes spreadsheet formula injection prefixes on string cell exports.
 */
function sanitizeExcelText(str: string): string {
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
}

/**
 * Exports tabular dataset to Excel (.xlsx) preserving numeric/date types and formatting
 * via write-excel-file (zero-SheetJS, formula-injection hardened).
 */
export function exportToExcel<T>({
  filename,
  sheetName = 'Report',
  columns,
  data,
  calculationNotes,
}: Omit<ExportDataOptions<T>, 'format'>): void {
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`

  // 1. Build Header Row
  const headerRow: ExcelRow = columns.map((c) => ({
    value: sanitizeExcelText(c.header),
    type: String,
    fontWeight: 'bold',
  }))

  // 2. Build Data Rows preserving numeric and boolean types cleanly
  const rawMatrix: Array<Array<string | number | boolean>> = []
  const dataRows: ExcelRow[] = data.map((row) => {
    const rawVals: Array<string | number | boolean> = []
    const excelCells: ExcelRow = columns.map((col) => {
      const raw = getRawCellValue(row, col)
      if (raw === null || raw === undefined || raw === '') {
        rawVals.push('')
        return { value: '', type: String }
      }
      if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage') {
        const num = Number(raw)
        if (!isNaN(num)) {
          rawVals.push(num)
          return { value: num, type: Number }
        }
      }
      if (typeof raw === 'number' && !isNaN(raw)) {
        rawVals.push(raw)
        return { value: raw, type: Number }
      }
      if (typeof raw === 'boolean') {
        rawVals.push(raw)
        return { value: raw, type: Boolean }
      }
      const textVal = sanitizeExcelText(String(raw))
      rawVals.push(textVal)
      return { value: textVal, type: String }
    })
    rawMatrix.push(rawVals)
    return excelCells
  })

  // 3. Assemble worksheet with optional calculation notes and trailing branding row
  const notesRows: ExcelRow[] =
    calculationNotes && calculationNotes.length > 0
      ? [
          [],
          [{ value: '--- CALCULATION PROVENANCE & INSTITUTIONAL BENCHMARKS ---', type: String, fontWeight: 'bold' }],
          ...calculationNotes.map((n): ExcelRow => [{ value: sanitizeExcelText(n), type: String }]),
          [],
        ]
      : []

  const sheetData: ExcelRow[] = [
    headerRow,
    ...dataRows,
    ...notesRows,
    [],
    [{ value: PRINT_SHARE_BRANDING.text, type: String }],
  ]

  // 4. Calculate sensible column widths
  const sheetColumns = columns.map((col, idx) => {
    let maxLen = col.header.length
    for (const r of rawMatrix) {
      const cellStr = String(r[idx] ?? '')
      if (cellStr.length > maxLen) maxLen = cellStr.length
    }
    return { width: Math.min(Math.max(maxLen + 4, 12), 40) }
  })

  // 5. Generate OOXML workbook Blob and download
  void writeXlsxFile(sheetData, {
    sheet: sheetName.substring(0, 31),
    columns: sheetColumns,
  })
    .toBlob()
    .then((blob) => {
      downloadBlob(blob, safeFilename)
    })
}

/**
 * Exports tabular dataset to CSV (.csv) with UTF-8 BOM and RFC-4180 escaping.
 */
export function exportToCsv<T>({
  filename,
  columns,
  data,
  calculationNotes,
}: Omit<ExportDataOptions<T>, 'format'>): void {
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`

  const headerLine = columns.map((c) => sanitizeCsvValue(c.header)).join(',')
  const rowLines = data.map((row) => {
    return columns.map((col) => sanitizeCsvValue(getRawCellValue(row, col))).join(',')
  })

  const notesLines =
    calculationNotes && calculationNotes.length > 0
      ? ['', '# CALCULATION PROVENANCE & INSTITUTIONAL BENCHMARKS', ...calculationNotes.map((n) => `# ${sanitizeCsvValue(n)}`)]
      : []

  const footerLine = sanitizeCsvValue(PRINT_SHARE_BRANDING.text)

  // Prepend UTF-8 BOM so Microsoft Excel handles rupee signs and UTF-8 characters seamlessly
  const csvContent = '\uFEFF' + [headerLine, ...rowLines, ...notesLines, '', footerLine].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, safeFilename)
}

/**
 * Exports tabular dataset to structured JSON (.json).
 */
export function exportToJson<T>({
  filename,
  columns,
  data,
}: Omit<ExportDataOptions<T>, 'format'>): void {
  const safeFilename = filename.endsWith('.json') ? filename : `${filename}.json`

  const jsonObjects = data.map((row) => {
    const obj: Record<string, any> = {}
    for (const col of columns) {
      obj[col.header] = getRawCellValue(row, col)
    }
    return obj
  })

  const jsonString = JSON.stringify(jsonObjects, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
  downloadBlob(blob, safeFilename)
}

/**
 * Unified export dispatcher handling xlsx, csv, and json formats.
 */
export function executeReportExport<T>(options: ExportDataOptions<T>): void {
  switch (options.format) {
    case 'xlsx':
      exportToExcel(options)
      break
    case 'csv':
      exportToCsv(options)
      break
    case 'json':
      exportToJson(options)
      break
  }
}

