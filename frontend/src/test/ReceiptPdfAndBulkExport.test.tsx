/**
 * @file        ReceiptPdfAndBulkExport.test.tsx
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
 * @created     2026-11-09
 * @updated     2026-11-09
 *
 * @description Frontend test suite for receipt PDF download, direct file attachment sharing, fallback logic, and bulk selection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  sanitizeReceiptFilename,
  shareOrDownloadReceiptPdf,
} from '../utils/receiptShare'
import PaymentReceiptView from '../components/PaymentReceiptView'
import { paymentsApi } from '../api/endpoints'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

describe('Receipt PDF & Sharing Utilities', () => {
  beforeEach(() => {
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn()
    }
  })
  it('strictly sanitizes filenames to StudentName_ReceiptNo.pdf', () => {
    expect(sanitizeReceiptFilename('Aarav Sharma', 'RCP-2026-0001')).toBe(
      'Aarav_Sharma_RCP-2026-0001.pdf'
    )
    expect(sanitizeReceiptFilename('Priya  Patel  ', 'REC/2026/042')).toBe(
      'Priya_Patel_REC_2026_042.pdf'
    )
    expect(sanitizeReceiptFilename('Rohan: Senior*', 'TXN-001?*')).toBe(
      'Rohan_Senior_TXN-001.pdf'
    )
    expect(sanitizeReceiptFilename('', '')).toBe('Student_Receipt.pdf')
  })

  it('shares actual PDF file attachment directly when navigator.share supports files', async () => {
    const mockPdfBlob = new Blob(['%PDF-1.7 dummy pdf bytes'], {
      type: 'application/pdf',
    })
    vi.spyOn(paymentsApi, 'downloadReceiptPdf').mockResolvedValue({
      data: mockPdfBlob,
    } as any)

    const shareMock = vi.fn().mockResolvedValue(undefined)
    const canShareMock = vi.fn().mockReturnValue(true)

    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(navigator, 'canShare', {
      value: canShareMock,
      configurable: true,
      writable: true,
    })

    const notifications: any[] = []
    const result = await shareOrDownloadReceiptPdf(
      'RCP-2026-0001',
      'Aarav Sharma',
      (notif) => notifications.push(notif)
    )

    expect(result.success).toBe(true)
    expect(result.shared).toBe(true)
    expect(result.downloaded).toBe(false)
    expect(result.filename).toBe('Aarav_Sharma_RCP-2026-0001.pdf')
    expect(shareMock).toHaveBeenCalled()

    const shareArgs = shareMock.mock.calls[0][0]
    expect(shareArgs.files).toBeDefined()
    expect(shareArgs.files.length).toBe(1)
    expect(shareArgs.files[0].name).toBe('Aarav_Sharma_RCP-2026-0001.pdf')
    expect(shareArgs.url).toBeUndefined() // STRICTLY NO WEB/CLOUD URLS

    expect(notifications[0].type).toBe('success')
  })

  it('falls back to downloading PDF file with manual attachment message if device cannot share files', async () => {
    const mockPdfBlob = new Blob(['%PDF-1.7 dummy pdf bytes'], {
      type: 'application/pdf',
    })
    vi.spyOn(paymentsApi, 'downloadReceiptPdf').mockResolvedValue({
      data: mockPdfBlob,
    } as any)

    // Simulate browser without file-sharing capability
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const notifications: any[] = []
    const result = await shareOrDownloadReceiptPdf(
      'RCP-2026-0002',
      'Priya Patel',
      (notif) => notifications.push(notif)
    )

    expect(result.success).toBe(true)
    expect(result.shared).toBe(false)
    expect(result.downloaded).toBe(true)
    expect(result.filename).toBe('Priya_Patel_RCP-2026-0002.pdf')

    // Verifies explicit fallback instructions
    expect(notifications[0].type).toBe('warning')
    expect(notifications[0].message).toContain(
      'Direct browser file attachment sharing is unsupported on this device'
    )
    expect(notifications[0].message).toContain('Please attach this file directly in WhatsApp or your email client')
  })
})

describe('PaymentReceiptView Direct PDF & Share Actions', () => {
  const dummyReceipt = {
    id: 1,
    payment_id: 1,
    receipt_number: 'RCP-2026-0088',
    student_name: 'Ananya Deshmukh',
    admission_number: 'PA-2026-0088',
    standard: 'Class 10',
    division: 'Batch A',
    amount: 15000,
    payment_date: '2026-11-09',
    payment_method: 'upi',
    fee_summary: {
      total_fee_amount: 60000,
      previous_payments_total: 0,
      current_payment_amount: 15000,
      total_paid_to_date: 15000,
      outstanding_balance: 45000,
    },
  }

  it('renders Download PDF and Share PDF action buttons', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PaymentReceiptView receipt={dummyReceipt} showPrintActions={true} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Download PDF')).toBeDefined()
    expect(screen.getByText('Share PDF')).toBeDefined()
    expect(screen.getByText(/Print Receipt/i)).toBeDefined()
  })

  it('clicking Download PDF calls downloadReceiptPdf API endpoint', async () => {
    const downloadSpy = vi
      .spyOn(paymentsApi, 'downloadReceiptPdf')
      .mockResolvedValue({
        data: new Blob(['%PDF-1.7 bytes']),
      } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentReceiptView receipt={dummyReceipt} showPrintActions={true} />
      </QueryClientProvider>
    )

    const downloadBtn = screen.getByText('Download PDF')
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith('RCP-2026-0088')
    })
  })
})
