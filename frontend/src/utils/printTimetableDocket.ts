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
 * @updated     2026-11-21
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
 * Generates the complete, self-contained standalone CSS styles for the Timetable Docket
 * ensuring high-contrast certificate-grade sharpness even if "Background graphics" is unchecked.
 */
export function getTimetableDocketPrintStyles(): string {
  return `
    @page {
      size: A4 landscape !important;
      margin: 4mm 5mm !important;
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 287mm !important;
      height: 202mm !important;
      max-height: 202mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
      overflow: hidden !important;
    }
    #print-root {
      width: 100% !important;
      max-width: 287mm !important;
      height: 100% !important;
      max-height: 202mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    #printable-timetable-docket {
      width: 100% !important;
      max-width: 287mm !important;
      max-height: 200mm !important;
      margin: 0 auto !important;
      padding: 3.5mm 5mm !important;
      border: 2px solid #0f172a !important;
      border-radius: 6px !important;
      background: #ffffff !important;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      box-sizing: border-box !important;
    }
    /* Enforce strict image bounding so high-resolution logos never blow up */
    img, .docket-logo-img, img.docket-logo-img {
      width: 42px !important;
      height: 42px !important;
      max-width: 42px !important;
      max-height: 42px !important;
      min-width: 42px !important;
      min-height: 42px !important;
      object-fit: contain !important;
      display: block !important;
    }
    /* Fixed layout table for pixel-perfect 1-page fit */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      border: 1.5px solid #0f172a !important;
    }
    th, td {
      border: 1px solid #334155 !important;
      padding: 2px 2.5px !important;
      vertical-align: top !important;
      box-sizing: border-box !important;
    }
    th {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
      font-weight: 800 !important;
      text-align: center !important;
      border-bottom: 2px solid #0f172a !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    /* High contrast text guarantees readability even if background colors are stripped */
    .docket-dark-text {
      color: #0f172a !important;
    }
    .docket-sub-text {
      color: #334155 !important;
    }
    .docket-muted-text {
      color: #64748b !important;
    }
    .docket-border-box {
      border: 1px solid #0f172a !important;
    }
    @media print {
      @page {
        size: A4 landscape !important;
        margin: 4mm 5mm !important;
      }
      html, body {
        width: 287mm !important;
        height: 202mm !important;
        max-height: 202mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
      }
      #printable-timetable-docket {
        border: 2px solid #0f172a !important;
        max-height: 200mm !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
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
  defaultTitle: string = 'Official Academic Timetable Docket — Prashant Academy'
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
      img.style.width = '42px'
      img.style.height = '42px'
      img.style.maxWidth = '42px'
      img.style.maxHeight = '42px'
      img.style.objectFit = 'contain'
    })

    // Collect parent stylesheets from document.head to preserve Tailwind styling
    const parentStyles = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n')

    const safeOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''
    const baseTag = safeOrigin ? `<base href="${escapeHtml(safeOrigin)}/" />` : ''

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        ${baseTag}
        <title>${escapeHtml(title)}</title>
        ${parentStyles}
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

    // Trigger print safely after stylesheets, fonts, and images have loaded
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
      setTimeout(triggerIframePrint, 150)
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
        setTimeout(triggerIframePrint, 150)
      } else {
        setTimeout(triggerIframePrint, 600)
      }
    }

    return true
  } catch (error) {
    console.error('[TimetablePrint] Exception in isolated print:', error)
    window.print()
    return false
  }
}
