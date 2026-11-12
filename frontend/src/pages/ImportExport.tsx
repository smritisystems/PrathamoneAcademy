/**
 * @file        ImportExport.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
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
 * @description Data Import/Export workspace featuring Excel copy-paste spreadsheet grid and file upload.
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  FileSpreadsheet, Table, Upload, Download, CheckCircle2,
  AlertCircle, AlertTriangle, Trash2, Plus, RefreshCw, FileText,
  ChevronDown, Calendar, Filter, ArrowRight, Eye, X, ClipboardCheck,
  Info, ShieldCheck, ArrowDownToLine, Check, HelpCircle
} from 'lucide-react'
import {
  importExportApi, academicYearsApi, boardsApi, standardsApi, divisionsApi
} from '../api/endpoints'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, ContextualHelpButton } from '../components/common'
import { Lock } from 'lucide-react'
import type {
  SupportedEntity, ImportPreviewResponse, ImportPreviewRow,
  ImportHistoryItem, ImportHistoryDetail, AcademicYear, Board,
  Standard, Division, ExportFilterParams
} from '../types'

type ActiveTab = 'paste' | 'upload' | 'export' | 'history'

export default function ImportExportPage() {
  const editScope = 'system:import_export'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const [activeTab, setActiveTab] = useState<ActiveTab>('paste')
  const [entities, setEntities] = useState<SupportedEntity[]>([])
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('students')
  const [mode, setMode] = useState<'create_only' | 'update_existing'>('create_only')
  const [loading, setLoading] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Filter Dropdown state for Cascading Filters (used in Export and Preview)
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [standards, setStandards] = useState<Standard[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [selectedAyId, setSelectedAyId] = useState<number | undefined>(undefined)
  const [selectedBoardId, setSelectedBoardId] = useState<number | undefined>(undefined)
  const [selectedStandardId, setSelectedStandardId] = useState<number | undefined>(undefined)
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | undefined>(undefined)

  // ── Tab 1: Paste from Excel Grid State ─────────────────────────────────────
  const [gridHeaders, setGridHeaders] = useState<string[]>([])
  const [gridRows, setGridRows] = useState<string[][]>([])
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({})
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null)
  const [gridPreview, setGridPreview] = useState<ImportPreviewResponse | null>(null)
  const [gridExecuting, setGridExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any | null>(null)
  const gridContainerRef = useRef<HTMLDivElement>(null)

  // ── Tab 2: File Upload State ──────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<ImportPreviewResponse | null>(null)
  const [fileParsing, setFileParsing] = useState(false)
  const [fileExecuting, setFileExecuting] = useState(false)
  const [fileResult, setFileResult] = useState<any | null>(null)

  // ── Tab 3: Export State ───────────────────────────────────────────────────
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [exportStartDate, setExportStartDate] = useState<string>('')
  const [exportEndDate, setExportEndDate] = useState<string>('')
  const [exportStatus, setExportStatus] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  // ── Tab 4: History State ──────────────────────────────────────────────────
  const [historyList, setHistoryList] = useState<ImportHistoryItem[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyFilterEntity, setHistoryFilterEntity] = useState<string>('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<ImportHistoryDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ── Initial Data Load ─────────────────────────────────────────────────────
  useEffect(() => {
    loadEntities()
    loadAcademicData()
  }, [])

  const loadEntities = async () => {
    try {
      const res = await importExportApi.getEntities()
      setEntities(res.data)
      if (res.data.length > 0 && !res.data.find(e => e.key === selectedEntityKey)) {
        setSelectedEntityKey(res.data[0].key)
      }
    } catch (err: any) {
      console.error('Failed to load supported entities:', err)
    }
  }

  const loadAcademicData = async () => {
    try {
      const [ayRes, bRes, sRes, dRes] = await Promise.all([
        academicYearsApi.list().catch(() => ({ data: [] })),
        boardsApi.list().catch(() => ({ data: [] })),
        standardsApi.list().catch(() => ({ data: [] })),
        divisionsApi.list().catch(() => ({ data: [] })),
      ])
      setAcademicYears(ayRes.data || [])
      setBoards(bRes.data || [])
      setStandards(sRes.data || [])
      setDivisions(dRes.data || [])

      const currentAy = (ayRes.data || []).find((a: AcademicYear) => a.is_current)
      if (currentAy) setSelectedAyId(currentAy.id)
    } catch (err) {
      console.error('Error loading academic filters:', err)
    }
  }

  // Active Entity Object
  const currentEntity = entities.find(e => e.key === selectedEntityKey)

  // Initialize or reset grid on entity change
  useEffect(() => {
    if (currentEntity) {
      initGridForEntity(currentEntity)
    }
  }, [selectedEntityKey])

  const initGridForEntity = (entity: SupportedEntity) => {
    const defaultHeaders = entity.fields.map(f => f.label)
    setGridHeaders(defaultHeaders)
    const newMapping: Record<number, string> = {}
    entity.fields.forEach((f, idx) => {
      newMapping[idx] = f.key
    })
    setColumnMapping(newMapping)
    setGridRows([
      entity.fields.map(() => ''),
      entity.fields.map(() => ''),
      entity.fields.map(() => ''),
    ])
    setGridPreview(null)
    setExecutionResult(null)
  }

  // ── Template Download Handler ─────────────────────────────────────────────
  const handleDownloadTemplate = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      setLoading(true)
      const res = await importExportApi.downloadTemplate(selectedEntityKey, format)
      const blob = new Blob([res.data], {
        type: format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8;'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `template_${selectedEntityKey}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setFeedbackMsg({ type: 'success', text: `Downloaded ${selectedEntityKey} template (${format.toUpperCase()})` })
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Failed to download template: ' + (err.response?.data?.detail || err.message) })
    } finally {
      setLoading(false)
    }
  }

  // ── Load Sample Data into Grid ────────────────────────────────────────────
  const handleLoadSampleData = () => {
    if (!currentEntity) return
    const sampleRow = currentEntity.fields.map(f => f.sample || '')
    const sampleRow2 = currentEntity.fields.map(f => {
      if (f.type === 'date') return '2024-04-15'
      if (f.type === 'int') return '50'
      if (f.type === 'float') return '15000'
      if (f.key.includes('admission')) return f.sample ? f.sample.replace(/\d+$/, '99') : 'SAMPLE-02'
      if (f.key.includes('name')) return 'Sample 2'
      return f.sample || ''
    })
    setGridRows([sampleRow, sampleRow2])
    setGridPreview(null)
    setFeedbackMsg({ type: 'info', text: `Loaded sample data for ${currentEntity.label}. Click 'Validate & Preview' to inspect.` })
  }

  // ── Excel Copy-Paste Parser ───────────────────────────────────────────────
  const handlePasteText = (text: string, startR = 0, startC = 0) => {
    if (!text) return
    const lines = text.split(/\r?\n/).filter(line => line.length > 0)
    if (lines.length === 0) return

    const parsedMatrix = lines.map(line => line.split('\t').map(c => c.trim()))
    const pasteColCount = Math.max(...parsedMatrix.map(r => r.length))

    // Check if the first row is a header row by matching field labels/keys
    let dataStartRow = 0
    let potentialHeaders = parsedMatrix[0]
    let headerMatchCount = 0

    if (currentEntity) {
      potentialHeaders.forEach(h => {
        const clean = h.toLowerCase().replace(/[\s_-]+/g, '')
        const found = currentEntity.fields.some(
          f => f.key.toLowerCase().replace(/[\s_-]+/g, '') === clean ||
               f.label.toLowerCase().replace(/[\s_-]+/g, '') === clean
        )
        if (found) headerMatchCount++
      })
    }

    const isHeaderRow = headerMatchCount >= Math.min(2, potentialHeaders.length)

    // Adjust grid headers and mappings if headers were pasted
    let updatedHeaders = [...gridHeaders]
    let updatedMapping = { ...columnMapping }

    if (isHeaderRow) {
      dataStartRow = 1
      while (updatedHeaders.length < pasteColCount) {
        updatedHeaders.push(`Col ${updatedHeaders.length + 1}`)
      }
      potentialHeaders.forEach((h, colIdx) => {
        updatedHeaders[colIdx] = h
        if (currentEntity) {
          const cleanH = h.toLowerCase().replace(/[\s_-]+/g, '')
          const matchedField = currentEntity.fields.find(
            f => f.key.toLowerCase().replace(/[\s_-]+/g, '') === cleanH ||
                 f.label.toLowerCase().replace(/[\s_-]+/g, '') === cleanH
          )
          if (matchedField) {
            updatedMapping[colIdx] = matchedField.key
          }
        }
      })
      setGridHeaders(updatedHeaders)
      setColumnMapping(updatedMapping)
    }

    const dataMatrix = parsedMatrix.slice(dataStartRow)
    if (dataMatrix.length === 0) return

    // Expand rows and columns to fit pasted data
    const neededRows = Math.max(gridRows.length, startR + dataMatrix.length)
    const neededCols = Math.max(gridHeaders.length, startC + pasteColCount)

    while (updatedHeaders.length < neededCols) {
      const newIdx = updatedHeaders.length
      updatedHeaders.push(`Col ${newIdx + 1}`)
    }
    setGridHeaders(updatedHeaders)

    const newRows: string[][] = []
    for (let r = 0; r < neededRows; r++) {
      const existingRow = gridRows[r] ? [...gridRows[r]] : []
      while (existingRow.length < neededCols) {
        existingRow.push('')
      }
      newRows.push(existingRow)
    }

    // Insert pasted cells
    dataMatrix.forEach((pRow, rOffset) => {
      const targetR = startR + rOffset
      pRow.forEach((val, cOffset) => {
        const targetC = startC + cOffset
        if (targetR < newRows.length && targetC < newRows[targetR].length) {
          newRows[targetR][targetC] = val
        }
      })
    })

    setGridRows(newRows)
    setGridPreview(null)
    setFeedbackMsg({
      type: 'success',
      text: `Pasted ${dataMatrix.length} rows and ${pasteColCount} columns directly from Excel/Sheets.`,
    })
  }

  // Handle clipboard event on grid
  const handleGridPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    const startR = activeCell ? activeCell.r : 0
    const startC = activeCell ? activeCell.c : 0
    handlePasteText(text, startR, startC)
  }

  const handlePasteFromClipboardButton = async () => {
    try {
      const text = await navigator.clipboard.readText()
      handlePasteText(text, 0, 0)
    } catch (err) {
      setFeedbackMsg({
        type: 'info',
        text: 'Press Ctrl+V (or Cmd+V on Mac) while clicking any cell in the grid to paste directly.',
      })
    }
  }

  // ── Grid Editing Controls ─────────────────────────────────────────────────
  const handleCellChange = (r: number, c: number, value: string) => {
    setGridRows(prev => {
      const copy = prev.map(row => [...row])
      if (!copy[r]) copy[r] = []
      copy[r][c] = value
      return copy
    })
    // Invalidate stale preview for quick feedback
    if (gridPreview) {
      setGridPreview(null)
    }
  }

  const handleAddRow = () => {
    const emptyRow = gridHeaders.map(() => '')
    setGridRows(prev => [...prev, emptyRow])
  }

  const handleDeleteRow = (index: number) => {
    setGridRows(prev => prev.filter((_, idx) => idx !== index))
    setGridPreview(null)
  }

  const handleAddColumn = () => {
    const newColName = `Col ${gridHeaders.length + 1}`
    setGridHeaders(prev => [...prev, newColName])
    setGridRows(prev => prev.map(r => [...r, '']))
  }

  const handleClearGrid = () => {
    if (currentEntity) {
      initGridForEntity(currentEntity)
      setFeedbackMsg({ type: 'info', text: 'Grid cleared.' })
    }
  }

  // ── Validate & Preview Grid ───────────────────────────────────────────────
  const handleValidateGrid = async () => {
    if (!currentEntity) return
    const nonBlankRows = gridRows.filter(r => r.some(cell => cell.trim() !== ''))
    if (nonBlankRows.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'The grid is empty. Paste data or load samples before validating.' })
      return
    }

    try {
      setLoading(true)
      const mappedPayload: Record<string, string> = {}
      Object.entries(columnMapping).forEach(([colIdx, fieldKey]) => {
        if (fieldKey && fieldKey !== '--skip--') {
          mappedPayload[colIdx] = fieldKey
        }
      })

      const res = await importExportApi.previewGrid({
        entity_type: selectedEntityKey,
        headers: gridHeaders,
        raw_rows: nonBlankRows,
        column_mapping: mappedPayload,
        mode,
        academic_year_id: selectedAyId,
      })

      setGridPreview(res.data)
      setFeedbackMsg({
        type: res.data.invalid_rows === 0 ? 'success' : 'error',
        text: `Validation complete: ${res.data.valid_rows} valid, ${res.data.duplicates_found} duplicates, ${res.data.invalid_rows} invalid rows.`,
      })
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: 'Validation failed: ' + (err.response?.data?.detail || err.message),
      })
    } finally {
      setLoading(false)
    }
  }

  // ── Commit & Execute Grid Import ──────────────────────────────────────────
  const handleCommitGridImport = async () => {
    if (!isEditMode) {
      setFeedbackMsg({ type: 'error', text: 'Locked in View Mode: Please enable Edit Mode above before executing database imports.' })
      return
    }
    if (!gridPreview || !currentEntity) return
    const rowsToExecute = gridPreview.row_previews
    if (!rowsToExecute || rowsToExecute.length === 0) return

    try {
      setGridExecuting(true)
      const res = await importExportApi.execute({
        entity_type: selectedEntityKey,
        validated_rows: rowsToExecute,
        mode,
        source_type: 'paste_grid',
        academic_year_id: selectedAyId,
      })
      setExecutionResult(res.data)
      setFeedbackMsg({
        type: 'success',
        text: `Import completed! Created: ${res.data.created_count}, Updated: ${res.data.updated_count}, Skipped: ${res.data.skipped_count}`,
      })
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: 'Execution error: ' + (err.response?.data?.detail || err.message),
      })
    } finally {
      setGridExecuting(false)
    }
  }

  // ── Tab 2: File Upload Handlers ───────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setFileResult(null)
    setFilePreview(null)

    try {
      setFileParsing(true)
      const res = await importExportApi.previewFile(file, selectedEntityKey, mode, selectedAyId)
      setFilePreview(res.data)
      setFeedbackMsg({
        type: 'info',
        text: `Parsed ${res.data.total_rows} rows from ${file.name}. Review below and confirm.`,
      })
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: 'Failed to preview file: ' + (err.response?.data?.detail || err.message),
      })
    } finally {
      setFileParsing(false)
    }
  }

  const handleCommitFileImport = async () => {
    if (!isEditMode) {
      setFeedbackMsg({ type: 'error', text: 'Locked in View Mode: Please enable Edit Mode above before executing database imports.' })
      return
    }
    if (!filePreview || !selectedFile) return
    try {
      setFileExecuting(true)
      const res = await importExportApi.execute({
        entity_type: selectedEntityKey,
        validated_rows: filePreview.row_previews,
        mode,
        source_type: 'file',
        file_name: selectedFile.name,
        academic_year_id: selectedAyId,
      })
      setFileResult(res.data)
      setFeedbackMsg({
        type: 'success',
        text: `File import completed! Created: ${res.data.created_count}, Updated: ${res.data.updated_count}, Skipped: ${res.data.skipped_count}`,
      })
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: 'Execution error: ' + (err.response?.data?.detail || err.message),
      })
    } finally {
      setFileExecuting(false)
    }
  }

  // ── Tab 3: Export Execution ───────────────────────────────────────────────
  const handleExportData = async () => {
    try {
      setExporting(true)
      const params: ExportFilterParams = {
        entity_type: selectedEntityKey,
        file_format: exportFormat,
        academic_year_id: selectedAyId,
        board_id: selectedBoardId,
        standard_id: selectedStandardId,
        division_id: selectedDivisionId,
        start_date: exportStartDate || undefined,
        end_date: exportEndDate || undefined,
        status_filter: exportStatus || undefined,
      }

      const res = await importExportApi.exportData(params)
      const blob = new Blob([res.data], {
        type: exportFormat === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8;'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `prashant_academy_${selectedEntityKey}_export.${exportFormat}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setFeedbackMsg({
        type: 'success',
        text: `Export downloaded successfully with formula injection protection enabled.`,
      })
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: 'Export failed: ' + (err.response?.data?.detail || err.message),
      })
    } finally {
      setExporting(false)
    }
  }

  // ── Tab 4: History Fetch ──────────────────────────────────────────────────
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true)
      const res = await importExportApi.getHistory({
        entity_type: historyFilterEntity || undefined,
        limit: 50,
      })
      setHistoryList(res.data.items || [])
      setHistoryTotal(res.data.total || 0)
    } catch (err: any) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab, historyFilterEntity])

  const handleViewHistoryDetails = async (id: number) => {
    try {
      setDetailLoading(true)
      const res = await importExportApi.getHistoryDetail(id)
      setSelectedHistoryDetail(res.data)
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Failed to load details: ' + (err.response?.data?.detail || err.message) })
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Data Ingestion and Bulk Export Hub" isDirty={gridExecuting || fileExecuting} />

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-600/30 border border-primary-500/40 rounded-xl text-indigo-400">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Import & Export Center
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Database Engine
                  </span>
                </h1>
                <p className="text-slate-300 text-sm">
                  Excel-style copy-paste grid, bulk file upload, real-time validation, and safe filtered exports.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ContextualHelpButton moduleKey="import_export" variant="pill" label="Import Help" />
            <button
              onClick={() => handleDownloadTemplate('xlsx')}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white text-xs font-semibold border border-slate-700 transition shadow-sm"
              title="Download Excel Template for selected entity"
            >
              <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
              Template (.XLSX)
            </button>
            <button
              onClick={() => handleDownloadTemplate('csv')}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white text-xs font-semibold border border-slate-700 transition shadow-sm"
              title="Download CSV Template for selected entity"
            >
              <ArrowDownToLine className="w-4 h-4 text-blue-400" />
              Template (.CSV)
            </button>
          </div>
        </div>

        {/* Feedback Alert Bar */}
        {feedbackMsg && (
          <div
            className={`mt-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-200'
                : feedbackMsg.type === 'error'
                ? 'bg-rose-950/80 border-rose-800/60 text-rose-200'
                : 'bg-indigo-950/80 border-indigo-800/60 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {feedbackMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {feedbackMsg.type === 'info' && <Info className="w-4 h-4 text-indigo-400" />}
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('paste')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'paste'
              ? 'bg-primary-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Paste from Excel</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 font-mono">Grid</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'upload'
              ? 'bg-primary-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload File</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 font-mono">.xlsx/.csv</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'export'
              ? 'bg-primary-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Export Data</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'history'
              ? 'bg-primary-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Import History</span>
        </button>
      </div>

      {/* ── Global Entity & Mode Selection Header (Shared across Import tabs) ── */}
      {activeTab !== 'history' && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Target Entity
              </label>
              <select
                value={selectedEntityKey}
                onChange={e => setSelectedEntityKey(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {entities.map(ent => (
                  <option key={ent.key} value={ent.key}>
                    {ent.label} ({ent.unique_key.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {activeTab !== 'export' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Import Mode
                </label>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs">
                  <label className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer font-medium hover:text-primary-600">
                    <input
                      type="radio"
                      name="mode"
                      value="create_only"
                      checked={mode === 'create_only'}
                      onChange={() => setMode('create_only')}
                      className="text-primary-600"
                    />
                    <span>Create Only (Skip Duplicates)</span>
                  </label>
                  <label className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer font-medium hover:text-primary-600">
                    <input
                      type="radio"
                      name="mode"
                      value="update_existing"
                      checked={mode === 'update_existing'}
                      onChange={() => setMode('update_existing')}
                      className="text-primary-600"
                    />
                    <span>Update Existing (Upsert)</span>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Academic Year
              </label>
              <select
                value={selectedAyId || ''}
                onChange={e => setSelectedAyId(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Default (Active Academic Year)</option>
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Tenant & Safety Isolated
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: PASTE FROM EXCEL (INTERACTIVE COPY-PASTE SPREADSHEET GRID)
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'paste' && (
        <div className="space-y-4">
          {/* Grid Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePasteFromClipboardButton}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Paste from Clipboard
              </button>
              <button
                onClick={handleLoadSampleData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-medium transition"
              >
                <FileText className="w-3.5 h-3.5 text-primary-500" />
                Load Sample Data
              </button>
              <button
                onClick={handleClearGrid}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-medium transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                Reset Grid
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                Add Row
              </button>
              <button
                onClick={handleAddColumn}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5 text-primary-500" />
                Add Column
              </button>
              <button
                onClick={handleValidateGrid}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Validate & Preview
              </button>
            </div>
          </div>

          {/* Validation Metrics Banner (if validated) */}
          {gridPreview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">Total Rows</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{gridPreview.total_rows}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Valid Rows</span>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{gridPreview.valid_rows}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50">
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {mode === 'update_existing' ? 'Matches (To Update)' : 'Duplicates (To Skip)'}
                </span>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{gridPreview.duplicates_found}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800/50">
                <span className="text-xs text-rose-600 dark:text-rose-400">Errors Found</span>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{gridPreview.invalid_rows}</p>
              </div>
            </div>
          )}

          {/* Interactive Spreadsheet Grid Container */}
          <div
            ref={gridContainerRef}
            tabIndex={0}
            onPaste={handleGridPaste}
            className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            style={{ maxHeight: '520px' }}
          >
            <table className="w-full text-left text-xs border-collapse">
              {/* Row 1: Column Mapping Selectors */}
              <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 z-20">
                <tr>
                  <th className="w-12 px-2 py-2 text-center font-mono border-b border-r border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800">
                    #
                  </th>
                  {gridHeaders.map((header, colIdx) => {
                    const currentMapping = columnMapping[colIdx] || ''
                    const fieldDef = currentEntity?.fields.find(f => f.key === currentMapping)

                    return (
                      <th
                        key={colIdx}
                        className="min-w-[170px] p-2 border-b border-r border-slate-300 dark:border-slate-700 font-semibold"
                      >
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={header}
                            onChange={e => {
                              const val = e.target.value
                              setGridHeaders(prev => {
                                const copy = [...prev]
                                copy[colIdx] = val
                                return copy
                              })
                            }}
                            className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-2 py-1 rounded text-xs font-bold border border-slate-300 dark:border-slate-600 outline-none"
                            placeholder={`Header ${colIdx + 1}`}
                          />
                          <select
                            value={currentMapping}
                            onChange={e => {
                              const val = e.target.value
                              setColumnMapping(prev => ({ ...prev, [colIdx]: val }))
                              setGridPreview(null)
                            }}
                            className={`w-full text-[11px] px-2 py-1 rounded border outline-none font-medium ${
                              currentMapping
                                ? 'bg-primary-50 dark:bg-indigo-950/60 border-indigo-400 text-primary-700 dark:text-indigo-300'
                                : 'bg-white dark:bg-slate-700 border-slate-300 text-slate-500'
                            }`}
                          >
                            <option value="--skip--">-- Skip Column --</option>
                            {currentEntity?.fields.map(f => (
                              <option key={f.key} value={f.key}>
                                → {f.label} {f.required ? '*' : ''} ({f.type})
                              </option>
                            ))}
                          </select>
                          {fieldDef && (
                            <span className="block text-[10px] text-slate-400 truncate">
                              {fieldDef.desc || fieldDef.sample}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                  <th className="w-16 px-2 py-2 text-center border-b border-slate-300 dark:border-slate-700 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              {/* Grid Body Cells */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {gridRows.map((row, rowIdx) => {
                  const previewRow = gridPreview?.row_previews?.[rowIdx]
                  const hasError = previewRow && !previewRow.is_valid
                  const isDuplicate = previewRow?.is_duplicate

                  return (
                    <tr
                      key={rowIdx}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        hasError
                          ? 'bg-rose-50/50 dark:bg-rose-950/20'
                          : isDuplicate
                          ? 'bg-amber-50/40 dark:bg-amber-950/20'
                          : ''
                      }`}
                    >
                      <td className="px-2 py-1.5 text-center font-mono text-[11px] text-slate-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <div className="flex items-center justify-center gap-1">
                          <span>{rowIdx + 1}</span>
                          <button
                            onClick={() => handleDeleteRow(rowIdx)}
                            className="opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-opacity"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                          </button>
                        </div>
                      </td>

                      {gridHeaders.map((_, colIdx) => {
                        const cellVal = row[colIdx] || ''
                        const mappedField = columnMapping[colIdx]

                        // Find if this cell has a specific validation error
                        let cellError: string | null = null
                        if (previewRow && !previewRow.is_valid && mappedField) {
                          cellError = previewRow.errors.find(
                            err =>
                              err.toLowerCase().includes(mappedField.replace(/_/g, ' ')) ||
                              err.toLowerCase().includes(mappedField)
                          ) || null
                        }

                        return (
                          <td
                            key={colIdx}
                            className={`p-1 border-r border-slate-200 dark:border-slate-800 ${
                              cellError
                                ? 'bg-rose-100 dark:bg-rose-900/40 ring-1 ring-rose-500'
                                : ''
                            }`}
                          >
                            <div className="relative group/cell">
                              <input
                                type="text"
                                value={cellVal}
                                onFocus={() => setActiveCell({ r: rowIdx, c: colIdx })}
                                onChange={e => handleCellChange(rowIdx, colIdx, e.target.value)}
                                className={`w-full px-2 py-1 rounded text-xs outline-none bg-transparent ${
                                  cellError
                                    ? 'text-rose-700 dark:text-rose-300 font-semibold'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                                placeholder="—"
                              />
                              {cellError && (
                                <div className="hidden group-hover/cell:flex absolute bottom-full left-0 mb-1 z-30 bg-rose-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-300" />
                                  <span>{cellError}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}

                      {/* Row Status Badge */}
                      <td className="px-2 py-1 text-center whitespace-nowrap text-[11px]">
                        {previewRow ? (
                          previewRow.is_valid ? (
                            isDuplicate ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                                  mode === 'update_existing'
                                    ? 'bg-primary-100 text-primary-700 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                                title={mode === 'update_existing' ? 'Will update existing record' : 'Will skip existing record'}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {mode === 'update_existing' ? 'Update' : 'Skip'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
                                <Check className="w-3 h-3" />
                                Valid
                              </span>
                            )
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-medium cursor-help"
                              title={previewRow.errors.join('; ')}
                            >
                              <AlertCircle className="w-3 h-3" />
                              Error
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Action Footer for Grid Import */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 space-y-0.5">
              <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary-500" />
                Excel Copy-Paste Tips:
              </p>
              <p>• Copy any table from Excel or Google Sheets and click inside the grid then press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono">Ctrl+V</kbd>.</p>
              <p>• Fix any highlighted red errors directly in the cells and click <strong>Validate & Preview</strong> again without losing your data.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleValidateGrid}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold transition"
              >
                Re-Validate
              </button>
              <button
                onClick={handleCommitGridImport}
                disabled={
                  !gridPreview ||
                  gridPreview.valid_rows === 0 ||
                  gridExecuting
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
              >
                {gridExecuting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Commit Import ({gridPreview ? gridPreview.valid_rows : 0} Rows)
              </button>
            </div>
          </div>

          {/* Execution Result Modal / Summary Card */}
          {executionResult && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/40 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Import Transaction Committed Successfully</h3>
                    <p className="text-xs text-slate-300">
                      Import ID #{executionResult.import_id} • Status: {executionResult.status}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExecutionResult(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400">Created</span>
                  <p className="text-xl font-bold text-emerald-400">{executionResult.created_count}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400">Updated</span>
                  <p className="text-xl font-bold text-blue-400">{executionResult.updated_count}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400">Skipped</span>
                  <p className="text-xl font-bold text-amber-400">{executionResult.skipped_count}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400">Failed</span>
                  <p className="text-xl font-bold text-rose-400">{executionResult.failed_count}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('history')}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-xs font-semibold transition"
                >
                  View Import History Log
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: UPLOAD FILE (.XLSX OR .CSV)
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Drag & Drop Zone */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 transition text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-blue-950/40 text-primary-600 dark:text-blue-400 mx-auto flex items-center justify-center">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Drag and drop your spreadsheet here
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv) up to 25MB
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-blue-500/20 transition">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Browse Files</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => handleDownloadTemplate('xlsx')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold transition"
              >
                <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                Download Format Template
              </button>
            </div>
          </div>

          {/* File Parsing Loading */}
          {fileParsing && (
            <div className="p-8 text-center space-y-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Parsing spreadsheet and validating records against database...
              </p>
            </div>
          )}

          {/* File Preview Content */}
          {filePreview && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    {selectedFile?.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Parsed {filePreview.total_rows} total rows • {filePreview.valid_rows} valid •{' '}
                    {filePreview.duplicates_found} duplicates • {filePreview.invalid_rows} errors
                  </p>
                </div>

                <button
                  onClick={handleCommitFileImport}
                  disabled={filePreview.valid_rows === 0 || fileExecuting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                >
                  {fileExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Execute Import ({filePreview.valid_rows} Rows)
                </button>
              </div>

              {/* Rows Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm max-h-[460px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 z-10 font-semibold">
                    <tr>
                      <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">#</th>
                      {filePreview.field_definitions.map(f => (
                        <th key={f.key} className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
                          {f.label}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filePreview.row_previews.map(r => (
                      <tr
                        key={r.row_number}
                        className={!r.is_valid ? 'bg-rose-50/50 dark:bg-rose-950/20' : r.is_duplicate ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}
                      >
                        <td className="px-3 py-2 font-mono text-slate-400">{r.row_number}</td>
                        {filePreview.field_definitions.map(f => (
                          <td key={f.key} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                            {r.data[f.key] !== undefined && r.data[f.key] !== null ? String(r.data[f.key]) : '—'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {r.is_valid ? (
                            r.is_duplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium text-[11px]">
                                {r.action === 'update' ? 'Update' : 'Duplicate (Skip)'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium text-[11px]">
                                Valid
                              </span>
                            )
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-medium text-[11px]"
                              title={r.errors.join('; ')}
                            >
                              <AlertCircle className="w-3 h-3" />
                              {r.errors[0] || 'Error'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* File Result */}
          {fileResult && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/40 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">File Import Completed Successfully</h3>
                    <p className="text-xs text-slate-300">File: {fileResult.file_name || selectedFile?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setFileResult(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400">Created</span>
                  <p className="text-xl font-bold text-emerald-400">{fileResult.created_count}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400">Updated</span>
                  <p className="text-xl font-bold text-blue-400">{fileResult.updated_count}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400">Skipped</span>
                  <p className="text-xl font-bold text-amber-400">{fileResult.skipped_count}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-400">Failed</span>
                  <p className="text-xl font-bold text-rose-400">{fileResult.failed_count}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: EXPORT DATA (FILTERED EXCEL / CSV WITH FORMULA INJECTION DEFENSE)
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-primary-500" />
                Filtered Data Export
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Download filtered institutional records into styled Microsoft Excel (.xlsx) or CSV files.
              </p>
            </div>

            {/* Filter Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Export Format
                </label>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="xlsx"
                      checked={exportFormat === 'xlsx'}
                      onChange={() => setExportFormat('xlsx')}
                      className="text-primary-600"
                    />
                    <span>Excel (.XLSX)</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      className="text-primary-600"
                    />
                    <span>CSV (.CSV)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Board / Curriculum
                </label>
                <select
                  value={selectedBoardId || ''}
                  onChange={e => setSelectedBoardId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Boards</option>
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Class / Standard
                </label>
                <select
                  value={selectedStandardId || ''}
                  onChange={e => setSelectedStandardId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Classes</option>
                  {standards.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Level {s.level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Batch / Division
                </label>
                <select
                  value={selectedDivisionId || ''}
                  onChange={e => setSelectedDivisionId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Batches</option>
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={e => setExportStartDate(e.target.value)}
                    className="w-1/2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 text-xs outline-none"
                    placeholder="From"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={e => setExportEndDate(e.target.value)}
                    className="w-1/2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 text-xs outline-none"
                    placeholder="To"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={exportStatus}
                  onChange={e => setExportStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Formula Injection Sanitization Enabled
                </p>
                <p>
                  Any cell starting with formula trigger symbols (<code className="text-primary-500 font-mono">=</code>,{' '}
                  <code className="text-primary-500 font-mono">+</code>,{' '}
                  <code className="text-primary-500 font-mono">-</code>,{' '}
                  <code className="text-primary-500 font-mono">@</code>) is safely escaped with a leading apostrophe to prevent spreadsheet formula injection attacks when opened in Microsoft Excel.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50"
              >
                {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export & Download File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: IMPORT HISTORY & AUDIT LOGS
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <select
                value={historyFilterEntity}
                onChange={e => setHistoryFilterEntity(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-1.5 text-xs font-medium outline-none"
              >
                <option value="">All Entities</option>
                {entities.map(ent => (
                  <option key={ent.key} value={ent.key}>
                    {ent.label}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchHistory}
                disabled={historyLoading}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                title="Refresh History"
              >
                <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <span className="text-xs text-slate-500">
              Showing {historyList.length} of {historyTotal} logged imports
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">Date & Time</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">Entity</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">Source</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">File / Label</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-center">Total Rows</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-center">Success</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-center">Failed</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-center">Status</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">Imported By</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No import logs found.
                    </td>
                  </tr>
                ) : (
                  historyList.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white capitalize">
                        {log.entity_type}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {log.source_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[180px] truncate" title={log.file_name}>
                        {log.file_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">{log.total_rows}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {log.successful_rows}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">
                        {log.failed_rows}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            log.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : log.status === 'partial'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.imported_by}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleViewHistoryDetails(log.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-medium transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Details Modal */}
          {selectedHistoryDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Import Job #{selectedHistoryDetail.id} — Details
                    </h3>
                    <p className="text-xs text-slate-500">
                      Entity: <span className="capitalize">{selectedHistoryDetail.entity_type}</span> • Mode:{' '}
                      {selectedHistoryDetail.import_mode}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedHistoryDetail(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selectedHistoryDetail.reconciliation && (
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
                      <span className="text-slate-500">Created</span>
                      <p className="text-base font-bold text-emerald-600">
                        {selectedHistoryDetail.reconciliation.created || 0}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-primary-50 dark:bg-blue-950/40 border border-blue-200">
                      <span className="text-slate-500">Updated</span>
                      <p className="text-base font-bold text-primary-600">
                        {selectedHistoryDetail.reconciliation.updated || 0}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200">
                      <span className="text-slate-500">Skipped</span>
                      <p className="text-base font-bold text-amber-600">
                        {selectedHistoryDetail.reconciliation.skipped || 0}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200">
                      <span className="text-slate-500">Failed</span>
                      <p className="text-base font-bold text-rose-600">
                        {selectedHistoryDetail.reconciliation.failed || 0}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error log list */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Row-Level Errors & Messages
                  </h4>
                  {selectedHistoryDetail.errors && selectedHistoryDetail.errors.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                      {selectedHistoryDetail.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-2"
                        >
                          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                          <div>
                            {err.row && <span className="font-semibold text-rose-600">Row {err.row}: </span>}
                            <span className="text-slate-700 dark:text-slate-300">
                              {err.errors ? err.errors.join('; ') : err.raw || JSON.stringify(err)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                      No row-level errors recorded for this import job.
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedHistoryDetail(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

