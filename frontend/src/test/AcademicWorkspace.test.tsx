/**
 * @file        AcademicWorkspace.test.tsx
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
 * @description Vitest test suite verifying Academic Workspace navigation, KPIs, batch cards, and roster modals.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import AcademicWorkspace from '../pages/AcademicWorkspace'
import * as endpoints from '../api/endpoints'

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'admin', first_name: 'Admin', last_name: 'User' },
    selectedInstitutionId: 2,
    selectedAcademicYearId: 1,
  }),
}))

describe('Academic Structure & Batch Management Workspace Specification', () => {
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
              { standard_id: 9, standard_name: 'Class IX', standard_level: 9, batch_count: 3, student_count: 15 },
            ],
          },
        ],
      },
    } as any)

    vi.spyOn(endpoints.boardsApi, 'list').mockResolvedValue({
      data: [
        { id: 1, name: 'ICSE Board', code: 'ICSE', is_active: true, institution_id: 2, classes_count: 12, batches_count: 14, students_count: 18 },
        { id: 2, name: 'CBSE Board', code: 'CBSE', is_active: true, institution_id: 2, classes_count: 10, batches_count: 12, students_count: 15 },
      ],
    } as any)

    vi.spyOn(endpoints.standardsApi, 'list').mockResolvedValue({
      data: [
        { id: 10, name: 'Class X', level: 10, institution_id: 2, batches_count: 4, subjects_count: 5, students_count: 8 },
        { id: 9, name: 'Class IX', level: 9, institution_id: 2, batches_count: 3, subjects_count: 5, students_count: 15 },
      ],
    } as any)

    vi.spyOn(endpoints.divisionsApi, 'list').mockResolvedValue({
      data: [
        {
          id: 25,
          name: 'Batch A (Morning)',
          code: 'ICSE-X-A',
          standard_id: 10,
          standard_name: 'Class X',
          standard_level: 10,
          board_id: 1,
          board_name: 'ICSE Board',
          board_code: 'ICSE',
          capacity: 40,
          room_number: 'Room 101',
          schedule_timing: 'Mon - Fri, 07:00 AM - 09:00 AM',
          status: 'active',
          is_active: true,
          class_teacher_id: 121,
          class_teacher_name: 'Mr. Rahul Desai',
          enrolled_count: 8,
          available_seats: 32,
          occupancy_percentage: 20,
          subjects: ['Mathematics', 'Science', 'English'],
        },
      ],
    } as any)

    vi.spyOn(endpoints.subjectsApi, 'list').mockResolvedValue({
      data: [
        { id: 1, name: 'Mathematics', code: 'MATH10', standard_id: 10, standard_name: 'Class X', max_marks: 100, passing_marks: 35, is_core: true, is_active: true },
        { id: 2, name: 'Science', code: 'SCI10', standard_id: 10, standard_name: 'Class X', max_marks: 100, passing_marks: 35, is_core: true, is_active: true },
      ],
    } as any)

    vi.spyOn(endpoints.timetableApi, 'list').mockResolvedValue({
      data: [
        {
          id: 1,
          division_id: 25,
          division_name: 'Batch A (Morning)',
          division_code: 'ICSE-X-A',
          subject_id: 1,
          subject_name: 'Mathematics',
          day_of_week: 'Monday',
          start_time: '08:00',
          end_time: '09:30',
          room_number: 'Room 101',
          is_active: true,
        },
      ],
    } as any)

    vi.spyOn(endpoints.timetableApi, 'getRooms').mockResolvedValue({
      data: ['Room 101', 'Room 102', 'Hall A', 'Lab 1'],
    } as any)

    vi.spyOn(endpoints.enrollmentsApi, 'getStats').mockResolvedValue({
      data: {
        total_active_enrollments: 39,
        total_students: 39,
        unassigned_students: 0,
        enrolled_capacity: 39,
        total_capacity: 1530,
        occupancy_percentage: 3,
      },
    } as any)

    vi.spyOn(endpoints.enrollmentsApi, 'list').mockResolvedValue({
      data: {
        items: [
          {
            id: 1,
            student_id: 101,
            student_name: 'Aarav Patel',
            admission_number: 'ADM-2024-001',
            academic_year_id: 1,
            academic_year_name: '2024-25',
            standard_id: 10,
            standard_name: 'Class X',
            board_id: 1,
            board_name: 'ICSE Board',
            board_code: 'ICSE',
            division_id: 25,
            division_name: 'Batch A (Morning)',
            division_code: 'ICSE-X-A',
            roll_number: '10-A-01',
            enrollment_date: '2024-06-15',
            status: 'active',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      },
    } as any)

    vi.spyOn(endpoints.academicReportsApi, 'getBatchCapacity').mockResolvedValue({
      data: [
        {
          batch_id: 25,
          batch_name: 'Batch A (Morning)',
          board_name: 'ICSE Board',
          standard_name: 'Class X',
          capacity: 40,
          enrolled: 8,
          available_seats: 32,
          occupancy_percentage: 20,
          status: 'active',
          teacher_name: 'Mr. Rahul Desai',
          room_number: 'Room 101',
          schedule_timing: 'Mon - Fri',
        },
      ],
    } as any)
  })

  it('renders workspace title and top navigation tabs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Academic Structure & Batch Management')).toBeDefined()
    expect(screen.getByText('Overview')).toBeDefined()
    expect(screen.getByText('Boards')).toBeDefined()
    expect(screen.getByText('Classes')).toBeDefined()
    expect(screen.getByText('Subjects')).toBeDefined()
    expect(screen.getByText('Batches')).toBeDefined()
    expect(screen.getByText('Enrollment')).toBeDefined()
    expect(screen.getByText('Reports')).toBeDefined()
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Timetable').length).toBeGreaterThanOrEqual(1)
  })

  it('renders 5 KPI metric cards with live values on Overview', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Total Students')).toBeDefined()
      expect(screen.getAllByText('39').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Classes / Standards')).toBeDefined()
      expect(screen.getByText('Active Batches')).toBeDefined()
      expect(screen.getByText('Weekly Class Sessions')).toBeDefined()
    })
  })

  it('renders academic structure tree and batch cards', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Academic Structure')).toBeDefined()
      expect(screen.getByText('Batch A (Morning)')).toBeDefined()
      expect(screen.getByText('ICSE-X-A')).toBeDefined()
      expect(screen.getByText('Mr. Rahul Desai')).toBeDefined()
      expect(screen.getByText('Room 101')).toBeDefined()
    })
  })

  it('switches to Boards tab and renders board cards with counts', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    const boardsTabBtn = screen.getByRole('button', { name: /Boards/i })
    fireEvent.click(boardsTabBtn)

    await waitFor(() => {
      expect(screen.getByText('Educational Boards')).toBeDefined()
      expect(screen.getByText('ICSE Board')).toBeDefined()
      expect(screen.getByText('CBSE Board')).toBeDefined()
      expect(screen.getByText('Add Board')).toBeDefined()
    })
  })

  it('switches to Classes tab and renders classes table', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    const classesTabBtn = screen.getByRole('button', { name: /Classes/i })
    fireEvent.click(classesTabBtn)

    await waitFor(() => {
      expect(screen.getByText('Classes & Standards Master')).toBeDefined()
      expect(screen.getByText('Add Class')).toBeDefined()
      expect(screen.getByText('Class X')).toBeDefined()
      expect(screen.getByText('Class IX')).toBeDefined()
    })
  })

  it('switches to Subjects tab and renders curriculum list', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    const subjectsTabBtn = screen.getByRole('button', { name: /Subjects/i })
    fireEvent.click(subjectsTabBtn)

    await waitFor(() => {
      expect(screen.getByText('Academic Subjects')).toBeDefined()
      expect(screen.getByText('Mathematics')).toBeDefined()
      expect(screen.getByText('MATH10')).toBeDefined()
      expect(screen.getByText('Add Subject')).toBeDefined()
    })
  })

  it('switches to Timetable tab and renders weekly schedule slots', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    const timetableTabBtn = screen.getAllByRole('button', { name: /Timetable/i })[0]
    fireEvent.click(timetableTabBtn)

    await waitFor(() => {
      expect(screen.getByText('Institute Master Timetable')).toBeDefined()
      expect(screen.getByText('Add Session')).toBeDefined()
      expect(screen.getByText('Monday')).toBeDefined()
    })
  })

  it('switches to Enrollment tab and renders active enrollments', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    const enrollTabBtn = screen.getByRole('button', { name: /Enrollment/i })
    fireEvent.click(enrollTabBtn)

    await waitFor(() => {
      expect(screen.getByText('Student Enrollment Register')).toBeDefined()
      expect(screen.getByText('Aarav Patel')).toBeDefined()
      expect(screen.getByText('ADM-2024-001')).toBeDefined()
      expect(screen.getByText('Enroll Student')).toBeDefined()
    })
  })

  it('switches to Reports tab and renders capacity report', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    const reportsTabBtn = screen.getByRole('button', { name: /Reports/i })
    fireEvent.click(reportsTabBtn)

    await waitFor(() => {
      expect(screen.getByText('Academic Analytics & Reports')).toBeDefined()
      expect(screen.getByText('Batch Capacity')).toBeDefined()
      expect(screen.getByText('Export CSV')).toBeDefined()
    })
  })

  it('switches to Settings tab and renders operational configuration form', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcademicWorkspace />
        </BrowserRouter>
      </QueryClientProvider>
    )

    const settingsTabBtn = screen.getByRole('button', { name: /Settings/i })
    fireEvent.click(settingsTabBtn)

    await waitFor(() => {
      expect(screen.getByText('Academic & Batch Operational Settings')).toBeDefined()
      expect(screen.getByText('Default Batch Capacity (Seats)')).toBeDefined()
      expect(screen.getByText('Save Settings')).toBeDefined()
    })
  })
})
