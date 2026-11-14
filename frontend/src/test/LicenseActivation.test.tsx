/**
 * @file        LicenseActivation.test.tsx
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
 * @created     2026-11-16
 * @updated     2026-11-15
 *
 * @description Tests the Institution Admin license activation entry point and institution scoping.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LicenseActivation from '../pages/LicenseActivation'
import { useAuthStore } from '../store/authStore'
import { useEnvironmentStore } from '../store/environmentStore'

const { getStatusMock } = vi.hoisted(() => ({
  getStatusMock: vi.fn(),
}))

vi.mock('../api/endpoints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/endpoints')>()
  return {
    ...actual,
    licenseApi: {
      ...actual.licenseApi,
      getStatus: getStatusMock,
    },
  }
})

describe('LicenseActivation', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'test-token',
      user: {
        id: 7,
        username: 'institution-admin',
        email: 'admin@example.test',
        first_name: 'Institution',
        last_name: 'Admin',
        role: 'admin',
        institution_id: 7,
        is_active: true,
        permissions: [],
      },
      selectedInstitutionId: 99,
    })
    useEnvironmentStore.getState().exitTrainingMode()
    getStatusMock.mockReset()
    getStatusMock.mockResolvedValue({
      data: {
        mode: 'unactivated',
        document_id: null,
        edition: null,
        license_model: null,
        rollout_stage: 'shadow',
        expires_at: null,
        issued_at: null,
        refresh_status: 'not_activated',
      },
    })
  })

  it('lets an Institution Admin open license activation without using the selected institution override', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LicenseActivation />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText('License state')).toBeTruthy()
    expect(screen.getByLabelText('License key for activation or refresh')).toBeTruthy()
    expect(getStatusMock).toHaveBeenCalledWith(undefined)
    expect(screen.queryByText('System Administrator Center')).toBeNull()
  })
})
