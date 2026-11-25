/**
 * @file        SortableHeader.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.1.0
 * @created     2026-11-10
 * @updated     2026-11-26
 *
 * @description Accessible, keyboard-navigable table header with ASC/DESC sort indicators
 */

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, Search, X, Check } from 'lucide-react'
import type { SortDirection, SortType } from '../../hooks/useTableSort'
import {
  isColumnFilterActive,
  type ColumnFilterType,
  type ColumnFilterOption,
} from '../../hooks/useTableColumnFilters'

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
  /** Optional in-header filter configuration */
  filterType?: ColumnFilterType
  filterValue?: any
  onFilterChange?: (key: string, value: any) => void
  filterOptions?: ColumnFilterOption[]
  filterPlaceholder?: string
  /** Optional secondary checklist facet inside same popover (e.g. Priority on Student Name) */
  secondaryFacetLabel?: string
  secondaryFacetOptions?: ColumnFilterOption[]
  secondaryFacetValue?: string[]
  onSecondaryFacetChange?: (values: string[]) => void
  /** Use slightly tighter padding for dense pivot/matrix headers */
  compact?: boolean
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
  filterType,
  filterValue,
  onFilterChange,
  filterOptions = [],
  filterPlaceholder,
  secondaryFacetLabel,
  secondaryFacetOptions,
  secondaryFacetValue = [],
  onSecondaryFacetChange,
  compact = false,
  children,
  ...thProps
}) => {
  const isSorted = currentSortKey === columnKey
  const direction = isSorted ? currentDirection : null
  const canFilter = Boolean(filterType && onFilterChange)
  const hasPrimaryFilter = isColumnFilterActive(filterValue)
  const hasSecondaryFilter = Array.isArray(secondaryFacetValue) && secondaryFacetValue.length > 0
  const isFiltered = hasPrimaryFilter || hasSecondaryFilter

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [optionSearch, setOptionSearch] = useState('')
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const triggerBtnRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const labelString = typeof label === 'string' ? label : columnKey

  const updatePopoverPosition = () => {
    const el = triggerBtnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const popoverWidth = 248
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800

    let left = align === 'right' ? rect.right - popoverWidth : rect.left
    if (left + popoverWidth > viewportW - 12) {
      left = Math.max(12, viewportW - popoverWidth - 12)
    }
    if (left < 12) {
      left = 12
    }

    let top = rect.bottom + 6
    if (top + 280 > viewportH && rect.top > 290) {
      top = Math.max(12, rect.top - 280)
    }

    setPopoverCoords({ top, left })
  }

  useEffect(() => {
    if (!isFilterOpen) return
    updatePopoverPosition()

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerBtnRef.current &&
        !triggerBtnRef.current.contains(target)
      ) {
        setIsFilterOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterOpen(false)
      }
    }

    const handleReposition = () => updatePopoverPosition()

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [isFilterOpen])

  const filteredSelectOptions = useMemo(() => {
    if (!optionSearch.trim()) return filterOptions
    const q = optionSearch.trim().toLowerCase()
    return filterOptions.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [filterOptions, optionSearch])

  const handleSortClick = () => {
    if (!sortable || !onSort) return
    onSort(columnKey, accessor, sortType)
  }

  const handleSortKeyDown = (e: React.KeyboardEvent) => {
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

  const paddingClass = compact ? 'py-2.5 px-2.5' : 'py-3 px-4'

  const handleClearHeaderFilter = () => {
    onFilterChange?.(columnKey, undefined)
    if (onSecondaryFacetChange) {
      onSecondaryFacetChange([])
    }
    setOptionSearch('')
  }

  const toggleSelectOption = (val: string) => {
    if (!onFilterChange) return
    const current: string[] = Array.isArray(filterValue) ? filterValue : []
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
    onFilterChange(columnKey, next.length > 0 ? next : undefined)
  }

  const toggleSecondaryFacet = (val: string) => {
    if (!onSecondaryFacetChange) return
    const current = Array.isArray(secondaryFacetValue) ? secondaryFacetValue : []
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
    onSecondaryFacetChange(next)
  }

  const popoverBody = isFilterOpen && canFilter ? (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`Filter ${labelString}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ top: `${popoverCoords.top}px`, left: `${popoverCoords.left}px`, width: '248px' }}
      className="fixed z-9999 bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-left font-normal normal-case tracking-normal text-slate-700 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Popover Title & Clear */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider truncate">
          Filter: {labelString}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isFiltered && (
            <button
              type="button"
              onClick={handleClearHeaderFilter}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            aria-label={`Close ${labelString} filter`}
            onClick={() => setIsFilterOpen(false)}
            className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Sort Shortcuts inside Popover */}
      {sortable && onSort && (
        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          <button
            type="button"
            onClick={() => onSort(columnKey, accessor, sortType)}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
              isSorted && direction === 'asc'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowUp className="w-3 h-3" />
            Toggle Sort
          </button>
          {isSorted ? (
            <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50/60 border border-emerald-200 text-emerald-800 flex items-center justify-center gap-1">
              {direction === 'asc' ? 'ASC Active' : 'DESC Active'}
            </span>
          ) : (
            <span className="px-2 py-1 rounded-lg text-[10px] text-slate-400 bg-slate-50 border border-slate-100 flex items-center justify-center">
              Unsorted
            </span>
          )}
        </div>
      )}

      {/* Filter Inputs by Type */}
      {filterType === 'text' && (
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={typeof filterValue === 'string' ? filterValue : ''}
              onChange={(e) => onFilterChange?.(columnKey, e.target.value)}
              placeholder={filterPlaceholder || `Search ${labelString.toLowerCase()}...`}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
            />
            {typeof filterValue === 'string' && filterValue && (
              <button
                type="button"
                aria-label="Clear text filter"
                onClick={() => onFilterChange?.(columnKey, '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {filterType === 'select' && (
        <div className="space-y-2">
          {filterOptions.length > 5 && (
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={optionSearch}
                onChange={(e) => setOptionSearch(e.target.value)}
                placeholder="Search options..."
                className="w-full pl-7 pr-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 px-0.5">
            <button
              type="button"
              onClick={() =>
                onFilterChange?.(
                  columnKey,
                  filteredSelectOptions.map((o) => o.value)
                )
              }
              className="hover:text-emerald-700 cursor-pointer"
            >
              Select All ({filteredSelectOptions.length})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange?.(columnKey, undefined)}
              className="hover:text-rose-600 cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
            {filteredSelectOptions.length === 0 ? (
              <div className="py-3 text-center text-[11px] text-slate-400">No matching options</div>
            ) : (
              filteredSelectOptions.map((opt) => {
                const selectedArr: string[] = Array.isArray(filterValue) ? filterValue : []
                const isChecked = selectedArr.includes(opt.value)
                return (
                  <label
                    key={`${opt.value}-${opt.label}`}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectOption(opt.value)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
                      />
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {typeof opt.count === 'number' && (
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{opt.count}</span>
                    )}
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}

      {filterType === 'number_range' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Min</label>
            <input
              type="number"
              value={filterValue?.min ?? ''}
              onChange={(e) =>
                onFilterChange?.(columnKey, {
                  ...(filterValue || {}),
                  min: e.target.value,
                })
              }
              placeholder="0"
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Max</label>
            <input
              type="number"
              value={filterValue?.max ?? ''}
              onChange={(e) =>
                onFilterChange?.(columnKey, {
                  ...(filterValue || {}),
                  max: e.target.value,
                })
              }
              placeholder="Any"
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {filterType === 'date_range' && (
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={filterValue?.from ?? ''}
              onChange={(e) =>
                onFilterChange?.(columnKey, {
                  ...(filterValue || {}),
                  from: e.target.value,
                })
              }
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={filterValue?.to ?? ''}
              onChange={(e) =>
                onFilterChange?.(columnKey, {
                  ...(filterValue || {}),
                  to: e.target.value,
                })
              }
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Optional Secondary Facet (e.g., Priority tags inside Student Name & Priority header) */}
      {secondaryFacetOptions && secondaryFacetOptions.length > 0 && onSecondaryFacetChange && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {secondaryFacetLabel || 'Priority'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {secondaryFacetOptions.map((opt) => {
              const active = secondaryFacetValue.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleSecondaryFacet(opt.value)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                    active
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {active && <Check className="w-2.5 h-2.5" />}
                  <span>{opt.label}</span>
                  {typeof opt.count === 'number' && (
                    <span className={active ? 'text-emerald-100' : 'text-slate-400'}>({opt.count})</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  ) : null

  return (
    <th
      {...thProps}
      className={`${paddingClass} select-none transition-colors group ${
        isSorted
          ? 'bg-primary-50/70 text-primary-950 font-bold border-b-2 border-primary-500'
          : sortable
          ? 'hover:bg-slate-100/70 text-slate-600'
          : 'text-slate-600'
      } ${className}`}
      aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <div className={`flex items-center gap-1 ${alignClass}`}>
        {sortable ? (
          <button
            type="button"
            onClick={handleSortClick}
            onKeyDown={handleSortKeyDown}
            title={displayTitle}
            className={`flex items-center gap-1 font-bold uppercase tracking-wider text-[11px] transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 rounded px-1 -mx-1 cursor-pointer min-w-0 ${
              canFilter ? '' : 'w-full'
            } ${alignClass} ${isSorted ? 'text-primary-800' : 'text-slate-600 hover:text-slate-900'}`}
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
                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              )}
            </span>
          </button>
        ) : (
          <div className={`font-bold uppercase tracking-wider text-[11px] text-slate-600 min-w-0 ${alignClass}`}>
            {label || children}
          </div>
        )}

        {canFilter && (
          <button
            ref={triggerBtnRef}
            type="button"
            aria-label={`Filter ${labelString}`}
            aria-expanded={isFilterOpen}
            title={`Filter ${labelString}`}
            onClick={(e) => {
              e.stopPropagation()
              setIsFilterOpen((prev) => !prev)
            }}
            className={`shrink-0 p-1 rounded-md transition-colors cursor-pointer ${
              isFiltered
                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400/60'
                : isFilterOpen
                ? 'bg-slate-200 text-slate-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <Filter className="w-3 h-3" />
          </button>
        )}
      </div>

      {typeof document !== 'undefined' && popoverBody ? createPortal(popoverBody, document.body) : popoverBody}
    </th>
  )
}

export default SortableHeader
