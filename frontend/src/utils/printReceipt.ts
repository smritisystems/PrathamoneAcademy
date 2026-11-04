/**
 * @file        printReceipt.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
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
 * @description Isolated receipt printing utility for clean, header-free A4/A5 voucher generation.
 */

export interface PrintReceiptOptions {
  elementId?: string;
  documentTitle?: string;
  paperSize?: 'A4' | 'A5' | 'auto';
  onAfterPrint?: () => void;
}

/**
 * Prints the target receipt element inside an isolated sandbox iframe
 * preventing any outer application UI, backdrop modals, buttons, or navigation from printing.
 */
export function printReceiptElement(
  elementId: string = 'receipt-print-area',
  title: string = 'Official Fee Receipt - Prashant Academy'
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const receiptEl = document.getElementById(elementId);
  if (!receiptEl) {
    console.warn(`[ReceiptPrint] Element #${elementId} not found, falling back to window.print()`);
    window.print();
    return false;
  }

  try {
    // Remove existing print iframe if any
    const existingIframe = document.getElementById('receipt-isolated-print-frame');
    if (existingIframe && existingIframe.parentNode) {
      existingIframe.parentNode.removeChild(existingIframe);
    }

    // Create an isolated hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'receipt-isolated-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.warn('[ReceiptPrint] Could not acquire iframe document; falling back to direct print.');
      directPrintReceipt(elementId);
      return false;
    }

    // Clone receipt contents
    const clonedReceipt = receiptEl.cloneNode(true) as HTMLElement;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
          }
          #print-root {
            width: 100%;
            max-width: 185mm;
            margin: 0 auto;
            padding: 18px 24px;
            background: #ffffff;
            border: 2px solid #cbd5e1;
            border-radius: 12px;
          }
          /* Typography & utilities */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .justify-center { justify-content: center; }
          .justify-between { justify-content: space-between; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .gap-4 { gap: 16px; }
          .w-12 { width: 48px; }
          .h-12 { height: 48px; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mt-0\\.5 { margin-top: 2px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .p-4 { padding: 16px; }
          .p-6 { padding: 24px; }
          .pb-4 { padding-bottom: 16px; }
          .pt-4 { padding-top: 16px; }
          .px-4 { padding-left: 16px; padding-right: 16px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .rounded-2xl { border-radius: 16px; }
          .rounded-xl { border-radius: 12px; }
          .rounded-lg { border-radius: 8px; }
          .border { border: 1px solid #e2e8f0; }
          .border-b-2 { border-bottom: 2px solid #2563eb; }
          .border-t { border-top: 1px solid #e2e8f0; }
          .border-blue-200 { border-color: #bfdbfe; }
          .border-slate-100 { border-color: #f1f5f9; }
          .border-slate-200 { border-color: #e2e8f0; }
          .bg-blue-600 { background-color: #2563eb !important; color: #ffffff !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .bg-white { background-color: #ffffff !important; }
          .text-white { color: #ffffff !important; }
          .text-slate-900 { color: #0f172a !important; }
          .text-slate-800 { color: #1e293b !important; }
          .text-slate-700 { color: #334155 !important; }
          .text-slate-600 { color: #475569 !important; }
          .text-slate-500 { color: #64748b !important; }
          .text-slate-400 { color: #94a3b8 !important; }
          .text-blue-900 { color: #1e3a8a !important; }
          .text-emerald-700 { color: #047857 !important; }
          .font-black { font-weight: 900; }
          .font-extrabold { font-weight: 800; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .text-2xl { font-size: 24px; line-height: 32px; }
          .text-xl { font-size: 20px; line-height: 28px; }
          .text-lg { font-size: 18px; line-height: 28px; }
          .text-sm { font-size: 14px; line-height: 20px; }
          .text-xs { font-size: 12px; line-height: 16px; }
          .text-\\[10px\\] { font-size: 10px; line-height: 14px; }
          .uppercase { text-transform: uppercase; }
          .capitalize { text-transform: capitalize; }
          .italic { font-style: italic; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .inline-block { display: inline-block; }
          .shadow-sm, .shadow-md { box-shadow: none !important; }
        </style>
      </head>
      <body>
        <div id="print-root">
          ${clonedReceipt.innerHTML}
        </div>
      </body>
      </html>
    `);
    iframeDoc.close();

    // Trigger print safely after layout stabilization
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('[ReceiptPrint] Iframe print failed, calling direct print fallback:', err);
        directPrintReceipt(elementId);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 200);

    return true;
  } catch (error) {
    console.error('[ReceiptPrint] Exception in isolated print:', error);
    directPrintReceipt(elementId);
    return false;
  }
}

/**
 * Fallback direct print helper adding .printing-receipt class to body to scope @media print
 */
export function directPrintReceipt(elementId: string = 'receipt-print-area'): void {
  if (typeof document === 'undefined') return;

  const target = document.getElementById(elementId);
  if (!target) {
    window.print();
    return;
  }

  document.body.classList.add('printing-receipt');

  const cleanup = () => {
    document.body.classList.remove('printing-receipt');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();

  // Safety fallback in case afterprint does not fire
  setTimeout(cleanup, 2000);
}

