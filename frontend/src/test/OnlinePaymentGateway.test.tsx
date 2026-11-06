/**
 * @file        OnlinePaymentGateway.test.tsx
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
 * @created     2026-11-06
 * @updated     2026-11-06
 *
 * @description Vitest test suite for Online Payment Gateway modal, dynamic UPI QR code generation, and instant receipt verification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OnlinePaymentModal from '../components/OnlinePaymentModal'
import { paymentsApi } from '../api/endpoints'

vi.mock('../api/endpoints', () => ({
  paymentsApi: {
    createOnlineOrder: vi.fn(),
    verifyOnlinePayment: vi.fn(),
    getOnlineConfig: vi.fn(),
    updateOnlineConfig: vi.fn(),
  },
}))

describe('Online Payment Gateway & UPI Checkout Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockOrderResponse = {
    order_id: 'order_test_998877',
    amount: 5000,
    amount_in_paise: 500000,
    currency: 'INR',
    key_id: 'rzp_test_PrathamOneEduOSKey',
    merchant_name: 'Prashant Academy Coaching Institute',
    upi_vpa: 'prashantacademy@upi',
    upi_uri: 'upi://pay?pa=prashantacademy@upi&pn=Prashant%20Academy&am=5000.00&cu=INR&tr=order_test_998877',
    upi_qr_svg: '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="black"/></svg>',
    invoice_id: 12,
    invoice_number: 'INV-2026-0012',
    student_id: 42,
    student_name: 'Aarav Sharma',
    student_admission_number: 'ADM-2026-0042',
    created_at: '2026-11-06T10:00:00Z',
  }

  const mockVerifyResult = {
    status: 'success',
    message: 'Payment verified and posted successfully.',
    payment_id: 88,
    receipt_number: 'RCP-2026-0088',
    amount: 5000,
    invoice_id: 12,
    remaining_outstanding: 7000,
    transaction_reference: 'pay_rzp_mock_123',
    timestamp: '2026-11-06T10:05:00Z',
  }

  it('renders initial order step with invoice balance and amount selection', () => {
    render(
      <OnlinePaymentModal
        isOpen={true}
        onClose={vi.fn()}
        invoiceId={12}
        invoiceNumber="INV-2026-0012"
        studentId={42}
        studentName="Aarav Sharma"
        outstandingAmount={12000}
      />
    )

    expect(screen.getByText('Online Payment & Instant UPI')).toBeDefined()
    expect(screen.getByText('INV-2026-0012')).toBeDefined()
    expect(screen.getByText('Pay Full Due (₹12000)')).toBeDefined()
    expect(screen.getByText('Proceed to UPI QR & Online Checkout')).toBeDefined()
  })

  it('generates dynamic UPI QR code and order details on proceed', async () => {
    vi.mocked(paymentsApi.createOnlineOrder).mockResolvedValue({
      data: mockOrderResponse,
    } as any)

    render(
      <OnlinePaymentModal
        isOpen={true}
        onClose={vi.fn()}
        invoiceId={12}
        invoiceNumber="INV-2026-0012"
        studentId={42}
        studentName="Aarav Sharma"
        outstandingAmount={12000}
      />
    )

    const proceedBtn = screen.getByText('Proceed to UPI QR & Online Checkout')
    fireEvent.click(proceedBtn)

    await waitFor(() => {
      expect(paymentsApi.createOnlineOrder).toHaveBeenCalledWith({
        invoice_id: 12,
        amount: 12000,
        installment_id: undefined,
      })
      expect(screen.getByText('Dynamic UPI QR Code')).toBeDefined()
      expect(screen.getByText('prashantacademy@upi')).toBeDefined()
      expect(screen.getByText(/I Have Paid — Verify & Generate Receipt/i)).toBeDefined()
    })
  })

  it('verifies payment and renders official receipt confirmation', async () => {
    vi.mocked(paymentsApi.createOnlineOrder).mockResolvedValue({
      data: mockOrderResponse,
    } as any)
    vi.mocked(paymentsApi.verifyOnlinePayment).mockResolvedValue({
      data: mockVerifyResult,
    } as any)

    const handleSuccess = vi.fn()

    render(
      <OnlinePaymentModal
        isOpen={true}
        onClose={vi.fn()}
        invoiceId={12}
        invoiceNumber="INV-2026-0012"
        studentId={42}
        studentName="Aarav Sharma"
        outstandingAmount={12000}
        onPaymentSuccess={handleSuccess}
      />
    )

    // Proceed to Step 2
    fireEvent.click(screen.getByText('Proceed to UPI QR & Online Checkout'))

    await waitFor(() => {
      expect(screen.getByText(/I Have Paid — Verify & Generate Receipt/i)).toBeDefined()
    })

    // Click Verify
    fireEvent.click(screen.getByText(/I Have Paid — Verify & Generate Receipt/i))

    await waitFor(() => {
      expect(paymentsApi.verifyOnlinePayment).toHaveBeenCalled()
      expect(screen.getByText('Payment Successful & Recorded!')).toBeDefined()
      expect(screen.getByText('RCP-2026-0088')).toBeDefined()
      expect(handleSuccess).toHaveBeenCalledWith(mockVerifyResult)
    })
  })
})
