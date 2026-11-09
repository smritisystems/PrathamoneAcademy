/**
 * @file        StaffDedicatedSubmenus.test.tsx
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
 * @description Vitest test suite validating dedicated functional workspaces for Staff & HR Directory across all 8 submenus, URL synchronization, and Rule 010 View-First governance.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StaffManagement from '../pages/StaffManagement'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

// Mock API endpoints
vi.mock('../api/endpoints', () => ({
  staffApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            user_id: 101,
            id: 101,
            first_name: 'Pooja',
            last_name: 'Nair',
            employee_id: 'EMP-ADM-01',
            department: 'Administration',
            role: 'staff',
            status: 'active',
            phone: '9876543201',
          },
          {
            user_id: 102,
            id: 102,
            first_name: 'Sanjay',
            last_name: 'Gupta',
            employee_id: 'EMP-FIN-02',
            department: 'Finance',
            role: 'staff',
            status: 'active',
            phone: '9876543202',
          },
        ],
        total: 2,
        page: 1,
        limit: 15,
        pages: 1,
      },
    }),
    get: vi.fn().mockResolvedValue({
      data: {
        user_id: 101,
        id: 101,
        first_name: 'Pooja',
        last_name: 'Nair',
        employee_id: 'EMP-ADM-01',
      },
    }),
    create: vi.fn().mockResolvedValue({
      data: {
        success: true,
        message: 'Staff created',
        user_id: 105,
        employee_id: 'EMP-ADM-05',
        temporary_password: 'Pass@123',
      },
    }),
    dailyAttendance: vi.fn().mockResolvedValue({
      data: {
        attendance_date: '2026-11-09',
        records: [
          {
            user_id: 101,
            employee_id: 'EMP-ADM-01',
            full_name: 'Pooja Nair',
            name: 'Pooja Nair',
            staff_type: 'staff',
            role: 'staff',
            status: 'present',
            check_in_time: '09:00 AM',
            check_out_time: '06:00 PM',
            hours_worked: 9.0,
            remarks: 'On time',
          },
        ],
      },
    }),
    markAttendance: vi.fn().mockResolvedValue({ data: { success: true } }),
    leavesList: vi.fn().mockResolvedValue({
      data: [
        {
          id: 501,
          user_id: 101,
          staff_name: 'Pooja Nair',
          user_name: 'Pooja Nair',
          leave_type: 'casual',
          start_date: '2026-11-12',
          end_date: '2026-11-13',
          days_count: 2,
          reason: 'Family function',
          status: 'pending',
        },
      ],
    }),
    actionLeave: vi.fn().mockResolvedValue({ data: { success: true } }),
    getStaffDashboard: vi.fn().mockResolvedValue({
      data: {
        total_staff: 18,
        active_shifts: 16,
      },
    }),
    documentCatalogue: vi.fn().mockResolvedValue({
      data: [
        { id: 'appointment_letter', name: 'Appointment Letter', category: 'Recruitment' },
      ],
    }),
    renderDocument: vi.fn().mockResolvedValue({
      data: { html: '<p>Document Preview</p>' },
    }),
  },
  settingsApi: {
    getAll: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

describe('Staff & HR Dedicated Workspaces Suite', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

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

    useEditModeStore.setState({
      scopes: {},
    })

    useEnvironmentStore.setState({
      isTrainingMode: false,
      dataEnvironment: 'PRODUCTION',
    })
  })

  const renderWithRoute = (initialPath = '/staff') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="staff/*" element={<StaffManagement />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders all 8 dedicated navigation tabs', async () => {
    renderWithRoute('/staff')

    const nav = screen.getByRole('navigation', { name: 'Staff Navigation Tabs' })
    expect(within(nav).getByRole('button', { name: /overview/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /staff register/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /new onboarding/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /roles & duties/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /staff presence/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /leave requests/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /hr documents studio/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /hr policies/i })).toBeDefined()
  })

  it('renders Overview workspace at /staff/overview with HR analytics', async () => {
    renderWithRoute('/staff/overview')

    expect(await screen.findByText('Staff Workforce Overview & HR Analytics')).toBeDefined()
    expect(screen.getByText('Total Non-Teaching Staff')).toBeDefined()
    expect(screen.getByText('Present on Duty')).toBeDefined()
    expect(screen.getByText('Pending Leaves')).toBeDefined()
    expect(screen.getByText('Workforce Department Distribution')).toBeDefined()
  })

  it('renders Staff Register workspace at /staff/directory with personnel table', async () => {
    renderWithRoute('/staff/directory')

    expect(await screen.findByText('Staff Register & Master Directory')).toBeDefined()
    expect(screen.getByPlaceholderText(/search staff by name, employee code/i)).toBeDefined()
    expect(await screen.findByText('Pooja Nair')).toBeDefined()
    expect(screen.getByText('EMP-ADM-01')).toBeDefined()
  })

  it('renders New Onboarding workspace at /staff/onboarding with application form', async () => {
    renderWithRoute('/staff/onboarding')

    expect(await screen.findByText('New Staff Member Onboarding & Intake')).toBeDefined()
    expect(screen.getByText('1. Personal & Identity Details')).toBeDefined()
    expect(screen.getByText('2. Department & Employment Role')).toBeDefined()
    expect(screen.getByText('3. System Credentials & Email')).toBeDefined()
  })

  it('renders Roles & Duties workspace at /staff/duties with departmental duties', async () => {
    renderWithRoute('/staff/duties')

    expect(await screen.findByText('Roles, Duties & Department Allocations')).toBeDefined()
    expect(screen.getByText('Departmental Operational Duties & Allocation')).toBeDefined()
    expect(screen.getByText('Front Desk & Parent Inquiries')).toBeDefined()
  })

  it('renders Daily Attendance workspace at /staff/attendance with roll call register', async () => {
    renderWithRoute('/staff/attendance')

    expect(await screen.findByText('Daily Duty Register & Attendance Roll Call')).toBeDefined()
    expect(screen.getByText('Attendance Date:')).toBeDefined()
    expect(await screen.findByText('Pooja Nair')).toBeDefined()
  })

  it('renders Leave Requests workspace at /staff/leaves with application queue', async () => {
    renderWithRoute('/staff/leaves')

    expect(await screen.findByText('Leave Requests & Approvals Centre')).toBeDefined()
    expect(await screen.findByText('Family function')).toBeDefined()
  })

  it('renders HR Documents Studio workspace at /staff/documents with standard HR forms', async () => {
    renderWithRoute('/staff/documents')

    expect(await screen.findByText('Staff Documents & HR Forms Studio')).toBeDefined()
    expect(screen.getByText('Official Appointment Letter')).toBeDefined()
    expect(screen.getByText('Non-Disclosure Agreement (NDA)')).toBeDefined()
  })

  it('renders HR Policies workspace at /staff/settings with shift and leave rules', async () => {
    renderWithRoute('/staff/settings')

    expect(await screen.findByText('HR Policies, Roles & Working Hours')).toBeDefined()
    expect(screen.getByText('Standard Probation Duration')).toBeDefined()
    expect(screen.getByText('Standard Shift Start Time')).toBeDefined()
  })

  it('enforces Rule 010 View-First button locking in View Mode', async () => {
    renderWithRoute('/staff/overview')

    const lockedBtn = await screen.findByText('New Staff Onboarding (Locked)')
    expect(lockedBtn).toBeDefined()
  })

  it('unlocks primary action button when Edit Mode is active for workforce:staff', async () => {
    act(() => {
      useEditModeStore.setState({
        scopes: { 'workforce:staff': true },
      })
    })

    renderWithRoute('/staff/overview')

    expect(await screen.findByRole('button', { name: /^new staff onboarding$/i })).toBeDefined()
    expect(screen.queryByText('New Staff Onboarding (Locked)')).toBeNull()
  })

  it('displays prominent amber TRAINING MODE indicator when training mode is active', async () => {
    act(() => {
      useEnvironmentStore.setState({
        isTrainingMode: true,
        dataEnvironment: 'TRAINING',
      })
    })

    renderWithRoute('/staff/overview')

    expect(await screen.findByText(/TRAINING MODE ACTIVE/i)).toBeDefined()
  })
})
