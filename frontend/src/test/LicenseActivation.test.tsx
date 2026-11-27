/**
 * @file        LicenseActivation.test.tsx
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
 * @created     2026-11-16
 * @updated     2026-11-27
 *
 * @description Tests the Institution Admin license activation entry point and institution scoping.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LicenseActivation from '../pages/LicenseActivation'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'

const { getStatusMock, startTrialMock, printCertificateMock, createCertificateMock, downloadCertificateMock, shareCertificateMock } = vi.hoisted(() => ({
  getStatusMock: vi.fn(),
  startTrialMock: vi.fn(),
  printCertificateMock: vi.fn(),
  createCertificateMock: vi.fn(),
  downloadCertificateMock: vi.fn(),
  shareCertificateMock: vi.fn(),
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
      startTrial: startTrialMock,
    },
  }
})

vi.mock('../utils/printReceipt', () => ({
  printReceiptElement: printCertificateMock,
}))

vi.mock('../utils/licenseCertificatePdf', () => ({
  createLicenseCertificateFilename: vi.fn(() => 'prathamone-license-test.pdf'),
  createLicenseCertificatePdf: createCertificateMock,
  createLicenseVerificationQrDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,dGVzdA=='),
  describeLicenseCertificateStatus: vi.fn((status: string) => status.startsWith('ACTIVE')
    ? 'License is valid and in use'
    : 'Authority status not recorded'),
  downloadLicenseCertificatePdf: downloadCertificateMock,
  formatLicenseCertificateEntitlements: vi.fn((entitlements: Record<string, unknown> | null) =>
    Object.entries(entitlements || {})
      .filter(([key]) => key !== 'company.binding')
      .map(([key, value]) => ({
        key: key.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value: String(value),
      })),
  ),
  formatLicenseCertificateDate: vi.fn((value: string | null, fallback = 'Not recorded') => value || fallback),
  formatLicenseCertificateDateTime: vi.fn((value: string | null) => value || 'Not recorded'),
  formatLicenseCertificateValidThrough: vi.fn((expiresAt: string | null, model: string | null) =>
    !expiresAt && model?.toLowerCase().includes('perpetual')
      ? 'Perpetual (No Expiry)'
      : expiresAt || 'No expiry date recorded',
  ),
  groupLicenseCertificateEntitlements: vi.fn((entitlements: Array<{ key: string; value: string }>) => ({
    groups: [
      { label: 'Licensed Users', value: entitlements.find(({ key }) => key === 'Users')?.value || 'Not recorded in signed snapshot' },
      { label: 'Branches / locations', value: 'Not recorded in signed snapshot' },
      { label: 'Licensed modules', value: 'Not recorded in signed snapshot' },
      { label: 'Deployment type', value: 'Not recorded in signed snapshot' },
    ],
    other: entitlements.filter(({ key }) => key !== 'Users'),
  })),
  getLicenseCertificateStatus: vi.fn((status: string | null, mode: string) => status || mode.toUpperCase()),
  shareLicenseCertificatePdf: shareCertificateMock,
}))

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
    useEditModeStore.getState().resetAll()
    getStatusMock.mockReset()
    startTrialMock.mockReset().mockResolvedValue({
      data: {
        ok: true,
        already_started: false,
        mode: 'trial',
        license_model: 'offline_trial_30d',
        edition: '30-Day Machine Trial',
        started_at: '2026-11-26T10:00:00+00:00',
        expires_at: '2026-12-26T10:00:00+00:00',
        days_remaining: 30,
        limits: { max_students: 100, max_staff: 25, seats: 10 },
      },
    })
    printCertificateMock.mockReset()
    createCertificateMock.mockReset().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }))
    downloadCertificateMock.mockReset()
    shareCertificateMock.mockReset().mockResolvedValue('shared')
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
        license_id: 'license-1042',
        hardware_fingerprint: 'do-not-share-hardware-id',
        serial_number: '123456789',
        registered_email: 'license@example.test',
        license_model: 'on_premise_perpetual',
        license_status: 'ACTIVE',
        entitlements: { users: 25, 'company.binding': 'private-binding' },
        verification_url: 'https://smritisys.com/api/license/verify?document_id=signed-license-001',
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
    expect(screen.getAllByText('license@example.test')).toHaveLength(2)
    await waitFor(() => {
      expect((screen.getByLabelText('Current registered license email') as HTMLInputElement).value).toBe('license@example.test')
    })
    expect(screen.getByRole('button', { name: 'Deactivate this device' })).toBeTruthy()
    const certificate = screen.getByTestId('license-certificate')
    expect(certificate.textContent).toContain('Prashant Academy')
    expect(certificate.textContent).toContain('signed-license-001')
    expect(certificate.textContent).toContain('license-1042')
    expect(certificate.textContent).toContain('license@example.test')
    expect(certificate.textContent).toContain('Registered Email ID')
    expect(certificate.textContent).toContain('Perpetual (No Expiry)')
    expect(certificate.textContent).toContain('Users')
    expect(certificate.textContent).toContain('Entitlements')
    expect(certificate.textContent).toContain('Certificate Generated')
    expect(certificate.textContent).toContain('Scan to verify this license')
    expect(certificate.textContent).toContain('Product Architect · SmritiSys & AITDL Networks')
    expect(certificate.textContent).not.toContain('Support validity')
    expect(certificate.textContent).not.toContain('private-binding')
    expect(certificate.textContent).not.toContain('do-not-share-hardware-id')
    expect(certificate.textContent).not.toContain('Digitally Signed')
    expect(certificate.textContent).not.toContain('profile@example.test')
    const headerLogo = certificate.querySelector('img[alt="PrathamOne EduOS logo"][src="/artwork/25112026/widelogofinal/batch_g55.svg"]')
    const footerLogo = certificate.querySelector('footer img[alt="PrathamOne EduOS footer logo"][src="/artwork/25112026/widelogofinal/batch_g55.svg"]')
    expect(headerLogo?.className).toContain('print-wide-logo')
    expect(footerLogo?.className).toContain('print-wide-logo')
    expect(certificate.querySelector('img[src="/artwork/25112026/widelogofinal/batch_g52-2-2-2_icon.svg"]')).toBeTruthy()
    const brandingRow = certificate.querySelector('[data-testid="certificate-branding-row"]')
    const titleRow = certificate.querySelector('[data-testid="certificate-title-row"]')
    expect(brandingRow).toBeTruthy()
    expect(titleRow?.textContent).toContain('COACHING INSTITUTE EDITION')
    const signatoryGroup = certificate.querySelector('[data-testid="certificate-signatory-group"]')
    const issuerBadge = certificate.querySelector('[data-testid="certificate-issuer-badge"]')
    expect(signatoryGroup?.textContent).toContain('Jawahar R. Mallah')
    expect(signatoryGroup?.querySelector('img[alt="Authorized issuer signature of Jawahar R. Mallah"]')).toBeTruthy()
    expect(issuerBadge).toBeTruthy()
    expect(await screen.findByAltText('Secure verification for license document signed-license-001')).toBeTruthy()
    expect(screen.getByAltText('Authorized issuer signature of Jawahar R. Mallah')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Print license certificate' }))
    expect(printCertificateMock).toHaveBeenCalledWith(expect.objectContaining({
      elementId: 'license-certificate-print-content',
      paperSize: 'A4',
    }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    })
    expect(downloadCertificateMock).toHaveBeenCalled()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share PDF' }))
    })
    expect(shareCertificateMock).toHaveBeenCalledWith(
      expect.any(Blob),
      'prathamone-license-test.pdf',
      'Prashant Academy',
    )
  })

  it('does not invent organization data or render a decorative QR when optional verification data is absent', async () => {
    getStatusMock.mockResolvedValueOnce({
      data: {
        mode: 'active',
        document_id: 'signed-license-without-verifier',
        license_id: null,
        serial_number: null,
        license_model: null,
        license_status: null,
        entitlements: null,
        verification_url: null,
        edition: null,
        expires_at: null,
        issued_at: null,
        registration: null,
        refresh_status: 'up_to_date',
        evaluation_policy: null,
        error: null,
      },
    })

    renderLicenseActivationPage()

    const certificate = await screen.findByTestId('license-certificate')
    expect(certificate.textContent).toContain('Organization name not recorded')
    expect(certificate.textContent).toContain('Authority verification URL is not available')
    expect(certificate.querySelector('img[alt^="Secure verification"]')).toBeNull()
    expect(certificate.textContent).not.toContain('Digitally Signed')
    expect(certificate.textContent).not.toContain('Support valid')
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
    expect(screen.getByTestId('license-certificate').textContent).not.toContain('profile@example.test')
  })

  it('does not show activation or registration fields when license status cannot be checked', async () => {
    getStatusMock.mockRejectedValueOnce(new Error('License service unavailable'))

    renderLicenseActivationPage()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Activation and registration are hidden')
    expect(screen.queryByText('Customer registration details')).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry license status check' })).toBeTruthy()
  })

  it('lets an Institution Admin start the 30-day unique-machine trial in Edit Mode and shows active countdown', async () => {
    renderLicenseActivationPage()

    expect(await screen.findByText('30-Day Free Unique-Machine Trial')).toBeTruthy()
    const trialBtn = screen.getByRole('button', { name: 'Start 30-Day Free Trial' }) as HTMLButtonElement
    expect(trialBtn.disabled).toBe(true)

    fireEvent.click(screen.getAllByRole('button', { name: 'Enable Edit Mode' })[0])
    expect(trialBtn.disabled).toBe(false)
    fireEvent.click(trialBtn)
    await waitFor(() => {
      expect(startTrialMock).toHaveBeenCalledTimes(1)
    })

    cleanup()
    getStatusMock.mockResolvedValueOnce({
      data: {
        mode: 'trial',
        document_id: null,
        edition: '30-Day Machine Trial',
        license_model: 'offline_trial_30d',
        rollout_stage: 'enforced',
        expires_at: '2026-12-26T10:00:00+00:00',
        issued_at: '2026-11-26T10:00:00+00:00',
        refresh_status: 'not_activated',
        trial_active: true,
        trial_expired: false,
        trial_days_remaining: 29,
        trial_limits: { max_students: 100, max_staff: 25, seats: 10 },
      },
    })
    renderLicenseActivationPage()
    expect(await screen.findByText('30-Day Machine Trial Active (29 days remaining)')).toBeTruthy()
  })
})
