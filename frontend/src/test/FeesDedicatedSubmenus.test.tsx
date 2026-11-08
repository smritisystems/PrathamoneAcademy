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
 * @updated     2026-11-08
 *
 * @description Vitest test suite validating all 8 Fees & Payments dedicated workspace routes, view-first locks, and training isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Fees from '../pages/Fees'
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

  it('1. /fees/overview renders financial KPI dashboard and quick actions', async () => {
    renderWithRouter('/fees/overview')

    expect(screen.getByRole('heading', { name: 'Fees & Payments' })).toBeDefined()
    expect(screen.getByText('Manage student fees, collections, payments, and receipts')).toBeDefined()
    expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
  })

  it('2. /fees/register renders dedicated Student Fee Register workspace', async () => {
    renderWithRouter('/fees/register')

    expect(screen.getByRole('heading', { name: 'Student Fee Register' })).toBeDefined()
    expect(
      screen.getByText(/Comprehensive student-wise fee ledger, installments, concessions/i)
    ).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Collect Fee/i }).length).toBeGreaterThan(0)
  })

  it('3. /fees/collect renders dedicated Fee Collection Terminal', async () => {
    renderWithRouter('/fees/collect')

    expect(screen.getByRole('heading', { name: 'Fee Collection Terminal' })).toBeDefined()
    expect(
      screen.getByText(/Select student account, calculate outstanding balance/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Reset Terminal/i })).toBeDefined()
  })

  it('4. /fees/payments renders dedicated Payment Transactions workspace', async () => {
    renderWithRouter('/fees/payments')

    expect(screen.getByRole('heading', { name: 'Payment Transactions' })).toBeDefined()
    expect(
      screen.getByText(/Audit log of all processed payment transactions, settlement modes/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined()
  })

  it('5. /fees/receipts renders dedicated Receipts & Invoicing Journal workspace', async () => {
    renderWithRouter('/fees/receipts')

    expect(screen.getByRole('heading', { name: 'Receipts & Invoicing Journal' })).toBeDefined()
    expect(
      screen.getByText(/Official numbered money receipts, print duplicates/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Search Receipt/i })).toBeDefined()
  })

  it('6. /fees/plans renders Fee Structures & Plans and enforces View-First lock', async () => {
    renderWithRouter('/fees/plans')

    expect(screen.getByRole('heading', { name: 'Fee Structures & Plans' })).toBeDefined()
    expect(
      screen.getByText(/Standard-wise fee templates, component categories, installment schedules/i)
    ).toBeDefined()
    // In view mode, Create Fee Plan button shows locked badge
    expect(screen.getByText(/Create Fee Plan \(Locked\)/i)).toBeDefined()
  })

  it('7. /fees/reports renders Fee Reports & Financial Analytics workspace', async () => {
    renderWithRouter('/fees/reports')

    expect(screen.getByRole('heading', { name: 'Fee Reports & Financial Analytics' })).toBeDefined()
    expect(
      screen.getByText(/Collection summaries, aging overdue statements/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Export Report/i })).toBeDefined()
  })

  it('8. /fees/settings renders Fee Settings & Accounting Policies and enforces View-First lock', async () => {
    renderWithRouter('/fees/settings')

    expect(screen.getByRole('heading', { name: 'Fee Settings & Accounting Policies' })).toBeDefined()
    expect(
      screen.getByText(/Financial year defaults, receipt numbering prefixes/i)
    ).toBeDefined()
    expect(screen.getByText(/Save Preferences \(Locked\)/i)).toBeDefined()
  })

  it('9. displays prominent TRAINING MODE badge in header when training mode is active', async () => {
    useEnvironmentStore.setState({ isTrainingMode: true })

    renderWithRouter('/fees/register')

    expect(screen.getByText('TRAINING MODE')).toBeDefined()
  })
})
