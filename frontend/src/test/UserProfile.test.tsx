/**
 * @file        UserProfile.test.tsx
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
 * @updated     2026-11-12
 *
 * @description Vitest test suite verifying user profile details rendering, role badges, and security reset modals.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import UserProfilePage from '../pages/UserProfile'
import * as endpoints from '../api/endpoints'

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'superadmin', first_name: 'Super', last_name: 'Admin' },
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: '10' }),
  }
})

describe('Dedicated User Profile Workspace Specification', () => {
  const studentWorkspaceData = {
    user: {
      id: 10,
      username: 'aarav.sharma',
      email: 'aarav.sharma@example.com',
      phone: '9876543210',
      first_name: 'Aarav',
      last_name: 'Sharma',
      full_name: 'Aarav Sharma',
      role: 'student',
      role_description: 'Enrolled Student',
      is_active: true,
      invitation_status: 'accepted',
      scope_type: 'batch',
      scope_id: 1,
      scope_label: 'Batch ICSE-X-A',
      staff_code: null,
      designation: null,
      student_id: 101,
      last_login: '2026-11-03T14:30:00Z',
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    permissions: [
      { resource: 'attendance', action: 'read' },
      { resource: 'examinations', action: 'read' },
      { resource: 'fees', action: 'read' },
    ],
    linked_student: {
      id: 101,
      admission_number: 'ADM-2024-001',
      first_name: 'Aarav',
      last_name: 'Sharma',
      full_name: 'Aarav Sharma',
      date_of_birth: '2008-05-15',
      gender: 'male',
      blood_group: 'B+',
      phone: '9876543210',
      email: 'aarav.sharma@example.com',
      is_active: true,
      current_enrollment: {
        id: 5,
        academic_year: '2024-25',
        standard_name: 'Class X',
        board_name: 'ICSE',
        batch_name: 'ICSE-X-A',
        roll_number: '12',
        status: 'active',
      },
    },
    academic: {
      enrollments: [
        {
          id: 5,
          academic_year: '2024-25',
          standard_name: 'Class X',
          board_name: 'ICSE',
          batch_name: 'ICSE-X-A',
          roll_number: '12',
          enrollment_date: '2024-06-15',
          status: 'active',
        },
      ],
      assigned_batches: [],
    },
    attendance: {
      summary: {
        total_days: 40,
        present_days: 38,
        absent_days: 2,
        late_days: 1,
        rate_percentage: 95.0,
      },
      records: [
        { id: 1, date: '2026-11-03', status: 'present', remarks: 'On time' },
      ],
    },
    examinations: {
      results: [
        {
          id: 1,
          exam_name: 'Mid-Term Mathematics',
          marks_obtained: 94,
          max_marks: 100,
          percentage: 94.0,
          grade: 'A+',
          remarks: 'Excellent work',
        },
      ],
    },
    fees: {
      total_fees: 50000,
      total_paid: 35000,
      outstanding_balance: 15000,
      invoices: [
        {
          id: 1,
          invoice_number: 'INV-2024-001',
          total_amount: 50000,
          paid_amount: 35000,
          status: 'partial',
          due_date: '2024-12-31',
        },
      ],
      payments: [
        {
          id: 1,
          amount: 35000,
          payment_date: '2024-07-01',
          payment_method: 'bank_transfer',
          transaction_reference: 'TXN-998877',
          status: 'completed',
        },
      ],
    },
    activity_logs: [
      {
        id: 1,
        action: 'user_updated',
        resource_type: 'user',
        resource_id: 10,
        new_data: 'phone updated',
        created_at: '2026-11-01T10:00:00Z',
      },
    ],
    permitted_tabs: [
      'overview',
      'profile',
      'access',
      'academic',
      'attendance',
      'examinations',
      'fees',
      'activity',
    ],
  }

  beforeEach(() => {
    vi.spyOn(endpoints.usersApi, 'getProfile').mockResolvedValue({
      data: studentWorkspaceData,
    } as any)

    vi.spyOn(endpoints.standardsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Class X' }],
    } as any)

    vi.spyOn(endpoints.divisionsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Batch ICSE-X-A' }],
    } as any)
  })

  it('renders student profile header with name, avatar, and linked admission number', async () => {
    render(
      <BrowserRouter>
        <UserProfilePage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
      expect(screen.getAllByText('@aarav.sharma').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Student Admission: ADM-2024-001')).toBeDefined()
      expect(screen.getAllByText('Batch ICSE-X-A').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders all 8 tabs for student role including Academic, Attendance, Examinations, and Fees', async () => {
    render(
      <BrowserRouter>
        <UserProfilePage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Overview/i })).toBeDefined()
      expect(screen.getAllByRole('button', { name: /Profile Details/i }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('button', { name: /Access & Roles/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Academic & Enrollments/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Attendance/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Examinations/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Fees & Ledger/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Activity Log/i })).toBeDefined()
    })
  })

  it('switches to Fees tab and displays invoices and payment ledgers', async () => {
    render(
      <BrowserRouter>
        <UserProfilePage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Fees & Ledger/i })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: /Fees & Ledger/i }))

    await waitFor(() => {
      expect(screen.getByText('Fee Invoices')).toBeDefined()
      expect(screen.getByText('INV-2024-001')).toBeDefined()
      expect(screen.getByText('TXN-998877')).toBeDefined()
    })
  })

  it('switches to Examinations tab and displays marks and grades', async () => {
    render(
      <BrowserRouter>
        <UserProfilePage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Examinations/i })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: /Examinations/i }))

    await waitFor(() => {
      expect(screen.getByText('Mid-Term Mathematics')).toBeDefined()
      expect(screen.getByText('94 / 100')).toBeDefined()
      expect(screen.getByText('A+')).toBeDefined()
    })
  })

  it('opens Edit Account modal when Edit Mode is enabled and clicking Edit Account button', async () => {
    render(
      <BrowserRouter>
        <UserProfilePage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit Account/i })).toBeDefined()
    })

    // View-First Lock: clicking Edit Account in View Mode must not open the edit modal
    fireEvent.click(screen.getByRole('button', { name: /Edit Account/i }))
    expect(screen.queryByRole('heading', { name: 'Edit User Profile' })).toBeNull()

    // Activate Edit Mode via EditModeBar
    fireEvent.click(screen.getByRole('button', { name: /Enable Edit Mode/i }))
    fireEvent.click(screen.getByRole('button', { name: /Edit Account/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit User Profile' })).toBeDefined()
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDefined()
    })
  })
})
