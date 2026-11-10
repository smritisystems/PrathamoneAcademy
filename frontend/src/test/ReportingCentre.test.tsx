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
 * @updated     2026-11-11
 *
 * @description Comprehensive unit and integration test suite validating Central Reporting & Analytics Centre, 6-category navigation, search filter, favorite pins, and ExcelReportGrid rendering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Reports from '../pages/Reports'
import { reportsApi, academicReportsApi, examinationsApi, boardsApi, standardsApi, divisionsApi, academicYearsApi, reportIntelligenceApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

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

  it('renders Central Reporting & Analytics Centre with primary 6 canonical categories', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Reporting & Analytics Centre')).toBeDefined()
    expect(screen.getByText(/26 Enterprise Reports/i)).toBeDefined()

    // 6 Canonical category switcher tabs
    expect(screen.getByRole('button', { name: /Students & Admissions/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Academics & Batches/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Fees & Financials/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Teachers & Payroll/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Examinations & Merit/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /System & Audit/i })).toBeDefined()
  })

  it('switches between categories and updates sub-report pill selectors', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Default category is students: check student reports
    expect(screen.getAllByText(/Student Master Directory & Demographic Roster/i).length).toBeGreaterThan(0)

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

    const searchInput = screen.getByPlaceholderText(/Search all 26 reports.../i)
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
