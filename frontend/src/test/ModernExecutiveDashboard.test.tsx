/**
 * @file        ModernExecutiveDashboard.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-17
 * @updated     2026-11-17
 *
 * @description Unit & regression test suite verifying the Modern Executive Dashboard layout, micro-sparklines, dual-comparative charts, stream breakdown, and 3-pillar operational command tier.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/Dashboard'
import { academicYearsApi, boardsApi, codexApi, dashboardApi, divisionsApi, standardsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

vi.mock('../config/branding', () => ({
  useBranding: () => ({ academyName: 'Prashant Academy Coaching' }),
}))

describe('Modern Executive Dashboard Architecture & Ergonomics', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'prof_sharma',
        first_name: 'Jawahar',
        last_name: 'Mallah',
        email: 'jawahar@smritisys.com',
        role: 'admin',
      },
      selectedAcademicYearId: 1,
      selectedInstitutionId: 1,
    })

    vi.spyOn(dashboardApi, 'getStats').mockResolvedValue({
      data: {
        total_students: 482,
        total_fees: 1800000,
        total_collected: 1485000,
        total_outstanding: 245000,
        collection_rate: 82.5,
        monthly_trends: [],
        recent_payments: [
          {
            id: 101,
            receipt_number: 'REC-2026-1024',
            student_id: 1,
            student_name: 'Aarav Sharma',
            admission_number: 'AD-2026-089',
            standard: 'Class 12',
            batch: '12-A JEE Advanced',
            fee_category: 'Tuition Fee',
            payment_date: '2026-11-17',
            payment_method: 'upi',
            amount: 15000,
          },
        ],
        daily_operations: {
          today_admissions: 18,
          new_leads: 5,
          follow_ups_due_today: 3,
          demos_scheduled: 2,
          upcoming_fee_due_invoices: 8,
          pending_payment_verifications: 2,
        },
      },
    } as never)

    vi.spyOn(dashboardApi, 'getCollectionTrends').mockResolvedValue({
      data: {
        granularity: 'month',
        records: [
          { period_key: '2026-08', label: '1 AUG', collected: 120000, transaction_count: 14 },
          { period_key: '2026-09', label: '1 SEP', collected: 185000, transaction_count: 22 },
          { period_key: '2026-10', label: '1 OCT', collected: 210000, transaction_count: 28 },
          { period_key: '2026-11', label: '1 NOV', collected: 295000, transaction_count: 35 },
        ],
        total_collected: 810000,
        total_transactions: 99,
      },
    } as never)

    vi.spyOn(dashboardApi, 'getAnalytics').mockResolvedValue({
      data: {
        academic_analysis: {
          attendance: {
            present_percentage: 94.2,
          },
        },
        student_analysis: {
          standard_distribution: [
            { standard_name: 'IIT-JEE Advanced', student_count: 145 },
            { standard_name: 'NEET Medical', student_count: 120 },
            { standard_name: 'Class 10 Foundation', student_count: 96 },
          ],
          batch_utilization: [
            {
              division_id: 1,
              standard_name: 'Class 12',
              batch_name: '12-A JEE Advanced',
              enrolled_count: 48,
              capacity: 50,
              utilization_rate: 96,
            },
            {
              division_id: 2,
              standard_name: 'Class 12',
              batch_name: '12-B NEET Medical',
              enrolled_count: 45,
              capacity: 50,
              utilization_rate: 90,
            },
          ],
        },
        operations: {
          recent_activities: [
            {
              id: 1,
              type: 'payment',
              title: 'Fee Payment Received — ₹15,000',
              subtitle: 'Aarav Sharma • Receipt REC-2026-1024',
              timestamp: '2 min ago',
            },
          ],
        },
      },
    } as never)

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

  it('renders modern executive greeting with personalized username and quick period controls', async () => {
    renderDashboard()

    expect(await screen.findByText(/Hello, Jawahar 👋/i)).toBeTruthy()
    expect(screen.getByText(/Here's what's happening in Prashant Academy Coaching this month\./i)).toBeTruthy()
    expect(screen.getByLabelText('Dashboard Period')).toBeTruthy()
    expect(screen.getByTitle('Open Executive Reports & Exports')).toBeTruthy()
  })

  it('renders the 4 Executive KPI cards with micro-sparklines and sentiment badges', async () => {
    renderDashboard()

    expect(await screen.findByText('Total Fees Collected')).toBeTruthy()
    expect(screen.getByText('Active Students')).toBeTruthy()
    expect(screen.getByText('Institute Attendance')).toBeTruthy()
    expect(screen.getByText('Outstanding Dues')).toBeTruthy()

    // Trend sentiment badges
    expect(screen.getByText('+12.4%')).toBeTruthy()
    expect(screen.getByText('+18 admissions')).toBeTruthy()
    expect(screen.getByText('+1.8%')).toBeTruthy()
    expect(screen.getByText('-8.5%')).toBeTruthy()
  })

  it('renders the Three-Pillar Operational Command tier with receipts, top batches, and live activity stream', async () => {
    renderDashboard()

    // Pillar 1: Recent Fee Receipts
    expect(await screen.findByText('Recent Fee Receipts')).toBeTruthy()
    const receipts = await screen.findAllByText('REC-2026-1024')
    expect(receipts.length).toBeGreaterThan(0)
    const students = await screen.findAllByText('Aarav Sharma')
    expect(students.length).toBeGreaterThan(0)

    // Pillar 2: Top Performing Batches
    expect(screen.getByText('Top Performing Batches')).toBeTruthy()
    expect(screen.getByText(/Class 12 — 12-A JEE Advanced/i)).toBeTruthy()

    // Pillar 3: Live Coaching Activity Feed
    expect(screen.getByText('Live Activity Feed')).toBeTruthy()
    expect(screen.getByText(/Fee Payment Received — ₹15,000/i)).toBeTruthy()
    expect(screen.getByText('2 min ago')).toBeTruthy()
  })

  it('supports seamless toggling between Fee Status and By Stream on the category donut card', async () => {
    renderDashboard()

    // Default: Fee Collection Status
    expect(await screen.findByText('Fee Collection Status')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Fee Status' })).toBeTruthy()
    const streamBtn = screen.getByRole('button', { name: 'By Stream' })
    expect(streamBtn).toBeTruthy()

    // Click By Stream
    fireEvent.click(streamBtn)
    expect(await screen.findByText('Sales by Category / Streams')).toBeTruthy()
    expect(screen.getByText('IIT-JEE Advanced')).toBeTruthy()
    expect(screen.getByText('NEET Medical')).toBeTruthy()

    // Click Fee Status back
    fireEvent.click(screen.getByRole('button', { name: 'Fee Status' }))
    expect(await screen.findByText('Fee Collection Status')).toBeTruthy()
  })
})
