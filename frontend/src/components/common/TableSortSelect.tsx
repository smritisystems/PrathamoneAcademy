/**
 * @file        TableSortSelect.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-10
 * @updated     2026-11-10
 *
 * @description Filter-bar sort selector dropdown with Ascending / Descending direction toggle.
 */

import React from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react'
import type { SortDirection, SortType } from '../../hooks/useTableSort'

export interface TableSortOption {
  key: string
  label: string
  defaultDirection?: SortDirection
  type?: SortType
}

export interface TableSortSelectProps {
  options: TableSortOption[]
  currentSortKey?: string | null
  currentDirection?: SortDirection | null
  onSortChange: (key: string, direction: SortDirection) => void
  onClear?: () => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export const TableSortSelect: React.FC<TableSortSelectProps> = ({
  options,
  currentSortKey,
  currentDirection,
  onSortChange,
  onClear,
  className = '',
  placeholder = 'Sort By...',
  disabled = false,
}) => {
  const isSorted = Boolean(currentSortKey)
  const activeDirection: SortDirection = currentDirection || 'asc'

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedKey = e.target.value
    if (!selectedKey) {
      if (onClear) onClear()
      return
    }

    const opt = options.find((o) => o.key === selectedKey)
    const initialDir = opt?.defaultDirection || activeDirection || 'asc'
    onSortChange(selectedKey, initialDir)
  }

  const handleToggleDirection = () => {
    if (!currentSortKey) {
      if (options.length > 0) {
        onSortChange(options[0].key, 'asc')
      }
      return
    }
    const nextDir: SortDirection = activeDirection === 'asc' ? 'desc' : 'asc'
    onSortChange(currentSortKey, nextDir)
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="relative inline-flex items-center">
        <select
          value={currentSortKey || ''}
          onChange={handleSelectChange}
          disabled={disabled}
          title="Select sort column"
          className="input text-xs py-1.5 pl-2.5 pr-7 bg-white border border-slate-300 rounded-lg shadow-2xs font-medium text-slate-700 hover:border-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors cursor-pointer disabled:opacity-50"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Direction Toggle Button */}
      <button
        type="button"
        onClick={handleToggleDirection}
        disabled={disabled || !isSorted}
        title={
          !isSorted
            ? 'Select a sort column first'
            : activeDirection === 'asc'
            ? 'Order: Ascending (Click to sort Descending)'
            : 'Order: Descending (Click to sort Ascending)'
        }
        className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
          !isSorted
            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            : 'bg-primary-50 text-primary-700 border-primary-300 hover:bg-primary-100 shadow-2xs cursor-pointer'
        }`}
      >
        {activeDirection === 'asc' ? (
          <>
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[11px] uppercase tracking-wider font-bold">ASC</span>
          </>
        ) : (
          <>
            <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[11px] uppercase tracking-wider font-bold">DESC</span>
          </>
        )}
      </button>

      {/* Reset Sort Button */}
      {isSorted && onClear && (
        <button
          type="button"
          onClick={onClear}
          title="Clear sorting"
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export default TableSortSelect
