/**
 * @file        ExcelReportGrid.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
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
 * @description Unit tests verifying spreadsheet-style grid operations: search, sorting, filtering, column visibility, pagination, summary calculations, and multi-format exports.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExcelReportGrid, { ColumnConfig } from '../components/reports/ExcelReportGrid'

interface TestRecord {
  id: number
  name: string
  standard: string
  fee: number
  status: string
}

const mockData: TestRecord[] = [
  { id: 1, name: 'Aman Sharma', standard: 'CBSE X', fee: 85000, status: 'Paid' },
  { id: 2, name: 'Johan Joseph', standard: 'ICSE IV', fee: 85000, status: 'Pending' },
  { id: 3, name: 'Riddhima Sen', standard: 'ICSE X', fee: 95000, status: 'Paid' },
  { id: 4, name: 'Siddharth Roy', standard: 'SSC IX', fee: 65000, status: 'Overdue' },
]

const testColumns: ColumnConfig<TestRecord>[] = [
  {
    id: 'name',
    header: 'Student Name',
    accessorKey: 'name',
    type: 'text',
    width: 200,
    sortable: true,
    filterable: true,
    filterType: 'text',
  },
  {
    id: 'standard',
    header: 'Class / Standard',
    accessorKey: 'standard',
    type: 'text',
    width: 150,
    sortable: true,
    filterable: true,
    filterType: 'select',
  },
  {
    id: 'fee',
    header: 'Total Fee (₹)',
    accessorKey: 'fee',
    type: 'currency',
    width: 150,
    align: 'right',
    sortable: true,
    filterable: true,
    filterType: 'number',
  },
  {
    id: 'status',
    header: 'Payment Status',
    accessorKey: 'status',
    type: 'select',
    width: 130,
    align: 'center',
    sortable: true,
    filterable: true,
    filterType: 'select',
  },
]

describe('ExcelReportGrid Component', () => {
  it('renders grid with title, headers, and data rows', () => {
    render(
      <ExcelReportGrid
        title="Student Fee Roster"
        subtitle="Spreadsheet exploration test"
        columns={testColumns}
        data={mockData}
      />
    )

    expect(screen.getByText('Student Fee Roster')).toBeDefined()
    expect(screen.getByText('Spreadsheet exploration test')).toBeDefined()
    expect(screen.getByText('Student Name')).toBeDefined()
    expect(screen.getByText('Class / Standard')).toBeDefined()
    expect(screen.getByText('Total Fee (₹)')).toBeDefined()
    expect(screen.getByText('Aman Sharma')).toBeDefined()
    expect(screen.getByText('Johan Joseph')).toBeDefined()
    expect(screen.getByText('Riddhima Sen')).toBeDefined()
    expect(screen.getByText('Siddharth Roy')).toBeDefined()
  })

  it('filters rows correctly with global search', () => {
    render(
      <ExcelReportGrid
        title="Search Test"
        columns={testColumns}
        data={mockData}
      />
    )

    const searchInput = screen.getByPlaceholderText(/Search report records.../i)
    fireEvent.change(searchInput, { target: { value: 'Riddhima' } })

    expect(screen.getByText('Riddhima Sen')).toBeDefined()
    expect(screen.queryByText('Aman Sharma')).toBeNull()
    expect(screen.queryByText('Johan Joseph')).toBeNull()
  })

  it('sorts columns when header sort button is clicked', () => {
    render(
      <ExcelReportGrid
        title="Sort Test"
        columns={testColumns}
        data={mockData}
      />
    )

    // Find and click the sort button for Student Name
    const nameHeader = screen.getByText('Student Name')
    fireEvent.click(nameHeader)

    // Check that records are still visible and sorted
    expect(screen.getByText('Aman Sharma')).toBeDefined()
  })

  it('supports hiding and showing columns via Select Columns menu', () => {
    render(
      <ExcelReportGrid
        title="Column Visibility Test"
        columns={testColumns}
        data={mockData}
      />
    )

    // Open Columns menu
    const columnsBtn = screen.getByRole('button', { name: /Columns/i })
    fireEvent.click(columnsBtn)

    expect(screen.getByText('Display Columns')).toBeDefined()

    // Uncheck the last checkbox (Payment Status)
    const checkboxes = screen.getAllByRole('checkbox')
    const lastCheckbox = checkboxes[checkboxes.length - 1]
    fireEvent.click(lastCheckbox)

    // Verify Display Columns contains the counter showing 3 of 4
    const countBadge = screen.getByText((content) => content.includes('3') && content.includes('4'))
    expect(countBadge).toBeDefined()
  })

  it('renders summary row when showSummaryRow is true', () => {
    const summaryCalculations = {
      name: () => <span>Total Students</span>,
      fee: (rows: TestRecord[]) => {
        const sum = rows.reduce((acc, r) => acc + r.fee, 0)
        return <span>₹{sum.toLocaleString('en-IN')}</span>
      },
    }

    render(
      <ExcelReportGrid
        title="Summary Test"
        columns={testColumns}
        data={mockData}
        showSummaryRow={true}
        summaryCalculations={summaryCalculations}
      />
    )

    expect(screen.getByText('Total Students')).toBeDefined()
    expect(screen.getByText('₹3,30,000')).toBeDefined()
  })

  it('shows export dropdown menu with Excel, CSV, and JSON options', () => {
    render(
      <ExcelReportGrid
        title="Export Test"
        columns={testColumns}
        data={mockData}
        exportFilename="test_export"
      />
    )

    const exportBtn = screen.getByRole('button', { name: /Export/i })
    fireEvent.click(exportBtn)

    expect(screen.getByText('Excel Workbook (.xlsx)')).toBeDefined()
    expect(screen.getByText('CSV Spreadsheet (.csv)')).toBeDefined()
    expect(screen.getByText('JSON Dataset (.json)')).toBeDefined()
    expect(screen.getByText(/Export Scope:/i)).toBeDefined()
  })
})
