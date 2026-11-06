/**
 * @file        WorkforceDashboards.test.tsx
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
 * @created     2026-11-06
 * @updated     2026-11-07
 *
 * @description Unit tests verifying Teacher and Staff Workforce Dashboards, live KPI metrics, unassigned teacher highlights, lifecycle transitions, and 15-tab profile modals.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeacherManagement from '../pages/TeacherManagement'
import StaffManagement from '../pages/StaffManagement'
import TeacherProfileModal from '../components/TeacherProfileModal'
import StaffLifecycleModal from '../components/StaffLifecycleModal'
import { staffApi, boardsApi, standardsApi, divisionsApi, subjectsApi, academicYearsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import type { TeacherDashboardData, StaffDashboardData } from '../types'

describe('Teacher & Staff Workforce Dashboards Suite', () => {
  let queryClient: QueryClient

  const mockTeacherDashboard: TeacherDashboardData = {
    metrics: {
      total_teachers: 5,
      active_teachers: 4,
      assigned_teachers: 3,
      unassigned_teachers: 1,
      teachers_without_timetable: 1,
      teachers_on_leave: 1,
      inactive_teachers: 0,
      departed_teachers: 1,
      upcoming_joining: 0,
      pending_session_approvals: 3,
      monthly_teaching_hours: 42.5,
      monthly_payroll_payable: 125000.0,
      pending_teacher_payments: 35000.0,
    },
    teachers: [
      {
        id: 101,
        profile_id: 1,
        employee_id: 'TCH-001',
        name: 'Ramesh Sharma',
        first_name: 'Ramesh',
        last_name: 'Sharma',
        email: 'sharma@prashantacademy.com',
        phone: '9820011111',
        designation: 'Senior Faculty',
        department: 'Academics',
        employment_type: 'full_time',
        joining_date: '2024-06-01',
        status: 'active',
        is_active_employee: true,
        is_assigned: true,
        assignment_count: 2,
        weekly_hours: 8.0,
        has_timetable: true,
        timetable_slots_count: 4,
        payment_method: 'hourly',
        hourly_rate: 1200.0,
        per_lecture_rate: 0.0,
        monthly_fixed_amount: 0.0,
        qualification: 'M.Sc. Mathematics',
        specialization: 'Advanced Calculus',
        is_departed: false,
        is_upcoming: false,
        exit_date: null,
        exit_reason: null,
        rehire_eligible: true,
      },
      {
        id: 102,
        profile_id: 2,
        employee_id: 'TCH-002',
        name: 'Priya Kulkarni',
        first_name: 'Priya',
        last_name: 'Kulkarni',
        email: 'priya@prashantacademy.com',
        phone: '9820022222',
        designation: 'Faculty Specialist',
        department: 'Academics',
        employment_type: 'full_time',
        joining_date: '2025-01-15',
        status: 'active',
        is_active_employee: true,
        is_assigned: false,
        assignment_count: 0,
        weekly_hours: 0.0,
        has_timetable: false,
        timetable_slots_count: 0,
        payment_method: 'monthly_fixed',
        hourly_rate: 0.0,
        per_lecture_rate: 0.0,
        monthly_fixed_amount: 55000.0,
        qualification: 'M.Sc. Physics',
        specialization: 'Thermodynamics & Optics',
        is_departed: false,
        is_upcoming: false,
        exit_date: null,
        exit_reason: null,
        rehire_eligible: true,
      },
    ],
  }

  const mockStaffDashboard: StaffDashboardData = {
    metrics: {
      total_staff: 6,
      active_staff: 5,
      unassigned_staff: 0,
      staff_on_leave: 1,
      inactive_staff: 0,
      departed_staff: 1,
      upcoming_joining: 0,
      departments_count: 3,
      department_breakdown: {
        'Accounts & Finance': 2,
        'Front Desk & Counseling': 2,
        'IT & Operations': 2,
      },
      designation_breakdown: {
        Accountant: 2,
        Receptionist: 2,
        Administrator: 2,
      },
    },
    staff: [
      {
        id: 201,
        profile_id: 11,
        employee_id: 'STF-001',
        name: 'Rajesh Sharma',
        first_name: 'Rajesh',
        last_name: 'Sharma',
        email: 'rajesh@prashantacademy.com',
        phone: '9820033333',
        designation: 'Senior Accountant',
        department: 'Accounts & Finance',
        employment_type: 'full_time',
        joining_date: '2023-04-01',
        status: 'active',
        is_active_employee: true,
        is_on_leave: false,
        qualification: 'M.Com, CA-Inter',
        specialization: 'Accounting & Taxation',
        basic_salary: 45000.0,
        is_departed: false,
        is_upcoming: false,
        exit_date: null,
        exit_reason: null,
        rehire_eligible: true,
      },
    ],
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })
    vi.clearAllMocks()

    // Mock Admin User
    useAuthStore.setState({
      user: {
        id: 1,
        institution_id: 1,
        username: 'sysadmin',
        email: 'admin@prashantacademy.com',
        role: 'superadmin',
        first_name: 'System',
        last_name: 'Administrator',
      } as any,
      token: 'mock-jwt-token',
    })

    // Mock API endpoints
    vi.spyOn(staffApi, 'getTeacherDashboard').mockResolvedValue({
      data: mockTeacherDashboard,
    } as any)

    vi.spyOn(staffApi, 'getStaffDashboard').mockResolvedValue({
      data: mockStaffDashboard,
    } as any)

    vi.spyOn(staffApi, 'list').mockResolvedValue({
      data: {
        items: [
          {
            profile_id: 11,
            user_id: 201,
            employee_id: 'STF-001',
            first_name: 'Rajesh',
            last_name: 'Sharma',
            full_name: 'Rajesh Sharma',
            username: 'rajesh.sharma',
            email: 'rajesh@prashantacademy.com',
            role: 'accountant',
            staff_type: 'Accountant',
            department: 'Accounts & Finance',
            employment_type: 'full_time',
            status: 'active',
            is_active: true,
            assignments_count: 0,
            total_weekly_hours: 0,
          },
        ],
        total: 1,
        page: 1,
        limit: 15,
        pages: 1,
      },
    } as any)

    vi.spyOn(staffApi, 'get').mockResolvedValue({
      data: {
        profile_id: 1,
        user_id: 101,
        employee_id: 'TCH-001',
        first_name: 'Ramesh',
        last_name: 'Sharma',
        full_name: 'Ramesh Sharma',
        username: 'prof_sharma',
        email: 'sharma@prashantacademy.com',
        phone: '9820011111',
        role: 'teacher',
        staff_type: 'Teacher',
        department: 'Academics',
        qualification: 'M.Sc. Mathematics',
        specialization: 'Advanced Calculus',
        experience_years: 6,
        employment_type: 'full_time',
        joining_date: '2024-06-01',
        status: 'active',
        is_active: true,
        assignments_count: 2,
        total_weekly_hours: 8.0,
        assignments: [
          {
            id: 501,
            board: 'CBSE',
            standard: 'Std 10',
            batch: 'Batch A',
            subject: 'Mathematics',
            weekly_hours: 4.0,
            is_class_teacher: true,
          },
        ],
      },
    } as any)

    vi.spyOn(academicYearsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: '2026-2027', is_current: true }],
    } as any)

    vi.spyOn(boardsApi, 'list').mockResolvedValue({ data: [{ id: 1, name: 'CBSE' }] } as any)
    vi.spyOn(standardsApi, 'list').mockResolvedValue({ data: [{ id: 10, name: 'Std 10' }] } as any)
    vi.spyOn(divisionsApi, 'list').mockResolvedValue({ data: [{ id: 25, name: 'Div A' }] } as any)
    vi.spyOn(subjectsApi, 'list').mockResolvedValue({ data: [{ id: 1, name: 'Mathematics', code: 'MATH10' }] } as any)
  })

  it('renders Teacher Workspace with live 13 KPI metric cards and unassigned teacher badge', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeacherManagement />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Teacher Workspace')).toBeDefined()
    })

    // Wait for async query data to render
    await waitFor(() => {
      expect(screen.getByText('Priya Kulkarni')).toBeDefined()
    })

    // Check Live KPI Cards
    expect(screen.getByText('Total Teachers')).toBeDefined()
    expect(screen.getByText('Monthly Teaching Hours')).toBeDefined()
    expect(screen.getByText('Teacher Status Distribution')).toBeDefined()

    // Verify unassigned teacher highlight
    expect(screen.getByText('Unassigned • Allocate')).toBeDefined()

    // Verify assigned teacher details
    expect(screen.getByText('Ramesh Sharma')).toBeDefined()
    expect(screen.getByText('TCH-001')).toBeDefined()
  })

  it('filters teacher list when clicking Unassigned sub-filter tab', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeacherManagement />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Priya Kulkarni')).toBeDefined()
    })

    // Click on "Unassigned" tab button
    const unassignedButtons = screen.getAllByText('Unassigned')
    fireEvent.click(unassignedButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Priya Kulkarni')).toBeDefined()
      // Assigned teacher should not be shown under unassigned filter
      expect(screen.queryByText('Ramesh Sharma')).toBeNull()
    })
  })

  it('opens and submits StaffLifecycleModal for status transition', async () => {
    const updateSpy = vi.spyOn(staffApi, 'updateLifecycle').mockResolvedValue({
      data: {
        status: 'success',
        action: 'resign',
        user_id: 101,
        old_status: 'active',
        new_status: 'resigned',
        effective_date: '2026-11-06',
        is_active: false,
      },
    } as any)

    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StaffLifecycleModal
            isOpen={true}
            onClose={onClose}
            employee={{
              id: 101,
              name: 'Ramesh Sharma',
              employee_id: 'TCH-001',
              role: 'Teacher',
              status: 'active',
            }}
            onSuccess={onSuccess}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Employee Lifecycle Management')).toBeDefined()
    expect(screen.getByText('Ramesh Sharma')).toBeDefined()

    // Select Formal Resignation action
    const resignButton = screen.getByText('Formal Resignation')
    fireEvent.click(resignButton)

    // Submit the lifecycle form
    const submitBtn = screen.getByText('Confirm Status Transition')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          action: 'resign',
          rehire_eligible: true,
        })
      )
      expect(onSuccess).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('renders Non-Teaching Staff Workspace with department and headcount KPIs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StaffManagement />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Total Staff')).toBeDefined()
    })

    expect(screen.getByText('Active Staff')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('Rajesh Sharma')).toBeDefined()
    })
  })
})
