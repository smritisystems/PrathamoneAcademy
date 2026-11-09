/**
 * @file        FeesDedicatedSubmenus.test.tsx
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
 * @updated     2026-11-09
 *
 * @description Vitest test suite validating all 8 Fees & Payments dedicated workspace routes, view-first locks, and training isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Fees, { FEES_TABS } from '../pages/Fees'
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
        <Fees />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Fees & Payments Dedicated Workspace Submenu Suite', () => {
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

    // Default mocks for APIs
    vi.spyOn(endpoints.feesApi, 'getOverview').mockResolvedValue({
      data: {
        summary: {
          total_obligation: 192000,
          total_collected: 128000,
          total_outstanding: 64000,
          collection_rate: 66.7,
          student_count: 8,
        },
        board_breakdown: [],
        batch_breakdown: [],
        monthly_trends: [],
        payment_methods: [],
        top_overdue: [],
        recent_payments: [],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.academicYearsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: '2026-2027', is_current: true } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.boardsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'ICSE' } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.standardsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Class X', board_id: 1 } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.divisionsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Batch A', standard_id: 1, capacity: 40 } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.feeStructuresApi, 'list').mockResolvedValue({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.feeCategoriesApi, 'list').mockResolvedValue({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.paymentsApi, 'listReceipts').mockResolvedValue({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.paymentsApi, 'list').mockResolvedValue({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.feesApi, 'getRegister').mockResolvedValue({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })
  })

  it('1. /fees/overview renders financial KPI dashboard and all 8 dedicated submenus', async () => {
    renderWithRouter('/fees/overview')

    expect(screen.getByRole('heading', { name: /Fees & Payments Overview/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()

    // Verify all 8 dedicated tabs exist in DOM
    expect(FEES_TABS).toHaveLength(8)
    expect(screen.getByTestId('tab-overview')).toBeDefined()
    expect(screen.getByTestId('tab-structures')).toBeDefined()
    expect(screen.getByTestId('tab-invoicing')).toBeDefined()
    expect(screen.getByTestId('tab-collection')).toBeDefined()
    expect(screen.getByTestId('tab-defaulters')).toBeDefined()
    expect(screen.getByTestId('tab-concessions')).toBeDefined()
    expect(screen.getByTestId('tab-online-gateway')).toBeDefined()
    expect(screen.getByTestId('tab-reports')).toBeDefined()
  })

  it('2. /fees/structures renders Fee Structures & Schedules workspace', async () => {
    renderWithRouter('/fees/structures')

    expect(screen.getByRole('heading', { name: /Fee Structures & Schedules/i })).toBeDefined()
    expect(
      screen.getByText(/Standard-wise fee templates, component categories, installment schedules/i)
    ).toBeDefined()
  })

  it('3. enforces Rule 010 View-First lock on Fee Structures mutation controls', async () => {
    // 1. In View Mode (default), primary action button is locked
    renderWithRouter('/fees/structures')
    expect(screen.getByText(/Create Fee Plan \(Locked\)/i)).toBeDefined()

    // 2. When scoped Edit Mode is active, button is unlocked
    act(() => {
      useEditModeStore.setState({ scopes: { 'finance:fees': true } })
    })
    expect(screen.getAllByRole('button', { name: /Create Fee Plan/i }).length).toBeGreaterThan(0)
  })

  it('4. /fees/invoicing renders dedicated Fee Invoicing & Register workspace', async () => {
    renderWithRouter('/fees/invoicing')

    expect(screen.getByRole('heading', { name: /Fee Invoicing & Register/i })).toBeDefined()
    expect(
      screen.getByText(/Comprehensive student-wise fee ledger, installments, concessions/i)
    ).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Collect Fee/i }).length).toBeGreaterThan(0)
  })

  it('5. /fees/collection renders dedicated Fee Collection Desk & POS workspace', async () => {
    renderWithRouter('/fees/collection')

    expect(screen.getByRole('heading', { name: /Fee Collection Desk & POS/i })).toBeDefined()
    expect(
      screen.getByText(/Cash counter terminal, student lookup, instant payment recording/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Reset Terminal/i })).toBeDefined()
  })

  it('6. /fees/defaulters renders dedicated Defaulters & Overdue Dues workspace with aging brackets', async () => {
    renderWithRouter('/fees/defaulters')

    expect(screen.getByRole('heading', { name: /Fee Defaulters & Overdue Dues/i })).toBeDefined()
    expect(screen.getByTestId('workspace-defaulters')).toBeDefined()
    expect(screen.getByText(/Mild \(1–30 Days\)/i)).toBeDefined()
    expect(screen.getByText(/Moderate \(31–60 Days\)/i)).toBeDefined()
    expect(screen.getByText(/Critical \(60\+ Days\)/i)).toBeDefined()
    expect(screen.getByText(/Total Defaulter Dues/i)).toBeDefined()
  })

  it('7. enforces Rule 010 View-First lock on Bulk Reminder Dispatch in Defaulters workspace', async () => {
    // View mode: shows locked indicator
    renderWithRouter('/fees/defaulters')
    expect(screen.getByRole('button', { name: /Dispatch Bulk Reminders/i }).className).toContain('cursor-not-allowed')

    // Edit mode: unlocked
    act(() => {
      useEditModeStore.setState({ scopes: { 'finance:fees': true } })
    })
    expect(screen.getByRole('button', { name: /Dispatch Bulk Reminders/i }).className).toContain('hover:bg-amber-700')
  })

  it('8. /fees/concessions renders dedicated Fee Concessions & Scholarship Waivers workspace', async () => {
    renderWithRouter('/fees/concessions')

    expect(screen.getByRole('heading', { name: /Fee Concessions & Scholarship Waivers/i })).toBeDefined()
    expect(screen.getByTestId('workspace-concessions')).toBeDefined()
    expect(screen.getByText(/Total Concessions/i)).toBeDefined()
    expect(screen.getAllByText(/Merit Scholarships/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Sibling Discounts/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Pending Review/i)).toBeDefined()
  })

  it('9. enforces Rule 010 View-First lock on Apply Concession action in Concessions workspace', async () => {
    // View mode
    renderWithRouter('/fees/concessions')
    expect(screen.getByText(/Apply Concession \(Locked\)/i)).toBeDefined()

    // Edit mode
    act(() => {
      useEditModeStore.setState({ scopes: { 'finance:fees': true } })
    })
    expect(screen.getAllByRole('button', { name: /Apply Concession/i }).length).toBeGreaterThan(0)
  })

  it('10. /fees/online-gateway renders dedicated Online Payments & Gateway Desk', async () => {
    renderWithRouter('/fees/online-gateway')

    expect(screen.getByRole('heading', { name: /Online Payments & Gateway Desk/i })).toBeDefined()
    expect(screen.getByTestId('workspace-online-gateway')).toBeDefined()
    expect(screen.getAllByText(/UPI BharatQR/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Dynamic BharatQR Generator/i)).toBeDefined()
    expect(screen.getByText(/Instant Online Payment Portal Link/i)).toBeDefined()
    expect(screen.getByText(/Recent Gateway Settlements & Webhook Receipts/i)).toBeDefined()
  })

  it('11. /fees/reports renders Financial Daybook & Reports workspace', async () => {
    renderWithRouter('/fees/reports')

    expect(screen.getByRole('heading', { name: /Fee Reports & Financial Analytics/i })).toBeDefined()
    expect(
      screen.getByText(/Collection summaries, aging overdue statements/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Export Report/i })).toBeDefined()
  })

  it('12. displays prominent TRAINING MODE badge in header when training mode is active', async () => {
    useEnvironmentStore.setState({ isTrainingMode: true })

    renderWithRouter('/fees/overview')

    expect(screen.getByText('TRAINING MODE')).toBeDefined()
  })
})
