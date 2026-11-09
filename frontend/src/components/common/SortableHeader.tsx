/**
 * @file        SortableHeader.tsx
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
 * @description Accessible, keyboard-navigable table header button with ASC/DESC sort indicators.
 */

import React from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import type { SortDirection, SortType } from '../../hooks/useTableSort'

export interface SortableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnKey: string
  label: React.ReactNode
  currentSortKey?: string | null
  currentDirection?: SortDirection | null
  onSort?: (key: string, accessor?: any, type?: SortType) => void
  align?: 'left' | 'center' | 'right'
  className?: string
  sortable?: boolean
  accessor?: (item: any) => any
  sortType?: SortType
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  columnKey,
  label,
  currentSortKey,
  currentDirection,
  onSort,
  align = 'left',
  className = '',
  sortable = true,
  accessor,
  sortType = 'auto',
  children,
  ...thProps
}) => {
  const isSorted = currentSortKey === columnKey
  const direction = isSorted ? currentDirection : null

  const handleClick = () => {
    if (!sortable || !onSort) return
    onSort(columnKey, accessor, sortType)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!sortable || !onSort) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSort(columnKey, accessor, sortType)
    }
  }

  const alignClass =
    align === 'right'
      ? 'justify-end text-right'
      : align === 'center'
      ? 'justify-center text-center'
      : 'justify-start text-left'

  const directionText = !isSorted
    ? 'Click to sort ascending'
    : direction === 'asc'
    ? 'Ascending (click for descending)'
    : 'Descending (click to clear)'

  const displayTitle =
    typeof label === 'string'
      ? `${label} - ${directionText}`
      : `Sort: ${columnKey} - ${directionText}`

  return (
    <th
      {...thProps}
      className={`py-3 px-4 select-none transition-colors group ${
        isSorted
          ? 'bg-primary-50/70 text-primary-950 font-bold border-b-2 border-primary-500'
          : sortable
          ? 'hover:bg-slate-100/70 text-slate-600'
          : 'text-slate-600'
      } ${className}`}
      aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      {sortable ? (
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          title={displayTitle}
          className={`w-full flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 rounded px-1 -mx-1 ${alignClass} ${
            isSorted ? 'text-primary-800' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="truncate">{label || children}</span>
          <span className="shrink-0 transition-opacity">
            {isSorted && direction === 'asc' ? (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-primary-100 text-primary-700 shadow-2xs">
                <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              </span>
            ) : isSorted && direction === 'desc' ? (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-primary-100 text-primary-700 shadow-2xs">
                <ArrowDown className="w-3 h-3 stroke-[2.5]" />
              </span>
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </button>
      ) : (
        <div
          className={`flex items-center gap-1 font-bold uppercase tracking-wider text-[11px] ${alignClass}`}
        >
          <span>{label || children}</span>
        </div>
      )}
    </th>
  )
}

export default SortableHeader
