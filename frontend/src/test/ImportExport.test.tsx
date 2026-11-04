/**
 * @file        ImportExport.test.tsx
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
 * @description Vitest test suite verifying spreadsheet copy-paste grid, file upload validation, and CSV export.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ImportExportPage from '../pages/ImportExport'
import * as endpoints from '../api/endpoints'

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'admin', first_name: 'Admin', last_name: 'User' },
    selectedInstitutionId: 1,
    selectedAcademicYearId: 1,
  }),
}))

describe('ImportExportPage Master Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    vi.spyOn(endpoints.importExportApi, 'getEntities').mockResolvedValue({
      data: [
        {
          key: 'students',
          label: 'Students Master',
          unique_key: ['admission_number'],
          fields: [
            { key: 'admission_number', label: 'Admission Number', required: true, type: 'str', sample: 'PA-2024-001', desc: 'Unique admission number' },
            { key: 'first_name', label: 'First Name', required: true, type: 'str', sample: 'Aarav', desc: 'First name' },
            { key: 'last_name', label: 'Last Name', required: false, type: 'str', sample: 'Sharma', desc: 'Last name' },
            { key: 'date_of_birth', label: 'Date of Birth', required: true, type: 'date', sample: '2009-05-15', desc: 'YYYY-MM-DD' },
            { key: 'gender', label: 'Gender', required: true, type: 'str', sample: 'male', desc: 'male/female' },
          ],
        },
        {
          key: 'batches',
          label: 'Batches & Divisions',
          unique_key: ['code'],
          fields: [
            { key: 'name', label: 'Batch Name', required: true, type: 'str', sample: 'Batch A', desc: 'Name' },
            { key: 'code', label: 'Batch Code', required: true, type: 'str', sample: 'ICSE-10-A', desc: 'Code' },
            { key: 'standard_name', label: 'Class / Standard', required: true, type: 'str', sample: 'Class 10', desc: 'Class' },
          ],
        },
      ],
    } as any)

    vi.spyOn(endpoints.academicYearsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'AY 2024-25', is_current: true, institution_id: 1, start_date: '2024-04-01', end_date: '2025-03-31' }],
    } as any)

    vi.spyOn(endpoints.boardsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'ICSE Board', code: 'ICSE', is_active: true, institution_id: 1 }],
    } as any)

    vi.spyOn(endpoints.standardsApi, 'list').mockResolvedValue({
      data: [{ id: 10, name: 'Class X', level: 10, institution_id: 1 }],
    } as any)

    vi.spyOn(endpoints.divisionsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Batch A', code: 'ICSE-10-A', standard_id: 10, capacity: 40 }],
    } as any)

    vi.spyOn(endpoints.importExportApi, 'getHistory').mockResolvedValue({
      data: {
        items: [
          {
            id: 101,
            entity_type: 'students',
            import_mode: 'create_only',
            source_type: 'paste_grid',
            file_name: 'Pasted Grid',
            total_rows: 25,
            successful_rows: 25,
            failed_rows: 0,
            status: 'completed',
            created_at: '2026-11-04T08:00:00Z',
            imported_by: 'Admin User',
            reconciliation: { created: 25, updated: 0, skipped: 0, failed: 0 },
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      },
    } as any)
  })

  it('renders header, tabs, and default paste grid workspace', async () => {
    render(
      <BrowserRouter>
        <ImportExportPage />
      </BrowserRouter>
    )

    expect(screen.getByText(/Import & Export Center/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Paste from Excel/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Upload File/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Export Data/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Import History/i })).toBeDefined()

    await waitFor(() => {
      expect(screen.getByText(/Target Entity/i)).toBeDefined()
      expect(screen.getByText(/Create Only/i)).toBeDefined()
      expect(screen.getByText(/Update Existing/i)).toBeDefined()
      expect(screen.getAllByText(/Validate & Preview/i).length).toBeGreaterThan(0)
    })
  })

  it('loads sample data and executes grid validation', async () => {
    const previewGridSpy = vi.spyOn(endpoints.importExportApi, 'previewGrid').mockResolvedValue({
      data: {
        entity_type: 'students',
        total_rows: 2,
        valid_rows: 2,
        invalid_rows: 0,
        duplicates_found: 0,
        mode: 'create_only',
        mapped_columns: { '0': 'admission_number', '1': 'first_name', '2': 'last_name', '3': 'date_of_birth', '4': 'gender' },
        field_definitions: [],
        row_previews: [
          {
            row_number: 1,
            data: { admission_number: 'PA-2024-001', first_name: 'Aarav' },
            raw_row: ['PA-2024-001', 'Aarav', 'Sharma', '2009-05-15', 'male'],
            is_valid: true,
            is_duplicate: false,
            action: 'create',
            errors: [],
          },
          {
            row_number: 2,
            data: { admission_number: 'SAMPLE-02', first_name: 'Sample 2' },
            raw_row: ['SAMPLE-02', 'Sample 2', '', '2024-04-15', 'male'],
            is_valid: true,
            is_duplicate: false,
            action: 'create',
            errors: [],
          },
        ],
      },
    } as any)

    render(
      <BrowserRouter>
        <ImportExportPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Load Sample Data/i)).toBeDefined()
    })

    fireEvent.click(screen.getByText(/Load Sample Data/i))

    await waitFor(() => {
      expect(screen.getByText(/Loaded sample data for Students Master/i)).toBeDefined()
    })

    const validateBtn = screen.getByRole('button', { name: /Validate & Preview/i })
    fireEvent.click(validateBtn)

    await waitFor(() => {
      expect(previewGridSpy).toHaveBeenCalled()
    })
  })

  it('switches to Export tab and displays cascading filters and formula protection notice', async () => {
    render(
      <BrowserRouter>
        <ImportExportPage />
      </BrowserRouter>
    )

    const exportTabBtn = screen.getByRole('button', { name: /Export Data/i })
    fireEvent.click(exportTabBtn)

    await waitFor(() => {
      expect(screen.getByText(/Filtered Data Export/i)).toBeDefined()
      expect(screen.getByText(/Formula Injection Sanitization Enabled/i)).toBeDefined()
      expect(screen.getByText(/Export & Download File/i)).toBeDefined()
    })
  })

  it('switches to Import History tab and displays history items', async () => {
    render(
      <BrowserRouter>
        <ImportExportPage />
      </BrowserRouter>
    )

    const historyTabBtn = screen.getByRole('button', { name: /Import History/i })
    fireEvent.click(historyTabBtn)

    await waitFor(() => {
      expect(screen.getByText(/Showing 1 of 1 logged imports/i)).toBeDefined()
      expect(screen.getByText(/Pasted Grid/i)).toBeDefined()
      expect(screen.getByText(/completed/i)).toBeDefined()
      expect(screen.getByText(/Admin User/i)).toBeDefined()
    })
  })
})
