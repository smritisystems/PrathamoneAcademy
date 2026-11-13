/**
 * @file        DashboardCollectionStatus.test.tsx
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
 * @created     2026-11-14
 * @updated     2026-11-14
 *
 * @description Regression tests for the Dashboard collection-status pie chart, including empty data.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/Dashboard'
import { academicYearsApi, boardsApi, codexApi, dashboardApi, divisionsApi, standardsApi } from '../api/endpoints'

vi.mock('../config/branding', () => ({
  useBranding: () => ({ academyName: 'Test Academy' }),
}))

describe('Dashboard collection status chart', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.spyOn(dashboardApi, 'getStats').mockResolvedValue({
      data: {
        total_students: 10,
        total_fees: 1000,
        total_collected: 600,
        total_outstanding: 400,
        collection_rate: 60,
        monthly_trends: [],
      },
    } as never)
    vi.spyOn(dashboardApi, 'getCollectionTrends').mockResolvedValue({
      data: {
        granularity: 'month',
        records: [
          { period_key: '2026-04', label: 'Apr 2026', collected: 600, transaction_count: 2 },
        ],
        total_collected: 600,
        total_transactions: 2,
      },
    } as never)
    vi.spyOn(dashboardApi, 'getAnalytics').mockResolvedValue({ data: {} } as never)
    vi.spyOn(codexApi, 'getUserStatus').mockResolvedValue({
      data: { is_enabled: false, visibility_mode: 'actual_only', can_decode: false },
    } as never)
    vi.spyOn(academicYearsApi, 'list').mockResolvedValue({ data: [] } as never)
    vi.spyOn(boardsApi, 'list').mockResolvedValue({ data: [] } as never)
    vi.spyOn(standardsApi, 'list').mockResolvedValue({ data: [] } as never)
    vi.spyOn(divisionsApi, 'list').mockResolvedValue({ data: [] } as never)
  })

  const renderDashboard = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('shows collected and outstanding shares alongside monthly trends', async () => {
    renderDashboard()

    expect(await screen.findByText('Monthly Fee Collection Trends')).toBeTruthy()
    expect(screen.getByText('Fee Collection Status')).toBeTruthy()
    expect(await screen.findByText('Collected:')).toBeTruthy()
    expect(screen.getByText('Outstanding:')).toBeTruthy()
    expect(screen.getByText('(60.0%)')).toBeTruthy()
    expect(screen.getByText('(40.0%)')).toBeTruthy()
  })

  it('shows an empty state when there is no collection data', async () => {
    vi.spyOn(dashboardApi, 'getStats').mockResolvedValue({
      data: {
        total_students: 0,
        total_fees: 0,
        total_collected: 0,
        total_outstanding: 0,
        collection_rate: 0,
        monthly_trends: [],
      },
    } as never)
    vi.spyOn(dashboardApi, 'getCollectionTrends').mockResolvedValue({
      data: {
        granularity: 'month',
        records: [],
        total_collected: 0,
        total_transactions: 0,
      },
    } as never)

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Fee Collection Status')).toBeTruthy()
      expect(screen.getByText('No fee collection data available for the selected filters')).toBeTruthy()
      expect(screen.getByText('No fee collection data available for current filter selection')).toBeTruthy()
    })
  })

  it('lets users select yearly or daily data, a measure, and a chart style', async () => {
    renderDashboard()

    await screen.findByText('Monthly Fee Collection Trends')
    fireEvent.change(screen.getByLabelText('Collection trend period'), { target: { value: 'year' } })
    await screen.findByText('Yearly Fee Collection Trends')
    await waitFor(() => {
      expect(dashboardApi.getCollectionTrends).toHaveBeenCalledWith(
        expect.objectContaining({ granularity: 'year' })
      )
    })

    fireEvent.change(screen.getByLabelText('Collection trend period'), { target: { value: 'day' } })
    const monthInput = await screen.findByLabelText('Collection trend month')
    fireEvent.change(monthInput, { target: { value: '2026-10' } })
    fireEvent.change(screen.getByLabelText('Collection trend measure'), {
      target: { value: 'transaction_count' },
    })
    fireEvent.change(screen.getByLabelText('Collection trend chart type'), {
      target: { value: 'donut' },
    })

    await waitFor(() => {
      expect(dashboardApi.getCollectionTrends).toHaveBeenCalledWith(
        expect.objectContaining({ granularity: 'day', month: '2026-10' })
      )
    })
    expect((screen.getByLabelText('Collection trend measure') as HTMLSelectElement).value).toBe('transaction_count')
    expect((screen.getByLabelText('Collection trend chart type') as HTMLSelectElement).value).toBe('donut')
  })
})
