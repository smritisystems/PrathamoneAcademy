/**
 * @file        ReportIntelligence.test.tsx
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
 * @created     2026-11-11
 * @updated     2026-11-11
 *
 * @description Comprehensive test suite validating the Universal Report Calculation & Intelligence Engine,
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReportIntelligenceBanner from '../components/reports/ReportIntelligenceBanner'
import { reportIntelligenceApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import type { ReportIntelligencePayload } from '../types'

vi.mock('../api/endpoints', () => ({
  reportIntelligenceApi: {
    getMetrics: vi.fn(),
    getDefinitions: vi.fn(),
    getThresholds: vi.fn(),
    updateThresholds: vi.fn(),
  },
}))

describe('Universal Report Intelligence Engine Suite', () => {
  let queryClient: QueryClient

  const mockAttendanceIntelligence: ReportIntelligencePayload = {
    report_id: 'student-attendance',
    generated_at: '2026-11-11T00:00:00Z',
    institution_id: 1,
    filters_applied: { academic_year_id: 1 },
    kpis: [
      {
        id: 'attendance_rate',
        name: 'Aggregate Attendance Percentage',
        value: 78.5,
        formatted_value: '78.5%',
        unit: '%',
        status: 'positive',
        badge_label: 'Healthy & On Track',
        target: 75.0,
        variance: 3.5,
        trend: 'up',
        explanation: {
          formula: '(Present Student-Days / Total Eligible Student-Days) × 100',
          latex_formula: '\\frac{D_{present}}{D_{eligible}} \\times 100',
          numerator_name: 'Present Student-Days',
          numerator_value: 3925,
          denominator_name: 'Total Eligible Student-Days',
          denominator_value: 5000,
          multiplier: 100,
          included_count: 5000,
          excluded_count: 45,
          rounding_rule: 'Rounded to 1 decimal place',
          filter_context: 'Academic Year 2026-2027',
          plain_english_breakdown: 'Out of 5,000 eligible student-days, students were marked present 3,925 times, resulting in a 78.5% institutional attendance rate.',
        },
      },
    ],
    insights: [
      {
        id: 'attendance_health',
        title: 'Institutional Attendance Healthy',
        severity: 'positive',
        what_happened: 'Cohort attendance is averaging 78.5%, surpassing the 75% benchmark.',
        why_it_matters: 'Sustained attendance correlates directly with exam pass rates and retention.',
        action_required: 'Maintain consistent biometric verification and SMS parent alerts.',
        action_label: 'Review Roster',
        action_url: '/reports',
      },
    ],
    comparisons: {
      benchmark_name: 'Institutional Compliance Target',
      target: 75.0,
      actual: 78.5,
      variance: 3.5,
    },
  }

  const mockThresholds = {
    institution_id: 1,
    thresholds: {
      attendance_target: 75.0,
      fee_collection_target: 85.0,
      homework_completion_target: 80.0,
      exam_pass_target: 70.0,
      batch_occupancy_target: 85.0,
    },
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })
    vi.clearAllMocks()

    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        first_name: 'System',
        last_name: 'Admin',
        role: 'admin',
        email: 'admin@prashantacademy.com',
      },
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    } as any)
  })

  it('renders intelligence banner with KPI metrics and status badges', async () => {
    vi.mocked(reportIntelligenceApi.getMetrics).mockResolvedValue({
      data: mockAttendanceIntelligence,
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReportIntelligenceBanner reportId="student-attendance" />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Decision Intelligence & Calculation Provenance')).toBeDefined()
      expect(screen.getByText('Aggregate Attendance Percentage')).toBeDefined()
      expect(screen.getAllByText(/78\.5/)[0]).toBeDefined()
      expect(screen.getByText('+3.5%')).toBeDefined()
      expect(screen.getByText('Healthy & On Track')).toBeDefined()
    })
  })

  it('opens "How It Was Calculated" modal showing formula, numerator, denominator, and narrative', async () => {
    vi.mocked(reportIntelligenceApi.getMetrics).mockResolvedValue({
      data: mockAttendanceIntelligence,
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReportIntelligenceBanner reportId="student-attendance" />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Aggregate Attendance Percentage')).toBeDefined()
    })

    const inspectBtn = screen.getByTitle('Inspect How It Was Calculated')
    fireEvent.click(inspectBtn)

    await waitFor(() => {
      expect(screen.getByText('Calculation Formula & Provenance')).toBeDefined()
      expect(screen.getByText('(Present Student-Days / Total Eligible Student-Days) × 100')).toBeDefined()
      expect(screen.getByText('3,925')).toBeDefined()
      expect(screen.getByText('5,000')).toBeDefined()
      expect(screen.getByText(/Out of 5,000 eligible student-days/i)).toBeDefined()
      expect(screen.getByText(/Included Records:/i)).toBeDefined()
    })

    const closeBtn = screen.getByText('Close Inspector')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByText('Calculation Formula & Provenance')).toBeNull()
    })
  })

  it('renders deterministic decision insights and required action buttons', async () => {
    vi.mocked(reportIntelligenceApi.getMetrics).mockResolvedValue({
      data: mockAttendanceIntelligence,
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReportIntelligenceBanner reportId="student-attendance" />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Key Intelligence & Required Actions/i)).toBeDefined()
      expect(screen.getByText('Institutional Attendance Healthy')).toBeDefined()
      expect(screen.getByText(/Cohort attendance is averaging 78.5%/i)).toBeDefined()
      expect(screen.getByText(/Sustained attendance correlates directly/i)).toBeDefined()
      expect(screen.getByText(/Maintain consistent biometric verification/i)).toBeDefined()
      expect(screen.getByText('Review Roster')).toBeDefined()
    })
  })

  it('allows authorized administrators to inspect institutional benchmark thresholds', async () => {
    vi.mocked(reportIntelligenceApi.getMetrics).mockResolvedValue({
      data: mockAttendanceIntelligence,
    } as any)
    vi.mocked(reportIntelligenceApi.getThresholds).mockResolvedValue({
      data: mockThresholds,
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReportIntelligenceBanner reportId="student-attendance" />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByTitle('Configure Institutional Benchmark Thresholds')).toBeDefined()
    })

    const benchmarkBtn = screen.getByTitle('Configure Institutional Benchmark Thresholds')
    fireEvent.click(benchmarkBtn)

    await waitFor(() => {
      expect(screen.getByText('Institutional Benchmarks & Target Thresholds')).toBeDefined()
      expect(screen.getByText('Attendance Target')).toBeDefined()
      expect(screen.getByText('Fee Collection Target')).toBeDefined()
      expect(screen.getByText('Homework Completion Target')).toBeDefined()
    })
  })
})
