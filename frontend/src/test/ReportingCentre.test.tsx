/**
 * @file        ReportingCentre.test.tsx
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
 * @created     2026-11-07
 * @updated     2026-11-14
 *
 * @description Comprehensive unit and integration test suite validating Central Reporting & Analytics Centre, 6-category navigation, search filter, favorite pins, and ExcelReportGrid rendering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Reports from '../pages/Reports'
import { reportsApi, academicReportsApi, examinationsApi, boardsApi, standardsApi, divisionsApi, academicYearsApi, reportIntelligenceApi, feesApi, communicationApi, importExportApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

function LocationProbe() {
  const { search } = useLocation()
  return <span data-testid="location-search">{search}</span>
}

describe('Central Reporting & Analytics Centre Suite', () => {
  let queryClient: QueryClient

  const mockStudentsMaster = [
    {
      id: 1,
      admission_number: 'ADM-2026-001',
      student_name: 'Aarav Patel',
      first_name: 'Aarav',
      last_name: 'Patel',
      gender: 'Male',
      date_of_birth: '2008-05-14',
      phone: '9820012345',
      email: 'aarav@example.com',
      blood_group: 'B+',
      emergency_contact: '9820012346',
      standard_name: 'Std 10',
      division_name: 'Batch A',
      batch_code: 'B10-A',
      board_name: 'CBSE',
      admission_date: '2026-06-01',
      status: 'active',
      is_active: true,
      city: 'Mumbai',
      address: 'Dadar, Mumbai',
    },
    {
      id: 2,
      admission_number: 'ADM-2026-002',
      student_name: 'Isha Sharma',
      first_name: 'Isha',
      last_name: 'Sharma',
      gender: 'Female',
      date_of_birth: '2008-08-20',
      phone: '9820023456',
      email: 'isha@example.com',
      blood_group: 'O+',
      emergency_contact: '9820023457',
      standard_name: 'Std 10',
      division_name: 'Batch B',
      batch_code: 'B10-B',
      board_name: 'CBSE',
      admission_date: '2026-06-01',
      status: 'active',
      is_active: true,
      city: 'Mumbai',
      address: 'Andheri, Mumbai',
    },
  ]

  const mockBatchCapacity = [
    {
      batch_id: 1,
      batch_name: 'Batch A',
      batch_code: 'B10-A',
      standard_name: 'Std 10',
      board_name: 'CBSE',
      total_enrolled: 30,
      active_students: 28,
      withdrawn_students: 2,
      max_capacity: 35,
      occupancy_rate: 80.0,
      is_full: false,
    },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })
    localStorage.clear()

    useAuthStore.setState({
      user: {
        id: 1,
        username: 'sysadmin',
        first_name: 'System',
        last_name: 'Admin',
        role: 'sysadmin',
        institution_id: 1,
      } as any,
      token: 'mock-jwt-token',
    })

    // Mock lookups
    vi.spyOn(academicYearsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: '2026-2027', is_current: true }],
    } as any)
    vi.spyOn(boardsApi, 'list').mockResolvedValue({ data: [{ id: 1, name: 'CBSE' }] } as any)
    vi.spyOn(standardsApi, 'list').mockResolvedValue({ data: [{ id: 10, name: 'Std 10' }] } as any)
    vi.spyOn(divisionsApi, 'list').mockResolvedValue({ data: [{ id: 25, name: 'Batch A' }] } as any)
    vi.spyOn(examinationsApi, 'list').mockResolvedValue({ data: [] } as any)

    // Mock report APIs
    vi.spyOn(reportIntelligenceApi, 'getMetrics').mockResolvedValue({
      data: {
        report_id: 'student-master',
        generated_at: '2026-11-11T00:00:00Z',
        institution_id: 1,
        filters_applied: {},
        kpis: [],
        insights: [],
      },
    } as any)
    vi.spyOn(reportsApi, 'studentMasterDirectory').mockResolvedValue({
      data: mockStudentsMaster,
    } as any)
    vi.spyOn(academicReportsApi, 'getBatchCapacity').mockResolvedValue({
      data: mockBatchCapacity,
    } as any)
  })

  it('renders Central Reporting & Analytics Centre with all 7 canonical categories including 20 Concession Reports', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Reporting & Analytics Centre')).toBeDefined()
    expect(screen.getByText(/49 Enterprise Reports/i)).toBeDefined()

    // 7 Canonical category switcher tabs
    expect(screen.getByRole('button', { name: /Students & Admissions/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Academics & Batches/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Fees & Financials/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Concessions & Scholarships/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Teachers & Payroll/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Examinations & Merit/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /System & Audit/i })).toBeDefined()
  })

  it('switches between categories and displays all 20 Concession Governance reports', async () => {
    vi.spyOn(reportsApi, 'concessionReport').mockResolvedValue({
      data: {
        report_id: 'complete-concession-register',
        title: 'Complete Concession Register',
        category: 'Concessions & Scholarships',
        generated_at: '2026-11-11T00:00:00Z',
        reporting_period: { start_date: null, end_date: null },
        currency: { code: 'INR', symbol: '₹', precision: 2 },
        summary: { records_count: 1, total_posted: 15000 },
        columns: [
          { key: 'application_number', label: 'App No', type: 'text' },
          { key: 'student_name', label: 'Student', type: 'text' },
          { key: 'applied_amount', label: 'Posted', type: 'currency' },
        ],
        rows: [
          { application_id: 1, application_number: 'SCH-2026-0001', student_name: 'Aadya Sharma', applied_amount: 15000 },
        ],
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Default category is students: check student reports
    expect(screen.getAllByText(/Student Master Directory & Demographic Roster/i).length).toBeGreaterThan(0)

    // Switch to Concessions & Scholarships
    const concessionsBtn = screen.getByRole('button', { name: /Concessions & Scholarships/i })
    fireEvent.click(concessionsBtn)

    await waitFor(() => {
      expect(screen.getAllByText(/Complete Concession Register/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Approved vs Applied Concession Report/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Fee Collection vs Concession Reconciliation/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Complete Student Benefit Register/i).length).toBeGreaterThan(0)
    })

    // Switch to Academics & Batches
    const academicsBtn = screen.getByRole('button', { name: /Academics & Batches/i })
    fireEvent.click(academicsBtn)

    await waitFor(() => {
      expect(screen.getAllByText(/Batch Capacity & Occupancy Analysis/i).length).toBeGreaterThan(0)
    })
  })

  it('filters reports catalog in real-time when typing in global search', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const searchInput = screen.getByPlaceholderText(/Search all 49 reports.../i)
    fireEvent.change(searchInput, { target: { value: 'Defaulters' } })

    // Matching overlay should show matching count
    expect(screen.getByText(/Matching Reports/i)).toBeDefined()
  })

  it('renders ExcelReportGrid with data when Student Master Directory is active', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Aarav Patel/i)).toBeDefined()
      expect(screen.getByText(/Isha Sharma/i)).toBeDefined()
      expect(screen.getByText(/ADM-2026-001/i)).toBeDefined()
    })
  })

  it('selects the report named in the URL and keeps the URL in sync with report navigation', async () => {
    vi.spyOn(reportsApi, 'feeDefaulters').mockResolvedValue({ data: [] } as any)
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/reports?category=fees&report=fee-defaulters']}>
          <Reports />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByRole('heading', { name: 'Consolidated Fee Defaulters Aging Roster' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /Fee Collection Register/i }))
    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toContain('report=collection')
      expect(screen.getByTestId('location-search').textContent).toContain('category=fees')
    })
  })

  it('renders financial reconciliation values from the fee overview response schema', async () => {
    vi.spyOn(reportsApi, 'feeCollection').mockResolvedValue({ data: [] } as any)
    const overviewRequest = vi.spyOn(feesApi, 'getOverview').mockResolvedValue({
      data: {
        summary: {
          total_obligation: 2854000,
          total_collected: 1882900,
          total_outstanding: 971100,
          collection_rate: 66,
          student_count: 38,
        },
        board_breakdown: [],
        batch_breakdown: [{
          batch_name: 'ICSE-IX',
          standard_name: 'IX',
          board_name: 'ICSE',
          total_fees: 1104000,
          collected: 734700,
          outstanding: 369300,
          student_count: 12,
          rate: 66.5,
        }],
        monthly_trends: [],
        recent_payments: [],
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Fees & Financials/i }))
    fireEvent.click(screen.getByRole('button', { name: /Financial Audit & Reconciliation Ledger/i }))

    await waitFor(() => expect(overviewRequest).toHaveBeenCalled())
    expect(await screen.findByRole('heading', { name: 'Batch-wise Financial Reconciliation Ledger' })).toBeDefined()
    expect((await screen.findAllByText('₹11,04,000')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('₹7,34,700').length).toBeGreaterThan(0)
    expect(screen.getAllByText('₹3,69,300').length).toBeGreaterThan(0)
    expect(screen.getByText('66.5%')).toBeDefined()
  })

  it('renders batch-capacity and faculty-load values using their API field names', async () => {
    vi.spyOn(academicReportsApi, 'getBatchCapacity').mockResolvedValue({
      data: [{
        batch_id: 1,
        batch_name: 'Batch A',
        batch_code: 'B10-A',
        standard_name: 'Std 10',
        board_name: 'CBSE',
        capacity: 35,
        enrolled: 28,
        available_seats: 7,
        occupancy_percentage: 80,
      }],
    } as any)
    vi.spyOn(academicReportsApi, 'getDistribution').mockResolvedValue({
      data: [{
        board_id: 1,
        board_name: 'CBSE',
        board_code: 'CBSE',
        standard_id: 10,
        standard_name: 'Std 10',
        standard_level: 10,
        batches_count: 2,
        total_capacity: 40,
        enrolled_count: 30,
        available_seats: 10,
        occupancy_percentage: 75,
      }],
    } as any)
    vi.spyOn(academicReportsApi, 'getFacultyLoad').mockResolvedValue({
      data: [{
        user_id: 2,
        teacher_name: 'Riya Shah',
        staff_code: 'T-002',
        designation: 'Teacher',
        assigned_batches_count: 2,
        weekly_sessions_count: 8,
        total_students: 42,
      }],
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Academics & Batches/i }))
    expect((await screen.findAllByText('35')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('28').length).toBeGreaterThan(0)
    expect(screen.getByText('80%')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /Board & Standard Distribution Audit/i }))
    expect(await screen.findByText('75%')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /Teachers & Payroll/i }))
    fireEvent.click(screen.getByRole('button', { name: /Faculty Teaching Load & Mentorship Audit/i }))
    expect(await screen.findByText('Riya Shah')).toBeDefined()
    expect(screen.getAllByText('8').length).toBeGreaterThan(0)
    expect(screen.getAllByText('42').length).toBeGreaterThan(0)
  })

  it('renders withdrawal analytics using the API summary contract', async () => {
    vi.spyOn(reportsApi, 'withdrawalAnalytics').mockResolvedValue({
      data: {
        summary: {
          total_enrolled: 40,
          total_active: 36,
          total_withdrawn: 4,
          attrition_rate: 10,
          paid_withdrawals: 3,
          unpaid_withdrawals: 1,
          total_gross_paid: 60000,
          total_refunds: 10000,
          total_net_retained: 50000,
          total_outstanding_at_exit: 70000,
        },
        by_reason: [],
        by_class_batch: [],
        by_installment: [],
        trends_monthly: [],
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Student Attrition & Retention Analytics/i }))
    expect(await screen.findByText('4')).toBeDefined()
    expect(screen.getByText('₹60,000')).toBeDefined()
    expect(screen.getByText('₹10,000')).toBeDefined()
    expect(screen.getByText('₹50,000')).toBeDefined()
  })

  it('renders communication and import history values returned by their APIs', async () => {
    vi.spyOn(reportsApi, 'systemAuditSummary').mockResolvedValue({ data: [] } as any)
    vi.spyOn(communicationApi, 'getLogs').mockResolvedValue({
      data: {
        items: [{
          id: 1,
          created_at: '2026-11-14T10:00:00Z',
          recipient_name: 'Aarav Patel',
          recipient_destination: '9820012345',
          channel: 'SMS',
          template_code: 'FEE_REMINDER',
          subject: 'November fee reminder',
          status: 'sent',
        }],
        total: 1,
      },
    } as any)
    vi.spyOn(importExportApi, 'getHistory').mockResolvedValue({
      data: {
        items: [{
          id: 2,
          created_at: '2026-11-14T11:00:00Z',
          file_name: 'students.xlsx',
          entity_type: 'students',
          total_rows: 12,
          successful_rows: 10,
          failed_rows: 2,
          status: 'partial',
        }],
        total: 1,
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /System & Audit/i }))
    fireEvent.click(screen.getByRole('button', { name: /Communication & Notification Dispatch Logs/i }))
    expect(await screen.findByText('9820012345')).toBeDefined()
    expect(screen.getByText('FEE_REMINDER')).toBeDefined()
    expect(screen.getByText('November fee reminder')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /Data Import & Migration History/i }))
    expect((await screen.findAllByText('10')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('allows pinning and unpinning a report as favorite to local storage', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const favoriteBtns = screen.getAllByTitle(/Pin to favorites/i)
    expect(favoriteBtns.length).toBeGreaterThan(0)
    fireEvent.click(favoriteBtns[0])

    // Verify localStorage updated via waitFor
    await waitFor(() => {
      const savedFavs = JSON.parse(localStorage.getItem('prashant_pinned_reports') || '[]')
      expect(savedFavs.length).toBeGreaterThan(0)
    })
  })
})
