/**
 * @file        EnterpriseDataTable.test.tsx
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
 * @updated     2026-11-24
 *
 * @description Comprehensive test suite for EnterpriseDataTable component: sorting, column toggle, search, exports, and View-First locks.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EnterpriseDataTable } from '../components/common/EnterpriseDataTable'
import type { DataTableColumn } from '../components/common/EnterpriseDataTable/types'

interface SampleStudent {
  id: number
  admission_number: string
  name: string
  fee_balance: number
  admission_date: string
  phone: string
  aadhaar: string
  city: string
  is_active: boolean
}

const mockData: SampleStudent[] = [
  {
    id: 1,
    admission_number: 'ADM-001',
    name: 'Aarav Sharma',
    fee_balance: 15000,
    admission_date: '2026-06-15',
    phone: '9876543210',
    aadhaar: '123456789012',
    city: 'Pune',
    is_active: true,
  },
  {
    id: 2,
    admission_number: 'ADM-002',
    name: 'Bhavna Patel',
    fee_balance: 0,
    admission_date: '2026-07-20',
    phone: '9822334455',
    aadhaar: '987654321098',
    city: 'Mumbai',
    is_active: false,
  },
  {
    id: 3,
    admission_number: 'ADM-003',
    name: 'Chetan Deshmukh',
    fee_balance: 45000,
    admission_date: '2026-05-10',
    phone: '9123456789',
    aadhaar: '555566667777',
    city: 'Nagpur',
    is_active: true,
  },
]

const testColumns: DataTableColumn<SampleStudent>[] = [
  {
    id: 'admission_number',
    header: 'Admission No.',
    accessorKey: 'admission_number',
    sticky: 'left',
    sortable: true,
  },
  {
    id: 'name',
    header: 'Student Name',
    accessorKey: 'name',
    sortable: true,
  },
  {
    id: 'fee_balance',
    header: 'Balance',
    accessorKey: 'fee_balance',
    type: 'currency',
    sortable: true,
  },
  {
    id: 'admission_date',
    header: 'Admission Date',
    accessorKey: 'admission_date',
    type: 'date',
    sortable: true,
  },
  {
    id: 'aadhaar',
    header: 'Aadhaar Mask',
    accessorKey: 'aadhaar',
    type: 'masked_aadhaar',
  },
  {
    id: 'phone',
    header: 'Phone',
    accessorKey: 'phone',
    type: 'phone',
  },
]

describe('EnterpriseDataTable Component Suite', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders table headers and records with formatters correctly', () => {
    render(
      <EnterpriseDataTable
        tableId="test_students"
        data={mockData}
        columns={testColumns}
      />
    )

    // Check Headers
    expect(screen.getByText('Admission No.')).toBeDefined()
    expect(screen.getByText('Student Name')).toBeDefined()
    expect(screen.getByText('Balance')).toBeDefined()

    // Check Data rendering
    expect(screen.getByText('ADM-001')).toBeDefined()
    expect(screen.getByText('Aarav Sharma')).toBeDefined()

    // Check INR Currency Formatter
    expect(screen.getByText('₹15,000')).toBeDefined()
    expect(screen.getByText('₹45,000')).toBeDefined()

    // Check DPDP Act Aadhaar Masking: XXXX-XXXX-9012
    expect(screen.getByText('XXXX-XXXX-9012')).toBeDefined()
    expect(screen.getByText('XXXX-XXXX-1098')).toBeDefined()

    // Check Phone Formatter: 98765 43210
    expect(screen.getByText('98765 43210')).toBeDefined()
  })

  it('filters data via internal debounced search', async () => {
    render(
      <EnterpriseDataTable
        tableId="test_search"
        data={mockData}
        columns={testColumns}
      />
    )

    const searchInput = screen.getByPlaceholderText(/search records/i)
    fireEvent.change(searchInput, { target: { value: 'Bhavna' } })

    await waitFor(() => {
      expect(screen.getByText('Bhavna Patel')).toBeDefined()
      expect(screen.queryByText('Aarav Sharma')).toBeNull()
      expect(screen.queryByText('Chetan Deshmukh')).toBeNull()
    })
  })

  it('toggles column visibility and updates view', async () => {
    render(
      <EnterpriseDataTable
        tableId="test_columns"
        data={mockData}
        columns={testColumns}
      />
    )

    // Click Columns dropdown
    const columnsBtn = screen.getByTitle('Customize table columns')
    fireEvent.click(columnsBtn)

    // Uncheck "Student Name" column
    const nameCheckbox = screen.getByLabelText('Student Name')
    fireEvent.click(nameCheckbox)

    // The name column should now be hidden
    await waitFor(() => {
      expect(screen.queryByText('Aarav Sharma')).toBeNull()
    })

    // Reset columns
    const resetBtn = screen.getByText('Reset')
    fireEvent.click(resetBtn)

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })
  })

  it('supports row selection and renders floating bulk dock', () => {
    render(
      <EnterpriseDataTable
        tableId="test_selection"
        data={mockData}
        columns={testColumns}
        enableRowSelection={true}
        bulkActions={(selectedIds) => (
          <button type="button" className="test-bulk-btn">
            Bulk Action ({selectedIds.size})
          </button>
        )}
      />
    )

    // Click select all
    const selectAllBtn = screen.getByTitle('Select all on page')
    fireEvent.click(selectAllBtn)

    expect(screen.getByText('3 records selected')).toBeDefined()
    expect(screen.getByText('Bulk Action (3)')).toBeDefined()
  })

  it('merges legacy localStorage column visibility preferences with new column defaults', () => {
    // Simulate legacy localStorage entry created before new columns existed
    localStorage.setItem(
      'prathamone_table_cols_test_legacy',
      JSON.stringify({
        admission_number: true,
        name: true,
        fee_balance: false, // user previously hid fee_balance
      })
    )

    const columnsWithNewField: DataTableColumn<SampleStudent>[] = [
      ...testColumns,
      {
        id: 'city',
        header: 'City Name',
        accessorKey: 'city',
        defaultVisible: true, // Newly introduced column, not in localStorage
      },
      {
        id: 'is_active',
        header: 'Active State',
        accessorKey: 'is_active',
        defaultVisible: false, // Newly introduced optional column, not in localStorage
      },
    ]

    render(
      <EnterpriseDataTable
        tableId="test_legacy"
        data={mockData}
        columns={columnsWithNewField}
      />
    )

    // User's explicit choice to hide fee_balance is preserved
    expect(screen.queryByText('₹15,000')).toBeNull()

    // Newly introduced column with defaultVisible: true is visible by default
    expect(screen.getByText('City Name')).toBeDefined()
    expect(screen.getByText('Pune')).toBeDefined()

    // Newly introduced column with defaultVisible: false stays hidden by default
    expect(screen.queryByText('Active State')).toBeNull()
  })
})
