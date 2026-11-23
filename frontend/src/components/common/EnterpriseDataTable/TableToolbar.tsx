/**
 * @file        TableToolbar.tsx
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
 * @description Universal toolbar deck with debounced search, column visibility toggle, and instant multi-format exports.
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  X,
  Columns,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
  RotateCcw,
  Filter,
} from 'lucide-react'
import type { DataTableColumn, TableExportConfig } from './types'

interface TableToolbarProps<T = any> {
  searchable?: boolean
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (val: string) => void
  columns: DataTableColumn<T>[]
  columnVisibility: Record<string, boolean>
  onToggleColumnVisibility: (colId: string) => void
  onResetColumns: () => void
  exportConfig?: TableExportConfig<T>
  onExport: (format: 'xlsx' | 'csv' | 'print') => void
  isExporting?: boolean
  customFilterBar?: React.ReactNode
  totalCount: number
  filteredCount: number
  activeFiltersCount?: number
  onClearAllFilters?: () => void
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  columns,
  columnVisibility,
  onToggleColumnVisibility,
  onResetColumns,
  exportConfig,
  onExport,
  isExporting = false,
  customFilterBar,
  totalCount,
  filteredCount,
  activeFiltersCount = 0,
  onClearAllFilters,
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue)
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const columnsMenuRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Sync external search value
  useEffect(() => {
    setLocalSearch(searchValue)
  }, [searchValue])

  // Debounced search trigger (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [localSearch, searchValue, onSearchChange])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setShowColumnsMenu(false)
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hideableColumns = columns.filter((col) => col.hideable !== false)
  const enabledFormats = exportConfig?.enabledFormats || ['xlsx', 'csv', 'print']

  return (
    <div className="flex flex-col gap-2.5 p-3 sm:p-4 bg-slate-50/80 border-b border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Search Bar */}
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('')
                  onSearchChange('')
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Action Controls Group: Column Toggle, Export, Counts */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Active Filter Clear Button */}
          {activeFiltersCount > 0 && onClearAllFilters && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 shadow-2xs transition"
              title="Clear all active column filters"
            >
              <Filter className="w-3.5 h-3.5 text-primary-600" />
              <span>Filters ({activeFiltersCount})</span>
              <X className="w-3 h-3 text-primary-500 hover:text-primary-800" />
            </button>
          )}

          {/* Column Visibility Menu */}
          {hideableColumns.length > 0 && (
            <div className="relative" ref={columnsMenuRef}>
              <button
                type="button"
                onClick={() => setShowColumnsMenu((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  showColumnsMenu
                    ? 'bg-slate-200 text-slate-900 border-slate-300 shadow-inner'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                }`}
                title="Customize table columns"
              >
                <Columns className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Columns</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showColumnsMenu && (
                <div className="absolute right-0 mt-1.5 w-56 p-2 bg-white border border-slate-200 rounded-xl shadow-lg z-30 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                    <span>Visible Columns</span>
                    <button
                      type="button"
                      onClick={onResetColumns}
                      className="inline-flex items-center gap-1 text-[11px] font-normal text-primary-600 hover:text-primary-800"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 text-xs">
                    {hideableColumns.map((col) => {
                      const colId = col.id || ''
                      const isVisible =
                        columnVisibility[colId] !== undefined
                          ? columnVisibility[colId] === true
                          : col.defaultVisible !== false
                      return (
                        <label
                          key={colId}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => onToggleColumnVisibility(colId)}
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                          />
                          <span className="truncate">{col.header}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Menu */}
          {enabledFormats.length > 0 && (
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu((prev) => !prev)}
                disabled={isExporting}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  showExportMenu
                    ? 'bg-slate-200 text-slate-900 border-slate-300 shadow-inner'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                }`}
                title="Export table data"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-44 p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 animate-in fade-in zoom-in-95 duration-100">
                  {enabledFormats.includes('xlsx') && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false)
                        onExport('xlsx')
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Excel (.xlsx)</span>
                    </button>
                  )}
                  {enabledFormats.includes('csv') && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false)
                        onExport('csv')
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>CSV (.csv)</span>
                    </button>
                  )}
                  {enabledFormats.includes('print') && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false)
                        onExport('print')
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg transition"
                    >
                      <Printer className="w-4 h-4 text-indigo-600" />
                      <span>Print Docket</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Record Telemetry Counter */}
          <div className="hidden lg:flex items-center px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg shadow-2xs">
            {filteredCount !== totalCount ? (
              <span>
                <strong className="text-slate-900">{filteredCount}</strong> of {totalCount}
              </span>
            ) : (
              <span>
                <strong className="text-slate-900">{totalCount}</strong> records
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Optional Workspace Filter Row */}
      {customFilterBar && <div className="pt-1">{customFilterBar}</div>}
    </div>
  )
}
