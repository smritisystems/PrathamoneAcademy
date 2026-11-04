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
 * @updated     2026-11-05
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
 * Supports A4 and A5 paper dimensions with automatic scaling.
 */
export function printReceiptElement(
  elementIdOrOptions: string | PrintReceiptOptions = 'receipt-print-area',
  defaultTitle: string = 'Official Fee Receipt - Prashant Academy'
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const options: PrintReceiptOptions =
    typeof elementIdOrOptions === 'string'
      ? { elementId: elementIdOrOptions, documentTitle: defaultTitle, paperSize: 'A4' }
      : { elementId: 'receipt-print-area', documentTitle: defaultTitle, paperSize: 'A4', ...elementIdOrOptions };

  const elementId = options.elementId || 'receipt-print-area';
  const title = options.documentTitle || defaultTitle;
  const paperSize = options.paperSize || 'A4';

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

    const pageSizeCss =
      paperSize === 'A5'
        ? `@page { size: A5 portrait; margin: 8mm 10mm; } #print-root { max-width: 130mm; padding: 12px 16px; font-size: 11px; }`
        : `@page { size: A4 portrait; margin: 10mm 14mm; } #print-root { max-width: 185mm; padding: 18px 24px; }`;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          ${pageSizeCss}
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
            margin: 0 auto;
            background: #ffffff;
            border: 2px solid #cbd5e1;
            border-radius: 12px;
            page-break-inside: avoid;
          }
          /* Tables */
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th, td { border: 1px solid #e2e8f0; padding: 6px 10px; font-size: 11px; text-align: left; }
          th { background-color: #f8fafc !important; font-weight: 700; color: #334155 !important; }
          .receipt-history-table th, .receipt-history-table td { border-color: #cbd5e1; }
          /* Typography & utilities */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .items-end { align-items: flex-end; }
          .justify-center { justify-content: center; }
          .justify-between { justify-content: space-between; }
          .justify-end { justify-content: flex-end; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
          .gap-1 { gap: 4px; }
          .gap-2 { gap: 8px; }
          .gap-3 { gap: 12px; }
          .gap-4 { gap: 16px; }
          .gap-6 { gap: 24px; }
          .space-y-1 > * + * { margin-top: 4px; }
          .space-y-2 > * + * { margin-top: 8px; }
          .space-y-3 > * + * { margin-top: 12px; }
          .space-y-4 > * + * { margin-top: 16px; }
          .w-12 { width: 48px; }
          .h-12 { height: 48px; }
          .w-16 { width: 64px; }
          .h-16 { height: 64px; }
          .w-40 { width: 160px; }
          .h-10 { height: 40px; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .mt-0\\.5 { margin-top: 2px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .mt-3 { margin-top: 12px; }
          .mt-4 { margin-top: 16px; }
          .mt-6 { margin-top: 24px; }
          .mt-8 { margin-top: 32px; }
          .p-2 { padding: 8px; }
          .p-3 { padding: 12px; }
          .p-4 { padding: 16px; }
          .p-6 { padding: 24px; }
          .p-8 { padding: 32px; }
          .pb-2 { padding-bottom: 8px; }
          .pb-4 { padding-bottom: 16px; }
          .pb-6 { padding-bottom: 24px; }
          .pt-2 { padding-top: 8px; }
          .pt-4 { padding-top: 16px; }
          .px-2 { padding-left: 8px; padding-right: 8px; }
          .px-3 { padding-left: 12px; padding-right: 12px; }
          .px-4 { padding-left: 16px; padding-right: 16px; }
          .px-6 { padding-left: 24px; padding-right: 24px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
          .py-2 { padding-top: 8px; padding-bottom: 8px; }
          .rounded-full { border-radius: 9999px; }
          .rounded-2xl { border-radius: 16px; }
          .rounded-xl { border-radius: 12px; }
          .rounded-lg { border-radius: 8px; }
          .border { border: 1px solid #e2e8f0; }
          .border-2 { border-width: 2px; }
          .border-b { border-bottom: 1px solid #e2e8f0; }
          .border-b-2 { border-bottom: 2px solid #2563eb; }
          .border-t { border-top: 1px solid #e2e8f0; }
          .border-blue-200 { border-color: #bfdbfe; }
          .border-blue-600 { border-color: #2563eb; }
          .border-slate-100 { border-color: #f1f5f9; }
          .border-slate-200 { border-color: #e2e8f0; }
          .border-slate-300 { border-color: #cbd5e1; }
          .border-gray-200 { border-color: #e5e7eb; }
          .border-gray-300 { border-color: #d1d5db; }
          .border-red-300 { border-color: #fca5a5; }
          .bg-blue-600 { background-color: #2563eb !important; color: #ffffff !important; }
          .bg-blue-700 { background-color: #1d4ed8 !important; color: #ffffff !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .bg-emerald-50 { background-color: #ecfdf5 !important; }
          .bg-red-50 { background-color: #fef2f2 !important; }
          .bg-white { background-color: #ffffff !important; }
          .text-white { color: #ffffff !important; }
          .text-slate-900 { color: #0f172a !important; }
          .text-slate-800 { color: #1e293b !important; }
          .text-slate-700 { color: #334155 !important; }
          .text-slate-600 { color: #475569 !important; }
          .text-slate-500 { color: #64748b !important; }
          .text-slate-400 { color: #94a3b8 !important; }
          .text-blue-900 { color: #1e3a8a !important; }
          .text-blue-700 { color: #1d4ed8 !important; }
          .text-blue-600 { color: #2563eb !important; }
          .text-blue-100 { color: #dbeafe !important; }
          .text-emerald-700 { color: #047857 !important; }
          .text-emerald-600 { color: #059669 !important; }
          .text-red-700 { color: #b91c1c !important; }
          .text-red-600 { color: #dc2626 !important; }
          .font-black { font-weight: 900; }
          .font-extrabold { font-weight: 800; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .text-4xl { font-size: 32px; line-height: 40px; }
          .text-3xl { font-size: 28px; line-height: 36px; }
          .text-2xl { font-size: 24px; line-height: 32px; }
          .text-xl { font-size: 20px; line-height: 28px; }
          .text-lg { font-size: 18px; line-height: 28px; }
          .text-sm { font-size: 14px; line-height: 20px; }
          .text-xs { font-size: 12px; line-height: 16px; }
          .text-\\[11px\\] { font-size: 11px; line-height: 15px; }
          .text-\\[10px\\] { font-size: 10px; line-height: 14px; }
          .uppercase { text-transform: uppercase; }
          .capitalize { text-transform: capitalize; }
          .italic { font-style: italic; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .inline-block { display: inline-block; }
          .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
          .tracking-wide { letter-spacing: 0.025em; }
          .tracking-wider { letter-spacing: 0.05em; }
          .print-hidden, .no-print { display: none !important; }
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

