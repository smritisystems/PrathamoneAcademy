/**
 * @file        AcademicDedicatedSubmenus.test.tsx
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
 * @created     2026-11-08
 * @updated     2026-11-08
 *
 * @description Dedicated automated test suite verifying all 9 Academic Structure & Management workspaces.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AcademicWorkspace from '../pages/AcademicWorkspace'
import * as endpoints from '../api/endpoints'

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'admin', first_name: 'Admin', last_name: 'User' },
    selectedInstitutionId: 2,
    selectedAcademicYearId: 1,
  }),
}))

describe('Academic Submenu Dedicated Workspaces Specification', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    vi.spyOn(endpoints.standardsApi, 'getOverview').mockResolvedValue({
      data: {
        metrics: {
          total_students: 39,
          total_classes: 12,
          active_batches: 37,
          enrolled_seats: 39,
          total_seats: 1530,
          occupancy_percentage: 3,
          weekly_sessions: 100,
        },
        structure_tree: [
          {
            board_id: 1,
            board_name: 'ICSE Board',
            board_code: 'ICSE',
            classes: [
              { standard_id: 10, standard_name: 'Class X', standard_level: 10, batch_count: 4, student_count: 8 },
            ],
          },
        ],
      },
    } as any)

    vi.spyOn(endpoints.boardsApi, 'list').mockResolvedValue({
      data: [
        { id: 1, name: 'ICSE Board', code: 'ICSE', is_active: true, created_at: '2026-01-01' },
        { id: 2, name: 'CBSE Board', code: 'CBSE', is_active: true, created_at: '2026-01-01' },
      ],
    } as any)

    vi.spyOn(endpoints.standardsApi, 'list').mockResolvedValue({
      data: [
        { id: 10, name: 'Class X', level: 10, board_id: 1, is_active: true },
        { id: 9, name: 'Class IX', level: 9, board_id: 1, is_active: true },
      ],
    } as any)

    vi.spyOn(endpoints.divisionsApi, 'list').mockResolvedValue({
      data: [
        { id: 1, name: 'Batch 10-A', code: 'B10A', standard_id: 10, capacity: 40, room_number: 'Room 101', status: 'active', student_count: 8 },
      ],
    } as any)

    vi.spyOn(endpoints.subjectsApi, 'list').mockResolvedValue({
      data: [
        { id: 1, name: 'Mathematics', code: 'MATH', standard_id: 10, max_marks: 100, passing_marks: 35, is_core: true },
      ],
    } as any)

    vi.spyOn(endpoints.timetableApi, 'list').mockResolvedValue({
      data: [
        { id: 1, division_id: 1, subject_id: 1, day_of_week: 'Monday', start_time: '08:00', end_time: '09:30', room_number: 'Room 101' },
      ],
    } as any)

    vi.spyOn(endpoints.enrollmentsApi, 'list').mockResolvedValue({
      data: [
        { id: 1, student_id: 101, student_name: 'Aarav Sharma', standard_id: 10, standard_name: 'Class X', division_id: 1, division_name: 'Batch 10-A', roll_number: '10A-01', status: 'active' },
      ],
    } as any)

    vi.spyOn(endpoints.academicReportsApi, 'getBatchCapacity').mockResolvedValue({
      data: [
        { division_id: 1, batch_name: 'Batch 10-A', standard_name: 'Class X', board_code: 'ICSE', capacity: 40, enrolled_count: 8, occupancy_pct: 20, room_number: 'Room 101', schedule_timing: 'Morning' },
      ],
    } as any)

    vi.spyOn(endpoints.standardsApi, 'getSettings').mockResolvedValue({
      data: {
        defaultBatchCapacity: 40,
        enforceCapacityStrict: true,
        preventTimetableConflicts: true,
        academicYearName: 'AY 2024–25 (Current)',
        autoRollNumberFormat: 'STD-DIV-SEQ',
      },
    } as any)

    vi.spyOn(endpoints.settingsApi, 'getAll').mockResolvedValue({
      data: {
        academic: {
          batch_capacity_warning: 40,
          enforce_capacity_strict: true,
          prevent_timetable_conflicts: true,
          auto_roll_number_format: 'STD-DIV-SEQ',
        },
      },
    } as any)

    vi.spyOn(endpoints.usersApi, 'list').mockResolvedValue({
      data: { items: [{ id: 1, first_name: 'Admin', last_name: 'User', role: 'admin' }] },
    } as any)
  })

  const renderWithRoute = (initialPath: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/academic" element={<AcademicWorkspace />} />
            <Route path="/academic/:subTab" element={<AcademicWorkspace />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('SPEC 1: /academic renders Overview workspace with KPIs and Structure Tree', async () => {
    renderWithRoute('/academic')
    await waitFor(() => {
      expect(screen.getByText('Academic Structure & Batch Management')).toBeDefined()
    })
    expect(screen.getByText('Overview')).toBeDefined()
    expect(screen.getByText('Boards')).toBeDefined()
    expect(screen.getByText('Classes')).toBeDefined()
    expect(screen.getByText('Batches')).toBeDefined()
  })

  it('SPEC 2: /academic/boards renders Boards workspace and Add Board action', async () => {
    renderWithRoute('/academic/boards')
    await waitFor(() => {
      expect(screen.getByText('Boards & Curriculum Authorities')).toBeDefined()
    })
    expect(screen.getAllByText(/Add Board/i).length).toBeGreaterThan(0)
  })

  it('SPEC 3: /academic/classes renders Classes register workspace', async () => {
    renderWithRoute('/academic/classes')
    await waitFor(() => {
      expect(screen.getByText('Classes & Standards Register')).toBeDefined()
    })
    expect(screen.getAllByText(/Add Class/i).length).toBeGreaterThan(0)
  })

  it('SPEC 4: /academic/subjects renders Curriculum & Subjects Directory', async () => {
    renderWithRoute('/academic/subjects')
    await waitFor(() => {
      expect(screen.getByText('Curriculum & Subjects Directory')).toBeDefined()
    })
    expect(screen.getAllByText(/Add Subject/i).length).toBeGreaterThan(0)
  })

  it('SPEC 5: /academic/batches renders Batch Operations workspace', async () => {
    renderWithRoute('/academic/batches')
    await waitFor(() => {
      expect(screen.getByText('Batches & Division Operations')).toBeDefined()
    })
    expect(screen.getAllByText(/Create Batch/i).length).toBeGreaterThan(0)
  })

  it('SPEC 6: /academic/timetable renders Weekly Timetable & Schedule', async () => {
    renderWithRoute('/academic/timetable')
    await waitFor(() => {
      expect(screen.getByText('Weekly Timetable & Schedule')).toBeDefined()
    })
    expect(screen.getAllByText(/Schedule Session/i).length).toBeGreaterThan(0)
  })

  it('SPEC 7: /academic/enrollment renders Student Batch Enrollment & Transfers', async () => {
    renderWithRoute('/academic/enrollment')
    await waitFor(() => {
      expect(screen.getByText('Student Batch Enrollment & Transfers')).toBeDefined()
    })
    expect(screen.getAllByText(/Enroll Student/i).length).toBeGreaterThan(0)
  })

  it('SPEC 8: /academic/reports renders Academic Reports & Analytics', async () => {
    renderWithRoute('/academic/reports')
    await waitFor(() => {
      expect(screen.getByText('Academic Reports & Analytics')).toBeDefined()
    })
    expect(screen.getAllByText(/Export/i).length).toBeGreaterThan(0)
  })

  it('SPEC 9: /academic/settings renders Academic Settings & Conflict Policy', async () => {
    renderWithRoute('/academic/settings')
    await waitFor(() => {
      expect(screen.getByText('Academic Settings & Conflict Policy')).toBeDefined()
    })
    expect(screen.getAllByText(/Settings/i).length).toBeGreaterThan(0)
  })
})
