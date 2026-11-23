/**
 * @file        EnterpriseDataTableHeaderFilters.test.tsx
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
 * @created     2026-11-23
 * @updated     2026-11-23
 *
 * @description Comprehensive Vitest test suite validating EnterpriseDataTable in-header filtering, popover interactions, multi-column slicing, and active filter toolbar integration.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EnterpriseDataTable } from '../components/common/EnterpriseDataTable'
import type { DataTableColumn } from '../components/common/EnterpriseDataTable/types'

interface SampleStudent {
  id: number
  admission_no: string
  name: string
  standard: string
  board: string
  fees: number
  status: string
}

const mockStudents: SampleStudent[] = [
  { id: 1, admission_no: 'PA-001', name: 'Aadya Sharma', standard: 'Grade 10', board: 'CBSE', fees: 25000, status: 'Active' },
  { id: 2, admission_no: 'PA-002', name: 'Kabir Mehta', standard: 'Grade 12', board: 'ICSE', fees: 45000, status: 'Active' },
  { id: 3, admission_no: 'PA-003', name: 'Diya Patel', standard: 'Grade 10', board: 'CBSE', fees: 25000, status: 'Withdrawn' },
  { id: 4, admission_no: 'PA-004', name: 'Rohan Verma', standard: 'Grade 11', board: 'State Board', fees: 30000, status: 'Active' },
]

const sampleColumns: DataTableColumn<SampleStudent>[] = [
  { id: 'admission_no', header: 'Admission No.', accessorKey: 'admission_no', sortable: true },
  { id: 'name', header: 'Student Name', accessorKey: 'name', sortable: true },
  { id: 'standard', header: 'Standard', accessorKey: 'standard', sortable: true, filterType: 'select' },
  { id: 'board', header: 'Board', accessorKey: 'board', sortable: true, filterType: 'select' },
  { id: 'fees', header: 'Annual Fees', accessorKey: 'fees', type: 'currency', sortable: true },
  { id: 'status', header: 'Status', accessorKey: 'status', sortable: true, filterType: 'select' },
]

describe('EnterpriseDataTable In-Header Filtering & Sorting Suite', () => {
  it('renders split header with 1-click sort and filter funnel button', () => {
    render(
      <EnterpriseDataTable
        tableId="test_filter_table"
        data={mockStudents}
        columns={sampleColumns}
      />
    )

    // Check headers rendered
    expect(screen.getByText('Student Name')).toBeDefined()
    expect(screen.getByText('Standard')).toBeDefined()
    expect(screen.getByText('Board')).toBeDefined()

    // Check filter buttons exist for columns
    const filterButtons = screen.getAllByTitle(/Filter/i)
    expect(filterButtons.length).toBeGreaterThanOrEqual(4)
  })

  it('toggles column sort on header title click without opening filter popover', () => {
    const onSortChange = vi.fn()
    render(
      <EnterpriseDataTable
        tableId="test_filter_table"
        data={mockStudents}
        columns={sampleColumns}
        onSortChange={onSortChange}
      />
    )

    const nameHeaderButton = screen.getByTitle('Sort by Student Name')
    fireEvent.click(nameHeaderButton)
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc')

    fireEvent.click(nameHeaderButton)
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc')
  })

  it('opens in-header filter popover and filters by categorical checkbox selection', () => {
    render(
      <EnterpriseDataTable
        tableId="test_filter_table"
        data={mockStudents}
        columns={sampleColumns}
      />
    )

    // Initial state: all 4 students visible
    expect(screen.getByText('Aadya Sharma')).toBeDefined()
    expect(screen.getByText('Kabir Mehta')).toBeDefined()
    expect(screen.getByText('Diya Patel')).toBeDefined()
    expect(screen.getByText('Rohan Verma')).toBeDefined()

    // Click filter funnel for "Board"
    const boardFilterButton = screen.getByTitle('Filter Board')
    fireEvent.click(boardFilterButton)

    // Popover opens with title
    expect(screen.getByText('Filter Board')).toBeDefined()
    expect(screen.getAllByText('CBSE').length).toBeGreaterThanOrEqual(1)

    // Click CBSE checkbox to filter only CBSE
    const cbseCheckbox = screen.getByLabelText(/CBSE/i)
    fireEvent.click(cbseCheckbox)

    // Only CBSE students should be rendered
    expect(screen.getByText('Aadya Sharma')).toBeDefined()
    expect(screen.getByText('Diya Patel')).toBeDefined()
    expect(screen.queryByText('Kabir Mehta')).toBeNull()
    expect(screen.queryByText('Rohan Verma')).toBeNull()

    // Check toolbar shows active filter button
    expect(screen.getByTitle('Clear all active column filters')).toBeDefined()
  })

  it('filters by numeric currency range min and max', () => {
    render(
      <EnterpriseDataTable
        tableId="test_filter_table"
        data={mockStudents}
        columns={sampleColumns}
      />
    )

    // Open filter for Annual Fees
    const feesFilterButton = screen.getByTitle('Filter Annual Fees')
    fireEvent.click(feesFilterButton)

    expect(screen.getByText('Numeric Range:')).toBeDefined()
    const minInput = screen.getByPlaceholderText('0')
    const maxInput = screen.getByPlaceholderText('Max')

    // Filter fees between 28000 and 50000 (matches Kabir: 45000, Rohan: 30000)
    fireEvent.change(minInput, { target: { value: '28000' } })
    fireEvent.change(maxInput, { target: { value: '50000' } })

    expect(screen.getByText('Kabir Mehta')).toBeDefined()
    expect(screen.getByText('Rohan Verma')).toBeDefined()
    expect(screen.queryByText('Aadya Sharma')).toBeNull()
    expect(screen.queryByText('Diya Patel')).toBeNull()
  })

  it('clears all active filters when clicking the toolbar filter chip', () => {
    render(
      <EnterpriseDataTable
        tableId="test_filter_table"
        data={mockStudents}
        columns={sampleColumns}
      />
    )

    // Filter board to ICSE
    const boardFilterButton = screen.getByTitle('Filter Board')
    fireEvent.click(boardFilterButton)
    const icseCheckbox = screen.getByLabelText(/ICSE/i)
    fireEvent.click(icseCheckbox)

    // Sliced state
    expect(screen.getByText('Kabir Mehta')).toBeDefined()
    expect(screen.queryByText('Aadya Sharma')).toBeNull()

    // Click "Clear all active column filters"
    const clearAllButton = screen.getByTitle('Clear all active column filters')
    fireEvent.click(clearAllButton)

    // All records restored
    expect(screen.getByText('Aadya Sharma')).toBeDefined()
    expect(screen.getByText('Kabir Mehta')).toBeDefined()
    expect(screen.getByText('Diya Patel')).toBeDefined()
    expect(screen.getByText('Rohan Verma')).toBeDefined()
  })
})
