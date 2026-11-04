/**
 * @file        ShareModal.test.tsx
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
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Vitest tests for the Universal ShareModal component covering WhatsApp, Email, SMS, expiring links, PIN protection, and printing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShareModal from '../components/ShareModal'
import { communicationApi } from '../api/endpoints'

vi.mock('../api/endpoints', () => ({
  communicationApi: {
    shareDocument: vi.fn(),
    sendMessage: vi.fn(),
  },
}))

describe('ShareModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    documentType: 'RECEIPT',
    recordId: 101,
    title: 'Receipt #RCP-2026-001',
    recipientName: 'Puneeta Kulkarni',
    recipientPhone: '+919876543210',
    recipientEmail: 'puneeta@example.com',
    defaultMessage: 'Your fee payment receipt of Rs. 7,000 has been generated.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(communicationApi.shareDocument).mockResolvedValue({
      data: {
        share_url: '/shared/doc/tok_test123',
        token: 'tok_test123',
        expires_at: '2026-11-12T00:00:00Z',
        requires_pin: false,
        qr_code_svg: '<svg>QR</svg>',
      },
    } as any)
  })

  it('renders modal when open with document title and default recipient data', async () => {
    render(<ShareModal {...defaultProps} />)
    expect(screen.getByText('Share Document & Send')).toBeDefined()
    expect(screen.getByText('Receipt #RCP-2026-001')).toBeDefined()
    expect(screen.getByDisplayValue('Puneeta Kulkarni')).toBeDefined()
    expect(screen.getByDisplayValue('+919876543210')).toBeDefined()
    await waitFor(() => {
      expect(communicationApi.shareDocument).toHaveBeenCalled()
    })
  })

  it('allows switching between sharing channels (WhatsApp, Email, SMS, Secure Link)', async () => {
    render(<ShareModal {...defaultProps} />)

    // Switch to Email tab
    const emailTab = screen.getByRole('button', { name: /Email/i })
    fireEvent.click(emailTab)
    expect(screen.getByDisplayValue('puneeta@example.com')).toBeDefined()

    // Switch to SMS tab
    const smsTab = screen.getByRole('button', { name: /SMS/i })
    fireEvent.click(smsTab)
    expect(screen.getByText(/Send SMS/i)).toBeDefined()

    // Switch to Secure Link tab
    const linkTab = screen.getByRole('button', { name: /Secure Link/i })
    fireEvent.click(linkTab)
    expect(screen.getByText(/Expiring Document Token Link/i)).toBeDefined()

    await waitFor(() => {
      expect(communicationApi.shareDocument).toHaveBeenCalled()
    })
  })

  it('generates secure link with custom expiration and PIN protection', async () => {
    render(<ShareModal {...defaultProps} />)

    // Wait for initial auto-generation to complete so loading is false
    await waitFor(() => {
      expect(communicationApi.shareDocument).toHaveBeenCalledTimes(1)
    })

    const linkTab = screen.getByRole('button', { name: /Secure Link/i })
    fireEvent.click(linkTab)

    // Ensure regenerate button is enabled
    const regenerateBtn = screen.getByRole('button', { name: /Regenerate/i })
    await waitFor(() => {
      expect(regenerateBtn).toBeDefined()
    })

    // Toggle PIN requirement checkbox
    const pinCheckbox = screen.getByRole('checkbox')
    fireEvent.click(pinCheckbox)

    const pinInput = screen.getByPlaceholderText('Enter 4-6 digit PIN')
    fireEvent.change(pinInput, { target: { value: '4321' } })

    fireEvent.click(regenerateBtn)

    await waitFor(() => {
      expect(communicationApi.shareDocument).toHaveBeenCalledTimes(2)
      expect(communicationApi.shareDocument).toHaveBeenLastCalledWith(
        expect.objectContaining({
          document_type: 'RECEIPT',
          record_id: 101,
          access_key: '4321',
          expires_in_hours: 168,
        })
      )
    })
  })

  it('triggers print callback when print button is clicked', async () => {
    const onPrintMock = vi.fn()
    render(<ShareModal {...defaultProps} onPrint={onPrintMock} />)

    const printButton = screen.getByTitle('Print Document')
    fireEvent.click(printButton)

    expect(onPrintMock).toHaveBeenCalled()
    await waitFor(() => {
      expect(communicationApi.shareDocument).toHaveBeenCalled()
    })
  })
})
