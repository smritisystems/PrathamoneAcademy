/**
 * @file        InlineQuickFeeCollection.test.tsx
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
 * @created     2026-11-25
 * @updated     2026-11-26
 *
 * @description Vitest suite for Inline Quick Fee Collection & Receipt Generation in Batch Monthly Fee Collection Matrix.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentMonthlyFeePivot } from '../components/fees/StudentMonthlyFeePivot'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import * as endpoints from '../api/endpoints'
import * as printReceipt from '../utils/printReceipt'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const buildPivotResponse = (collected = 0, balance = 45000) => ({
  summary: {
    total_students: 1,
    total_agreed_package: 45000,
    total_collected: collected,
    total_balance: balance,
    collection_percentage: Math.round((collected / 45000) * 100),
    defaulters_count: balance > 0 ? 1 : 0,
    pending_installments_count: balance > 0 ? 1 : 0,
  },
  months: [
    { key: '2026-04', name: 'April', short_name: 'Apr', year: 2026 },
    { key: '2026-05', name: 'May', short_name: 'May', year: 2026 },
    { key: '2026-11', name: 'November', short_name: 'Nov', year: 2026 },
  ],
  students: [
    {
      student_id: 42,
      admission_number: 'PA-2024-000035',
      student_name: 'Aaradhya',
      phone: '9876543210',
      board_id: 1,
      board_name: 'SSC',
      standard_id: 9,
      standard_name: 'Class IX',
      division_id: 3,
      division_name: 'SSC IX',
      batch_name: 'SSC IX',
      package_fee: 45000,
      months: {
        '2026-04': { amount: 0, payments_count: 0, is_pending: false, pending_amount: 0, status: 'unpaid' as const, payments: [] },
        '2026-05': { amount: 0, payments_count: 0, is_pending: balance > 0, pending_amount: balance, status: (balance > 0 ? 'pending' : 'paid') as any, payments: [] },
        '2026-11': { amount: collected, payments_count: collected > 0 ? 1 : 0, is_pending: false, pending_amount: 0, status: (collected > 0 ? 'paid' : 'none') as any, payments: [] },
      },
      total_collected: collected,
      balance,
      collection_rate: Math.round((collected / 45000) * 100),
      status: (balance <= 0 ? 'paid' : collected > 0 ? 'partial' : 'overdue') as any,
      student_status: 'active' as const,
      invoice_id: 101,
      remark: 'Total obligation corrected to Rs 45,000.00',
      priority: 'high',
      follow_up_status: 'follow_up_required',
    },
  ],
  monthly_totals: { '2026-04': 0, '2026-05': 0, '2026-11': collected },
  filter_options: {
    academic_years: [
      { id: 1, name: '2025-26', is_current: false },
      { id: 2, name: '2026-27', is_current: true },
    ],
    boards: [{ id: 1, name: 'SSC', code: 'SSC' }],
    standards: [{ id: 9, name: 'Class IX', level: 9 }],
    divisions: [{ id: 3, name: 'SSC IX', standard_id: 9, board_id: 1 }],
    payment_methods: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD'],
    payment_statuses: [{ id: 'all', label: 'All' }],
    student_statuses: [{ id: 'all', label: 'All' }],
  },
})

const currentInvoice = {
  id: 101,
  invoice_number: 'INV-2026-0101',
  student_id: 42,
  assignment_id: 10,
  academic_year_id: 2,
  total_amount: 45000,
  discount_amount: 0,
  net_amount: 45000,
  paid_amount: 0,
  outstanding_amount: 45000,
  status: 'unpaid' as const,
  issue_date: '2026-04-01',
  due_date: '2026-05-10',
  items: [
    { id: 1, fee_category_name: 'Tuition Fee', description: 'Tuition Fee', amount: 45000, discount_amount: 0, net_amount: 45000 },
  ],
  installments: [
    {
      id: 201,
      invoice_id: 101,
      installment_number: 1,
      description: 'May 2026 Installment',
      amount: 15000,
      paid_amount: 0,
      outstanding_amount: 15000,
      due_date: '2026-05-10',
      status: 'unpaid' as const,
    },
    {
      id: 202,
      invoice_id: 101,
      installment_number: 2,
      description: 'Aug 2026 Installment',
      amount: 15000,
      paid_amount: 0,
      outstanding_amount: 15000,
      due_date: '2026-08-10',
      status: 'unpaid' as const,
    },
    {
      id: 203,
      invoice_id: 101,
      installment_number: 3,
      description: 'Dec 2026 Installment',
      amount: 15000,
      paid_amount: 0,
      outstanding_amount: 15000,
      due_date: '2026-12-10',
      status: 'unpaid' as const,
    },
  ],
}

const priorYearInvoice = {
  id: 95,
  invoice_number: 'INV-2025-0095',
  student_id: 42,
  assignment_id: 5,
  academic_year_id: 1,
  total_amount: 6000,
  discount_amount: 0,
  net_amount: 6000,
  paid_amount: 0,
  outstanding_amount: 6000,
  status: 'unpaid' as const,
  issue_date: '2025-11-01',
  due_date: '2025-12-01',
  installments: [],
}

const renderPivot = (onNavigateToCollection = vi.fn()) => {
  const qc = createTestQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <StudentMonthlyFeePivot initialAcademicYearId={2} onNavigateToCollection={onNavigateToCollection} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Inline Quick Fee Collection & Receipt Generation Modal', () => {
  let getPivotMock: any
  let createPaymentMock: any
  let getReceiptMock: any
  let reprintReceiptMock: any
  let downloadPdfMock: any

  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashantacademy.in',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
      } as any,
      token: 'fake-token',
      selectedInstitutionId: 1,
      selectedAcademicYearId: 2,
    })
    useEditModeStore.setState({ scopes: { 'finance:fees': true } })

    getPivotMock = vi
      .spyOn(endpoints.feesApi, 'getStudentMonthlyPivot')
      .mockResolvedValue({ data: buildPivotResponse(0, 45000) } as any)

    vi.spyOn(endpoints.invoicesApi, 'list').mockResolvedValue({
      data: [currentInvoice, priorYearInvoice],
    } as any)

    vi.spyOn(endpoints.invoicesApi, 'get').mockImplementation(async (id: any) => ({
      data: Number(id) === 95 ? priorYearInvoice : currentInvoice,
    }) as any)

    vi.spyOn(endpoints.feeCategoriesApi, 'list').mockResolvedValue({
      data: [
        { id: 1, name: 'Tuition Fee', is_active: true },
        { id: 2, name: 'Exam Fee', is_active: true },
      ],
    } as any)

    vi.spyOn(endpoints.settingsApi, 'getLookups').mockResolvedValue({
      data: {
        categories: ['PAYMENT_METHOD'],
        items: [
          { id: 1, category: 'PAYMENT_METHOD', code: 'CASH', label: 'Cash', sort_order: 1, is_active: true, is_system: true },
          { id: 2, category: 'PAYMENT_METHOD', code: 'UPI', label: 'UPI / QR', sort_order: 2, is_active: true, is_system: true },
          { id: 3, category: 'PAYMENT_METHOD', code: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)', sort_order: 3, is_active: true, is_system: true },
          { id: 4, category: 'PAYMENT_METHOD', code: 'CHEQUE', label: 'Cheque / DD', sort_order: 4, is_active: true, is_system: true },
          { id: 5, category: 'PAYMENT_METHOD', code: 'CARD', label: 'Card', sort_order: 5, is_active: true, is_system: true },
        ],
      },
    } as any)

    vi.spyOn(endpoints.settingsApi, 'getAll').mockResolvedValue({ data: { documents: {} } } as any)

    createPaymentMock = vi.spyOn(endpoints.paymentsApi, 'create').mockResolvedValue({
      data: {
        payment_id: 501,
        receipt_number: 'RCP-2026-0501',
        amount: 15000,
        status: 'posted',
        message: 'Payment recorded and posted successfully',
      },
    } as any)

    getReceiptMock = vi.spyOn(endpoints.paymentsApi, 'getReceipt').mockResolvedValue({
      data: {
        receipt_number: 'RCP-2026-0501',
        payment_id: 501,
        student_id: 42,
        student_name: 'Aaradhya',
        admission_number: 'PA-2024-000035',
        standard: 'Class IX',
        batch: 'SSC IX',
        amount: 15000,
        payment_date: '2026-11-25',
        payment_method: 'upi',
        transaction_reference: 'UTR-7788',
        invoice_number: 'INV-2026-0101',
        status: 'posted',
        reprint_count: 0,
        is_duplicate: false,
        historical_payments: [],
        fee_summary: {
          total_fee_amount: 45000,
          previous_payments_total: 0,
          current_payment_amount: 15000,
          total_paid_to_date: 15000,
          outstanding_balance: 30000,
        },
      },
    } as any)

    reprintReceiptMock = vi.spyOn(endpoints.paymentsApi, 'reprintReceipt').mockResolvedValue({
      data: { receipt_number: 'RCP-2026-0501', reprint_count: 1, is_duplicate: true, message: 'Duplicate copy issued (Reprint #1)' },
    } as any)

    downloadPdfMock = vi.spyOn(endpoints.paymentsApi, 'downloadReceiptPdf').mockResolvedValue({
      data: new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' }),
    } as any)

    vi.spyOn(printReceipt, 'printReceiptElement').mockReturnValue(true)
  })

  async function openMayModal() {
    renderPivot()
    const pendingBtn = await screen.findByText('Pending')
    fireEvent.click(pendingBtn)
    return await screen.findByRole('dialog')
  }

  it('retains student context, loads configured payment modes & fee heads, and computes live partial/full balances', async () => {
    const dialog = await openMayModal()
    const scoped = within(dialog)

    expect(scoped.getByText('Receive Fee Payment • May 2026')).toBeDefined()
    expect(scoped.getByText('Aaradhya')).toBeDefined()
    expect(scoped.getByText(/PA-2024-000035/)).toBeDefined()
    expect(scoped.getByText(/Total obligation corrected to Rs 45,000.00/)).toBeDefined()

    // Wait for invoice & lookup data
    await waitFor(() => {
      expect(scoped.getByLabelText(/Payment Mode/i)).toBeDefined()
    })
    const modeSelect = scoped.getByLabelText(/Payment Mode/i) as HTMLSelectElement
    expect(Array.from(modeSelect.options).map((o) => o.value)).toEqual(['cash', 'upi', 'bank_transfer', 'cheque', 'card'])

    const typeSelect = scoped.getByLabelText(/Payment Type \/ Fee Allocation/i) as HTMLSelectElement
    const typeLabels = Array.from(typeSelect.options).map((o) => o.text)
    expect(typeLabels.some((t) => /Regular Fee/i.test(t))).toBe(true)
    expect(typeLabels.some((t) => /Installment/i.test(t))).toBe(true)
    expect(typeLabels.some((t) => /Previous Dues/i.test(t))).toBe(true)
    expect(typeLabels.some((t) => /Advance Payment/i.test(t))).toBe(true)
    expect(typeLabels.some((t) => /Exam Fee/i.test(t))).toBe(true)

    // Partial payment calculation
    const amountInput = scoped.getByLabelText(/Payment Amount/i) as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '10000' } })
    expect(scoped.getByTestId('calc-entered-amount').textContent).toContain('10,000')
    expect(scoped.getByTestId('calc-remaining-balance').textContent).toContain('35,000')
    expect(scoped.getByTestId('post-payment-status-badge').textContent).toContain('PARTIAL')

    // Full payment calculation
    fireEvent.change(amountInput, { target: { value: '45000' } })
    expect(scoped.getByTestId('calc-remaining-balance').textContent).toContain('0')
    expect(scoped.getByTestId('post-payment-status-badge').textContent).toContain('PAID')
  })

  it('prevents overpayment and invalid cheque submission without closing modal', async () => {
    const dialog = await openMayModal()
    const scoped = within(dialog)

    const amountInput = await scoped.findByLabelText(/Payment Amount/i)
    fireEvent.change(amountInput, { target: { value: '50000' } })
    expect(scoped.getByTestId('post-payment-status-badge').textContent).toContain('OVERPAYMENT')

    fireEvent.click(scoped.getByRole('button', { name: /^Save Payment$/i }))
    expect((await scoped.findByRole('alert')).textContent).toMatch(/Overpayment blocked/i)
    expect(createPaymentMock).not.toHaveBeenCalled()

    // Cheque without cheque number
    fireEvent.change(amountInput, { target: { value: '15000' } })
    fireEvent.change(scoped.getByLabelText(/Payment Mode/i), { target: { value: 'cheque' } })
    fireEvent.click(scoped.getByRole('button', { name: /^Save Payment$/i }))
    expect((await scoped.findByRole('alert')).textContent).toMatch(/Cheque \/ Demand Draft number is required/i)
    expect(createPaymentMock).not.toHaveBeenCalled()
  })

  it('supports multiple installments, separate payment date, saves payment, renders inline receipt, prints, downloads PDF, reprints, and refreshes matrix', async () => {
    getPivotMock
      .mockResolvedValueOnce({ data: buildPivotResponse(0, 45000) } as any)
      .mockResolvedValueOnce({ data: buildPivotResponse(30000, 15000) } as any)

    const dialog = await openMayModal()
    const scoped = within(dialog)

    // Switch to Installment mode & select 2 installments
    const typeSelect = await scoped.findByLabelText(/Payment Type \/ Fee Allocation/i)
    await waitFor(() => {
      expect(Array.from((typeSelect as HTMLSelectElement).options).some((o) => o.value === 'installment')).toBe(true)
    })
    fireEvent.change(typeSelect, { target: { value: 'installment' } })

    const checkboxes = await scoped.findAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(checkboxes[1]) // add Aug 2026 installment (15,000 + 15,000 = 30,000)

    const dateInput = scoped.getByLabelText(/Actual Payment Date/i)
    fireEvent.change(dateInput, { target: { value: '2026-11-25' } })

    fireEvent.change(scoped.getByLabelText(/Payment Mode/i), { target: { value: 'upi' } })
    fireEvent.change(scoped.getByLabelText(/UPI Transaction/i), { target: { value: 'UTR-7788' } })
    fireEvent.change(scoped.getByLabelText(/Remarks/i), { target: { value: '2 installments cleared' } })

    fireEvent.click(scoped.getByRole('button', { name: /Save Payment & Print Receipt/i }))

    await waitFor(() => {
      expect(createPaymentMock).toHaveBeenCalledTimes(1)
    })

    const sentPayload = createPaymentMock.mock.calls[0][0]
    expect(sentPayload.amount).toBe(30000)
    expect(sentPayload.payment_date).toBe('2026-11-25')
    expect(sentPayload.payment_method).toBe('upi')
    expect(sentPayload.transaction_reference).toBe('UTR-7788')
    expect(sentPayload.idempotency_key).toMatch(/^matrix-quick-42-/)
    expect(sentPayload.allocations).toEqual([
      { invoice_id: 101, installment_id: 201, amount: 15000 },
      { invoice_id: 101, installment_id: 202, amount: 15000 },
    ])

    // Receipt preview loads after commit
    await waitFor(() => {
      expect(getReceiptMock).toHaveBeenCalledWith('RCP-2026-0501')
      expect(scoped.getByText(/Payment committed & receipt #RCP-2026-0501 generated/i)).toBeDefined()
    })

    // Auto-print triggered
    await waitFor(() => {
      expect(printReceipt.printReceiptElement).toHaveBeenCalled()
    })

    // Reprint duplicate without creating a second payment
    const reprintBtn = scoped.getByRole('button', { name: /Reprint Duplicate/i })
    fireEvent.click(reprintBtn)
    await waitFor(() => {
      expect(reprintReceiptMock).toHaveBeenCalledWith('RCP-2026-0501')
    })
    expect(createPaymentMock).toHaveBeenCalledTimes(1)

    // Download PDF button works
    const pdfBtn = scoped.getByRole('button', { name: /Download PDF/i })
    fireEvent.click(pdfBtn)
    await waitFor(() => {
      expect(downloadPdfMock).toHaveBeenCalledWith('RCP-2026-0501')
    })

    // Matrix was refreshed without page reload
    expect(getPivotMock.mock.calls.length).toBeGreaterThanOrEqual(2)

    // Return to matrix closes modal
    fireEvent.click(scoped.getByRole('button', { name: /Return to Matrix/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('supports Previous Dues and Advance Payment allocations', async () => {
    const dialog = await openMayModal()
    const scoped = within(dialog)
    const typeSelect = await scoped.findByLabelText(/Payment Type \/ Fee Allocation/i)

    await waitFor(() => {
      expect(Array.from((typeSelect as HTMLSelectElement).options).some((o) => o.value === 'previous_dues')).toBe(true)
    })

    // Switch to Previous Dues -> targets prior-year invoice INV-2025-0095 (₹6,000)
    fireEvent.change(typeSelect, { target: { value: 'previous_dues' } })
    await waitFor(() => {
      expect((scoped.getByLabelText(/Payment Amount/i) as HTMLInputElement).value).toBe('6000')
    })

    // Switch to Advance Payment -> targets Dec 2026 future installment (₹15,000)
    fireEvent.change(typeSelect, { target: { value: 'advance' } })
    await waitFor(() => {
      expect((scoped.getByLabelText(/Payment Amount/i) as HTMLInputElement).value).toBe('15000')
    })
  })

  it('enforces View-First lock and role-based permission restrictions', async () => {
    useEditModeStore.setState({ scopes: {} })
    useAuthStore.setState({
      user: {
        id: 9,
        username: 'teacher1',
        email: 'teacher@prashantacademy.in',
        role: 'teacher',
        first_name: 'Teacher',
        last_name: 'One',
      } as any,
    })

    const dialog = await openMayModal()
    const scoped = within(dialog)

    expect(await scoped.findByText(/Permission Restricted/i)).toBeDefined()
    expect((scoped.getByRole('button', { name: /^Save Payment$/i }) as HTMLButtonElement).disabled).toBe(true)
    expect((scoped.getByRole('button', { name: /Save Payment & Print Receipt/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})
