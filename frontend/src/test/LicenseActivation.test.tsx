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
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LicenseActivation from '../pages/LicenseActivation'
import { useAuthStore } from '../store/authStore'
import { useEnvironmentStore } from '../store/environmentStore'

const { getStatusMock } = vi.hoisted(() => ({
  getStatusMock: vi.fn(),
}))

function renderLicenseActivationPage() {
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
}

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
    renderLicenseActivationPage()

    expect(await screen.findByText('License state')).toBeTruthy()
    expect(screen.queryByLabelText('License key for activation or refresh')).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: 'Enable Edit Mode' })[0])
    expect(screen.getByLabelText('Legacy license key (previously issued keys)')).toBeTruthy()
    expect(getStatusMock).toHaveBeenCalledWith(undefined)
    expect(screen.queryByText('System Administrator Center')).toBeNull()
  })

  it('shows license management instead of registration and activation forms after verification', async () => {
    getStatusMock.mockResolvedValueOnce({
      data: {
        mode: 'active',
        document_id: 'signed-license-001',
        serial_number: '123456789',
        registered_email: 'license@example.test',
        license_model: 'on_premise_perpetual',
        edition: 'coaching-institute',
        rollout_stage: 'enforced',
        expires_at: null,
        issued_at: '2026-11-15T12:00:00+00:00',
        offline_validity_days: 14,
        registration: {
          institution_name: 'Prashant Academy',
          contact_name: 'Admin User',
          contact_email: 'profile@example.test',
          phone: '1234567890',
          address: null,
          city: null,
          state: null,
          pincode: null,
          tax_id: null,
          website: null,
        },
        refresh_status: 'up_to_date',
        evaluation_policy: null,
        error: null,
      },
    })

    renderLicenseActivationPage()

    expect(await screen.findByText('License registration complete')).toBeTruthy()
    expect(screen.queryByText('Customer registration details')).toBeNull()
    expect(screen.queryByLabelText('Institution name')).toBeNull()
    expect(screen.queryByLabelText('License serial number')).toBeNull()
    expect(screen.queryByLabelText('License activation key')).toBeNull()
    expect(screen.getByText('Change registered license email')).toBeTruthy()
    expect(screen.getByText('license@example.test')).toBeTruthy()
    expect((screen.getByLabelText('Current registered license email') as HTMLInputElement).value).toBe('license@example.test')
    expect(screen.getByRole('button', { name: 'Deactivate this device' })).toBeTruthy()
  })

  it('reactivates a previously registered license by email without showing registration or key fields', async () => {
    getStatusMock.mockResolvedValueOnce({
      data: {
        mode: 'unactivated',
        document_id: null,
        serial_number: '123456789',
        registered_email: 'license@example.test',
        license_model: null,
        edition: null,
        rollout_stage: 'shadow',
        expires_at: null,
        issued_at: null,
        offline_validity_days: null,
        registration: null,
        refresh_status: 'not_activated',
        evaluation_policy: null,
        error: null,
      },
    })

    renderLicenseActivationPage()

    expect(await screen.findByText('Activate this existing license')).toBeTruthy()
    expect(screen.getByLabelText('Registered license email')).toBeTruthy()
    expect(screen.queryByText('Customer registration details')).toBeNull()
    expect(screen.queryByLabelText('License serial number')).toBeNull()
    expect(screen.queryByLabelText('License activation key')).toBeNull()
  })

  it('does not present institution profile email as the registered license email', async () => {
    getStatusMock.mockResolvedValueOnce({
      data: {
        mode: 'active',
        document_id: 'signed-license-002',
        registered_email: null,
        registration: {
          institution_name: 'Prashant Academy',
          contact_name: 'Admin User',
          contact_email: 'profile@example.test',
          phone: '1234567890',
        },
      },
    })

    renderLicenseActivationPage()

    expect(await screen.findByText('License registration complete')).toBeTruthy()
    expect((screen.getByLabelText('Current registered license email') as HTMLInputElement).value).toBe('')
    expect(screen.queryByText('profile@example.test')).toBeNull()
  })

  it('does not show activation or registration fields when license status cannot be checked', async () => {
    getStatusMock.mockRejectedValueOnce(new Error('License service unavailable'))

    renderLicenseActivationPage()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Activation and registration are hidden')
    expect(screen.queryByText('Customer registration details')).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry license status check' })).toBeTruthy()
  })
})
