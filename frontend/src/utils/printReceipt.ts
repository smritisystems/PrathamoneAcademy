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
 * @version     2.0.0
 * @created     2026-11-04
 * @updated     2026-11-10
 *
 * @description Isolated receipt printing utility for high-fidelity A5 portrait voucher generation.
 */

export interface PrintReceiptOptions {
  elementId?: string;
  documentTitle?: string;
  documentId?: string;
  classification?: string;
  paperSize?: 'A5' | 'A4' | 'auto';
  onAfterPrint?: () => void;
}

/**
 * Prints the target receipt element inside an isolated sandbox iframe
 * preventing any outer application UI, backdrop modals, buttons, or navigation from printing.
 * Supports A5 portrait (standard) and A4 paper dimensions with full color & layout parity.
 */
export function printReceiptElement(
  elementIdOrOptions: string | PrintReceiptOptions = 'receipt-print-area',
  defaultTitle: string = 'Official Fee Receipt - PrathamOne EduOS'
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const options: PrintReceiptOptions =
    typeof elementIdOrOptions === 'string'
      ? { elementId: elementIdOrOptions, documentTitle: defaultTitle, paperSize: 'A5' }
      : { elementId: 'receipt-print-area', documentTitle: defaultTitle, paperSize: 'A5', ...elementIdOrOptions };

  const elementId = options.elementId || 'receipt-print-area';
  const title = options.documentTitle || defaultTitle;
  const paperSize = options.paperSize || 'A5';

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

    // Remove any interactive print actions / buttons inside cloned container
    clonedReceipt.querySelectorAll('.print\\:hidden, button, [role="button"]').forEach((el) => {
      el.parentNode?.removeChild(el);
    });

    // Collect parent stylesheets and Tailwind styles to ensure styling parity
    const parentStyles = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    // Exact A5 portrait (148 x 210mm) and A4 portrait dimensions
    const pageSizeCss =
      paperSize === 'A5'
        ? `@page { size: A5 portrait; margin: 6mm 8mm; } #print-root { width: 100%; max-width: 136mm; padding: 0; font-size: 10px; margin: 0 auto; border: none; }`
        : `@page { size: A4 portrait; margin: 8mm 10mm; } #print-root { width: 100%; max-width: 185mm; padding: 0; font-size: 11px; margin: 0 auto; border: none; }`;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        ${parentStyles}
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
            border: none;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            #print-root {
              box-shadow: none !important;
              border: none !important;
              padding: 0 0 16mm 0 !important;
              overflow: visible !important;
              box-sizing: border-box !important;
            }
          }

          /* Global Print & Share Branding & Canonical Footer */
          .pratham-print-footer-spacer {
            display: block !important;
            height: 16mm !important;
            width: 100% !important;
          }
          .pratham-global-print-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            z-index: 9999 !important;
            margin: 0 !important;
            padding-top: 4px !important;
            padding-bottom: 2mm !important;
            border-top: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            visibility: visible !important;
            display: block !important;
          }
          [data-testid="print-footer-row-1"] {
            display: flex !important;
            justify-content: flex-end !important;
            text-align: right !important;
            color: #475569 !important;
            font-size: 8pt !important;
            font-family: 'Inter', -apple-system, sans-serif !important;
          }
          [data-testid="print-footer-row-2"] {
            display: block !important;
            text-align: center !important;
            color: #94a3b8 !important;
            font-size: 6.5pt !important;
            font-family: 'Inter', -apple-system, sans-serif !important;
            letter-spacing: 0.015em !important;
            margin-top: 2px !important;
          }
          .print-branding-footer {
            display: block !important;
            visibility: visible !important;
            text-align: center !important;
            margin-top: 8px !important;
            padding-top: 6px !important;
          }
          .print-branding-footer p {
            font-size: 8pt !important;
            color: #64748b !important;
            font-weight: 300 !important;
            letter-spacing: 0.025em !important;
            margin: 0 !important;
          }

          /* Currency and Indian Rupee Glyph Protection */
          .tabular-nums { font-variant-numeric: tabular-nums !important; }
          .tracking-tight { letter-spacing: -0.01em !important; }
          .tracking-normal { letter-spacing: 0 !important; }
          .currency-inr, [data-currency="inr"], .receipt-amount {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-variant-numeric: tabular-nums !important;
            white-space: nowrap !important;
            letter-spacing: 0.01em !important;
          }

          /* Comprehensive Layout & Utility Rules for Reliable Standalone Print */
          .flex { display: flex !important; }
          .inline-flex { display: inline-flex !important; }
          .flex-col { flex-direction: column !important; }
          .flex-wrap { flex-wrap: wrap !important; }
          .items-center { align-items: center !important; }
          .items-start { align-items: flex-start !important; }
          .items-end { align-items: flex-end !important; }
          .items-stretch { align-items: stretch !important; }
          .justify-center { justify-content: center !important; }
          .justify-between { justify-content: space-between !important; }
          .justify-end { justify-content: flex-end !important; }
          .shrink-0 { flex-shrink: 0 !important; }
          .flex-1 { flex: 1 1 0% !important; }
          .min-w-0 { min-width: 0 !important; }

          /* 12-Column and Standard Grid Utilities */
          .grid { display: grid !important; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
          .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
          .col-span-4 { grid-column: span 4 / span 4 !important; }
          .col-span-5 { grid-column: span 5 / span 5 !important; }
          .col-span-7 { grid-column: span 7 / span 7 !important; }
          .col-span-8 { grid-column: span 8 / span 8 !important; }
          .col-span-12 { grid-column: span 12 / span 12 !important; }

          /* Divide Utilities */
          .divide-x > * + * { border-left-width: 1px !important; }
          .divide-y > * + * { border-top-width: 1px !important; }
          .divide-slate-100 > * + * { border-color: #f1f5f9 !important; }
          .divide-slate-200 > * + * { border-color: #e2e8f0 !important; }

          /* Spacing & Gap */
          .gap-0\\.5 { gap: 2px !important; }
          .gap-1 { gap: 4px !important; }
          .gap-1\\.5 { gap: 6px !important; }
          .gap-2 { gap: 8px !important; }
          .gap-2\\.5 { gap: 10px !important; }
          .gap-3 { gap: 12px !important; }
          .gap-4 { gap: 16px !important; }
          .gap-x-3 { column-gap: 12px !important; }
          .gap-y-0\\.5 { row-gap: 2px !important; }

          /* Margins & Paddings */
          .p-0 { padding: 0 !important; }
          .p-1 { padding: 4px !important; }
          .p-2 { padding: 8px !important; }
          .p-2\\.5 { padding: 10px !important; }
          .p-3 { padding: 12px !important; }
          .p-4 { padding: 16px !important; }
          .py-0\\.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
          .py-1\\.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
          .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
          .px-1 { padding-left: 4px !important; padding-right: 4px !important; }
          .px-2 { padding-left: 8px !important; padding-right: 8px !important; }
          .px-2\\.5 { padding-left: 10px !important; padding-right: 10px !important; }
          .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
          .px-4 { padding-left: 16px !important; padding-right: 16px !important; }
          .pt-3 { padding-top: 12px !important; }
          .pb-1 { padding-bottom: 4px !important; }
          .pb-3 { padding-bottom: 12px !important; }
          .pl-3 { padding-left: 12px !important; }
          .pr-6 { padding-right: 24px !important; }
          .my-1 { margin-top: 4px !important; margin-bottom: 4px !important; }
          .my-2 { margin-top: 8px !important; margin-bottom: 8px !important; }
          .my-2\\.5 { margin-top: 10px !important; margin-bottom: 10px !important; }
          .mt-0\\.5 { margin-top: 2px !important; }
          .mt-1 { margin-top: 4px !important; }
          .mt-2 { margin-top: 8px !important; }
          .mt-3 { margin-top: 12px !important; }
          .mb-0\\.5 { margin-bottom: 2px !important; }
          .mb-3 { margin-bottom: 12px !important; }
          .mr-2 { margin-right: 8px !important; }
          .mx-1\\.5 { margin-left: 6px !important; margin-right: 6px !important; }
          .-ml-4 { margin-left: -16px !important; }
          .pl-6 { padding-left: 24px !important; }

          /* Dimensions */
          .w-3 { width: 12px !important; }
          .h-3 { height: 12px !important; }
          .w-3\\.5 { width: 14px !important; }
          .h-3\\.5 { height: 14px !important; }
          .w-4 { width: 16px !important; }
          .h-4 { height: 16px !important; }
          .w-5 { width: 20px !important; }
          .h-5 { height: 20px !important; }
          .w-6 { width: 24px !important; }
          .h-6 { height: 24px !important; }
          .w-10 { width: 40px !important; }
          .h-10 { height: 40px !important; }
          .w-12 { width: 48px !important; }
          .h-12 { height: 48px !important; }
          .w-20 { width: 80px !important; }
          .h-20 { height: 80px !important; }
          .w-28 { width: 112px !important; }
          .h-28 { height: 112px !important; }
          .w-full { width: 100% !important; }
          .h-full { height: 100% !important; }

          /* Borders & Radii */
          .border { border: 1px solid #e2e8f0 !important; }
          .border-2 { border-width: 2px !important; }
          .border-t { border-top: 1px solid #e2e8f0 !important; }
          .border-b { border-bottom: 1px solid #e2e8f0 !important; }
          .border-l { border-left: 1px solid #e2e8f0 !important; }
          .border-slate-100 { border-color: #f1f5f9 !important; }
          .border-slate-200 { border-color: #e2e8f0 !important; }
          .border-slate-300 { border-color: #cbd5e1 !important; }
          .border-blue-100 { border-color: #dbeafe !important; }
          .border-blue-200 { border-color: #bfdbfe !important; }
          .border-emerald-200\\/60 { border-color: rgba(167, 243, 208, 0.6) !important; }
          .border-emerald-500 { border-color: #10b981 !important; }
          .border-rose-200\\/60 { border-color: rgba(254, 205, 211, 0.6) !important; }
          .border-red-300 { border-color: #fca5a5 !important; }
          .border-red-500 { border-color: #ef4444 !important; }
          .rounded-md { border-radius: 6px !important; }
          .rounded-lg { border-radius: 8px !important; }
          .rounded-xl { border-radius: 12px !important; }
          .rounded-2xl { border-radius: 16px !important; }
          .rounded-full { border-radius: 9999px !important; }
          .rounded-t-xl { border-top-left-radius: 12px !important; border-top-right-radius: 12px !important; }
          .rounded-b-xl { border-bottom-left-radius: 12px !important; border-bottom-right-radius: 12px !important; }
          .rounded-tr-xl { border-top-right-radius: 12px !important; }

          /* Color Fills & Backgrounds */
          .bg-white { background-color: #ffffff !important; }
          .bg-\\[\\#0b2b5c\\] { background-color: #0b2b5c !important; color: #ffffff !important; }
          .bg-\\[\\#dbeafe\\] { background-color: #dbeafe !important; }
          .bg-\\[\\#0256b9\\] { background-color: #0256b9 !important; color: #ffffff !important; }
          .bg-\\[\\#eff6ff\\] { background-color: #eff6ff !important; }
          .bg-primary-50 { background-color: #eff6ff !important; }
          .bg-primary-50\\/40 { background-color: rgba(239, 246, 255, 0.4) !important; }
          .bg-emerald-50 { background-color: #ecfdf5 !important; }
          .bg-emerald-50\\/90 { background-color: rgba(236, 253, 245, 0.9) !important; }
          .bg-emerald-600 { background-color: #059669 !important; }
          .bg-rose-50 { background-color: #fff1f2 !important; }
          .bg-red-50 { background-color: #fef2f2 !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .bg-slate-300 { background-color: #cbd5e1 !important; }

          /* Typography */
          .text-white { color: #ffffff !important; }
          .text-\\[\\#0b2b5c\\] { color: #0b2b5c !important; }
          .text-slate-900 { color: #0f172a !important; }
          .text-slate-800 { color: #1e293b !important; }
          .text-slate-700 { color: #334155 !important; }
          .text-slate-600 { color: #475569 !important; }
          .text-slate-500 { color: #64748b !important; }
          .text-slate-400 { color: #94a3b8 !important; }
          .text-slate-300 { color: #cbd5e1 !important; }
          .text-primary-600 { color: #2563eb !important; }
          .text-primary-700 { color: #1d4ed8 !important; }
          .text-primary-800 { color: #1e40af !important; }
          .text-blue-950 { color: #172554 !important; }
          .text-sky-600 { color: #0284c7 !important; }
          .text-emerald-600 { color: #059669 !important; }
          .text-emerald-700 { color: #047857 !important; }
          .text-emerald-950 { color: #022c22 !important; }
          .text-rose-700 { color: #be123c !important; }
          .text-rose-950 { color: #4c0519 !important; }
          .text-red-600 { color: #dc2626 !important; }
          .text-red-700 { color: #b91c1c !important; }
          .text-red-800 { color: #991b1b !important; }

          .font-normal { font-weight: 400 !important; }
          .font-medium { font-weight: 500 !important; }
          .font-semibold { font-weight: 600 !important; }
          .font-bold { font-weight: 700 !important; }
          .font-extrabold { font-weight: 800 !important; }
          .font-black { font-weight: 900 !important; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }

          .text-\\[8\\.5px\\] { font-size: 8.5px !important; line-height: 11px !important; }
          .text-\\[9px\\] { font-size: 9px !important; line-height: 12px !important; }
          .text-\\[9\\.5px\\] { font-size: 9.5px !important; line-height: 13px !important; }
          .text-\\[10px\\] { font-size: 10px !important; line-height: 14px !important; }
          .text-\\[10\\.5px\\] { font-size: 10.5px !important; line-height: 14px !important; }
          .text-\\[11px\\] { font-size: 11px !important; line-height: 15px !important; }
          .text-xs { font-size: 12px !important; line-height: 16px !important; }
          .text-sm { font-size: 14px !important; line-height: 20px !important; }
          .text-base { font-size: 16px !important; line-height: 24px !important; }
          .text-xl { font-size: 20px !important; line-height: 26px !important; }
          .text-2xl { font-size: 24px !important; line-height: 30px !important; }
          .text-3xl { font-size: 28px !important; line-height: 34px !important; }

          .uppercase { text-transform: uppercase !important; }
          .capitalize { text-transform: capitalize !important; }
          .italic { font-style: italic !important; }
          .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
          .whitespace-nowrap { white-space: nowrap !important; }
          .leading-none { line-height: 1 !important; }
          .leading-tight { line-height: 1.25 !important; }
          .tracking-tight { letter-spacing: -0.025em !important; }
          .tracking-wide { letter-spacing: 0.025em !important; }
          .tracking-wider { letter-spacing: 0.05em !important; }
          .text-center { text-align: center !important; }
          .text-left { text-align: left !important; }
          .text-right { text-align: right !important; }

          /* Tables */
          table, .receipt-history-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            padding: 4px 8px !important;
            font-size: 10px !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Page Break Controls */
          header, .receipt-header, footer, .receipt-footer, .banner-ribbon {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Positioning & Overflows */
          .relative { position: relative !important; }
          .absolute { position: absolute !important; }
          .overflow-hidden { overflow: hidden !important; }
          .z-10 { z-index: 10 !important; }
          .z-0 { z-index: 0 !important; }
          .shadow-xs, .shadow-2xs, .shadow-sm, .shadow-md { box-shadow: none !important; }

          .print-hidden, .no-print, button {
            display: none !important;
          }
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

    // Trigger print safely after stylesheets, fonts, and images have loaded
    const triggerIframePrint = () => {
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
        }, 2000);
      }
    };

    // If iframe window is ready, wait for images or fallback to timeout
    const images = iframeDoc.getElementsByTagName('img');
    let loadedCount = 0;
    const totalImages = images.length;

    if (totalImages === 0) {
      setTimeout(triggerIframePrint, 150);
    } else {
      const checkAndPrint = () => {
        loadedCount++;
        if (loadedCount >= totalImages) {
          triggerIframePrint();
        }
      };

      for (let i = 0; i < totalImages; i++) {
        const img = images[i];
        if (img.complete) {
          loadedCount++;
        } else {
          img.onload = checkAndPrint;
          img.onerror = checkAndPrint;
        }
      }

      if (loadedCount >= totalImages) {
        setTimeout(triggerIframePrint, 150);
      } else {
        // Safety timeout so print never hangs
        setTimeout(triggerIframePrint, 600);
      }
    }

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
