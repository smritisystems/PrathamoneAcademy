/**
 * @file        types.ts
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
 * @updated     2026-11-23
 *
 * @description Type definitions and column contracts for the canonical EnterpriseDataTable system.
 */

import React from 'react'
import type { SortDirection, SortType } from '../../../hooks/useTableSort'

export interface DataTableColumn<T = any> {
  id?: string
  key?: string
  header: React.ReactNode
  accessorKey?: keyof T | string
  accessorFn?: (row: T) => any
  type?: SortType | 'currency' | 'date' | 'masked_aadhaar' | 'phone' | 'badge'
  sortable?: boolean
  filterable?: boolean
  filterType?: 'select' | 'text' | 'number_range' | 'date_range' | 'boolean'
  filterOptions?: { label: string; value: any }[]
  width?: string | number
  minWidth?: string | number
  align?: 'left' | 'center' | 'right'
  sticky?: 'left' | 'right'
  pinned?: 'left' | 'right'
  defaultVisible?: boolean
  hideable?: boolean
  cell?: (props: { row: T; value: any; index: number; isEditMode?: boolean }) => React.ReactNode
  render?: (row: T, index: number) => React.ReactNode
  rawExportValue?: (row: T) => string | number | boolean | null | undefined
}

export interface TableExportConfig<T = any> {
  filename?: string
  sheetName?: string
  title?: string
  enabledFormats?: ('xlsx' | 'csv' | 'print')[]
  columns?: any[]
}

export interface EnterpriseDataTableProps<T = any> {
  tableId?: string
  data: T[]
  columns: DataTableColumn<T>[]
  isLoading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  emptyState?: React.ReactNode

  // Search & Filtering
  searchable?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (val: string) => void
  customFilterBar?: React.ReactNode
  columnFilters?: Record<string, any>
  onColumnFilterChange?: (filters: Record<string, any>) => void
  disableColumnFiltering?: boolean

  // Sorting
  defaultSortKey?: string
  defaultSortDirection?: SortDirection
  onSortChange?: (key: string, direction: SortDirection) => void

  // Pagination
  page?: number
  pageSize?: number
  totalCount?: number
  pageSizeOptions?: number[]
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  serverSidePagination?: boolean

  // Row Selection & Bulk Actions
  enableRowSelection?: boolean
  selectedRowIds?: Set<string | number>
  onSelectionChange?: (selectedIds: Set<string | number>) => void
  getRowId?: (row: T, index: number) => string | number
  rowKey?: string | ((row: T) => string | number)
  bulkActions?: (selectedIds: Set<string | number>, selectedRows: T[]) => React.ReactNode

  // Row Interaction
  onRowClick?: (row: T, index: number) => void
  rowClassName?: string | ((row: T, index: number) => string)

  // Rule 010 View-First Governance
  isEditMode?: boolean
  editScope?: string

  // Export
  exportConfig?: TableExportConfig<T>

  // Layout & Styling
  className?: string
  density?: 'compact' | 'comfortable' | 'spacious'
  maxHeight?: string
}
