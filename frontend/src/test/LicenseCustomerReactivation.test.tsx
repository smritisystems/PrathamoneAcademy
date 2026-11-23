/**
 * @file        LicenseCustomerReactivation.test.tsx
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
 * @created     2026-11-23
 * @updated     2026-11-23
 *
 * @description Focused tests for customer-account license reactivation, session handling, polling/retry, and error states.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LicenseActivation from '../pages/LicenseActivation'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'

const {
  getStatusMock,
  customerLoginMock,
  getCustomerReactivationsMock,
  requestCustomerReactivationMock,
  pollCustomerReactivationMock,
  activateMock,
} = vi.hoisted(() => ({
  getStatusMock: vi.fn(),
  customerLoginMock: vi.fn(),
  getCustomerReactivationsMock: vi.fn(),
  requestCustomerReactivationMock: vi.fn(),
  pollCustomerReactivationMock: vi.fn(),
  activateMock: vi.fn(),
}))

vi.mock('../api/endpoints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/endpoints')>()
  return {
    ...actual,
    licenseApi: {
      ...actual.licenseApi,
      getStatus: getStatusMock,
      customerLogin: customerLoginMock,
      getCustomerReactivations: getCustomerReactivationsMock,
      requestCustomerReactivation: requestCustomerReactivationMock,
      pollCustomerReactivation: pollCustomerReactivationMock,
      activate: activateMock,
    },
  }
})

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LicenseActivation />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LicenseCustomerReactivation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: 'jwt-auth-token',
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashant.test',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        institution_id: 1,
        is_active: true,
        permissions: [],
      },
      selectedInstitutionId: 1,
    })
    useEditModeStore.setState({
      scopes: { 'license:activation': true },
    })
    useEnvironmentStore.getState().exitTrainingMode()

    getStatusMock.mockResolvedValue({
      data: {
        mode: 'unactivated',
        document_id: null,
        serial_number: null,
        registered_email: null,
        edition: null,
        license_model: null,
        rollout_stage: 'enforced',
        expires_at: null,
        issued_at: null,
        refresh_status: 'not_activated',
      },
    })
  })

  it('renders customer account login fields and executes login with email and password without saving password', async () => {
    customerLoginMock.mockResolvedValueOnce({
      data: {
        ok: true,
        session_token: 'auth-session-token-999',
        email: 'customer@smritisys.test',
      },
    })
    getCustomerReactivationsMock.mockResolvedValueOnce({
      data: {
        ok: true,
        licenses: [
          {
            license_id: 101,
            serial_number: '123456789',
            edition: 'coaching-institute',
            seats: 5,
            activation_count: 1,
          },
        ],
      },
    })

    renderPanel()

    expect(await screen.findByText('Reactivate with PrathamOne Customer Account')).toBeTruthy()
    const emailInput = screen.getByLabelText('Customer account email') as HTMLInputElement
    const passwordInput = screen.getByLabelText('Customer account password') as HTMLInputElement
    const signInBtn = screen.getByRole('button', { name: /sign in with account/i })

    fireEvent.change(emailInput, { target: { value: 'customer@smritisys.test' } })
    fireEvent.change(passwordInput, { target: { value: 'CustomerSecret123!' } })
    fireEvent.click(signInBtn)

    await waitFor(() => {
      expect(customerLoginMock).toHaveBeenCalledWith('customer@smritisys.test', 'CustomerSecret123!', undefined)
    })

    // Password input must be cleared immediately after login
    await waitFor(() => {
      expect(screen.queryByLabelText('Customer account password')).toBeNull()
      expect(screen.getByText('Account Authenticated')).toBeTruthy()
    })
  })

  it('handles approved reactivation by automatically calling activate with reactivation_request_id', async () => {
    customerLoginMock.mockResolvedValueOnce({
      data: { ok: true, session_token: 'tok-1', email: 'owner@academy.com' },
    })
    getCustomerReactivationsMock.mockResolvedValueOnce({
      data: {
        ok: true,
        licenses: [
          { license_id: 202, serial_number: '987654321', edition: 'pro', seats: 3, activation_count: 0 },
        ],
      },
    })
    requestCustomerReactivationMock.mockResolvedValueOnce({
      data: {
        ok: true,
        id: 'req-approved-001',
        status: 'approved',
        message: 'Device transfer approved.',
      },
    })
    activateMock.mockResolvedValueOnce({
      data: {
        ok: true,
        mode: 'active',
        document_id: 'doc-reactivated-01',
      },
    })

    renderPanel()

    await screen.findByText('Reactivate with PrathamOne Customer Account')
    fireEvent.change(screen.getByLabelText('Customer account email'), { target: { value: 'owner@academy.com' } })
    fireEvent.change(screen.getByLabelText('Customer account password'), { target: { value: 'Pass123!' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in with account/i }))

    await waitFor(() => {
      expect(screen.getByText('Account Authenticated')).toBeTruthy()
    })

    const reactivateBtn = await screen.findByRole('button', { name: /reactivate selected license/i })
    fireEvent.click(reactivateBtn)

    await waitFor(() => {
      expect(requestCustomerReactivationMock).toHaveBeenCalledWith(202, 'tok-1', undefined)
      expect(activateMock).toHaveBeenCalledWith({ reactivation_request_id: 'req-approved-001' }, undefined)
    })
  })

  it('handles pending reactivation by showing support phone notification and polling until approved', async () => {
    customerLoginMock.mockResolvedValueOnce({
      data: { ok: true, session_token: 'tok-2', email: 'director@academy.com' },
    })
    getCustomerReactivationsMock.mockResolvedValueOnce({
      data: {
        ok: true,
        licenses: [
          { license_id: 303, serial_number: '555666777', edition: 'enterprise', seats: 10, activation_count: 2 },
        ],
      },
    })
    requestCustomerReactivationMock.mockResolvedValueOnce({
      data: {
        ok: true,
        id: 'req-pending-002',
        status: 'pending',
        registered_phone: '+91 98765 43210',
        message: 'Support will call registered phone for verification.',
      },
    })
    pollCustomerReactivationMock.mockResolvedValueOnce({
      data: {
        ok: true,
        id: 'req-pending-002',
        status: 'approved',
        registered_phone: '+91 98765 43210',
      },
    })
    activateMock.mockResolvedValueOnce({
      data: {
        ok: true,
        mode: 'active',
        document_id: 'doc-reactivated-02',
      },
    })

    renderPanel()

    await screen.findByText('Reactivate with PrathamOne Customer Account')
    fireEvent.change(screen.getByLabelText('Customer account email'), { target: { value: 'director@academy.com' } })
    fireEvent.change(screen.getByLabelText('Customer account password'), { target: { value: 'Pass123!' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in with account/i }))

    const reactivateBtn = await screen.findByRole('button', { name: /reactivate selected license/i })
    fireEvent.click(reactivateBtn)

    // Should display support will call notification with phone number
    expect(await screen.findByText(/reactivation request pending verification/i)).toBeTruthy()
    expect(screen.getByText('+91 98765 43210')).toBeTruthy()

    // Test manual poll trigger
    const checkNowBtn = screen.getByRole('button', { name: /check status now/i })
    fireEvent.click(checkNowBtn)

    await waitFor(() => {
      expect(pollCustomerReactivationMock).toHaveBeenCalledWith('req-pending-002', 'tok-2', undefined)
      expect(activateMock).toHaveBeenCalledWith({ reactivation_request_id: 'req-pending-002' }, undefined)
    })
  })
})
