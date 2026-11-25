/**
 * @file        FeesMatrixHeaderSortFilter.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
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
 * @description Tests for SSOT useTableColumnFilters hook, SortableHeader filter popovers,
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook, act, within } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useTableColumnFilters,
  buildSelectOptionsFromRows,
} from '../hooks/useTableColumnFilters'
import { SortableHeader } from '../components/common/SortableHeader'
import { StudentMonthlyFeePivot } from '../components/fees/StudentMonthlyFeePivot'
import * as endpoints from '../api/endpoints'
import type { StudentMonthlyPivotResponse } from '../types'

interface SamplePaymentRow {
  id: number
  student_name: string
  board: string
  amount: number
  payment_date: string
}

const sampleRows: SamplePaymentRow[] = [
  { id: 1, student_name: 'Aaradhya', board: 'SSC', amount: 15000, payment_date: '2026-05-10' },
  { id: 2, student_name: 'Roudita', board: 'CBSE', amount: 25000, payment_date: '2026-06-15' },
  { id: 3, student_name: 'Chahak', board: 'ICSE', amount: 40000, payment_date: '2026-07-20' },
  { id: 4, student_name: 'Sukhneet', board: 'SSC', amount: 10000, payment_date: '2026-08-05' },
]

describe('useTableColumnFilters Hook', () => {
  const definitions = {
    student_name: { type: 'text' as const, accessor: (r: SamplePaymentRow) => r.student_name },
    board: { type: 'select' as const, accessor: (r: SamplePaymentRow) => r.board },
    amount: { type: 'number_range' as const, accessor: (r: SamplePaymentRow) => r.amount },
    payment_date: { type: 'date_range' as const, accessor: (r: SamplePaymentRow) => r.payment_date },
  }

  it('filters text, select, number_range, and date_range columns accurately and clears filters', () => {
    const { result } = renderHook(() => useTableColumnFilters(sampleRows, definitions))

    expect(result.current.filteredData).toHaveLength(4)
    expect(result.current.activeFilterCount).toBe(0)

    // 1. Text filter
    act(() => {
      result.current.setColumnFilter('student_name', 'rou')
    })
    expect(result.current.filteredData.map((r) => r.student_name)).toEqual(['Roudita'])
    expect(result.current.activeFilterCount).toBe(1)

    // 2. Clear text filter and apply select filter
    act(() => {
      result.current.clearColumnFilter('student_name')
      result.current.setColumnFilter('board', ['SSC', 'ICSE'])
    })
    expect(result.current.filteredData.map((r) => r.id)).toEqual([1, 3, 4])

    // 3. Combine with number_range filter
    act(() => {
      result.current.setColumnFilter('amount', { min: 14000, max: 35000 })
    })
    expect(result.current.filteredData.map((r) => r.student_name)).toEqual(['Aaradhya'])

    // 4. Clear all and test date_range
    act(() => {
      result.current.clearAllFilters()
    })
    expect(result.current.filteredData).toHaveLength(4)

    act(() => {
      result.current.setColumnFilter('payment_date', { from: '2026-06-01', to: '2026-07-31' })
    })
    expect(result.current.filteredData.map((r) => r.student_name)).toEqual(['Roudita', 'Chahak'])
  })

  it('builds sorted select options with counts', () => {
    const opts = buildSelectOptionsFromRows(sampleRows, (r) => r.board)
    expect(opts).toEqual([
      { value: 'CBSE', label: 'CBSE', count: 1 },
      { value: 'ICSE', label: 'ICSE', count: 1 },
      { value: 'SSC', label: 'SSC', count: 2 },
    ])
  })
})

describe('SortableHeader with Filter Popover', () => {
  it('supports clicking sort button and opening portal filter popover with secondary facet', () => {
    const onSort = vi.fn()
    const onFilterChange = vi.fn()
    const onSecondaryFacetChange = vi.fn()

    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              columnKey="student_name"
              label="Student Name & Priority"
              currentSortKey={null}
              currentDirection={null}
              onSort={onSort}
              filterType="text"
              filterValue=""
              onFilterChange={onFilterChange}
              secondaryFacetLabel="Priority"
              secondaryFacetOptions={[
                { value: 'urgent', label: 'Urgent', count: 1 },
                { value: 'high', label: 'High', count: 2 },
              ]}
              secondaryFacetValue={[]}
              onSecondaryFacetChange={onSecondaryFacetChange}
            />
          </tr>
        </thead>
      </table>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Student Name & Priority' }))
    expect(onSort).toHaveBeenCalledWith('student_name', undefined, 'auto')

    fireEvent.click(screen.getByRole('button', { name: 'Filter Student Name & Priority' }))
    const dialog = screen.getByRole('dialog', { name: 'Filter Student Name & Priority' })
    expect(dialog).toBeTruthy()

    const searchInput = within(dialog).getByPlaceholderText(/Search student name & priority/i)
    fireEvent.change(searchInput, { target: { value: 'Aaradhya' } })
    expect(onFilterChange).toHaveBeenCalledWith('student_name', 'Aaradhya')

    fireEvent.click(within(dialog).getByRole('button', { name: /Urgent/i }))
    expect(onSecondaryFacetChange).toHaveBeenCalledWith(['urgent'])
  })
})

const multiStudentPivotFixture: StudentMonthlyPivotResponse = {
  summary: {
    total_students: 4,
    total_agreed_package: 205000,
    total_collected: 110000,
    total_balance: 95000,
    collection_percentage: 53.7,
    defaulters_count: 2,
    pending_installments_count: 2,
  },
  months: [
    { key: '2026-04', name: 'April', short_name: 'Apr', year: 2026 },
    { key: '2026-05', name: 'May', short_name: 'May', year: 2026 },
  ],
  students: [
    {
      student_id: 1,
      admission_number: 'PA-2026-010',
      student_name: 'Rahul Sharma',
      phone: '9800000001',
      board_id: 1,
      board_name: 'SSC',
      standard_id: 5,
      standard_name: 'Standard 5',
      division_id: 1,
      division_name: 'Batch A',
      batch_name: 'Batch A',
      package_fee: 35000,
      months: {
        '2026-04': { amount: 0, payments_count: 0, is_pending: true, pending_amount: 15000, status: 'pending', payments: [] },
        '2026-05': { amount: 0, payments_count: 0, is_pending: true, pending_amount: 20000, status: 'pending', payments: [] },
      },
      total_collected: 0,
      balance: 35000,
      collection_rate: 0,
      status: 'overdue',
      student_status: 'active',
      invoice_id: 11,
      remark: 'Immediate follow up',
      priority: 'urgent',
      follow_up_status: 'follow_up_required',
    },
    {
      student_id: 2,
      admission_number: 'PA-2026-002',
      student_name: 'Roudita Sen',
      phone: '9800000002',
      board_id: 1,
      board_name: 'SSC',
      standard_id: 7,
      standard_name: 'Standard 7',
      division_id: 2,
      division_name: 'Batch B',
      batch_name: 'Batch B',
      package_fee: 50000,
      months: {
        '2026-04': { amount: 15000, payments_count: 1, is_pending: false, pending_amount: 0, status: 'paid', payments: [] },
        '2026-05': { amount: 25000, payments_count: 1, is_pending: false, pending_amount: 0, status: 'paid', payments: [] },
      },
      total_collected: 40000,
      balance: 10000,
      collection_rate: 80,
      status: 'partial',
      student_status: 'active',
      invoice_id: 12,
      remark: 'On track',
      priority: 'normal',
      follow_up_status: 'none',
    },
    {
      student_id: 3,
      admission_number: 'PA-2026-005',
      student_name: 'Aaradhya Kulkarni',
      phone: '9800000003',
      board_id: 2,
      board_name: 'CBSE',
      standard_id: 9,
      standard_name: 'Class IX',
      division_id: 3,
      division_name: 'CBSE IX',
      batch_name: 'CBSE IX',
      package_fee: 45000,
      months: {
        '2026-04': { amount: 0, payments_count: 0, is_pending: false, pending_amount: 0, status: 'unpaid', payments: [] },
        '2026-05': { amount: 10000, payments_count: 1, is_pending: false, pending_amount: 0, status: 'paid', payments: [] },
      },
      total_collected: 10000,
      balance: 35000,
      collection_rate: 22.2,
      status: 'overdue',
      student_status: 'active',
      invoice_id: 13,
      remark: 'Parent promised Friday',
      priority: 'high',
      follow_up_status: 'promised',
    },
    {
      student_id: 4,
      admission_number: 'PA-2026-008',
      student_name: 'Chahak Verma',
      phone: '9800000004',
      board_id: 3,
      board_name: 'ICSE',
      standard_id: 8,
      standard_name: 'Class VIII',
      division_id: 4,
      division_name: 'ICSE VIII',
      batch_name: 'ICSE VIII',
      package_fee: 75000,
      months: {
        '2026-04': { amount: 30000, payments_count: 1, is_pending: false, pending_amount: 0, status: 'paid', payments: [] },
        '2026-05': { amount: 30000, payments_count: 1, is_pending: false, pending_amount: 0, status: 'paid', payments: [] },
      },
      total_collected: 60000,
      balance: 15000,
      collection_rate: 80,
      status: 'partial',
      student_status: 'active',
      invoice_id: 14,
      remark: '',
      priority: 'normal',
      follow_up_status: 'none',
    },
  ],
  monthly_totals: { '2026-04': 45000, '2026-05': 65000 },
  filter_options: {
    academic_years: [{ id: 2, name: '2026-27', is_current: true }],
    boards: [
      { id: 1, name: 'SSC', code: 'SSC' },
      { id: 2, name: 'CBSE', code: 'CBSE' },
      { id: 3, name: 'ICSE', code: 'ICSE' },
    ],
    standards: [],
    divisions: [],
    payment_methods: ['CASH', 'UPI', 'BANK_TRANSFER'],
    payment_statuses: [{ id: 'all', label: 'All' }],
    student_statuses: [{ id: 'all', label: 'All' }],
  },
}

const renderPivot = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <StudentMonthlyFeePivot initialAcademicYearId={2} />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('StudentMonthlyFeePivot Matrix In-Header Sorting & Filtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(endpoints.feesApi, 'getStudentMonthlyPivot').mockResolvedValue({
      data: multiStudentPivotFixture,
    } as any)
  })

  it('sorts rows by Agreed Pkg (₹) and Month columns ascending and descending', async () => {
    renderPivot()

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeTruthy()
    })

    const getVisibleRowNames = () => {
      const tbody = document.querySelector('tbody')!
      return Array.from(tbody.querySelectorAll('tr')).map((tr) => tr.textContent || '')
    }

    // Click "Agreed Pkg (₹)" -> ascending: Rahul (35,000), Aaradhya (45,000), Roudita (50,000), Chahak (75,000)
    fireEvent.click(screen.getByRole('button', { name: 'Agreed Pkg (₹)' }))
    let rows = getVisibleRowNames()
    expect(rows[0]).toContain('Rahul Sharma')
    expect(rows[1]).toContain('Aaradhya Kulkarni')
    expect(rows[2]).toContain('Roudita Sen')
    expect(rows[3]).toContain('Chahak Verma')

    // Click again -> descending: Chahak (75,000) first
    fireEvent.click(screen.getByRole('button', { name: 'Agreed Pkg (₹)' }))
    rows = getVisibleRowNames()
    expect(rows[0]).toContain('Chahak Verma')
    expect(rows[3]).toContain('Rahul Sharma')

    // Click May 2026 header -> ascending by May collected amount: Rahul (0), Aaradhya (10k), Roudita (25k), Chahak (30k)
    fireEvent.click(screen.getByRole('button', { name: 'May 2026' }))
    rows = getVisibleRowNames()
    expect(rows[0]).toContain('Rahul Sharma')
    expect(rows[1]).toContain('Aaradhya Kulkarni')
    expect(rows[2]).toContain('Roudita Sen')
    expect(rows[3]).toContain('Chahak Verma')
  })

  it('filters Student Name & Priority, Board, Grade, Batch, and Agreed Pkg and updates footer totals', async () => {
    renderPivot()

    await waitFor(() => {
      expect(screen.getByText('Chahak Verma')).toBeTruthy()
    })

    // 1. Filter by Student Name & Priority -> Priority: Urgent
    fireEvent.click(screen.getByRole('button', { name: 'Filter Student Name & Priority' }))
    const studentDialog = screen.getByRole('dialog', { name: 'Filter Student Name & Priority' })
    fireEvent.click(within(studentDialog).getByRole('button', { name: /Urgent/i }))

    expect(screen.getByText('Rahul Sharma')).toBeTruthy()
    expect(screen.queryByText('Chahak Verma')).toBeNull()
    expect(screen.getByText('1 Students')).toBeTruthy()

    // Clear header filters restores all 4 students
    fireEvent.click(screen.getByRole('button', { name: 'Clear Header Filters' }))
    expect(screen.getByText('Chahak Verma')).toBeTruthy()
    expect(screen.getByText('4 Students')).toBeTruthy()

    // 2. Filter Board -> ICSE
    fireEvent.click(screen.getByRole('button', { name: 'Filter Board' }))
    const boardDialog = screen.getByRole('dialog', { name: 'Filter Board' })
    fireEvent.click(within(boardDialog).getByLabelText(/ICSE/i))
    expect(screen.getByText('Chahak Verma')).toBeTruthy()
    expect(screen.queryByText('Rahul Sharma')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Clear Header Filters' }))

    // 3. Filter Batch -> Batch B
    fireEvent.click(screen.getByRole('button', { name: 'Filter Batch' }))
    const batchDialog = screen.getByRole('dialog', { name: 'Filter Batch' })
    fireEvent.click(within(batchDialog).getByLabelText(/Batch B/i))
    expect(screen.getByText('Roudita Sen')).toBeTruthy()
    expect(screen.queryByText('Chahak Verma')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Clear Header Filters' }))

    // 4. Filter Agreed Pkg (₹) >= 48000 -> Roudita (50k) & Chahak (75k)
    fireEvent.click(screen.getByRole('button', { name: 'Filter Agreed Pkg (₹)' }))
    const pkgDialog = screen.getByRole('dialog', { name: 'Filter Agreed Pkg (₹)' })
    const minInput = within(pkgDialog).getByPlaceholderText('0')
    fireEvent.change(minInput, { target: { value: '48000' } })
    expect(screen.getByText('Roudita Sen')).toBeTruthy()
    expect(screen.getByText('Chahak Verma')).toBeTruthy()
    expect(screen.queryByText('Rahul Sharma')).toBeNull()
    expect(screen.getByText('2 Students')).toBeTruthy()
  })
})
