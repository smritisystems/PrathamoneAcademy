/**
 * @file        useTableColumnFilters.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.hooks
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-26
 * @updated     2026-11-26
 *
 * @description Reusable SSOT hook for in-header column filtering (text, multi-select,
 */

import { useState, useMemo, useCallback } from 'react'

export type ColumnFilterType = 'text' | 'select' | 'number_range' | 'date_range'

export interface NumberRangeFilterValue {
  min?: string | number
  max?: string | number
}

export interface DateRangeFilterValue {
  from?: string
  to?: string
}

export interface ColumnFilterOption {
  label: string
  value: string
  count?: number
}

export interface ColumnFilterDefinition<T = any> {
  type: ColumnFilterType
  accessor: (item: T) => any
}

export function isColumnFilterActive(value: any): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') {
    const minVal = value.min
    const maxVal = value.max
    const fromVal = value.from
    const toVal = value.to
    return Boolean(
      (minVal !== undefined && minVal !== null && String(minVal).trim() !== '') ||
        (maxVal !== undefined && maxVal !== null && String(maxVal).trim() !== '') ||
        (fromVal !== undefined && fromVal !== null && String(fromVal).trim() !== '') ||
        (toVal !== undefined && toVal !== null && String(toVal).trim() !== '')
    )
  }
  return false
}

export function buildSelectOptionsFromRows<T>(
  rows: T[],
  accessor: (item: T) => any,
  emptyLabel = '—'
): ColumnFilterOption[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const raw = accessor(row)
    const strVal =
      raw === null || raw === undefined || String(raw).trim() === ''
        ? ''
        : String(raw).trim()
    counts.set(strVal, (counts.get(strVal) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
    .map(([val, count]) => ({
      value: val,
      label: val === '' ? emptyLabel : val,
      count,
    }))
}

export function useTableColumnFilters<T = any>(
  items: T[] = [],
  definitions: Record<string, ColumnFilterDefinition<T>>
) {
  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({})

  const setColumnFilter = useCallback((key: string, value: any) => {
    setColumnFilters((prev) => {
      if (!isColumnFilterActive(value)) {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const clearColumnFilter = useCallback((key: string) => {
    setColumnFilters((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setColumnFilters({})
  }, [])

  const isColumnFiltered = useCallback(
    (key: string) => isColumnFilterActive(columnFilters[key]),
    [columnFilters]
  )

  const activeFilterCount = useMemo(
    () => Object.keys(columnFilters).filter((k) => isColumnFilterActive(columnFilters[k])).length,
    [columnFilters]
  )

  const filteredData = useMemo(() => {
    const activeKeys = Object.keys(columnFilters).filter(
      (key) => isColumnFilterActive(columnFilters[key]) && Boolean(definitions[key])
    )
    if (activeKeys.length === 0) return items

    return items.filter((item) => {
      for (const key of activeKeys) {
        const def = definitions[key]
        const filterVal = columnFilters[key]
        const raw = def.accessor(item)

        if (def.type === 'text') {
          const needle = String(filterVal).trim().toLowerCase()
          const haystack = raw === null || raw === undefined ? '' : String(raw).toLowerCase()
          if (!haystack.includes(needle)) return false
        } else if (def.type === 'select') {
          const selected: string[] = Array.isArray(filterVal) ? filterVal : []
          if (selected.length > 0) {
            const valStr =
              raw === null || raw === undefined || String(raw).trim() === ''
                ? ''
                : String(raw).trim()
            if (!selected.includes(valStr)) return false
          }
        } else if (def.type === 'number_range') {
          const numVal = Number(raw)
          if (Number.isNaN(numVal)) return false
          const hasMin =
            filterVal.min !== undefined && filterVal.min !== null && String(filterVal.min).trim() !== ''
          const hasMax =
            filterVal.max !== undefined && filterVal.max !== null && String(filterVal.max).trim() !== ''
          if (hasMin && numVal < Number(filterVal.min)) return false
          if (hasMax && numVal > Number(filterVal.max)) return false
        } else if (def.type === 'date_range') {
          const strDate = raw ? String(raw).slice(0, 10) : ''
          if (!strDate) return false
          if (filterVal.from && strDate < String(filterVal.from)) return false
          if (filterVal.to && strDate > String(filterVal.to)) return false
        }
      }
      return true
    })
  }, [items, columnFilters, definitions])

  return {
    filteredData,
    columnFilters,
    setColumnFilter,
    clearColumnFilter,
    clearAllFilters,
    isColumnFiltered,
    activeFilterCount,
  }
}

export default useTableColumnFilters
