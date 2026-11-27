/**
 * @file        printTimetableDocket.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-21
 * @updated     2026-11-27
 *
 * @description Isolated institutional timetable docket printing utility guaranteeing single-sheet A4 landscape fit.
 */

import { escapeHtml, sanitizeDomSubtree } from './htmlSanitizer'

export interface PrintTimetableDocketOptions {
  elementId?: string
  documentTitle?: string
  onAfterPrint?: () => void
}

/**
 * Returns complete, self-contained, high-contrast certificate-grade CSS styles.
 * 100% immune to external stylesheet delays and guaranteed to fit on 1 A4 Landscape sheet.
 */
export function getTimetableDocketPrintStyles(): string {
  return `
    @page {
      size: landscape !important;
      margin: 4mm 6mm !important;
    }
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 285mm !important;
      height: 200mm !important;
      max-height: 200mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0b1e36 !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
      overflow: hidden !important;
    }
    #print-root {
      width: 285mm !important;
      max-width: 285mm !important;
      height: 198mm !important;
      max-height: 198mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    /* Master Certificate Frame */
    .tt-cert-frame {
      width: 100% !important;
      max-width: 285mm !important;
      height: 195mm !important;
      max-height: 195mm !important;
      background: #ffffff !important;
      border: 2.5px solid #0b1e36 !important;
      outline: 1.5px solid #d4af37 !important;
      outline-offset: -3.5px !important;
      border-radius: 4px !important;
      padding: 3.5mm 5mm !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box !important;
      position: relative !important;
    }
    /* Top Gold Foil Bar */
    .tt-gold-bar {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 3px !important;
      background: linear-gradient(90deg, #b45309, #f59e0b, #d4af37, #f59e0b, #b45309) !important;
    }
    /* Header Section */
    .tt-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      border-bottom: 1.5px solid #0b1e36 !important;
      padding-bottom: 1.5mm !important;
      margin-top: 1mm !important;
    }
    .tt-header-left {
      display: flex !important;
      align-items: center !important;
      gap: 3.5mm !important;
    }
    .tt-logo-box {
      width: 38px !important;
      height: 38px !important;
      min-width: 38px !important;
      min-height: 38px !important;
      max-width: 38px !important;
      max-height: 38px !important;
      border: 1.5px solid #d4af37 !important;
      border-radius: 4px !important;
      background: #0b1e36 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow: hidden !important;
      padding: 1.5px !important;
    }
    .tt-logo-img {
      width: 34px !important;
      height: 34px !important;
      max-width: 34px !important;
      max-height: 34px !important;
      object-fit: contain !important;
      display: block !important;
    }
    .tt-brand-info {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.5px !important;
    }
    .tt-inst-title {
      font-size: 15px !important;
      font-weight: 900 !important;
      color: #0b1e36 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      line-height: 1.1 !important;
    }
    .tt-inst-tagline {
      font-size: 8.5px !important;
      font-weight: 700 !important;
      color: #b45309 !important;
      font-style: italic !important;
      letter-spacing: 0.5px !important;
    }
    .tt-inst-contact {
      font-size: 7.5px !important;
      font-weight: 500 !important;
      color: #475569 !important;
      margin-top: 0.5px !important;
    }
    .tt-inst-reg {
      font-size: 7px !important;
      font-weight: 700 !important;
      color: #64748b !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
    }
    /* Header Right Badge */
    .tt-header-right {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 1.5px !important;
    }
    .tt-ribbon-badge {
      background: #0b1e36 !important;
      color: #fef3c7 !important;
      border: 1px solid #d4af37 !important;
      font-size: 8px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.8px !important;
      padding: 1.5px 6px !important;
      border-radius: 2px !important;
    }
    .tt-ay-badge {
      font-size: 8.5px !important;
      font-family: monospace !important;
      font-weight: 800 !important;
      color: #0b1e36 !important;
    }
    .tt-docket-badge {
      font-size: 7.5px !important;
      font-family: monospace !important;
      color: #64748b !important;
    }
    .tt-verified-badge {
      background: #ecfdf5 !important;
      color: #065f46 !important;
      border: 0.5px solid #a7f3d0 !important;
      font-size: 7px !important;
      font-weight: 800 !important;
      padding: 0.5px 5px !important;
      border-radius: 2px !important;
    }
    /* Telemetry Strip */
    .tt-kpi-bar {
      display: flex !important;
      gap: 2.5mm !important;
      margin: 1.5mm 0 !important;
    }
    .tt-kpi-box {
      flex: 1 1 0% !important;
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      border-left: 2.5px solid #0b1e36 !important;
      border-radius: 3px !important;
      padding: 1.5px 5px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
    }
    .tt-kpi-lbl {
      font-size: 6.5px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      color: #64748b !important;
      letter-spacing: 0.3px !important;
    }
    .tt-kpi-val {
      font-size: 9.5px !important;
      font-weight: 900 !important;
      color: #0b1e36 !important;
      line-height: 1.15 !important;
    }
    .tt-kpi-sub {
      font-size: 6.5px !important;
      color: #64748b !important;
      font-weight: 500 !important;
    }
    /* Master Grid Table */
    .tt-table-wrap {
      width: 100% !important;
      border: 1.5px solid #0b1e36 !important;
      border-radius: 3px !important;
      overflow: hidden !important;
    }
    .tt-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
    }
    .tt-th-day {
      width: 65px !important;
      background: #0b1e36 !important;
      color: #fef3c7 !important;
      font-size: 8px !important;
      font-weight: 900 !important;
      text-align: center !important;
      padding: 2px 3px !important;
      border-right: 1px solid #1e3a5f !important;
      border-bottom: 1.5px solid #d4af37 !important;
      letter-spacing: 0.5px !important;
    }
    .tt-th-period {
      background: #0b1e36 !important;
      color: #ffffff !important;
      text-align: center !important;
      padding: 2px 2px !important;
      border-right: 1px solid #1e3a5f !important;
      border-bottom: 1.5px solid #d4af37 !important;
    }
    .tt-th-period-title {
      font-size: 8.5px !important;
      font-weight: 800 !important;
      color: #ffffff !important;
    }
    .tt-th-period-time {
      font-size: 7px !important;
      font-family: monospace !important;
      color: #fde68a !important;
      font-weight: 600 !important;
      margin-top: 0.5px !important;
    }
    /* Table Rows */
    .tt-row {
      border-bottom: 1px solid #cbd5e1 !important;
      height: 15.5mm !important;
      max-height: 15.5mm !important;
    }
    .tt-td-day {
      background: #f1f5f9 !important;
      border-right: 1px solid #cbd5e1 !important;
      padding: 2px 4px !important;
      vertical-align: middle !important;
    }
    .tt-day-content {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
    }
    .tt-day-title {
      font-size: 9px !important;
      font-weight: 900 !important;
      color: #0b1e36 !important;
    }
    .tt-day-count {
      font-size: 7px !important;
      font-weight: 800 !important;
      padding: 0.5px 3.5px !important;
      border-radius: 8px !important;
      background: #dbeafe !important;
      color: #1e40af !important;
      border: 0.5px solid #93c5fd !important;
    }
    .tt-day-stream {
      font-size: 6.5px !important;
      font-weight: 700 !important;
      color: #94a3b8 !important;
      text-transform: uppercase !important;
      margin-top: 1px !important;
    }
    .tt-td-cell {
      padding: 1.5px 2px !important;
      border-right: 1px solid #e2e8f0 !important;
      vertical-align: top !important;
      height: 15.5mm !important;
    }
    /* Session Card */
    .tt-card {
      height: 100% !important;
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 2.5px !important;
      padding: 1.5px 3px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      box-shadow: 0 0.5px 1px rgba(0,0,0,0.04) !important;
    }
    .tt-card-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 2px !important;
    }
    .tt-card-subname {
      font-size: 8.5px !important;
      font-weight: 900 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 75px !important;
    }
    .tt-card-code {
      font-size: 6.5px !important;
      font-weight: 800 !important;
      padding: 0.5px 2.5px !important;
      border-radius: 2px !important;
      border: 0.5px solid #cbd5e1 !important;
      white-space: nowrap !important;
    }
    .tt-card-div {
      font-size: 7.5px !important;
      font-weight: 800 !important;
      color: #1e3a8a !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .tt-card-teacher {
      font-size: 7px !important;
      font-weight: 600 !important;
      color: #334155 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .tt-card-footer {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-top: 0.5px solid #f1f5f9 !important;
      padding-top: 1px !important;
    }
    .tt-card-room {
      font-size: 6.5px !important;
      font-weight: 800 !important;
      background: #f8fafc !important;
      color: #0b1e36 !important;
      border: 0.5px solid #cbd5e1 !important;
      padding: 0.5px 2.5px !important;
      border-radius: 2px !important;
    }
    .tt-card-time {
      font-size: 6.5px !important;
      font-family: monospace !important;
      color: #64748b !important;
      font-weight: 600 !important;
    }
    /* Empty Card */
    .tt-empty-card {
      height: 100% !important;
      border: 0.5px dashed #cbd5e1 !important;
      background: #fafafa !important;
      border-radius: 2.5px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .tt-empty-text {
      font-size: 7px !important;
      font-style: italic !important;
      color: #94a3b8 !important;
    }
    /* Signatures */
    .tt-signatures {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-end !important;
      border-top: 1.5px solid #cbd5e1 !important;
      padding-top: 2mm !important;
      margin-top: 1mm !important;
    }
    .tt-sig-col {
      width: 22% !important;
      text-align: center !important;
    }
    .tt-sig-line {
      width: 75% !important;
      height: 7mm !important;
      border-bottom: 1px solid #0b1e36 !important;
      margin: 0 auto 1.5px !important;
    }
    .tt-sig-name {
      font-size: 8px !important;
      font-weight: 800 !important;
      color: #0b1e36 !important;
    }
    .tt-sig-role {
      font-size: 6.5px !important;
      color: #64748b !important;
      font-weight: 600 !important;
    }
    /* Official Stamp */
    .tt-seal-col {
      width: 22% !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    .tt-seal-circle {
      width: 38px !important;
      height: 38px !important;
      border: 1.5px dashed #0b1e36 !important;
      border-radius: 50% !important;
      background: #f8fafc !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 1px !important;
    }
    .tt-seal-top {
      font-size: 5px !important;
      font-weight: 900 !important;
      color: #0b1e36 !important;
      text-transform: uppercase !important;
    }
    .tt-seal-stars {
      font-size: 6.5px !important;
      color: #d4af37 !important;
      line-height: 1 !important;
      margin: 0.5px 0 !important;
    }
    .tt-seal-bot {
      font-size: 4.5px !important;
      font-weight: 800 !important;
      color: #0b1e36 !important;
      text-transform: uppercase !important;
    }
    .tt-seal-sub {
      font-size: 6px !important;
      font-family: monospace !important;
      color: #64748b !important;
      margin-top: 1px !important;
    }
    /* Footer */
    .tt-footer {
      border-top: 0.5px solid #e2e8f0 !important;
      padding-top: 1mm !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-size: 6.5px !important;
      color: #64748b !important;
    }
    .tt-footer-left {
      display: flex !important;
      align-items: center !important;
      gap: 3px !important;
    }
    .tt-footer-right {
      font-family: monospace !important;
    }
    .no-print, .print-hidden, button, [role="button"] {
      display: none !important;
    }
  `
}

