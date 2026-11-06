/**
 * @file        TeacherPayroll.test.tsx
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
 * @updated     2026-11-06
 *
 * @description Unit tests verifying Teacher Payroll tabs, KPI metrics, modals,
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeacherPayroll from '../pages/TeacherPayroll'
import { teacherPayrollApi, divisionsApi, subjectsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

describe('Teacher Payroll & Payment Management Workspace', () => {
  let queryClient: QueryClient

  const mockTeachers = [
    { id: 1, full_name: 'Ramesh Sharma', email: 'ramesh@test.com', role: 'teacher' },
    { id: 2, full_name: 'Priya Patel', email: 'priya@test.com', role: 'teacher' },
  ]

  const mockPayrolls = [
    {
      id: 101,
      payroll_number: 'PRL-2026-11-0001',
      teacher_user_id: 1,
      teacher_name: 'Ramesh Sharma',
      teacher_email: 'ramesh@test.com',
      month: 11,
      year: 2026,
      payment_method: 'hourly',
      total_teaching_hours: 12.5,
      total_completed_lectures: 8,
      base_earnings: 7500.0,
      approved_incentives: 500.0,
      approved_additional_earnings: 0.0,
      contractual_adjustments: 0.0,
      gross_pay: 8000.0,
      total_deductions: 200.0,
      withholdings: 0.0,
      net_payable: 7800.0,
      paid_amount: 5000.0,
      pending_amount: 2800.0,
      status: 'partially_paid',
      calculated_at: '2026-11-06T10:00:00Z',
    },
  ]

  const mockSessions = {
    items: [
      {
        id: 201,
        session_code: 'SES-202611-0001',
        teacher_user_id: 1,
        teacher_name: 'Ramesh Sharma',
        substitute_teacher_id: null,
        batch_name: 'Batch Alpha',
        subject_name: 'Mathematics',
        session_date: '2026-11-02',
        scheduled_start_time: '09:00',
        scheduled_end_time: '10:30',
        actual_start_time: '09:00',
        actual_end_time: '10:30',
        calculated_duration_hours: 1.5,
        payment_method: 'hourly',
        applicable_rate: 600.0,
        calculated_amount: 900.0,
        session_status: 'completed',
        approval_status: 'approved',
        is_payable: true,
        is_locked: true,
        payroll_id: 101,
      },
    ],
    total: 1,
    page: 1,
    limit: 50,
  }

  const mockProfiles = [
    {
      teacher_user_id: 1,
      teacher_name: 'Ramesh Sharma',
      designation: 'Senior Faculty',
      department: 'Mathematics',
      profile_id: 1,
      payment_method: 'hourly',
      hourly_rate: 600.0,
      per_lecture_rate: 750.0,
      monthly_fixed_amount: 0.0,
      contract_total_amount: 0.0,
      payment_frequency: 'monthly',
      is_active: true,
    },
  ]

  const mockVouchers = [
    {
      id: 301,
      voucher_number: 'TPV-2026-0001',
      payroll_number: 'PRL-2026-11-0001',
      teacher_user_id: 1,
      teacher_name: 'Ramesh Sharma',
      amount_paid: 5000.0,
      payment_date: '2026-11-06',
      payment_method: 'bank_transfer',
      transaction_reference: 'NEFT-883921',
      debit_account: 'Teacher Remuneration & Faculty Cost',
      credit_account: 'Main Operating Bank Account',
      status: 'posted',
    },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    useAuthStore.setState({
      user: {
        id: 99,
        username: 'sysadmin',
        email: 'sysadmin@prathamone.com',
        first_name: 'System',
        last_name: 'Admin',
        role: 'sysadmin',
        institution_id: 1,
        is_active: true,
      } as any,
      token: 'mock-token',
    })

    vi.spyOn(teacherPayrollApi, 'getTeachers').mockResolvedValue({ data: mockTeachers } as any)
    vi.spyOn(teacherPayrollApi, 'getMonthlyPayrolls').mockResolvedValue({ data: mockPayrolls } as any)
    vi.spyOn(teacherPayrollApi, 'getSessions').mockResolvedValue({ data: mockSessions } as any)
    vi.spyOn(teacherPayrollApi, 'getProfiles').mockResolvedValue({ data: mockProfiles } as any)
    vi.spyOn(teacherPayrollApi, 'getVouchers').mockResolvedValue({ data: mockVouchers } as any)
    vi.spyOn(teacherPayrollApi, 'getReport').mockResolvedValue({ data: [] } as any)
    vi.spyOn(divisionsApi, 'list').mockResolvedValue({ data: [] } as any)
    vi.spyOn(subjectsApi, 'list').mockResolvedValue({ data: [] } as any)
  })

  it('renders official PrathamOne EduOS branding and title', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeacherPayroll />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText(/Teacher Payroll & Payment Management/i)).toBeDefined()
    expect(screen.getByText(/PrathamOne EduOS/i)).toBeDefined()
    expect(screen.getByText(/Coaching Institute Edition • v1.0.0/i)).toBeDefined()
  })

  it('renders monthly payroll data and KPI summary cards correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeacherPayroll />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      const names = screen.getAllByText('Ramesh Sharma')
      expect(names.length).toBeGreaterThan(0)
      expect(screen.getByText('PRL-2026-11-0001')).toBeDefined()
      expect(screen.getAllByText('₹7,800').length).toBeGreaterThan(0) // Net payable
      expect(screen.getAllByText('₹5,000').length).toBeGreaterThan(0) // Paid
      expect(screen.getAllByText('₹2,800').length).toBeGreaterThan(0) // Pending
    })
  })

  it('allows switching to Teaching Session Register tab', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeacherPayroll />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const sessionTabBtn = screen.getByRole('button', { name: /Teaching Session Register/i })
    fireEvent.click(sessionTabBtn)

    await waitFor(() => {
      expect(screen.getByText('SES-202611-0001')).toBeDefined()
      expect(screen.getByText('Locked in Payroll')).toBeDefined()
    })
  })

  it('allows switching to Teacher Profiles & Rates tab', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeacherPayroll />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const profileTabBtn = screen.getByRole('button', { name: /Teacher Profiles & Rates/i })
    fireEvent.click(profileTabBtn)

    await waitFor(() => {
      expect(screen.getByText(/Teacher Payment Profiles & Rates/i)).toBeDefined()
      expect(screen.getByText('₹600 / hr')).toBeDefined()
    })
  })

  it('allows switching to Payment Vouchers & Ledger tab', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeacherPayroll />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const voucherTabBtn = screen.getByRole('button', { name: /Payment Vouchers & Ledger/i })
    fireEvent.click(voucherTabBtn)

    await waitFor(() => {
      expect(screen.getByText('TPV-2026-0001')).toBeDefined()
      expect(screen.getByText('Teacher Remuneration & Faculty Cost')).toBeDefined()
      expect(screen.getByText('Main Operating Bank Account')).toBeDefined()
    })
  })

  it('opens calculate modal when clicking Calculate Payroll button', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeacherPayroll />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const calcBtn = screen.getAllByRole('button', { name: /Calculate Payroll/i })[0]
    fireEvent.click(calcBtn)

    expect(screen.getByText(/Calculate Monthly Payroll/i)).toBeDefined()
    expect(screen.getByText(/Run Calculation/i)).toBeDefined()
  })
})
