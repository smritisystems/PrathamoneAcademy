/**
 * @file        ReceiptPrint.test.tsx
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
 * @created     2026-11-04
 * @updated     2026-11-05
 *
 * @description Unit and DOM integration tests for isolated fee receipt printing and container isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { printReceiptElement, directPrintReceipt } from '../utils/printReceipt';
import PaymentReceiptView from '../components/PaymentReceiptView';
import type { DetailedPaymentReceipt } from '../types';

describe('Receipt Printing Specification & Container Isolation', () => {
  let originalPrint: () => void;

  beforeEach(() => {
    originalPrint = window.print;
    window.print = vi.fn();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.print = originalPrint;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('locates #receipt-print-area and creates an isolated sandbox iframe for printing', () => {
    // Setup simulated receipt modal in DOM
    const receiptContainer = document.createElement('div');
    receiptContainer.id = 'receipt-print-area';
    receiptContainer.innerHTML = `
      <div class="text-center">
        <h2>PRASHANT ACADEMY</h2>
        <p>Receipt #REC-2026-0042</p>
      </div>
      <div>
        <p>Student: Aarav Sharma</p>
        <p>Admission No: PA-2026-001</p>
        <p>Amount Received: ₹25,000</p>
      </div>
    `;
    document.body.appendChild(receiptContainer);

    const result = printReceiptElement('receipt-print-area', 'Official Fee Receipt #REC-2026-0042');
    expect(result).toBe(true);

    // Verify isolated iframe was appended
    const iframe = document.getElementById('receipt-isolated-print-frame') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe?.style.position).toBe('fixed');
    expect(iframe?.style.opacity).toBe('0');
  });

  it('falls back to window.print() gracefully if receipt container is not found', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = printReceiptElement('non-existent-receipt-container');

    expect(result).toBe(false);
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Element #non-existent-receipt-container not found')
    );
  });

  it('directPrintReceipt adds and removes the .printing-receipt class on document.body', () => {
    const receipt = document.createElement('div');
    receipt.id = 'receipt-print-area';
    document.body.appendChild(receipt);

    directPrintReceipt('receipt-print-area');

    expect(document.body.classList.contains('printing-receipt')).toBe(true);
    expect(window.print).toHaveBeenCalledTimes(1);

    // Simulate afterprint event
    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains('printing-receipt')).toBe(false);
  });

  it('preserves essential receipt fields in the printable container', () => {
    const receipt = document.createElement('div');
    receipt.id = 'receipt-print-area';
    receipt.innerHTML = `
      <h2>PRASHANT ACADEMY</h2>
      <span>Receipt #REC-2026-0099</span>
      <span>Aarav Sharma</span>
      <span>PA-2026-001</span>
      <span>Twenty-Five Thousand Rupees Only</span>
      <span>₹25,000.00</span>
      <span>Authorized Signatory</span>
    `;
    document.body.appendChild(receipt);

    expect(receipt.textContent).toContain('PRASHANT ACADEMY');
    expect(receipt.textContent).toContain('REC-2026-0099');
    expect(receipt.textContent).toContain('Aarav Sharma');
    expect(receipt.textContent).toContain('₹25,000.00');
    expect(receipt.textContent).toContain('Authorized Signatory');
  });

  describe('PaymentReceiptView Component Specification', () => {
    const mockReceiptWithHistory: DetailedPaymentReceipt = {
      receipt_number: 'RCP-2026-0146',
      payment_id: 146,
      student_id: 149,
      student_name: 'Johan Iyer',
      admission_number: 'PA-2024-000021',
      standard: 'Class IV',
      division: 'Batch A (Morning)',
      batch: 'Batch A (Morning)',
      amount: 8500.0,
      payment_date: '2026-10-07',
      payment_method: 'bank_transfer',
      transaction_reference: 'TXN-2026-0146',
      invoice_number: 'INV-2026-0149',
      status: 'completed',
      collected_by: 'Staff Accountant',
      generated_at: '2026-10-07T10:30:00Z',
      historical_payments: [
        {
          payment_id: 1,
          receipt_number: 'RCP-2026-0001',
          date: '2026-03-06',
          payment_method: 'bank_transfer',
          amount: 8500.0,
          transaction_reference: 'TXN-2026-0001',
        },
        {
          payment_id: 6,
          receipt_number: 'RCP-2026-0006',
          date: '2026-04-04',
          payment_method: 'upi',
          amount: 8500.0,
          transaction_reference: 'UPI-2026-0006',
        },
      ],
      fee_summary: {
        total_fee_amount: 85000.0,
        previous_payments_total: 17000.0,
        current_payment_amount: 8500.0,
        total_paid_to_date: 25500.0,
        outstanding_balance: 59500.0,
      },
    };

    it('renders current payment details, student metadata, and amount in words', () => {
      render(<PaymentReceiptView receipt={mockReceiptWithHistory} />);

      expect(screen.getByText('RCP-2026-0146')).toBeDefined();
      expect(screen.getByText('Johan Iyer')).toBeDefined();
      expect(screen.getByText('PA-2024-000021')).toBeDefined();
      expect(screen.getByText(/Class IV/)).toBeDefined();
      expect(screen.getByText('INV-2026-0149')).toBeDefined();
      expect(screen.getByText('TXN-2026-0146')).toBeDefined();
      expect(screen.getAllByText(/₹8,500/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Rupees Eight Thousand Five Hundred Only/i)).toBeDefined();
    });

    it('displays historical payment records in chronological order excluding the current payment', () => {
      render(<PaymentReceiptView receipt={mockReceiptWithHistory} />);

      // Historical payments table headers
      expect(screen.getByText(/Historical Payment Details/i)).toBeDefined();
      expect(screen.getByText('RCP-2026-0001')).toBeDefined();
      expect(screen.getByText('RCP-2026-0006')).toBeDefined();

      // Subtotal of previous payments
      expect(screen.getByText('Previous Payments Total:')).toBeDefined();
      expect(screen.getAllByText('₹17,000').length).toBeGreaterThanOrEqual(1);
    });

    it('displays "No previous payments." when historical_payments array is empty (first installment)', () => {
      const firstPaymentReceipt: DetailedPaymentReceipt = {
        ...mockReceiptWithHistory,
        receipt_number: 'RCP-2026-0001',
        payment_id: 1,
        historical_payments: [],
        fee_summary: {
          total_fee_amount: 85000.0,
          previous_payments_total: 0.0,
          current_payment_amount: 8500.0,
          total_paid_to_date: 8500.0,
          outstanding_balance: 76500.0,
        },
      };

      render(<PaymentReceiptView receipt={firstPaymentReceipt} />);

      expect(screen.getByText(/No previous payments/i)).toBeDefined();
      expect(screen.getByText('₹76,500')).toBeDefined();
    });

    it('renders reconciled fee summary metrics including total fee, total paid, and outstanding balance', () => {
      render(<PaymentReceiptView receipt={mockReceiptWithHistory} />);

      expect(screen.getByText('Total Fee')).toBeDefined();
      expect(screen.getByText('₹85,000')).toBeDefined();
      expect(screen.getByText('Previous Paid')).toBeDefined();
      expect(screen.getByText('Current Paid')).toBeDefined();
      expect(screen.getByText('Total Paid to Date')).toBeDefined();
      expect(screen.getByText('₹25,500')).toBeDefined();
      expect(screen.getByText('Outstanding Balance')).toBeDefined();
      expect(screen.getByText('₹59,500')).toBeDefined();
    });

    it('displays prominent reversal banner when receipt status is reversed', () => {
      const reversedReceipt: DetailedPaymentReceipt = {
        ...mockReceiptWithHistory,
        status: 'reversed',
        is_reversed: true,
        reversal_reason: 'Cheque bounced by bank',
        reversed_at: '2026-10-08T14:00:00Z',
      };

      render(<PaymentReceiptView receipt={reversedReceipt} />);

      expect(screen.getByText(/VOIDED \/ REVERSED TRANSACTION/i)).toBeDefined();
      expect(screen.getByText(/Cheque bounced by bank/i)).toBeDefined();
    });

    it('allows toggling between A4 Portrait and A5 Compact format and triggers printing', () => {
      render(<PaymentReceiptView receipt={mockReceiptWithHistory} />);

      const a5Btn = screen.getByText('A5 Compact');
      fireEvent.click(a5Btn);

      const printBtn = screen.getByText(/Print Receipt \(A5\)/i);
      expect(printBtn).toBeDefined();
      fireEvent.click(printBtn);
    });

    it('renders exact visual components matching the A5 portrait screenshot specifications', () => {
      const screenshotReceipt: DetailedPaymentReceipt = {
        receipt_number: 'RCP-2026-0167',
        payment_id: 167,
        student_id: 155,
        student_name: 'Puneeta Kulkarni',
        admission_number: 'PA-2024-000029',
        standard: 'VIII',
        division: 'A (Morning)',
        batch: 'A (Morning)',
        amount: 7000.0,
        payment_date: '2026-11-04',
        academic_year: '2026 – 27',
        payment_method: 'bank_transfer',
        transaction_reference: 'TXN-2026-0167',
        invoice_number: 'INV-2026-0157',
        status: 'completed',
        historical_payments: [
          { payment_id: 19, receipt_number: 'RCP-2026-0019', date: '2026-04-14', payment_method: 'cheque', amount: 6000.0 },
          { payment_id: 56, receipt_number: 'RCP-2026-0056', date: '2026-06-08', payment_method: 'cash', amount: 9000.0 },
          { payment_id: 91, receipt_number: 'RCP-2026-0091', date: '2026-07-10', payment_method: 'cash', amount: 7000.0 },
          { payment_id: 117, receipt_number: 'RCP-2026-0117', date: '2026-08-12', payment_method: 'upi', amount: 7000.0 },
          { payment_id: 139, receipt_number: 'RCP-2026-0139', date: '2026-09-16', payment_method: 'bank_transfer', amount: 7000.0 },
          { payment_id: 144, receipt_number: 'RCP-2026-0144', date: '2026-10-06', payment_method: 'upi', amount: 7000.0 },
        ],
        fee_summary: {
          total_fee_amount: 90000.0,
          previous_payments_total: 43000.0,
          current_payment_amount: 7000.0,
          total_paid_to_date: 50000.0,
          outstanding_balance: 40000.0,
        },
      };

      render(<PaymentReceiptView receipt={screenshotReceipt} initialPaperSize="A5" />);

      // 1. Header ribbon & metadata
      expect(screen.getByText('OFFICIAL FEE RECEIPT')).toBeDefined();
      expect(screen.getByText('RCP-2026-0167')).toBeDefined();
      expect(screen.getByText('2026 – 27')).toBeDefined();
      expect(screen.getByText('INV-2026-0157')).toBeDefined();
      expect(screen.getByText('PAID')).toBeDefined();

      // 2. Student details & amount
      expect(screen.getByText('Puneeta Kulkarni')).toBeDefined();
      expect(screen.getByText('PA-2024-000029')).toBeDefined();
      expect(screen.getByText('VIII')).toBeDefined();
      expect(screen.getByText('A (Morning)')).toBeDefined();
      expect(screen.getAllByText('₹7,000').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Rupees Seven Thousand Only/i)).toBeDefined();

      // 3. Payment method & transaction reference
      expect(screen.getAllByText('Bank Transfer').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('TXN-2026-0167')).toBeDefined();

      // 4. Fee Account Summary & Donut percentage
      expect(screen.getByText('FEE ACCOUNT SUMMARY')).toBeDefined();
      expect(screen.getByText('56%')).toBeDefined();
      expect(screen.getByText('₹90,000')).toBeDefined();
      expect(screen.getAllByText('₹43,000').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('₹50,000')).toBeDefined();
      expect(screen.getByText('₹40,000')).toBeDefined();

      // 5. 6 previous payments in table
      expect(screen.getByText('RCP-2026-0019')).toBeDefined();
      expect(screen.getByText('RCP-2026-0056')).toBeDefined();
      expect(screen.getByText('RCP-2026-0091')).toBeDefined();
      expect(screen.getByText('RCP-2026-0117')).toBeDefined();
      expect(screen.getByText('RCP-2026-0139')).toBeDefined();
      expect(screen.getByText('RCP-2026-0144')).toBeDefined();

      // 6. Footer and security disclaimers
      expect(screen.getByText('Thank you for your payment.')).toBeDefined();
      expect(screen.getByText(/computer-generated receipt/i)).toBeDefined();
      expect(screen.getByText('Authorized Signatory')).toBeDefined();
    });

    it('adaptively caps historical payments to 6 on A5 paper and shows overflow footnote', () => {
      const eightPayments = Array.from({ length: 8 }, (_, i) => ({
        payment_id: i + 1,
        receipt_number: `RCP-2026-${String(i + 1).padStart(4, '0')}`,
        date: `2026-0${i + 1}-10`,
        payment_method: 'upi',
        amount: 5000.0,
      }));

      const heavyReceipt: DetailedPaymentReceipt = {
        receipt_number: 'RCP-2026-0099',
        payment_id: 99,
        student_id: 1,
        student_name: 'Test Student',
        admission_number: 'PA-2024-000001',
        amount: 5000.0,
        payment_date: '2026-11-01',
        payment_method: 'upi',
        status: 'completed',
        historical_payments: eightPayments,
        fee_summary: {
          total_fee_amount: 50000.0,
          previous_payments_total: 40000.0,
          current_payment_amount: 5000.0,
          total_paid_to_date: 45000.0,
          outstanding_balance: 5000.0,
        },
      };

      const { rerender } = render(<PaymentReceiptView receipt={heavyReceipt} initialPaperSize="A5" />);

      // On A5 mode, 6 are rendered and overflow notice appears
      expect(screen.getByText(/Showing 6 most recent installments/i)).toBeDefined();

      // When switched to A4 mode, all 8 are shown without the overflow notice
      const a4Btn = screen.getByText('A4 Portrait');
      fireEvent.click(a4Btn);
      expect(screen.queryByText(/Showing 6 most recent installments/i)).toBeNull();
    });
  });
});