/**
 * Prints the target timetable docket inside an isolated iframe sized to A4 landscape (297mm x 210mm).
 * Guarantees that the output prints on EXACTLY ONE sheet of A4 paper.
 */
export function printTimetableDocketElement(
  elementIdOrOptions: string | PrintTimetableDocketOptions = 'printable-timetable-docket',
  defaultTitle: string = 'Official Academic Timetable Docket'
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  const options: PrintTimetableDocketOptions =
    typeof elementIdOrOptions === 'string'
      ? { elementId: elementIdOrOptions, documentTitle: defaultTitle }
      : { elementId: 'printable-timetable-docket', documentTitle: defaultTitle, ...elementIdOrOptions }

  const elementId = options.elementId || 'printable-timetable-docket'
  const title = options.documentTitle || defaultTitle

  const docketEl = document.getElementById(elementId)
  if (!docketEl) {
    console.warn(`[TimetablePrint] Element #${elementId} not found, falling back to window.print()`)
    window.print()
    return false
  }

  try {
    // Remove existing print iframe if any
    const existingIframe = document.getElementById('timetable-isolated-print-frame')
    if (existingIframe && existingIframe.parentNode) {
      existingIframe.parentNode.removeChild(existingIframe)
    }

    // Create an isolated hidden iframe sized to physical A4 Landscape sheet (297mm x 210mm)
    const iframe = document.createElement('iframe')
    iframe.id = 'timetable-isolated-print-frame'
    iframe.style.position = 'fixed'
    iframe.style.left = '-10000px'
    iframe.style.top = '0'
    iframe.style.width = '297mm'
    iframe.style.height = '210mm'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.visibility = 'hidden'
    iframe.style.pointerEvents = 'none'
    iframe.setAttribute('aria-hidden', 'true')

    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) {
      console.warn('[TimetablePrint] Could not acquire iframe document; falling back to window.print().')
      window.print()
      return false
    }

    // Clone docket contents
    const clonedDocket = docketEl.cloneNode(true) as HTMLElement

    // Remove any interactive print actions / buttons inside cloned container
    clonedDocket.querySelectorAll('.print\\:hidden, button, [role="button"], .no-print').forEach((el) => {
      el.parentNode?.removeChild(el)
    })
    sanitizeDomSubtree(clonedDocket)

    // Ensure all images in cloned docket have strict inline constraints
    clonedDocket.querySelectorAll('img').forEach((img) => {
      img.style.width = '34px'
      img.style.height = '34px'
      img.style.maxWidth = '34px'
      img.style.maxHeight = '34px'
      img.style.objectFit = 'contain'
    })

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          ${getTimetableDocketPrintStyles()}
        </style>
      </head>
      <body>
        <div id="print-root">
          ${clonedDocket.outerHTML}
        </div>
      </body>
      </html>
    `)
    iframeDoc.close()

    // Trigger print safely after stylesheets and images have loaded
    const triggerIframePrint = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (err) {
        console.error('[TimetablePrint] Iframe print failed, calling window.print() fallback:', err)
        window.print()
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
          }
          if (options.onAfterPrint) {
            options.onAfterPrint()
          }
        }, 2500)
      }
    }

    // Wait for images to load before printing
    const images = iframeDoc.getElementsByTagName('img')
    let loadedCount = 0
    const totalImages = images.length

    if (totalImages === 0) {
      setTimeout(triggerIframePrint, 250)
    } else {
      const checkAndPrint = () => {
        loadedCount++
        if (loadedCount >= totalImages) {
          triggerIframePrint()
        }
      }

      for (let i = 0; i < totalImages; i++) {
        const img = images[i]
        if (img.complete) {
          loadedCount++
        } else {
          img.onload = checkAndPrint
          img.onerror = checkAndPrint
        }
      }

      if (loadedCount >= totalImages) {
        setTimeout(triggerIframePrint, 250)
      } else {
        setTimeout(triggerIframePrint, 800)
      }
    }

    return true
  } catch (error) {
    console.error('[TimetablePrint] Exception in isolated print:', error)
    window.print()
    return false
  }
}
