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
 * @updated     2026-11-24
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
  requestEmailCodeMock,
  verifyEmailCodeMock,
} = vi.hoisted(() => ({
  getStatusMock: vi.fn(),
  customerLoginMock: vi.fn(),
  getCustomerReactivationsMock: vi.fn(),
  requestCustomerReactivationMock: vi.fn(),
  pollCustomerReactivationMock: vi.fn(),
  activateMock: vi.fn(),
  requestEmailCodeMock: vi.fn(),
  verifyEmailCodeMock: vi.fn(),
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
      requestEmailCode: requestEmailCodeMock,
      verifyEmailCode: verifyEmailCodeMock,
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

  it('uses the same device-history cards after email verification', async () => {
    requestEmailCodeMock.mockResolvedValueOnce({
      data: { ok: true, challenge_id: 'email-challenge-1', message: 'Verification code sent.' },
    })
    verifyEmailCodeMock.mockResolvedValueOnce({
      data: {
        ok: true,
        stage: 'complete',
        licenses: [
          {
            license_id: 401,
            serial_number: '111222333',
            product_name: 'PrathamOne EduOS',
            edition: 'Pro',
            seats: 2,
            activation_count: 1,
            activation_history: [
              {
                activation_id: 72,
                device_label: 'Device ····C789',
                status: 'released',
                activated_at: '2026-11-01T10:00:00Z',
                last_seen_at: '2026-11-10T10:00:00Z',
                deactivated_at: '2026-11-11T10:00:00Z',
                release_source: 'customer',
              },
            ],
          },
          {
            license_id: 402,
            serial_number: '444555666',
            product_name: 'PrathamOne EduOS',
            edition: 'Enterprise',
            seats: 3,
            activation_count: 2,
            activation_history: [],
          },
        ],
      },
    })

    renderPanel()

    await screen.findByText(/Activate with registered email/i)
    fireEvent.change(screen.getByLabelText('Registered license email'), {
      target: { value: 'owner@academy.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await screen.findByLabelText('Email verification code')
    fireEvent.change(screen.getByLabelText('Email verification code'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }))

    expect(await screen.findByRole('radio', { name: /111222333/ })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /444555666/ })).toBeTruthy()
    expect(screen.getByText(/Released by customer/)).toBeTruthy()
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
      expect(requestCustomerReactivationMock).toHaveBeenCalledWith(202, 'tok-1', undefined, false, '', undefined)
      expect(activateMock).toHaveBeenCalledWith({ reactivation_request_id: 'req-approved-001' }, undefined)
    })
  })

  it('shows device release history and ties a surrender claim to the selected license activation', async () => {
    customerLoginMock.mockResolvedValueOnce({
      data: { ok: true, session_token: 'tok-release', email: 'owner@academy.com' },
    })
    getCustomerReactivationsMock.mockResolvedValueOnce({
      data: {
        ok: true,
        licenses: [
          {
            license_id: 202,
            serial_number: '987654321',
            product_name: 'PrathamOne EduOS',
            edition: 'Pro',
            seats: 2,
            activation_count: 1,
            activation_history: [
              {
                activation_id: 56,
                device_label: 'Device ····A123',
                status: 'released',
                activated_at: '2026-11-01T10:00:00Z',
                last_seen_at: '2026-11-10T10:00:00Z',
                deactivated_at: '2026-11-11T10:00:00Z',
                release_source: 'customer',
              },
            ],
          },
          {
            license_id: 303,
            serial_number: '555666777',
            product_name: 'PrathamOne EduOS',
            edition: 'Enterprise',
            seats: 3,
            activation_count: 1,
            activation_history: [
              {
                activation_id: 57,
                device_label: 'Device ····B456',
                status: 'active',
                activated_at: '2026-11-20T10:00:00Z',
                last_seen_at: '2026-11-24T10:00:00Z',
                deactivated_at: null,
                release_source: null,
              },
            ],
          },
        ],
      },
    })
    requestCustomerReactivationMock.mockResolvedValueOnce({
      data: {
        ok: true,
        id: 'req-release-review',
        status: 'pending',
        message: 'Support will review the selected device release.',
      },
    })

    renderPanel()

    await screen.findByText('Reactivate with PrathamOne Customer Account')
    fireEvent.change(screen.getByLabelText('Customer account email'), { target: { value: 'owner@academy.com' } })
    fireEvent.change(screen.getByLabelText('Customer account password'), { target: { value: 'Pass123!' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in with account/i }))

    const selectedLicense = await screen.findByRole('radio', { name: /987654321/ })
    expect(screen.getByText(/Released by customer/)).toBeTruthy()
    fireEvent.click(selectedLicense)
    fireEvent.click(screen.getByRole('checkbox', {
      name: /ask support to review a previously released device for this license/i,
    }))
    fireEvent.change(screen.getByLabelText('Which released device?'), { target: { value: '56' } })
    fireEvent.change(screen.getByLabelText('Surrender reason'), {
      target: { value: 'Replaced device after surrender' },
    })
    fireEvent.click(screen.getByRole('button', { name: /reactivate selected license/i }))

    await waitFor(() => {
      expect(requestCustomerReactivationMock).toHaveBeenCalledWith(
        202,
        'tok-release',
        undefined,
        true,
        'Replaced device after surrender',
        56,
      )
    })
    expect(await screen.findByText(/reactivation request pending verification/i)).toBeTruthy()
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
    expect(screen.getByText(/\+91 98765 43210/)).toBeTruthy()

    // Test manual poll trigger
    const checkNowBtn = screen.getByRole('button', { name: /check status now/i })
    fireEvent.click(checkNowBtn)

    await waitFor(() => {
      expect(pollCustomerReactivationMock).toHaveBeenCalledWith('req-pending-002', 'tok-2', undefined)
      expect(activateMock).toHaveBeenCalledWith({ reactivation_request_id: 'req-pending-002' }, undefined)
    })
  })
})
