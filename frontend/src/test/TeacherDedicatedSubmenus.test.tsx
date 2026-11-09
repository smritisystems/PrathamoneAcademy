/**
 * @file        TeacherDedicatedSubmenus.test.tsx
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
 * @created     2026-11-09
 * @updated     2026-11-09
 *
 * @description Vitest test suite validating all 8 dedicated Teacher & Faculty Management workspace routes, View-First locks, and training isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeacherManagement from '../pages/TeacherManagement'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import * as endpoints from '../api/endpoints'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const renderWithRouter = (initialRoute: string) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <TeacherManagement />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Teacher & Faculty Dedicated Workspace Submenus Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashantacademy.in',
        role: 'superadmin',
        first_name: 'Super',
        last_name: 'Admin',
      },
      token: 'fake-jwt-token',
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })
    useEditModeStore.setState({ scopes: {} })
    useEnvironmentStore.setState({ isTrainingMode: false })

    // Mock Teacher Dashboard
    vi.spyOn(endpoints.staffApi, 'getTeacherDashboard').mockResolvedValue({
      data: {
        metrics: {
          total_teachers: 12,
          active_teachers: 10,
          assigned_teachers: 8,
          unassigned_teachers: 2,
          teachers_without_timetable: 1,
          teachers_on_leave: 1,
          inactive_teachers: 0,
          departed_teachers: 0,
          upcoming_joining: 0,
          pending_session_approvals: 3,
          monthly_teaching_hours: 142,
          monthly_payroll_payable: 185000,
          pending_teacher_payments: 25000,
        },
        teachers: [
          {
            id: 101,
            name: 'Ramesh Sharma',
            employee_id: 'FAC-001',
            email: 'ramesh@prashantacademy.com',
            phone: '+91 98200 12345',
            specialization: 'Advanced Mathematics',
            qualification: 'M.Sc., B.Ed.',
            status: 'active',
            is_active_employee: true,
            is_assigned: true,
            has_timetable: true,
          },
          {
            id: 102,
            name: 'Priya Patel',
            employee_id: 'FAC-002',
            email: 'priya@prashantacademy.com',
            phone: '+91 98200 67890',
            specialization: 'Physics & Mechanics',
            qualification: 'Ph.D. Physics',
            status: 'active',
            is_active_employee: true,
            is_assigned: false,
            has_timetable: false,
          },
        ],
      } as any,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    // Mock academic years
    vi.spyOn(endpoints.academicYearsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: '2026-2027', is_current: true } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    // Mock boards, standards, divisions, subjects
    vi.spyOn(endpoints.boardsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'CBSE' } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.standardsApi, 'list').mockResolvedValue({
      data: [{ id: 10, name: 'Class 10' } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.divisionsApi, 'list').mockResolvedValue({
      data: [{ id: 25, name: 'Batch Alpha' } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.subjectsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Mathematics' } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    // Mock assignments list
    vi.spyOn(endpoints.staffApi, 'assignmentsList').mockResolvedValue({
      data: [
        {
          id: 501,
          teacher_user_id: 101,
          teacher_name: 'Ramesh Sharma',
          board_name: 'CBSE',
          standard_name: 'Class 10',
          division_name: 'Batch Alpha',
          subject_name: 'Mathematics',
          weekly_hours: 5.0,
          is_class_teacher: true,
          notes: 'Class 10 Lead Tutor',
        } as any,
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    // Mock sessions
    vi.spyOn(endpoints.teacherPayrollApi, 'getSessions').mockResolvedValue({
      data: {
        items: [
          {
            id: 601,
            session_code: 'SES-001',
            teacher_name: 'Ramesh Sharma',
            batch_name: 'Batch Alpha',
            subject_name: 'Mathematics',
            session_date: '2026-11-09',
            scheduled_start_time: '08:30',
            actual_start_time: '08:30',
            calculated_duration_hours: 1.5,
            topic: 'Quadratic Equations',
            students_count: 28,
            calculated_amount: 1125,
            approval_status: 'approved',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      } as any,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    // Mock monthly payroll
    vi.spyOn(endpoints.teacherPayrollApi, 'getMonthlyPayrolls').mockResolvedValue({
      data: [
        {
          id: 701,
          payroll_number: 'PRL-2026-11-0001',
          teacher_name: 'Ramesh Sharma',
          teacher_email: 'ramesh@prashantacademy.com',
          payment_method: 'hourly',
          total_teaching_hours: 24,
          total_completed_lectures: 16,
          gross_pay: 18000,
          total_deductions: 500,
          net_payable: 17500,
          paid_amount: 17500,
          pending_amount: 0,
          status: 'paid',
        } as any,
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    // Mock daily attendance
    vi.spyOn(endpoints.staffApi, 'dailyAttendance').mockResolvedValue({
      data: {
        date: '2026-11-09',
        total_staff: 2,
        present_count: 2,
        absent_count: 0,
        items: [
          {
            user_id: 101,
            name: 'Ramesh Sharma',
            employee_id: 'FAC-001',
            status: 'present',
            check_in_time: '08:25',
            check_out_time: '16:30',
            hours_worked: 8.0,
            remarks: 'On duty',
          },
        ],
      } as any,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    // Mock leaves list
    vi.spyOn(endpoints.staffApi, 'leavesList').mockResolvedValue({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })
  })

  it('1. Renders Faculty Overview Workspace at /teachers and /teachers/overview', async () => {
    renderWithRouter('/teachers')
    expect(await screen.findByRole('heading', { level: 1, name: /Faculty Workforce Overview/i })).toBeDefined()
    expect((await screen.findAllByText('12')).length).toBeGreaterThan(0)
    expect(screen.getByText(/Total Faculty/i)).toBeDefined()
    expect(screen.getByText(/Active Teaching Faculty Snapshot/i)).toBeDefined()
  })

  it('2. Navigates to Faculty Directory & Dossiers at /teachers/directory', async () => {
    renderWithRouter('/teachers/directory')
    expect(await screen.findByRole('heading', { level: 1, name: /Faculty Directory & Dossiers/i })).toBeDefined()
    expect(screen.getByPlaceholderText(/Search faculty by name, ID, subject.../i)).toBeDefined()
    expect(await screen.findByText('Ramesh Sharma')).toBeDefined()
    expect(screen.getByText('FAC-001')).toBeDefined()
  })

  it('3. Navigates to Batch & Subject Allocations at /teachers/allocations', async () => {
    renderWithRouter('/teachers/allocations')
    expect(await screen.findByRole('heading', { level: 1, name: /Batch & Subject Allocations/i })).toBeDefined()
    expect(screen.getByText(/Filter by Faculty/i)).toBeDefined()
    expect(await screen.findByText('Class 10 Lead Tutor')).toBeDefined()
    expect(screen.getAllByText('Class Teacher').length).toBeGreaterThan(0)
  })

  it('4. Navigates to Faculty Timetable & Schedules at /teachers/timetable', async () => {
    renderWithRouter('/teachers/timetable')
    expect(await screen.findByRole('heading', { level: 1, name: /Faculty Timetable & Schedules/i })).toBeDefined()
    expect(screen.getByText(/Lecture Schedule Grid/i)).toBeDefined()
    expect(screen.getByText(/Zero Schedule Collisions/i)).toBeDefined()
    expect(screen.getByText('Period 1')).toBeDefined()
  })

  it('5. Navigates to Faculty Attendance & Leaves at /teachers/attendance', async () => {
    renderWithRouter('/teachers/attendance')
    expect(await screen.findByRole('heading', { level: 1, name: /Faculty Attendance & Leave Requests/i })).toBeDefined()
    expect(await screen.findByText(/Faculty Daily Duty Register/i)).toBeDefined()
    expect(screen.getByText(/Faculty Leave Applications Queue/i)).toBeDefined()
  })

  it('6. Navigates to Salary & Payroll at /teachers/payroll', async () => {
    renderWithRouter('/teachers/payroll')
    expect(await screen.findByRole('heading', { level: 1, name: /Teacher Payroll & Salary Register/i })).toBeDefined()
    expect(screen.getByText(/Payroll Period:/i)).toBeDefined()
    expect(await screen.findByText('PRL-2026-11-0001')).toBeDefined()
    expect(screen.getAllByText('₹17,500').length).toBeGreaterThan(0)
  })

  it('7. Navigates to Teaching Sessions & Performance at /teachers/performance', async () => {
    renderWithRouter('/teachers/performance')
    expect(await screen.findByRole('heading', { level: 1, name: /Teaching Sessions & Performance/i })).toBeDefined()
    expect(await screen.findByText('SES-001')).toBeDefined()
    expect(screen.getByText('Quadratic Equations')).toBeDefined()
    expect(screen.getByText('₹1,125')).toBeDefined()
  })

  it('8. Navigates to Policies & Settings at /teachers/settings', async () => {
    renderWithRouter('/teachers/settings')
    expect(await screen.findByRole('heading', { level: 1, name: /Teacher Policies & Compensation Settings/i })).toBeDefined()
    expect(screen.getByText(/Faculty Compensation & Lecture Pay Scales/i)).toBeDefined()
    expect(screen.getByText(/Strict Timetable Collision Prevention/i)).toBeDefined()
  })

  it('9. Enforces Rule 010 View-First locked state for mutation action buttons', async () => {
    useEditModeStore.setState({ scopes: {} })
    renderWithRouter('/teachers/directory')
    // Primary action button should display (Locked) suffix in View Mode
    const addTeacherBtn = await screen.findByRole('button', { name: /Add New Teacher \(Locked\)/i })
    expect(addTeacherBtn).toBeDefined()
    expect(addTeacherBtn.className).toContain('cursor-not-allowed')
  })

  it('10. Displays prominent TRAINING MODE indicator when training mode is active', async () => {
    useEnvironmentStore.setState({ isTrainingMode: true })
    renderWithRouter('/teachers/overview')
    expect(await screen.findByText('TRAINING MODE')).toBeDefined()
  })
})
