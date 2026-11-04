/**
 * @file        CascadingFilters.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-04
 *
 * @description Cascading filter bar component for academic year, board, class, and batch selection.
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, RotateCcw, Calendar, Layers, BookOpen, Users, Search } from 'lucide-react'
import { academicYearsApi, boardsApi, standardsApi, divisionsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

export interface FilterState {
  academicYearId?: number | null
  boardId?: number | null
  standardId?: number | null
  divisionId?: number | null
  status?: string
  search?: string
}

interface CascadingFiltersProps {
  filters: FilterState
  onChange: (updated: FilterState) => void
  onReset?: () => void
  showSearch?: boolean
  searchPlaceholder?: string
  showStatus?: boolean
  statusOptions?: { value: string; label: string }[]
  className?: string
  title?: string
}

export default function CascadingFilters({
  filters,
  onChange,
  onReset,
  showSearch = false,
  searchPlaceholder = 'Search by student name or admission #...',
  showStatus = false,
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'paid', label: 'Paid in Full' },
    { value: 'partial', label: 'Partial Due' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'overdue', label: 'Overdue' },
  ],
  className = '',
  title = 'Filter Records',
}: CascadingFiltersProps) {
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()

  // 1. Academic Years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years', selectedInstitutionId],
    queryFn: async () => {
      const res = await academicYearsApi.list(selectedInstitutionId ?? undefined)
      if (res.data && res.data.length > 0) return res.data
      const fallback = await academicYearsApi.list()
      return fallback.data
    },
  })

  // 2. Boards (ICSE, CBSE, SSC, etc.)
  const { data: boards = [] } = useQuery({
    queryKey: ['boards', selectedInstitutionId],
    queryFn: () => boardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  // 3. Standards / Levels (filtered by selected Board)
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId, filters.boardId],
    queryFn: () =>
      standardsApi
        .list({
          institution_id: selectedInstitutionId ?? undefined,
          board_id: filters.boardId ?? undefined,
        })
        .then((r) => r.data),
  })

  // 4. Batches / Divisions (filtered by selected Standard and Board)
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', filters.standardId, filters.boardId],
    queryFn: () =>
      divisionsApi
        .list({
          standard_id: filters.standardId ?? undefined,
          board_id: filters.boardId ?? undefined,
        })
        .then((r) => r.data),
  })

  const handleYearChange = (val: string) => {
    const yrId = val ? Number(val) : null
    onChange({
      ...filters,
      academicYearId: yrId,
    })
  }

  const handleBoardChange = (val: string) => {
    const bId = val ? Number(val) : null
    // Reset dependent Standard and Batch when Board changes
    onChange({
      ...filters,
      boardId: bId,
      standardId: null,
      divisionId: null,
    })
  }

  const handleStandardChange = (val: string) => {
    const sId = val ? Number(val) : null
    // Reset dependent Batch when Standard changes
    onChange({
      ...filters,
      standardId: sId,
      divisionId: null,
    })
  }

  const handleDivisionChange = (val: string) => {
    const dId = val ? Number(val) : null
    onChange({
      ...filters,
      divisionId: dId,
    })
  }

  const handleStatusChange = (val: string) => {
    onChange({
      ...filters,
      status: val,
    })
  }

  const handleSearchChange = (val: string) => {
    onChange({
      ...filters,
      search: val,
    })
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
    } else {
      onChange({
        academicYearId: selectedAcademicYearId,
        boardId: null,
        standardId: null,
        divisionId: null,
        status: '',
        search: '',
      })
    }
  }

  const hasActiveFilters = Boolean(
    filters.boardId ||
      filters.standardId ||
      filters.divisionId ||
      (filters.academicYearId && filters.academicYearId !== selectedAcademicYearId) ||
      filters.status ||
      (filters.search && filters.search.trim().length > 0)
  )

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4 text-primary-600" />
          <span>{title}</span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-700 hover:bg-gray-100 px-2.5 py-1 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Academic Year */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Academic Year</span>
          </label>
          <select
            value={filters.academicYearId ? String(filters.academicYearId) : ''}
            onChange={(e) => handleYearChange(e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Academic Years</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name} {ay.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Board */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            <span>Course / Board</span>
          </label>
          <select
            value={filters.boardId ? String(filters.boardId) : ''}
            onChange={(e) => handleBoardChange(e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Boards</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        {/* Standard / Class */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
            <span>Standard / Level</span>
          </label>
          <select
            value={filters.standardId ? String(filters.standardId) : ''}
            onChange={(e) => handleStandardChange(e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">
              {filters.boardId ? 'All Standards in Board' : 'All Standards'}
            </option>
            {standards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Batch / Division */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span>Batch</span>
          </label>
          <select
            value={filters.divisionId ? String(filters.divisionId) : ''}
            onChange={(e) => handleDivisionChange(e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">
              {filters.standardId ? 'All Batches in Standard' : 'All Batches'}
            </option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(showSearch || showStatus) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
          {showSearch && (
            <div className={showStatus ? 'sm:col-span-2' : 'sm:col-span-3'}>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search ?? ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {showStatus && (
            <div className={showSearch ? 'sm:col-span-1' : 'sm:col-span-3'}>
              <select
                value={filters.status ?? ''}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

