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
 * @updated     2026-11-04
 *
 * @description Unit and DOM integration tests for isolated fee receipt printing and container isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printReceiptElement, directPrintReceipt } from '../utils/printReceipt';

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
});

