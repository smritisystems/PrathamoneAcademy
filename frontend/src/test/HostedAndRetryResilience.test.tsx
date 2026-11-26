/**
 * @file        HostedAndRetryResilience.test.tsx
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
 * @created     2026-11-26
 * @updated     2026-11-26
 *
 * @description Tests verifying 423 retry-storm suppression and non-blank fallback rendering across Fees Overview and Student Monthly Pivot.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentMonthlyFeePivot } from '../components/fees/StudentMonthlyFeePivot'
import Fees from '../pages/Fees'
import * as endpoints from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEnvironmentStore } from '../store/environmentStore'

describe('Hosted 423 retry suppression and error visibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@example.test',
        full_name: 'Admin User',
        role: 'admin',
        institution_id: 1,
      } as any,
      token: 'test-token',
    })
    useEnvironmentStore.setState({ dataEnvironment: 'PRODUCTION' })
  })

  it('fires student-monthly-pivot once without retry storms on HTTP 423 and renders accessible error alert', async () => {
    const pivotSpy = vi
      .spyOn(endpoints.feesApi, 'getStudentMonthlyPivot')
      .mockRejectedValue({
        response: {
          status: 423,
          data: { detail: 'Evaluation Mode is active. Activate license to continue.' },
        },
        message: 'Request failed with status code 423',
      })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: (failureCount, err: any) => {
            if (err?.response?.status === 423) return false
            return failureCount < 1
          },
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/fees/matrix']}>
          <StudentMonthlyFeePivot initialAcademicYearId={1} />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Failed to load student collection pivot')
    expect(alert.textContent).toContain('Evaluation Mode is active')
    // Must not hammer the server in a retry loop or show Retry on 423
    expect(pivotSpy).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
  })

  it('renders an explicit error alert on /fees/overview instead of a blank screen when API fails with 423', async () => {
    vi.spyOn(endpoints.academicYearsApi, 'list').mockResolvedValue({ data: [] } as any)
    vi.spyOn(endpoints.boardsApi, 'list').mockResolvedValue({ data: [] } as any)
    vi.spyOn(endpoints.standardsApi, 'list').mockResolvedValue({ data: [] } as any)
    vi.spyOn(endpoints.divisionsApi, 'list').mockResolvedValue({ data: [] } as any)
    const overviewSpy = vi
      .spyOn(endpoints.feesApi, 'getOverview')
      .mockRejectedValue({
        response: {
          status: 423,
          data: { detail: 'Evaluation Mode is active for billing.' },
        },
        message: 'Request failed with status code 423',
      })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/fees/overview']}>
          <Fees />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(overviewSpy).toHaveBeenCalled()
    })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Unable to load Fees Overview')
    expect(alert.textContent).toContain('Evaluation Mode is active for billing.')
  })
})
