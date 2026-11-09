/**
 * @file        useTableSort.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.hooks
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
 * @description Universal single-source-of-truth table sorting hook supporting multi-type
 */

import { useState, useMemo, useCallback } from 'react'

export type SortDirection = 'asc' | 'desc'
export type SortType = 'auto' | 'string' | 'number' | 'date'

export interface SortConfig<T = any> {
  key: string
  direction: SortDirection
  accessor?: (item: T) => any
  type?: SortType
}

export interface UseTableSortOptions<T = any> {
  initialKey?: string | null
  initialDirection?: SortDirection | null
  initialAccessor?: (item: T) => any
  initialType?: SortType
  triState?: boolean // When true: asc -> desc -> null. When false: asc <-> desc.
  customExtractors?: Record<string, (item: T) => any>
}

/**
 * Safely extracts a nested property value using dot-notation.
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined
  if (!path.includes('.')) return obj[path]
  return path.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), obj)
}

/**
 * Checks if a value is consider empty/nullish for sorting (sorted to bottom).
 */
function isEmptyValue(val: any): boolean {
  return val === null || val === undefined || val === ''
}

/**
 * Evaluates whether a string resembles an ISO date format (YYYY-MM-DD...).
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/

export function useTableSort<T = any>(
  items: T[] = [],
  options: UseTableSortOptions<T> = {}
) {
  const {
    initialKey = null,
    initialDirection = 'asc',
    initialAccessor,
    initialType = 'auto',
    triState = true,
    customExtractors = {},
  } = options

  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(() => {
    if (initialKey && initialDirection) {
      return {
        key: initialKey,
        direction: initialDirection,
        accessor: initialAccessor || customExtractors[initialKey],
        type: initialType,
      }
    }
    return null
  })

  /**
   * Request or toggle sorting for a specific column.
   */
  const requestSort = useCallback(
    (key: string, accessor?: (item: T) => any, type: SortType = 'auto') => {
      setSortConfig((prev) => {
        const resolvedAccessor = accessor || customExtractors[key] || prev?.accessor

        if (!prev || prev.key !== key) {
          return { key, direction: 'asc', accessor: resolvedAccessor, type }
        }

        if (prev.direction === 'asc') {
          return { key, direction: 'desc', accessor: resolvedAccessor, type: prev.type || type }
        }

        if (triState) {
          return null
        }

        return { key, direction: 'asc', accessor: resolvedAccessor, type: prev.type || type }
      })
    },
    [customExtractors, triState]
  )

  /**
   * Explicitly set the sort column and direction (e.g. from a filter dropdown).
   */
  const setSort = useCallback(
    (key: string, direction: SortDirection, accessor?: (item: T) => any, type: SortType = 'auto') => {
      const resolvedAccessor = accessor || customExtractors[key]
      setSortConfig({ key, direction, accessor: resolvedAccessor, type })
    },
    [customExtractors]
  )

  /**
   * Reset sorting state to default unsorted.
   */
  const clearSort = useCallback(() => {
    setSortConfig(null)
  }, [])

  /**
   * Get current sort direction for a specific key.
   */
  const getSortDirection = useCallback(
    (key: string): SortDirection | null => {
      if (sortConfig && sortConfig.key === key) {
        return sortConfig.direction
      }
      return null
    },
    [sortConfig]
  )

  /**
   * Memoized sorted records.
   */
  const sortedData = useMemo(() => {
    if (!items || items.length === 0 || !sortConfig) {
      return items || []
    }

    const { key, direction, accessor, type = 'auto' } = sortConfig
    const multiplier = direction === 'asc' ? 1 : -1

    return [...items].sort((a, b) => {
      let valA = accessor ? accessor(a) : getNestedValue(a, key)
      let valB = accessor ? accessor(b) : getNestedValue(b, key)

      // Handle nullish/empty values (always placed at the bottom regardless of direction)
      const aEmpty = isEmptyValue(valA)
      const bEmpty = isEmptyValue(valB)
      if (aEmpty && bEmpty) return 0
      if (aEmpty) return 1
      if (bEmpty) return -1

      // 1. Explicit Number sorting or numeric type
      if (type === 'number') {
        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[^0-9.-]/g, ''))
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[^0-9.-]/g, ''))
        if (!isNaN(numA) && !isNaN(numB)) {
          return (numA - numB) * multiplier
        }
      }

      // 2. Explicit Date sorting
      if (type === 'date') {
        const timeA = new Date(valA).getTime()
        const timeB = new Date(valB).getTime()
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return (timeA - timeB) * multiplier
        }
      }

      // 3. Auto-detection
      if (type === 'auto') {
        // Both are numbers
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * multiplier
        }

        // Both are booleans
        if (typeof valA === 'boolean' && typeof valB === 'boolean') {
          return (valA === valB ? 0 : valA ? 1 : -1) * multiplier
        }

        // Both are strings resembling ISO dates
        if (
          typeof valA === 'string' &&
          typeof valB === 'string' &&
          ISO_DATE_REGEX.test(valA) &&
          ISO_DATE_REGEX.test(valB)
        ) {
          const timeA = new Date(valA).getTime()
          const timeB = new Date(valB).getTime()
          if (!isNaN(timeA) && !isNaN(timeB)) {
            return (timeA - timeB) * multiplier
          }
        }
      }

      // 4. Fallback string collation with intelligent numeric chunk parsing (e.g., ADM-2 before ADM-10)
      const strA = String(valA)
      const strB = String(valB)
      return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' }) * multiplier
    })
  }, [items, sortConfig])

  return {
    sortedData,
    sortConfig,
    sortKey: sortConfig?.key ?? null,
    sortDirection: sortConfig?.direction ?? null,
    requestSort,
    setSort,
    clearSort,
    getSortDirection,
  }
}
export default useTableSort
