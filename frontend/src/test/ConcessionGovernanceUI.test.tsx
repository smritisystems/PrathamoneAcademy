/**
 * @file        ConcessionGovernanceUI.test.tsx
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
 * @created     2026-11-11
 * @updated     2026-11-11
 *
 * @description Vitest verification suite for governed Concession/Waiver/Scholarship UI components including end-to-end drill-down traceability.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConcessionTraceModal } from '../components/common/ConcessionTraceModal'
import PaymentReceiptView from '../components/PaymentReceiptView'
import { concessionsApi } from '../api/endpoints'
import type { DetailedPaymentReceipt } from '../types'

vi.mock('../api/endpoints', async () => {
  const actual = await vi.importActual<typeof import('../api/endpoints')>('../api/endpoints')
  return {
    ...actual,
    concessionsApi: {
      ...actual.concessionsApi,
      traceTransaction: vi.fn(),
    },
  }
})

describe('Concession & Financial Governance UI Components', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  it('renders complete drill-down chain in ConcessionTraceModal and supports navigation', async () => {
    const mockTrace = {
      student: {
        id: 42,
        name: 'Aarav Sharma',
        admission_number: 'ADM-2026-042',
      },
      invoice: {
        id: 108,
        invoice_number: 'INV-2026-0108',
        gross_fee: 45000,
        discount_amount: 10000,
        net_amount: 35000,
        paid_amount: 20000,
        outstanding_amount: 15000,
        status: 'partial',
      },
      applications: [
        {
          id: 9,
          application_number: 'CON-2026-0009',
          benefit_type: 'sponsor_funding',
          waiver_scope: null,
          funding_source: 'external_sponsor',
          sponsor_name: 'Tata Vidya Trust',
          sponsor_settlement_status: 'partial',
          status: 'applied',
          approved_amount: 10000,
          applied_amount: 10000,
          reversed_amount: 0,
          approval_remarks: 'Merit & sponsor grant approved',
          approved_at: '2026-11-10T10:00:00Z',
        },
      ],
      allocations: [
        {
          id: 301,
          transaction_ref: 'CTXN-2026-0031',
          transaction_type: 'sponsor_funding',
          posting_status: 'posted',
          effective_date: '2026-11-10',
          allocated_amount: 10000,
          credit_adjustment_amount: 0,
        },
      ],
      audit_history: [
        {
          id: 701,
          action: 'CONCESSION_APPLIED_TO_INVOICE',
          details: 'Posted ₹10,000 sponsor scholarship to INV-2026-0108',
          severity: 'INFO',
          actor: 'Super Admin (@superadmin)',
          created_at: '2026-11-10T10:05:00Z',
        },
      ],
    }

    vi.mocked(concessionsApi.traceTransaction).mockResolvedValue({ data: mockTrace } as any)
    const onClose = vi.fn()
    const onNavigateStudent = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <ConcessionTraceModal
          entityType="application"
          entityId={9}
          onClose={onClose}
          onNavigateStudent={onNavigateStudent}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })

    expect(screen.getByText('INV-2026-0108')).toBeDefined()
    expect(screen.getByText('CON-2026-0009')).toBeDefined()
    expect(screen.getByText('CTXN-2026-0031')).toBeDefined()
    expect(screen.getByText('CONCESSION_APPLIED_TO_INVOICE')).toBeDefined()
    expect(screen.getByText(/Tata Vidya Trust/)).toBeDefined()

    fireEvent.click(screen.getByText('Open Profile'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onNavigateStudent).toHaveBeenCalledWith(42)
  })

  it('displays Gross Assessed Fee, Concessions / Scholarships / Waivers, and Net Fee Payable in PaymentReceiptView when benefits apply', () => {
    const concessionReceipt: DetailedPaymentReceipt = {
      receipt_number: 'RCP-2026-0999',
      payment_id: 999,
      student_id: 42,
      student_name: 'Aarav Sharma',
      admission_number: 'ADM-2026-042',
      amount: 15000,
      payment_date: '2026-11-11',
      payment_method: 'upi',
      status: 'completed',
      gross_fee: 45000,
      concession_amount: 10000,
      historical_payments: [],
      fee_summary: {
        total_fee_amount: 35000,
        previous_payments_total: 0,
        current_payment_amount: 15000,
        total_paid_to_date: 15000,
        outstanding_balance: 20000,
      },
    }

    render(<PaymentReceiptView receipt={concessionReceipt} />)

    expect(screen.getByText('Gross Assessed Fee')).toBeDefined()
    expect(screen.getByText('Concessions / Scholarships / Waivers')).toBeDefined()
    expect(screen.getByText('Net Fee Payable')).toBeDefined()
    expect(screen.getByText('₹45,000')).toBeDefined()
    expect(screen.getByText('-₹10,000')).toBeDefined()
    expect(screen.getByText('₹35,000')).toBeDefined()
  })
})
