/**
 * @file        LicenseDetailsModal.test.tsx
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
 * @created     2026-11-19
 * @updated     2026-11-19
 *
 * @description Unit and accessibility tests for the popout License Details modal verifying unmasked serial number display, copy interactions, registered entity metadata, and administrative security governance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LicenseDetailsModal from '../components/LicenseDetailsModal'
import { useAuthStore } from '../store/authStore'
import { licenseApi, institutionsApi } from '../api/endpoints'

vi.mock('../api/endpoints', () => ({
  institutionsApi: {
    list: vi.fn(),
  },
  licenseApi: {
    getStatus: vi.fn(),
  },
}))

describe('LicenseDetailsModal Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })
    vi.clearAllMocks()

    useAuthStore.setState({
      token: 'mock-jwt-token',
      user: {
        id: 42,
        username: 'admin.jawahar',
        email: 'jawahar@prashantacademy.com',
        first_name: 'Jawahar',
        last_name: 'Mallah',
        role: 'admin',
        institution_id: 1,
      },
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })

    vi.mocked(institutionsApi.list).mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Prashant Academy Coaching Institute',
          code: 'PA001',
          email: 'admin@prashantacademy.com',
          phone: '+91 9323 023 007',
          address: 'Jankalyan Nagar, Malad West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400095',
          is_active: true,
        },
      ],
    } as any)

    vi.mocked(licenseApi.getStatus).mockResolvedValue({
      data: {
        product: 'PrathamOne EduOS',
        mode: 'active',
        rollout_stage: 'enforced',
        document_id: 'DOC-SIG-8842-VALID',
        serial_number: 'PRTH-2026-PA001-ACTV-9921',
        registered_email: 'license.owner@prashantacademy.com',
        license_model: 'Commercial Subscription',
        edition: 'Coaching Institute Edition',
        expires_at: '2027-12-31T23:59:59Z',
        issued_at: '2026-01-01T00:00:00Z',
        offline_validity_days: 30,
        registration: {
          institution_name: 'Prashant Academy Coaching Institute',
          contact_name: 'Jawahar R. Mallah',
          contact_email: 'license.owner@prashantacademy.com',
          phone: '+91 9323 023 007',
          address: 'Jankalyan Nagar, Malad West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400095',
          tax_id: '27AAAAA0000A1Z5',
          website: 'https://prashantacademy.com',
        },
        refresh_status: 'up_to_date',
        evaluation_policy: null,
        error: null,
      },
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderModal = (isOpen = true, onClose = vi.fn()) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LicenseDetailsModal isOpen={isOpen} onClose={onClose} />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('does not render when isOpen is false', () => {
    renderModal(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders unmasked full serial number prominently for support identification', async () => {
    renderModal(true)

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Software License & Registration')).toBeDefined()

    await waitFor(() => {
      const serialElement = screen.getByTestId('unmasked-serial-number')
      expect(serialElement.textContent).toBe('PRTH-2026-PA001-ACTV-9921')
    })
    expect(screen.getByText(/Product Serial Number \(Support Reference ID\)/i)).toBeDefined()
    expect(screen.getByText(/Quote this Serial Number when contacting customer care/i)).toBeDefined()
  })

  it('copies the unmasked serial number to clipboard when clicking Copy', async () => {
    const clipboardSpy = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardSpy,
      },
    })

    renderModal(true)

    await waitFor(() => {
      expect(screen.getByTestId('unmasked-serial-number').textContent).toBe('PRTH-2026-PA001-ACTV-9921')
    })

    const copyBtn = screen.getByTestId('copy-serial-btn')
    fireEvent.click(copyBtn)

    expect(clipboardSpy).toHaveBeenCalledWith('PRTH-2026-PA001-ACTV-9921')
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeDefined()
    })
  })

  it('renders registered on whom details: organization, email, and contact info', async () => {
    renderModal(true)

    expect(await screen.findByText('Prashant Academy Coaching Institute')).toBeDefined()
    expect(screen.getByText('license.owner@prashantacademy.com')).toBeDefined()
    expect(screen.getByText('Jawahar R. Mallah')).toBeDefined()
    expect(screen.getByText('+91 9323 023 007')).toBeDefined()
  })

  it('displays activation and deactivation security governance notice', async () => {
    renderModal(true)

    expect(screen.getByText(/Activation & Deactivation Governance/i)).toBeDefined()
    expect(
      screen.getByText(
        /strictly restricted to authorized administrators or the registered customer using one-time challenge codes/i
      )
    ).toBeDefined()
  })

  it('shows Manage/Activate button for admin role and hides it for non-admin', async () => {
    // 1. Admin user
    const { unmount } = renderModal(true)
    expect(await screen.findByText('Manage / Activate License')).toBeDefined()
    unmount()

    // 2. Non-admin (teacher)
    useAuthStore.setState({
      user: {
        id: 99,
        username: 'teacher.rohit',
        email: 'rohit@prashantacademy.com',
        first_name: 'Rohit',
        last_name: 'Mehta',
        role: 'teacher',
        institution_id: 1,
      },
    })

    renderModal(true)
    expect(screen.queryByText('Manage / Activate License')).toBeNull()
    expect(screen.getByText('Admin License Lock')).toBeDefined()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    renderModal(true, onClose)

    const closeBtn = screen.getByTestId('license-modal-close-btn')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
