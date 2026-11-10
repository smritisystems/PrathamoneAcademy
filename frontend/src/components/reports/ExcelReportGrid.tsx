/**
 * @file        ExcelReportGrid.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.reports
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-11
 *
 * @description Production-grade spreadsheet-style report data grid with sorting, column resizing/reordering, visibility toggle, column filters, and multi-format exports.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Columns,
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileText,
  Code,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoveLeft,
  MoveRight,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { executeReportExport, getRawCellValue, ExportColumn } from '../../utils/reportExport'

export interface ColumnConfig<T = any> extends ExportColumn<T> {
  sortable?: boolean
  filterable?: boolean
  filterType?: 'text' | 'number' | 'date' | 'select'
  filterOptions?: { label: string; value: any }[]
  width?: number
  minWidth?: number
  defaultVisible?: boolean
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: T, index: number) => React.ReactNode
}

export interface ExcelReportGridProps<T = any> {
  title?: string
  subtitle?: string
  columns: ColumnConfig<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  exportFilename?: string
  sheetName?: string
  defaultSort?: { columnId: string; direction: 'asc' | 'desc' }
  pageSizeOptions?: number[]
  defaultPageSize?: number
  showSummaryRow?: boolean
  summaryCalculations?: Record<string, (data: T[]) => React.ReactNode>
  extraActions?: React.ReactNode
  calculationNotes?: string[]
}

export default function ExcelReportGrid<T extends Record<string, any>>({
  title,
  subtitle,
  columns: initialColumns,
  data,
  loading = false,
  emptyMessage = 'No records found matching your filters.',
  exportFilename = 'report_export',
  sheetName = 'Report Data',
  defaultSort,
  pageSizeOptions = [10, 25, 50, 100, -1],
  defaultPageSize = 25,
  showSummaryRow = false,
  summaryCalculations,
  extraActions,
  calculationNotes,
}: ExcelReportGridProps<T>) {
  // ─── 1. State: Columns, Sizing, Ordering, Visibility ────────────────────────
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    initialColumns.map((c) => c.id)
  )
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    initialColumns.forEach((c) => {
      map[c.id] = c.defaultVisible !== false
    })
    return map
  })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    initialColumns.forEach((c) => {
      map[c.id] = c.width || (c.type === 'number' || c.type === 'currency' ? 130 : 160)
    })
    return map
  })

  // ─── 2. State: Global Search, Column Filters & Sorting ─────────────────────
  const [globalSearch, setGlobalSearch] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({})
  const [activeFilterPopover, setActiveFilterPopover] = useState<string | null>(null)
  const [sortState, setSortState] = useState<{
    columnId: string
    direction: 'asc' | 'desc'
  } | null>(defaultSort || null)

  // ─── 3. State: Pagination & Export Scope ──────────────────────────────────
  const [pageSize, setPageSize] = useState<number>(defaultPageSize)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [exportScope, setExportScope] = useState<'filtered' | 'page'>('filtered')
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Column map lookup
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnConfig<T>>()
    initialColumns.forEach((c) => map.set(c.id, c))
    return map
  }, [initialColumns])

  // Ordered visible columns
  const visibleColumns = useMemo(() => {
    return columnOrder
      .map((id) => columnMap.get(id)!)
      .filter((col) => col && columnVisibility[col.id])
  }, [columnOrder, columnMap, columnVisibility])

  // ─── 4. Column Resizing via Mouse Drag ─────────────────────────────────────
  const resizingColRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(
    null
  )

  const handleResizeStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const currentWidth = columnWidths[colId] || 150
    resizingColRef.current = { colId, startX: e.clientX, startWidth: currentWidth }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return
      const diff = moveEvent.clientX - resizingColRef.current.startX
      const minW = columnMap.get(resizingColRef.current.colId)?.minWidth || 80
      const newWidth = Math.max(minW, resizingColRef.current.startWidth + diff)
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColRef.current!.colId]: newWidth,
      }))
    }

    const handleMouseUp = () => {
      resizingColRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Column Reordering: Move Left / Move Right
  const moveColumn = (colId: string, direction: 'left' | 'right') => {
    const idx = columnOrder.indexOf(colId)
    if (idx === -1) return
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= columnOrder.length) return

    const newOrder = [...columnOrder]
    const temp = newOrder[idx]
    newOrder[idx] = newOrder[targetIdx]
    newOrder[targetIdx] = temp
    setColumnOrder(newOrder)
  }

  // ─── 5. Filtering Logic ───────────────────────────────────────────────────
  const activeFiltersCount = useMemo(() => {
    let count = Object.values(columnFilters).filter(
      (v) => v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
    ).length
    if (globalSearch.trim()) count += 1
    return count
  }, [columnFilters, globalSearch])

  const filteredData = useMemo(() => {
    let result = [...data]

    // A. Global quick search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim()
      result = result.filter((row) => {
        return visibleColumns.some((col) => {
          const raw = getRawCellValue(row, col)
          if (raw === null || raw === undefined) return false
          return String(raw).toLowerCase().includes(q)
        })
      })
    }

    // B. Column-specific filters
    Object.entries(columnFilters).forEach(([colId, filterVal]) => {
      if (filterVal === undefined || filterVal === '' || filterVal === null) return
      const col = columnMap.get(colId)
      if (!col) return

      if (Array.isArray(filterVal)) {
        // Multi-select dropdown filter
        if (filterVal.length === 0) return
        result = result.filter((row) => {
          const raw = getRawCellValue(row, col)
          return filterVal.includes(String(raw))
        })
      } else if (typeof filterVal === 'object' && ('min' in filterVal || 'max' in filterVal)) {
        // Numeric range filter
        const min = filterVal.min !== '' && filterVal.min !== undefined ? Number(filterVal.min) : null
        const max = filterVal.max !== '' && filterVal.max !== undefined ? Number(filterVal.max) : null
        result = result.filter((row) => {
          const num = Number(getRawCellValue(row, col))
          if (isNaN(num)) return false
          if (min !== null && num < min) return false
          if (max !== null && num > max) return false
          return true
        })
      } else {
        // Text contains search
        const strVal = String(filterVal).toLowerCase().trim()
        result = result.filter((row) => {
          const raw = getRawCellValue(row, col)
          return String(raw ?? '').toLowerCase().includes(strVal)
        })
      }
    })

    // C. Sorting
    if (sortState) {
      const col = columnMap.get(sortState.columnId)
      if (col) {
        result.sort((a, b) => {
          const valA = getRawCellValue(a, col)
          const valB = getRawCellValue(b, col)

          if (valA === valB) return 0
          if (valA === null || valA === undefined || valA === '') return 1
          if (valB === null || valB === undefined || valB === '') return -1

          if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage') {
            const numA = Number(valA)
            const numB = Number(valB)
            return sortState.direction === 'asc' ? numA - numB : numB - numA
          }

          const strA = String(valA).toLowerCase()
          const strB = String(valB).toLowerCase()
          return sortState.direction === 'asc'
            ? strA.localeCompare(strB)
            : strB.localeCompare(strA)
        })
      }
    }

    return result
  }, [data, globalSearch, columnFilters, sortState, visibleColumns, columnMap])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [globalSearch, columnFilters, pageSize])

  // ─── 6. Pagination Calculations ───────────────────────────────────────────
  const totalRecords = filteredData.length
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalRecords / pageSize) || 1
  const paginatedData = useMemo(() => {
    if (pageSize === -1) return filteredData
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  // ─── 7. Reset Handlers ────────────────────────────────────────────────────
  const handleClearFilters = () => {
    setGlobalSearch('')
    setColumnFilters({})
    setActiveFilterPopover(null)
  }

  const handleResetView = () => {
    handleClearFilters()
    setSortState(defaultSort || null)
    setColumnOrder(initialColumns.map((c) => c.id))
    const initialVisibility: Record<string, boolean> = {}
    const initialWidthMap: Record<string, number> = {}
    initialColumns.forEach((c) => {
      initialVisibility[c.id] = c.defaultVisible !== false
      initialWidthMap[c.id] = c.width || (c.type === 'number' || c.type === 'currency' ? 130 : 160)
    })
    setColumnVisibility(initialVisibility)
    setColumnWidths(initialWidthMap)
    setPageSize(defaultPageSize)
    setCurrentPage(1)
    toast.success('Grid view reset to default')
  }

  // ─── 8. Export Execution ──────────────────────────────────────────────────
  const handleExport = (format: 'xlsx' | 'csv' | 'json') => {
    const exportDataset = exportScope === 'page' ? paginatedData : filteredData
    if (exportDataset.length === 0) {
      toast.error('No matching records to export')
      return
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `${exportFilename}_${timestamp}`

    executeReportExport({
      filename,
      sheetName,
      columns: visibleColumns,
      data: exportDataset,
      format,
      calculationNotes,
    })

    setShowExportMenu(false)
    toast.success(
      `Exported ${exportDataset.length} rows as ${format.toUpperCase()} (${
        exportScope === 'page' ? 'current page' : 'all filtered'
      })`
    )
  }

  // ─── 9. Unique values for Column Select Filter ─────────────────────────────
  const getUniqueColumnValues = (col: ColumnConfig<T>) => {
    const values = new Map<string, number>()
    data.forEach((row) => {
      const val = getRawCellValue(row, col)
      if (val !== null && val !== undefined && val !== '') {
        const strVal = String(val)
        values.set(strVal, (values.get(strVal) || 0) + 1)
      }
    })
    return Array.from(values.entries())
      .map(([val, count]) => ({ label: val, value: val, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col min-w-0 transition-all">
      {/* ─── Grid Top Action Bar ───────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div className="min-w-0">
          {title && <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Global Quick Search */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search report records..."
              className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all shadow-xs"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Select Columns Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColumnsMenu(!showColumnsMenu)
                setShowExportMenu(false)
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-xs transition-colors"
            >
              <Columns className="w-3.5 h-3.5 text-slate-500" />
              <span>Columns</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] rounded-full font-mono font-bold">
                {visibleColumns.length}/{initialColumns.length}
              </span>
            </button>

            {showColumnsMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <span className="text-xs font-bold text-slate-800">Display Columns</span>
                  <button
                    type="button"
                    onClick={() => setShowColumnsMenu(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 py-1 custom-scrollbar">
                  {columnOrder.map((colId) => {
                    const col = columnMap.get(colId)
                    if (!col) return null
                    const isVis = columnVisibility[colId]
                    return (
                      <div
                        key={colId}
                        className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 text-xs text-slate-700"
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isVis}
                            onChange={(e) => {
                              const checked = e.target.checked
                              // Ensure at least one column remains visible
                              if (!checked && visibleColumns.length <= 1) {
                                toast.error('At least one column must remain visible')
                                return
                              }
                              setColumnVisibility((prev) => ({ ...prev, [colId]: checked }))
                            }}
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="truncate">{col.header}</span>
                        </label>
                        <div className="flex items-center gap-0.5 text-slate-400">
                          <button
                            type="button"
                            title="Move column left"
                            onClick={() => moveColumn(colId, 'left')}
                            className="p-1 hover:text-slate-700 hover:bg-slate-200/60 rounded"
                          >
                            <MoveLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Move column right"
                            onClick={() => moveColumn(colId, 'right')}
                            className="p-1 hover:text-slate-700 hover:bg-slate-200/60 rounded"
                          >
                            <MoveRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {}
                      initialColumns.forEach((c) => (all[c.id] = true))
                      setColumnVisibility(all)
                    }}
                    className="text-primary-600 hover:underline font-semibold"
                  >
                    Show All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const def: Record<string, boolean> = {}
                      initialColumns.forEach((c) => (def[c.id] = c.defaultVisible !== false))
                      setColumnVisibility(def)
                    }}
                    className="text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Filter Clear & Reset View */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              title="Clear all active filters"
              className="flex items-center gap-1 px-2.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors shadow-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters ({activeFiltersCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetView}
            title="Reset column widths, sort, order, and filters"
            className="flex items-center gap-1 px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl border border-slate-300 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset View</span>
          </button>

          {/* Export Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowExportMenu(!showExportMenu)
                setShowColumnsMenu(false)
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <span className="text-xs font-bold text-slate-800">Export Report Data</span>
                  <button
                    type="button"
                    onClick={() => setShowExportMenu(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scope selection */}
                <div className="mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Export Scope:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExportScope('filtered')}
                      className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all ${
                        exportScope === 'filtered'
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      All Filtered ({filteredData.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportScope('page')}
                      className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all ${
                        exportScope === 'page'
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Current Page ({paginatedData.length})
                    </button>
                  </div>
                </div>

                {/* Export options */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg transition-colors group"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>Excel Workbook (.xlsx)</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-normal">
                        Preserves numbers, calculations & types
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-primary-50 hover:text-primary-800 rounded-lg transition-colors group"
                  >
                    <FileText className="w-4 h-4 text-primary-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <span>CSV Spreadsheet (.csv)</span>
                      <p className="text-[10.5px] text-slate-400 font-normal">
                        Lightweight tabular text for tools
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-purple-50 hover:text-purple-800 rounded-lg transition-colors group"
                  >
                    <Code className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <span>JSON Dataset (.json)</span>
                      <p className="text-[10.5px] text-slate-400 font-normal">
                        Structured technical data format
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {extraActions}
        </div>
      </div>

      {/* ─── Grid Record Count & Active Search Banner ──────────────────────── */}
      <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500 font-medium select-none">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-800 font-bold">{filteredData.length}</strong> of{' '}
            <strong className="text-slate-800 font-bold">{data.length}</strong> total records
          </span>
          {activeFiltersCount > 0 && (
            <span className="text-primary-600 font-semibold bg-primary-50 px-2 py-0.5 rounded-full border border-blue-200/60">
              Filtered
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          Tip: Drag column header edge to resize · Click header to sort
        </div>
      </div>

      {/* ─── Main Spreadsheet Table Container ─────────────────────────────── */}
      <div className="overflow-x-auto overflow-y-auto max-h-[580px] custom-scrollbar relative">
        <table className="w-full border-collapse text-xs text-left">
          {/* Sticky Header Row */}
          <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs z-10 shadow-xs border-b border-slate-200">
            <tr>
              {visibleColumns.map((col) => {
                const width = columnWidths[col.id] || 150
                const isSorted = sortState?.columnId === col.id
                const sortDir = isSorted ? sortState.direction : null
                const hasFilter =
                  columnFilters[col.id] !== undefined &&
                  columnFilters[col.id] !== '' &&
                  (Array.isArray(columnFilters[col.id]) ? columnFilters[col.id].length > 0 : true)
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'

                return (
                  <th
                    key={col.id}
                    style={{ width: `${width}px`, minWidth: `${width}px` }}
                    className={`relative py-2.5 px-3 font-bold text-slate-700 border-r border-slate-200/80 select-none transition-colors group ${
                      isSorted ? 'bg-primary-50/60 text-primary-900' : 'hover:bg-slate-200/50'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 ${alignClass}`}>
                      {/* Sortable Header Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (col.sortable === false) return
                          if (!isSorted) {
                            setSortState({ columnId: col.id, direction: 'asc' })
                          } else if (sortDir === 'asc') {
                            setSortState({ columnId: col.id, direction: 'desc' })
                          } else {
                            setSortState(null)
                          }
                        }}
                        className={`flex items-center gap-1 flex-1 truncate font-bold text-slate-700 hover:text-slate-900 text-left ${
                          col.sortable !== false ? 'cursor-pointer' : 'cursor-default'
                        }`}
                        title={
                          col.sortable !== false
                            ? `Sort by ${col.header} (${
                                !isSorted ? 'Unsorted' : sortDir === 'asc' ? 'Ascending' : 'Descending'
                              })`
                            : undefined
                        }
                      >
                        <span className="truncate">{col.header}</span>
                        {col.sortable !== false && (
                          <span className="shrink-0 text-slate-400 group-hover:text-slate-600">
                            {sortDir === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-primary-600 font-bold" />
                            ) : sortDir === 'desc' ? (
                              <ArrowDown className="w-3.5 h-3.5 text-primary-600 font-bold" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </span>
                        )}
                      </button>

                      {/* Column Filter Icon Button */}
                      {col.filterable !== false && (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveFilterPopover(
                                activeFilterPopover === col.id ? null : col.id
                              )
                            }}
                            className={`p-1 rounded hover:bg-slate-300/60 transition-colors ${
                              hasFilter
                                ? 'text-primary-600 bg-primary-100 font-bold'
                                : 'text-slate-400 opacity-60 hover:opacity-100'
                            }`}
                            title={`Filter ${col.header}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>

                          {/* Filter Popover */}
                          {activeFilterPopover === col.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-40 text-left font-normal"
                            >
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  Filter {col.header}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveFilterPopover(null)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Text Filter */}
                              {(!col.filterType || col.filterType === 'text') && (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={columnFilters[col.id] || ''}
                                    onChange={(e) =>
                                      setColumnFilters((prev) => ({
                                        ...prev,
                                        [col.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Search text..."
                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                </div>
                              )}

                              {/* Numeric Range Filter */}
                              {col.filterType === 'number' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-slate-500 font-semibold">
                                        Min
                                      </label>
                                      <input
                                        type="number"
                                        value={columnFilters[col.id]?.min ?? ''}
                                        onChange={(e) =>
                                          setColumnFilters((prev) => ({
                                            ...prev,
                                            [col.id]: {
                                              ...prev[col.id],
                                              min: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder="Min"
                                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded-lg"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-500 font-semibold">
                                        Max
                                      </label>
                                      <input
                                        type="number"
                                        value={columnFilters[col.id]?.max ?? ''}
                                        onChange={(e) =>
                                          setColumnFilters((prev) => ({
                                            ...prev,
                                            [col.id]: {
                                              ...prev[col.id],
                                              max: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder="Max"
                                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded-lg"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Select / Unique Values Filter */}
                              {col.filterType === 'select' && (
                                <div className="space-y-1.5">
                                  <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                    {getUniqueColumnValues(col).map((opt) => {
                                      const currentSelected = columnFilters[col.id] || []
                                      const isChecked = currentSelected.includes(opt.value)
                                      return (
                                        <label
                                          key={opt.value}
                                          className="flex items-center justify-between gap-2 px-1.5 py-1 hover:bg-slate-50 rounded text-xs cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2 truncate">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                const checked = e.target.checked
                                                setColumnFilters((prev) => {
                                                  const oldList = prev[col.id] || []
                                                  const newList = checked
                                                    ? [...oldList, opt.value]
                                                    : oldList.filter((v: any) => v !== opt.value)
                                                  return { ...prev, [col.id]: newList }
                                                })
                                              }}
                                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="truncate">{opt.label}</span>
                                          </div>
                                          <span className="text-[10px] font-mono text-slate-400">
                                            {opt.count}
                                          </span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setColumnFilters((prev) => {
                                      const copy = { ...prev }
                                      delete copy[col.id]
                                      return copy
                                    })
                                  }}
                                  className="text-slate-500 hover:text-slate-800"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveFilterPopover(null)}
                                  className="px-2 py-0.5 bg-primary-600 text-white rounded font-semibold"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Drag Handle to Resize Column */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, col.id)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary-500 transition-colors z-20"
                      title="Drag to resize column"
                    />
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  <p className="text-xs text-slate-500 mt-3 font-semibold">
                    Loading report dataset...
                  </p>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-16 text-slate-400">
                  <p className="text-sm font-semibold text-slate-600">{emptyMessage}</p>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="mt-3 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold rounded-xl transition-colors"
                    >
                      Reset Active Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                return (
                  <tr
                    key={row.id ?? rowIdx}
                    className="hover:bg-primary-50/40 transition-colors group"
                  >
                    {visibleColumns.map((col) => {
                      const rawVal = getRawCellValue(row, col)
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'

                      return (
                        <td
                          key={col.id}
                          className={`py-2 px-3 border-r border-slate-100 last:border-r-0 truncate text-slate-700 ${alignClass}`}
                        >
                          {col.render
                            ? col.render(rawVal, row, rowIdx)
                            : col.type === 'currency'
                            ? `₹${Number(rawVal || 0).toLocaleString('en-IN')}`
                            : col.type === 'percentage'
                            ? `${rawVal}%`
                            : rawVal !== null && rawVal !== undefined
                            ? String(rawVal)
                            : '—'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>

          {/* Optional Spreadsheet Summary Row */}
          {showSummaryRow && !loading && paginatedData.length > 0 && (
            <tfoot className="sticky bottom-0 bg-slate-100/95 font-bold border-t-2 border-slate-300 z-10 text-xs">
              <tr>
                {visibleColumns.map((col, idx) => {
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'

                  if (summaryCalculations && summaryCalculations[col.id]) {
                    return (
                      <td key={col.id} className={`py-2 px-3 text-slate-900 ${alignClass}`}>
                        {summaryCalculations[col.id](filteredData)}
                      </td>
                    )
                  }

                  if (idx === 0) {
                    return (
                      <td key={col.id} className="py-2 px-3 text-slate-900 font-extrabold">
                        Total / Summary ({filteredData.length})
                      </td>
                    )
                  }

                  if (col.type === 'currency') {
                    const sum = filteredData.reduce(
                      (acc, row) => acc + (Number(getRawCellValue(row, col)) || 0),
                      0
                    )
                    return (
                      <td key={col.id} className="py-2 px-3 text-right font-extrabold text-slate-900">
                        ₹{sum.toLocaleString('en-IN')}
                      </td>
                    )
                  }

                  if (col.type === 'number') {
                    const sum = filteredData.reduce(
                      (acc, row) => acc + (Number(getRawCellValue(row, col)) || 0),
                      0
                    )
                    return (
                      <td key={col.id} className="py-2 px-3 text-right font-extrabold text-slate-900">
                        {sum.toLocaleString('en-IN')}
                      </td>
                    )
                  }

                  return <td key={col.id} className="py-2 px-3 text-slate-400">—</td>
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ─── Grid Bottom Pagination Bar ───────────────────────────────────── */}
      <div className="p-3 border-t border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-xs"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === -1 ? 'All records' : `${opt} rows`}
              </option>
            ))}
          </select>
          <span className="text-slate-400 select-none">|</span>
          <span className="font-medium text-slate-500">
            {pageSize === -1
              ? `Displaying all ${totalRecords} records`
              : `Page ${currentPage} of ${totalPages} (${totalRecords} items)`}
          </span>
        </div>

        {pageSize !== -1 && totalPages > 1 && (
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              title="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              title="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

