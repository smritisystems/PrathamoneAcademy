/**
 * @file        EnterpriseDataTable.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common.EnterpriseDataTable
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-23
 * @updated     2026-11-24
 *
 * @description Production-grade canonical EnterpriseDataTable component complying with Rule 001 SSOT, Rule 010 View-First, and Rule 014 Sleek UI/UX.
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Lock,
  Layers,
  CheckSquare,
  Square,
  MinusSquare,
  FileSpreadsheet,
  Filter,
  X,
  Search,
  Check,
  RotateCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTableSort, type SortDirection, type SortType } from '../../../hooks/useTableSort'
import { TableToolbar } from './TableToolbar'
import Pagination from '../../Pagination'
import {
  formatINR,
  formatDateIN,
  formatMaskedAadhaar,
  formatPhoneNumber,
  fallbackEmpty,
} from '../../../utils/formatters'
import { exportToExcel, downloadCsvRows } from '../../../utils/reportExport'
import type { DataTableColumn, EnterpriseDataTableProps } from './types'

export function EnterpriseDataTable<T extends Record<string, any>>({
  tableId = 'enterprise-table',
  data = [],
  columns,
  isLoading = false,
  loadingMessage = 'Loading records…',
  emptyMessage = 'No records found matching current criteria.',
  emptyIcon,
  emptyState,

  // Search
  searchable = true,
  searchPlaceholder = 'Search records…',
  searchValue: controlledSearch,
  onSearchChange: controlledOnSearchChange,
  customFilterBar,
  columnFilters: controlledColumnFilters,
  onColumnFilterChange: controlledOnColumnFilterChange,
  disableColumnFiltering = false,

  // Sorting
  defaultSortKey,
  defaultSortDirection = 'asc',
  onSortChange: externalOnSortChange,

  // Pagination
  page: controlledPage,
  pageSize: controlledPageSize = 20,
  totalCount: controlledTotalCount,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange: controlledOnPageChange,
  onPageSizeChange: controlledOnPageSizeChange,
  serverSidePagination = false,

  // Row Selection
  enableRowSelection = false,
  selectedRowIds: controlledSelectedRowIds,
  onSelectionChange: controlledOnSelectionChange,
  getRowId,
  rowKey,
  bulkActions,

  // Row Interaction
  onRowClick,
  rowClassName,

  // Governance
  isEditMode = false,

  // Export
  exportConfig,

  // Styling
  className = '',
  density = 'comfortable',
  maxHeight,
}: EnterpriseDataTableProps<T>) {
  // ─── 1. Internal Search State (if uncontrolled) ─────────────────────────────
  const [internalSearch, setInternalSearch] = useState('')
  const currentSearch = controlledSearch !== undefined ? controlledSearch : internalSearch
  const handleSearchChange = (val: string) => {
    if (controlledOnSearchChange) {
      controlledOnSearchChange(val)
    } else {
      setInternalSearch(val)
    }
  }

  // ─── 2. Internal Pagination State (if uncontrolled) ─────────────────────────
  const [internalPage, setInternalPage] = useState(1)
  const [internalPageSize, setInternalPageSize] = useState(controlledPageSize)
  const currentPage = controlledPage !== undefined ? controlledPage : internalPage
  const currentPageSize = controlledPageSize !== undefined ? controlledPageSize : internalPageSize

  const handlePageChange = (newPage: number) => {
    if (controlledOnPageChange) {
      controlledOnPageChange(newPage)
    } else {
      setInternalPage(newPage)
    }
  }

  const handlePageSizeChange = (newSize: number) => {
    if (controlledOnPageSizeChange) {
      controlledOnPageSizeChange(newSize)
    } else {
      setInternalPageSize(newSize)
      setInternalPage(1)
    }
  }

  // ─── 2. Column Normalization (id, key, sticky, pinned, render) ───────────
  const normalizedColumns = useMemo(() => {
    return columns.map((col, idx) => {
      const colId = col.id || col.key || `col_${idx}`
      const stickyPos = col.sticky || col.pinned
      return {
        ...col,
        id: colId,
        sticky: stickyPos,
      }
    })
  }, [columns])

  // ─── 3. Column Visibility with LocalStorage Persistence ─────────────────────
  const storageKey = `prathamone_table_cols_${tableId}`
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const initialMap: Record<string, boolean> = {}
    normalizedColumns.forEach((col) => {
      initialMap[col.id] = col.defaultVisible !== false
    })

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        normalizedColumns.forEach((col) => {
          if (parsed && typeof parsed[col.id] === 'boolean') {
            initialMap[col.id] = parsed[col.id]
          }
        })
      }
    } catch {
      // fallback to initialMap
    }
    return initialMap
  })

  const toggleColumnVisibility = (colId: string) => {
    setColumnVisibility((prev) => {
      const currentVal = prev[colId] !== undefined ? prev[colId] : true
      const updated = { ...prev, [colId]: !currentVal }
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch {
        // storage quota fallback
      }
      return updated
    })
  }

  const resetColumns = () => {
    const initialMap: Record<string, boolean> = {}
    normalizedColumns.forEach((col) => {
      initialMap[col.id] = col.defaultVisible !== false
    })
    setColumnVisibility(initialMap)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }

  // Visible columns filter
  const visibleColumns = useMemo(() => {
    return normalizedColumns.filter((col) =>
      columnVisibility[col.id] !== undefined
        ? columnVisibility[col.id] === true
        : col.defaultVisible !== false
    )
  }, [normalizedColumns, columnVisibility])

  // ─── 4. Cell Value Resolver (Canonical SSOT) ───────────────────────────────
  const resolveCellValue = useCallback((col: DataTableColumn<T>, row: T) => {
    if (col.accessorFn) return col.accessorFn(row)
    if (col.accessorKey) {
      const keys = String(col.accessorKey).split('.')
      let val: any = row
      for (const k of keys) {
        if (val === null || val === undefined) return undefined
        val = val[k]
      }
      return val
    }
    return col.id ? (row as any)[col.id] : undefined
  }, [])

  // ─── 5. Column-Level Filtering State ────────────────────────────────────────
  const [internalColumnFilters, setInternalColumnFilters] = useState<Record<string, any>>({})
  const columnFilters = controlledColumnFilters !== undefined ? controlledColumnFilters : internalColumnFilters
  const [activeFilterPopover, setActiveFilterPopover] = useState<string | null>(null)
  const [popoverSearchQuery, setPopoverSearchQuery] = useState('')
  const filterPopoverRef = useRef<HTMLDivElement>(null)

  const handleSetColumnFilter = useCallback((colId: string, value: any) => {
    const updated = { ...columnFilters }
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      delete updated[colId]
    } else {
      updated[colId] = value
    }
    if (controlledOnColumnFilterChange) {
      controlledOnColumnFilterChange(updated)
    } else {
      setInternalColumnFilters(updated)
    }
  }, [columnFilters, controlledOnColumnFilterChange])

  const handleClearColumnFilter = useCallback((colId: string) => {
    handleSetColumnFilter(colId, undefined)
  }, [handleSetColumnFilter])

  const handleClearAllFilters = useCallback(() => {
    if (controlledOnColumnFilterChange) {
      controlledOnColumnFilterChange({})
    } else {
      setInternalColumnFilters({})
    }
    setActiveFilterPopover(null)
  }, [controlledOnColumnFilterChange])

  // Close filter popover on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
        setActiveFilterPopover(null)
        setPopoverSearchQuery('')
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveFilterPopover(null)
        setPopoverSearchQuery('')
      }
    }
    if (activeFilterPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeFilterPopover])

  // Count active column filters
  const activeFiltersCount = useMemo(() => {
    return Object.values(columnFilters).filter((v) => {
      if (v === undefined || v === null || v === '') return false
      if (Array.isArray(v)) return v.length > 0
      if (typeof v === 'object') {
        return (
          (v.min !== undefined && v.min !== '') ||
          (v.max !== undefined && v.max !== '') ||
          (v.start !== undefined && v.start !== '') ||
          (v.end !== undefined && v.end !== '')
        )
      }
      return true
    }).length
  }, [columnFilters])

  // Unique values for categorical filter popover
  const getUniqueColumnValues = useCallback((col: DataTableColumn<T>) => {
    if (col.filterOptions && col.filterOptions.length > 0) {
      return col.filterOptions.map((opt) => ({ value: String(opt.value), label: opt.label, count: 0 }))
    }
    const valCounts = new Map<string, number>()
    data.forEach((row) => {
      const val = resolveCellValue(col, row)
      if (val !== null && val !== undefined && val !== '') {
        const s = String(val)
        valCounts.set(s, (valCounts.get(s) || 0) + 1)
      }
    })
    return Array.from(valCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [data, resolveCellValue])

  // ─── 6. Client-Side Search & Multi-Column Filtering ─────────────────────────
  const filteredData = useMemo(() => {
    let result = data
    if (serverSidePagination) return result

    // A. Global Search
    if (currentSearch.trim()) {
      const query = currentSearch.toLowerCase().trim()
      result = result.filter((item) => {
        return normalizedColumns.some((col) => {
          const val = resolveCellValue(col, item)
          if (val === null || val === undefined) return false
          return String(val).toLowerCase().includes(query)
        })
      })
    }

    // B. Column-specific filters
    const activeEntries = Object.entries(columnFilters)
    if (activeEntries.length > 0) {
      result = result.filter((item) => {
        return activeEntries.every(([colId, filterVal]) => {
          if (filterVal === undefined || filterVal === null || filterVal === '') return true
          const col = normalizedColumns.find((c) => c.id === colId)
          if (!col) return true
          const cellVal = resolveCellValue(col, item)

          if (Array.isArray(filterVal)) {
            if (filterVal.length === 0) return true
            if (cellVal === null || cellVal === undefined) return false
            return filterVal.includes(String(cellVal))
          }

          if (typeof filterVal === 'object' && ('min' in filterVal || 'max' in filterVal)) {
            const num = Number(cellVal)
            if (isNaN(num)) return false
            const min = filterVal.min !== '' && filterVal.min !== undefined ? Number(filterVal.min) : null
            const max = filterVal.max !== '' && filterVal.max !== undefined ? Number(filterVal.max) : null
            if (min !== null && num < min) return false
            if (max !== null && num > max) return false
            return true
          }

          if (typeof filterVal === 'object' && ('start' in filterVal || 'end' in filterVal)) {
            if (!cellVal) return false
            const dateStr = String(cellVal).slice(0, 10)
            if (filterVal.start && dateStr < filterVal.start) return false
            if (filterVal.end && dateStr > filterVal.end) return false
            return true
          }

          const strVal = String(filterVal).toLowerCase().trim()
          return String(cellVal ?? '').toLowerCase().includes(strVal)
        })
      })
    }

    return result
  }, [data, currentSearch, columnFilters, serverSidePagination, normalizedColumns, resolveCellValue])

  // ─── 7. Universal Sorting ───────────────────────────────────────────────────
  const customExtractors = useMemo(() => {
    const map: Record<string, (item: T) => any> = {}
    normalizedColumns.forEach((col) => {
      if (col.accessorFn) {
        map[col.id] = col.accessorFn
      }
    })
    return map
  }, [normalizedColumns])

  const {
    sortedData,
    sortKey,
    sortDirection,
    requestSort,
    setSort,
    clearSort,
  } = useTableSort(filteredData, {
    initialKey: defaultSortKey || null,
    initialDirection: defaultSortDirection || 'asc',
    customExtractors,
  })

  // Notify external sort listeners if provided
  const handleSortRequest = (col: DataTableColumn<T>) => {
    if (col.sortable === false || !col.id) return
    const colId = col.id
    const nextDir =
      sortKey !== colId ? 'asc' : sortDirection === 'asc' ? 'desc' : 'asc'
    requestSort(colId, col.accessorFn, (col.type as SortType) || 'auto')
    if (externalOnSortChange) {
      externalOnSortChange(colId, nextDir)
    }
  }

  // ─── 6. Pagination Slice ────────────────────────────────────────────────────
  const totalItems = serverSidePagination
    ? controlledTotalCount ?? data.length
    : sortedData.length

  const paginatedData = useMemo(() => {
    if (serverSidePagination) return sortedData
    if (currentPageSize === -1) return sortedData
    const start = (currentPage - 1) * currentPageSize
    return sortedData.slice(start, start + currentPageSize)
  }, [sortedData, currentPage, currentPageSize, serverSidePagination])

  // ─── 7. Row Selection ───────────────────────────────────────────────────────
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string | number>>(
    new Set()
  )
  const selectedIds = controlledSelectedRowIds ?? internalSelectedIds

  const setSelectedIds = useCallback(
    (newIds: Set<string | number>) => {
      if (controlledOnSelectionChange) {
        controlledOnSelectionChange(newIds)
      } else {
        setInternalSelectedIds(newIds)
      }
    },
    [controlledOnSelectionChange]
  )

  const resolveRowId = useCallback(
    (row: T, idx: number): string | number => {
      if (getRowId) return getRowId(row, idx)
      if (typeof rowKey === 'function') return rowKey(row)
      if (typeof rowKey === 'string' && (row as any)[rowKey] !== undefined) return (row as any)[rowKey]
      return (row as any)?.id ?? (row as any)?.key ?? idx
    },
    [getRowId, rowKey]
  )

  const isAllPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row, idx) => selectedIds.has(resolveRowId(row, idx)))

  const isSomePageSelected =
    paginatedData.some((row, idx) => selectedIds.has(resolveRowId(row, idx))) &&
    !isAllPageSelected

  const handleToggleSelectAll = () => {
    const updated = new Set(selectedIds)
    if (isAllPageSelected) {
      paginatedData.forEach((row, idx) => updated.delete(resolveRowId(row, idx)))
    } else {
      paginatedData.forEach((row, idx) => updated.add(resolveRowId(row, idx)))
    }
    setSelectedIds(updated)
  }

  const handleToggleSelectRow = (rowId: string | number) => {
    const updated = new Set(selectedIds)
    if (updated.has(rowId)) {
      updated.delete(rowId)
    } else {
      updated.add(rowId)
    }
    setSelectedIds(updated)
  }

  // Selected row instances
  const selectedRows = useMemo(() => {
    return data.filter((row, idx) => selectedIds.has(resolveRowId(row, idx)))
  }, [data, selectedIds, resolveRowId])

  // ─── 8. Cell Formatter & Renderer ──────────────────────────────────────────
  const renderCellContent = (col: DataTableColumn<T>, row: T, index: number) => {
    if (col.render) {
      return col.render(row, index)
    }

    const rawVal = resolveCellValue(col, row)

    if (col.cell) {
      return col.cell({ row, value: rawVal, index, isEditMode })
    }

    switch (col.type) {
      case 'currency':
        return <span className="font-mono font-semibold text-slate-900">{formatINR(rawVal)}</span>
      case 'date':
        return <span className="text-slate-600">{formatDateIN(rawVal)}</span>
      case 'masked_aadhaar':
        return <span className="font-mono text-slate-700">{formatMaskedAadhaar(rawVal)}</span>
      case 'phone':
        return <span className="font-mono text-slate-700">{formatPhoneNumber(rawVal)}</span>
      default:
        return <span className="text-slate-700">{fallbackEmpty(rawVal)}</span>
    }
  }

  // ─── 9. Instant Multi-Format Export Engine ──────────────────────────────────
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'xlsx' | 'csv' | 'print') => {
    setIsExporting(true)
    const toastId = toast.loading(`Generating ${format.toUpperCase()} export…`)

    try {
      const exportCols = visibleColumns.filter((c) => c.id !== 'actions')
      const targetRows = sortedData

      if (format === 'csv') {
        const headerRow = exportCols.map((c) =>
          typeof c.header === 'string' ? c.header : c.id
        )
        const dataRows = targetRows.map((row) =>
          exportCols.map((col) => {
            if (col.rawExportValue) return col.rawExportValue(row)
            const v = resolveCellValue(col, row)
            return v !== null && v !== undefined ? String(v) : ''
          })
        )
        downloadCsvRows(
          `${exportConfig?.filename || tableId}_${new Date().toISOString().slice(0, 10)}.csv`,
          [headerRow, ...dataRows]
        )
        toast.success('CSV downloaded successfully!', { id: toastId })
      } else if (format === 'xlsx') {
        const mappedColumns = exportCols.map((c) => ({
          id: c.id,
          header: typeof c.header === 'string' ? c.header : c.id,
          accessorFn: (row: T) =>
            c.rawExportValue ? c.rawExportValue(row) : resolveCellValue(c, row),
          type: (c.type === 'currency'
            ? 'currency'
            : c.type === 'date'
            ? 'date'
            : c.type === 'number'
            ? 'number'
            : 'text') as any,
        }))

        exportToExcel({
          filename: `${exportConfig?.filename || tableId}_${new Date().toISOString().slice(0, 10)}`,
          sheetName: exportConfig?.sheetName || 'Data',
          columns: mappedColumns,
          data: targetRows,
        })
        toast.success('Excel workbook downloaded!', { id: toastId })
      } else if (format === 'print') {
        window.print()
        toast.dismiss(toastId)
      }
    } catch (err: any) {
      toast.error(`Export failed: ${err.message || 'Unknown error'}`, { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  // Density paddings
  const pyClass = density === 'compact' ? 'py-2' : density === 'spacious' ? 'py-4' : 'py-3'
  const pxClass = 'px-3 sm:px-4'

  return (
    <div
      className={`enterprise-datatable-wrapper flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all ${className}`}
    >
      {/* 1. Universal Table Toolbar Deck */}
      <TableToolbar
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        searchValue={currentSearch}
        onSearchChange={handleSearchChange}
        columns={normalizedColumns}
        columnVisibility={columnVisibility}
        onToggleColumnVisibility={toggleColumnVisibility}
        onResetColumns={resetColumns}
        exportConfig={exportConfig}
        onExport={handleExport}
        isExporting={isExporting}
        customFilterBar={customFilterBar}
        totalCount={totalItems}
        filteredCount={sortedData.length}
        activeFiltersCount={activeFiltersCount}
        onClearAllFilters={handleClearAllFilters}
      />

      {/* 2. Scrollable Table Container */}
      <div
        className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300 transition-colors"
        style={{ maxHeight }}
      >
        <table className="w-full text-left border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider select-none">
              {/* Optional Row Selection Checkbox */}
              {enableRowSelection && (
                <th className="py-3 px-3 w-10 text-center bg-slate-50 sticky left-0 z-10">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-slate-700 transition"
                    title={isAllPageSelected ? 'Deselect all on page' : 'Select all on page'}
                  >
                    {isAllPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-600" />
                    ) : isSomePageSelected ? (
                      <MinusSquare className="w-4 h-4 text-primary-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
              )}

              {/* Render Visible Column Headers */}
              {visibleColumns.map((col, colIdx) => {
                const isSorted = sortKey === col.id
                const isSortable = col.sortable !== false
                const isFilterable =
                  !disableColumnFiltering &&
                  col.filterable !== false &&
                  col.id !== 'actions' &&
                  col.id !== 'selection'
                const filterVal = col.id ? columnFilters[col.id] : undefined
                const hasFilter =
                  filterVal !== undefined &&
                  filterVal !== null &&
                  filterVal !== '' &&
                  (Array.isArray(filterVal) ? filterVal.length > 0 : true)
                const isStickyLeft = col.sticky === 'left'
                const isStickyRight = col.sticky === 'right'

                const stickyClasses = isStickyLeft
                  ? `sticky ${enableRowSelection ? 'left-10' : 'left-0'} z-10 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0]`
                  : isStickyRight
                  ? 'sticky right-0 z-10 bg-slate-50 shadow-[-1px_0_0_0_#e2e8f0]'
                  : ''

                const alignClass =
                  col.align === 'right'
                    ? 'justify-end text-right'
                    : col.align === 'center'
                    ? 'justify-center text-center'
                    : 'justify-start text-left'

                const uniqueValues = activeFilterPopover === col.id ? getUniqueColumnValues(col) : []
                const filteredUniqueValues = popoverSearchQuery
                  ? uniqueValues.filter((v) =>
                      v.label.toLowerCase().includes(popoverSearchQuery.toLowerCase())
                    )
                  : uniqueValues

                return (
                  <th
                    key={col.id}
                    style={{ width: col.width, minWidth: col.minWidth }}
                    className={`${pxClass} py-3 text-slate-600 relative ${stickyClasses} ${
                      isSorted || hasFilter
                        ? 'bg-primary-50/70 text-primary-950 font-bold border-b-2 border-primary-500'
                        : ''
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 ${alignClass}`}>
                      {/* 1-Click Sort Button on Header Title */}
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSortRequest(col)}
                          className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] transition-colors focus:outline-none rounded px-1 -mx-1 truncate flex-1 ${
                            isSorted ? 'text-primary-800' : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title={`Sort by ${typeof col.header === 'string' ? col.header : col.id}`}
                        >
                          <span className="truncate">{col.header}</span>
                          <span className="shrink-0 transition-opacity">
                            {isSorted && sortDirection === 'asc' ? (
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-primary-100 text-primary-700">
                                <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                              </span>
                            ) : isSorted && sortDirection === 'desc' ? (
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-primary-100 text-primary-700">
                                <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                              </span>
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-30 hover:opacity-100 transition-opacity" />
                            )}
                          </span>
                        </button>
                      ) : (
                        <div
                          className={`flex items-center gap-1 font-bold uppercase tracking-wider text-[11px] truncate flex-1 ${alignClass}`}
                        >
                          <span className="truncate">{col.header}</span>
                        </div>
                      )}

                      {/* In-Header Filter Funnel Trigger */}
                      {isFilterable && col.id && (
                        <div
                          ref={activeFilterPopover === col.id ? filterPopoverRef : undefined}
                          className="relative shrink-0"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveFilterPopover((prev) => (prev === col.id ? null : col.id!))
                              setPopoverSearchQuery('')
                            }}
                            className={`p-1 rounded-md transition-all ${
                              hasFilter
                                ? 'text-primary-700 bg-primary-100 font-bold ring-1 ring-primary-300'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-40 hover:opacity-100'
                            }`}
                            title={`Filter ${typeof col.header === 'string' ? col.header : col.id}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>

                          {/* Floating In-Header Filter Popover */}
                          {activeFilterPopover === col.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute ${
                                colIdx > visibleColumns.length - 3 ? 'right-0' : 'left-0'
                              } mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-40 text-left font-normal animate-in fade-in zoom-in-95 duration-100 select-text`}
                            >
                              {/* Popover Header */}
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Filter className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                                  <span className="text-xs font-bold text-slate-800 truncate">
                                    Filter {typeof col.header === 'string' ? col.header : col.id}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveFilterPopover(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Number / Currency Range Filter */}
                              {(col.type === 'currency' || col.type === 'number') && (
                                <div className="space-y-2 text-xs">
                                  <span className="text-[11px] font-semibold text-slate-500">Numeric Range:</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-0.5">Min</label>
                                      <input
                                        type="number"
                                        placeholder="0"
                                        value={columnFilters[col.id]?.min ?? ''}
                                        onChange={(e) =>
                                          handleSetColumnFilter(col.id!, {
                                            ...columnFilters[col.id!],
                                            min: e.target.value,
                                          })
                                        }
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-0.5">Max</label>
                                      <input
                                        type="number"
                                        placeholder="Max"
                                        value={columnFilters[col.id]?.max ?? ''}
                                        onChange={(e) =>
                                          handleSetColumnFilter(col.id!, {
                                            ...columnFilters[col.id!],
                                            max: e.target.value,
                                          })
                                        }
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Date Range Filter */}
                              {col.type === 'date' && (
                                <div className="space-y-2 text-xs">
                                  <span className="text-[11px] font-semibold text-slate-500">Date Range:</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-0.5">From</label>
                                      <input
                                        type="date"
                                        value={columnFilters[col.id]?.start ?? ''}
                                        onChange={(e) =>
                                          handleSetColumnFilter(col.id!, {
                                            ...columnFilters[col.id!],
                                            start: e.target.value,
                                          })
                                        }
                                        className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-0.5">To</label>
                                      <input
                                        type="date"
                                        value={columnFilters[col.id]?.end ?? ''}
                                        onChange={(e) =>
                                          handleSetColumnFilter(col.id!, {
                                            ...columnFilters[col.id!],
                                            end: e.target.value,
                                          })
                                        }
                                        className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Categorical / Multi-select Checklist */}
                              {col.type !== 'currency' && col.type !== 'number' && col.type !== 'date' && (
                                <div className="space-y-2">
                                  {uniqueValues.length > 5 && (
                                    <div className="relative">
                                      <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                                      <input
                                        type="text"
                                        placeholder="Search values..."
                                        value={popoverSearchQuery}
                                        onChange={(e) => setPopoverSearchQuery(e.target.value)}
                                        className="w-full pl-6 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                                      />
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const allVals = uniqueValues.map((v) => v.value)
                                        handleSetColumnFilter(col.id!, allVals)
                                      }}
                                      className="text-primary-600 hover:underline font-semibold"
                                    >
                                      Select All
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleClearColumnFilter(col.id!)}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      Clear Selection
                                    </button>
                                  </div>

                                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 text-xs divide-y divide-slate-50 scrollbar-thin">
                                    {filteredUniqueValues.length === 0 ? (
                                      <div className="py-3 text-center text-slate-400 text-xs">
                                        No matching values
                                      </div>
                                    ) : (
                                      filteredUniqueValues.map((item) => {
                                        const currentSelected: string[] = Array.isArray(
                                          columnFilters[col.id!]
                                        )
                                          ? columnFilters[col.id!]
                                          : []
                                        const isChecked = currentSelected.includes(item.value)

                                        return (
                                          <label
                                            key={item.value}
                                            htmlFor={`filter_${col.id}_${item.value}`}
                                            className="flex items-center justify-between gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer text-slate-700"
                                          >
                                            <div className="flex items-center gap-2 truncate">
                                              <input
                                                id={`filter_${col.id}_${item.value}`}
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                  const next = isChecked
                                                    ? currentSelected.filter((v) => v !== item.value)
                                                    : [...currentSelected, item.value]
                                                  handleSetColumnFilter(col.id!, next)
                                                }}
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                                              />
                                              <span className="truncate">{item.label}</span>
                                            </div>
                                            {item.count > 0 && (
                                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded shrink-0">
                                                {item.count}
                                              </span>
                                            )}
                                          </label>
                                        )
                                      })
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Popover Footer */}
                              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleClearColumnFilter(col.id!)}
                                  disabled={!hasFilter}
                                  className={`text-[11px] font-semibold ${
                                    hasFilter
                                      ? 'text-rose-600 hover:text-rose-700'
                                      : 'text-slate-300 cursor-not-allowed'
                                  }`}
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveFilterPopover(null)}
                                  className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-md shadow-2xs"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 text-xs">
            {/* Loading State */}
            {isLoading && (
              <tr>
                <td
                  colSpan={visibleColumns.length + (enableRowSelection ? 1 : 0)}
                  className="py-12 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span>{loadingMessage}</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty State */}
            {!isLoading && paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + (enableRowSelection ? 1 : 0)}
                  className="py-12 text-center text-slate-400"
                >
                  {emptyState ? (
                    emptyState
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      {emptyIcon || <Layers className="w-8 h-8 text-slate-300" />}
                      <p className="text-slate-600 font-medium">{emptyMessage}</p>
                      {currentSearch && (
                        <button
                          type="button"
                          onClick={() => handleSearchChange('')}
                          className="text-primary-600 hover:text-primary-800 text-xs font-semibold mt-1"
                        >
                          Clear search filters
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {!isLoading &&
              paginatedData.map((row, rowIndex) => {
                const rowId = getRowId
                  ? getRowId(row, rowIndex)
                  : typeof rowKey === 'function'
                  ? rowKey(row)
                  : typeof rowKey === 'string' && (row as any)[rowKey] !== undefined
                  ? (row as any)[rowKey]
                  : (row as any)?.id ?? (row as any)?.key ?? rowIndex
                const isSelected = selectedIds.has(rowId)
                const customRowClass =
                  typeof rowClassName === 'function'
                    ? rowClassName(row, rowIndex)
                    : rowClassName || ''

                return (
                  <tr
                    key={String(rowId)}
                    onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                    className={`group transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
                      isSelected
                        ? 'bg-primary-50/50 hover:bg-primary-50/80'
                        : 'hover:bg-slate-50/70 bg-white'
                    } ${customRowClass}`}
                  >
                    {/* Row Selection Checkbox */}
                    {enableRowSelection && (
                      <td
                        className={`py-3 px-3 w-10 text-center sticky left-0 z-10 transition-colors ${
                          isSelected ? 'bg-primary-50/50' : 'bg-white group-hover:bg-slate-50/70'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(rowId)}
                          className="text-slate-400 hover:text-slate-700 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    )}

                    {/* Columns */}
                    {visibleColumns.map((col) => {
                      const isStickyLeft = col.sticky === 'left'
                      const isStickyRight = col.sticky === 'right'

                      const stickyClasses = isStickyLeft
                        ? `sticky ${
                            enableRowSelection ? 'left-10' : 'left-0'
                          } z-10 shadow-[1px_0_0_0_#e2e8f0] ${
                            isSelected ? 'bg-primary-50/50' : 'bg-white group-hover:bg-slate-50/70'
                          }`
                        : isStickyRight
                        ? `sticky right-0 z-10 shadow-[-1px_0_0_0_#e2e8f0] ${
                            isSelected ? 'bg-primary-50/50' : 'bg-white group-hover:bg-slate-50/70'
                          }`
                        : ''

                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'

                      return (
                        <td
                          key={col.id}
                          className={`${pxClass} ${pyClass} ${alignClass} ${stickyClasses} transition-colors`}
                        >
                          {renderCellContent(col, row, rowIndex)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {/* 3. Floating Bulk Action Dock (if items selected) */}
      {enableRowSelection && selectedIds.size > 0 && bulkActions && (
        <div className="flex items-center justify-between p-3 bg-slate-900 text-white animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <span>
              {selectedIds.size} {selectedIds.size === 1 ? 'record' : 'records'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions(selectedIds, selectedRows)}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white rounded border border-slate-700 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 4. Table Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-t border-slate-200">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Rows per page:</span>
          <select
            value={currentPageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === -1 ? 'All' : opt}
              </option>
            ))}
          </select>
        </div>

        {/* Universal Pagination */}
        <Pagination
          page={currentPage}
          pageSize={currentPageSize === -1 ? totalItems || 1 : currentPageSize}
          total={totalItems}
          onChange={handlePageChange}
        />
      </div>
    </div>
  )
}
export default EnterpriseDataTable
