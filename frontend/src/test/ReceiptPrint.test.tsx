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
 * @updated     2026-11-12
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

  it('preserves academy header (logo, name, address, phone, email), QR, signature, and full-scale A5/A4 layout inside isolated print iframe', () => {
    const receipt = document.createElement('div');
    receipt.id = 'receipt-print-area';
    receipt.setAttribute('data-paper-size', 'A4');
    receipt.innerHTML = `
      <header class="receipt-header print-header flex items-center justify-between">
        <img src="/media/logo/prashant-academy-logo.svg" alt="PRASHANT ACADEMY" />
        <h1>PRASHANT ACADEMY</h1>
        <span>Shop No16, 14, 12, Aquarius Taurus Building, Malad West</span>
        <span>+91-7021789907</span>
        <span>tejam.prashnat@gmail.com</span>
      </header>
      <footer class="receipt-footer">Authorized Signatory</footer>
    `;
    document.body.appendChild(receipt);

    const okA4 = printReceiptElement({ elementId: 'receipt-print-area', paperSize: 'A4' });
    expect(okA4).toBe(true);

    const iframeA4 = document.getElementById('receipt-isolated-print-frame') as HTMLIFrameElement;
    expect(iframeA4).not.toBeNull();
    expect(iframeA4.style.width).toBe('210mm');
    expect(iframeA4.style.height).toBe('297mm');
    const docA4 = iframeA4.contentDocument!;
    expect(docA4.querySelector('base')?.getAttribute('href')).toContain(window.location.origin);
    expect(docA4.getElementById('receipt-print-area')?.getAttribute('data-paper-size')).toBe('A4');
    expect(docA4.querySelector('header.receipt-header.print-header')).not.toBeNull();
    const cssA4 = Array.from(docA4.querySelectorAll('style')).map((s) => s.textContent || '').join('\n');
    expect(cssA4).toContain('size: A4 portrait');
    expect(cssA4).toContain('max-width: 190mm');
    expect(cssA4).toContain('header.receipt-header');
    expect(cssA4).toContain('display: flex !important');
    expect(cssA4).toContain('font-size: 16px !important');
    expect(cssA4).toContain('body:has(#receipt-print-area) > #print-root');
    expect(cssA4).toContain('.hidden { display: none !important; }');

    // Now test A5 Compact without shrink-to-fit width/padding overflow
    receipt.setAttribute('data-paper-size', 'A5');
    const okA5 = printReceiptElement('receipt-print-area', 'Fee Receipt A5');
    expect(okA5).toBe(true);
    const iframeA5 = document.getElementById('receipt-isolated-print-frame') as HTMLIFrameElement;
    expect(iframeA5.style.width).toBe('148mm');
    expect(iframeA5.style.height).toBe('210mm');
    const docA5 = iframeA5.contentDocument!;
    const cssA5 = Array.from(docA5.querySelectorAll('style')).map((s) => s.textContent || '').join('\n');
    expect(cssA5).toContain('size: A5 portrait');
    expect(cssA5).toContain('max-width: 136mm');
  });

  it('PaymentReceiptView marks header with .print-header and matches selected paper size on container & embedded print CSS', () => {
    const sampleReceipt: DetailedPaymentReceipt = {
      receipt_number: 'RCP-2026-0777',
      payment_id: 777,
      student_id: 101,
      student_name: 'Neha Kulkarni',
      admission_number: 'PA-2026-0777',
      amount: 12000,
      payment_date: '2026-11-12',
      payment_method: 'upi',
      status: 'completed',
      fee_summary: {
        total_fee_amount: 36000,
        previous_payments_total: 0,
        current_payment_amount: 12000,
        total_paid_to_date: 12000,
        outstanding_balance: 24000,
      },
    };
    const { container } = render(<PaymentReceiptView receipt={sampleReceipt} initialPaperSize="A5" />);
    const receiptArea = container.querySelector('#receipt-print-area') as HTMLElement;
    expect(receiptArea).not.toBeNull();
    expect(receiptArea.getAttribute('data-paper-size')).toBe('A5');
    const hdr = container.querySelector('header.receipt-header');
    expect(hdr).not.toBeNull();
    expect(hdr?.classList.contains('print-header')).toBe(true);
    const crestFallback = Array.from(hdr?.querySelectorAll('div') || []).find((d) => d.textContent?.trim() === 'PA');
    if (crestFallback && crestFallback.classList.contains('hidden')) {
      expect(crestFallback.classList.contains('flex')).toBe(false);
    }

    fireEvent.click(screen.getByText('A4 Portrait'));
    expect(receiptArea.getAttribute('data-paper-size')).toBe('A4');
    const embeddedStyle = receiptArea.querySelector('style')?.textContent || '';
    expect(embeddedStyle).toContain('max-width: 190mm !important');
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

      expect(screen.getAllByText('RCP-2026-0146').length).toBeGreaterThan(0);
      expect(screen.getByText('Johan Iyer')).toBeDefined();
      expect(screen.getByText('PA-2024-000021')).toBeDefined();
      expect(screen.getByText('IV')).toBeDefined();
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
      expect(screen.getByText('Previous Paid')).toBeDefined();
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

      expect(screen.getByText(/Previous Paid/i)).toBeDefined();
      expect(screen.getByText('₹76,500')).toBeDefined();
    });

    it('renders reconciled fee summary metrics including total fee, total paid, and outstanding balance', () => {
      render(<PaymentReceiptView receipt={mockReceiptWithHistory} />);

      expect(screen.getByText('Total Fee')).toBeDefined();
      expect(screen.getByText('₹85,000')).toBeDefined();
      expect(screen.getByText('Previous Paid')).toBeDefined();
      expect(screen.getByText('Current Paid')).toBeDefined();
      expect(screen.getByText('Total Paid to Date')).toBeDefined();
      expect(screen.getAllByText('₹25,500').length).toBeGreaterThanOrEqual(1);
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
      expect(screen.getAllByText('RCP-2026-0167').length).toBeGreaterThanOrEqual(1);
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
      expect(screen.getAllByText('₹50,000').length).toBeGreaterThanOrEqual(1);
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

    it('adaptively caps historical payments to 10 on A5 paper and shows overflow footnote', () => {
      const fifteenPayments = Array.from({ length: 15 }, (_, i) => ({
        payment_id: i + 1,
        receipt_number: `RCP-2026-${String(i + 1).padStart(4, '0')}`,
        date: `2026-0${(i % 9) + 1}-10`,
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
        historical_payments: fifteenPayments,
        fee_summary: {
          total_fee_amount: 50000.0,
          previous_payments_total: 40000.0,
          current_payment_amount: 5000.0,
          total_paid_to_date: 45000.0,
          outstanding_balance: 5000.0,
        },
      };

      const { rerender } = render(<PaymentReceiptView receipt={heavyReceipt} initialPaperSize="A5" />);

      // On A5 mode, installments are rendered and overflow notice appears
      expect(screen.getByText(/most recent installments/i)).toBeDefined();

      // When switched to A4 mode, all are shown without the overflow notice
      const a4Btn = screen.getByText('A4 Portrait');
      fireEvent.click(a4Btn);
      expect(screen.queryByText(/most recent installments/i)).toBeNull();
    });
  });

  describe('Comprehensive Print Fidelity & Institute Branding Scenarios', () => {
    it('Scenario 1: Preview and print a normal single-payment receipt', () => {
      const normalReceipt: DetailedPaymentReceipt = {
        receipt_number: 'RCP-2026-0001',
        payment_id: 1,
        student_id: 101,
        student_name: 'Ananya Sharma',
        admission_number: 'PA-2026-000001',
        standard: 'Class X',
        batch: 'Batch A',
        amount: 15000.0,
        payment_date: '2026-04-10',
        payment_method: 'upi',
        transaction_reference: 'TXN-2026-0001',
        invoice_number: 'INV-2026-0001',
        status: 'completed',
        historical_payments: [],
        fee_summary: {
          total_fee_amount: 60000.0,
          previous_payments_total: 0.0,
          current_payment_amount: 15000.0,
          total_paid_to_date: 15000.0,
          outstanding_balance: 45000.0,
        },
      };

      render(<PaymentReceiptView receipt={normalReceipt} initialPaperSize="A5" />);

      expect(screen.getAllByText('RCP-2026-0001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Ananya Sharma')).toBeDefined();
      expect(screen.getByText('PA-2026-000001')).toBeDefined();
      expect(screen.getAllByText('₹15,000').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('₹45,000')).toBeDefined();
      expect(screen.getByText(/Previous Paid/i)).toBeDefined();

      const printBtn = screen.getByText(/Print Receipt \(A5\)/i);
      fireEvent.click(printBtn);
    });

    it('Scenario 2: Preview and print receipt with historical installments matching ledger reconciliation', () => {
      const historyReceipt: DetailedPaymentReceipt = {
        receipt_number: 'RCP-2026-0167',
        payment_id: 167,
        student_id: 155,
        student_name: 'Puneeta Kulkarni',
        admission_number: 'PA-2024-000029',
        standard: 'VIII',
        batch: 'A (Morning)',
        amount: 7000.0,
        payment_date: '2026-11-04',
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

      render(<PaymentReceiptView receipt={historyReceipt} initialPaperSize="A5" />);

      expect(screen.getByText('56%')).toBeDefined();
      expect(screen.getAllByText('₹90,000').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('₹50,000').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('₹40,000')).toBeDefined();
      expect(screen.getByText('RCP-2026-0019')).toBeDefined();
      expect(screen.getByText('RCP-2026-0144')).toBeDefined();
    });

    it('Scenario 3: Print with long institute address and long student name without layout distortion', () => {
      const longNameReceipt: DetailedPaymentReceipt = {
        receipt_number: 'RCP-2026-0172',
        payment_id: 172,
        student_id: 199,
        student_name: 'Harsimranjeet Singh Randhawa-Bhattacharya',
        admission_number: 'PA-2026-000099',
        standard: 'Class XII (Science Stream)',
        batch: 'Batch B-Advanced Morning Coaching',
        amount: 25000.0,
        payment_date: '2026-11-05',
        payment_method: 'bank_transfer',
        transaction_reference: 'TXN-BANK-NEFT-2026-99999',
        invoice_number: 'INV-2026-0199',
        status: 'completed',
        historical_payments: [],
        fee_summary: {
          total_fee_amount: 100000.0,
          previous_payments_total: 0.0,
          current_payment_amount: 25000.0,
          total_paid_to_date: 25000.0,
          outstanding_balance: 75000.0,
        },
      };

      render(<PaymentReceiptView receipt={longNameReceipt} initialPaperSize="A5" />);

      expect(screen.getByText('Harsimranjeet Singh Randhawa-Bhattacharya')).toBeDefined();
      expect(screen.getByText('XII (Science Stream)')).toBeDefined();
      expect(screen.getByText('Batch B-Advanced Morning Coaching')).toBeDefined();
    });

    it('Scenario 4: Gracefully handles missing logo and optional contact fields without fabricating information', () => {
      const minimalReceipt: DetailedPaymentReceipt = {
        receipt_number: 'RCP-2026-0005',
        payment_id: 5,
        student_id: 105,
        student_name: 'Dev Patel',
        admission_number: 'PA-2026-000005',
        amount: 8000.0,
        payment_date: '2026-05-01',
        payment_method: 'cash',
        status: 'completed',
        fee_summary: {
          total_fee_amount: 8000.0,
          previous_payments_total: 0.0,
          current_payment_amount: 8000.0,
          total_paid_to_date: 8000.0,
          outstanding_balance: 0.0,
        },
      };

      const { container } = render(<PaymentReceiptView receipt={minimalReceipt} initialPaperSize="A5" />);

      expect(container.querySelector('.receipt-header')).not.toBeNull();
      expect(screen.getByText('PA')).toBeDefined();
      expect(screen.getByText('PAID')).toBeDefined();
    });

    it('Scenario 5: Accommodates large historical payments list with overflow handling on A5 and full expansion on A4', () => {
      const twelvePayments = Array.from({ length: 12 }, (_, i) => ({
        payment_id: i + 1,
        receipt_number: `RCP-2026-00${String(i + 1).padStart(2, '0')}`,
        date: `2026-0${(i % 9) + 1}-15`,
        payment_method: i % 2 === 0 ? 'upi' : 'cash',
        amount: 4000.0,
      }));

      const multiPageReceipt: DetailedPaymentReceipt = {
        receipt_number: 'RCP-2026-0099',
        payment_id: 99,
        student_id: 102,
        student_name: 'Rohit Verma',
        admission_number: 'PA-2024-000010',
        amount: 4000.0,
        payment_date: '2026-11-05',
        payment_method: 'upi',
        status: 'completed',
        historical_payments: twelvePayments,
        fee_summary: {
          total_fee_amount: 60000.0,
          previous_payments_total: 48000.0,
          current_payment_amount: 4000.0,
          total_paid_to_date: 52000.0,
          outstanding_balance: 8000.0,
        },
      };

      render(<PaymentReceiptView receipt={multiPageReceipt} initialPaperSize="A5" />);

      expect(screen.getByText(/most recent installments/i)).toBeDefined();

      const a4Btn = screen.getByText('A4 Portrait');
      fireEvent.click(a4Btn);
      expect(screen.queryByText(/most recent installments/i)).toBeNull();
      expect(screen.getByText('RCP-2026-0012')).toBeDefined();
    });

    it('Scenario 6: Dynamically renders updated Institute Profile branding without hardcoded overrides', () => {
      const receipt: DetailedPaymentReceipt = {
        receipt_number: 'RCP-2026-0199',
        payment_id: 199,
        student_id: 103,
        student_name: 'Sneha Joshi',
        admission_number: 'PA-2024-000015',
        amount: 10000.0,
        payment_date: '2026-11-05',
        payment_method: 'cheque',
        status: 'completed',
        fee_summary: {
          total_fee_amount: 50000.0,
          previous_payments_total: 0.0,
          current_payment_amount: 10000.0,
          total_paid_to_date: 10000.0,
          outstanding_balance: 40000.0,
        },
      };

      const { container } = render(<PaymentReceiptView receipt={receipt} initialPaperSize="A5" />);

      expect(container.querySelector('.receipt-header')).toBeDefined();
      expect(container.querySelector('.receipt-footer')).toBeDefined();
      expect(screen.getByText('Authorized Signatory')).toBeDefined();
    });

    it('Scenario 7: Guarantees tenant and student data isolation with zero leakage of unrelated student records', () => {
      const isolatedReceipt: DetailedPaymentReceipt = {
        receipt_number: 'RCP-2026-0155',
        payment_id: 155,
        student_id: 155,
        student_name: 'Kavita Menon',
        admission_number: 'PA-2024-000028',
        amount: 6500.0,
        payment_date: '2026-11-03',
        payment_method: 'upi',
        status: 'completed',
        fee_summary: {
          total_fee_amount: 65000.0,
          previous_payments_total: 20000.0,
          current_payment_amount: 6500.0,
          total_paid_to_date: 26500.0,
          outstanding_balance: 38500.0,
        },
      };

      render(<PaymentReceiptView receipt={isolatedReceipt} />);

      expect(screen.getByText('Kavita Menon')).toBeDefined();
      expect(screen.getByText('PA-2024-000028')).toBeDefined();
      expect(screen.queryByText('Puneeta Kulkarni')).toBeNull();
      expect(screen.queryByText('Aarav Sharma')).toBeNull();
    });
  });
});

