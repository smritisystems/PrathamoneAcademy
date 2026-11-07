/**
 * @file        printLayoutEngine.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.services
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-07
 * @updated     2026-11-07
 *
 * @description Intelligent scaling, physical dimension translation, readability protection, and print execution service.
 */

import type {
  PrintSettings,
  PrintLayoutCalculation,
  MarginsInMm,
} from '../types/printing'
import { PAPER_DIMENSIONS, MARGIN_PRESETS } from '../config/printPresets'

/**
 * Standard CSS resolution conversion factor (96 DPI / 25.4 mm per inch)
 */
export const MM_TO_PX = 96 / 25.4 // ≈ 3.7795275591 px/mm
export const PX_TO_MM = 25.4 / 96 // ≈ 0.2645833333 mm/px

export function mmToPx(mm: number): number {
  return Math.round(mm * MM_TO_PX * 100) / 100
}

export function pxToMm(px: number): number {
  return Math.round(px * PX_TO_MM * 100) / 100
}

/**
 * Resolves paper dimensions in millimeters taking into account orientation and custom sizes.
 */
export function resolvePaperDimensionsMm(
  settings: PrintSettings,
  contentAspect: number = 1.0
): { width: number; height: number; isContinuous: boolean } {
  let baseWidth: number
  let baseHeight: number
  let isContinuous = false

  if (settings.paperSize === 'Custom' && settings.customDimensions) {
    baseWidth = Math.max(10, settings.customDimensions.width)
    baseHeight = Math.max(10, settings.customDimensions.height)
  } else {
    const paper = PAPER_DIMENSIONS[settings.paperSize] || PAPER_DIMENSIONS.A4
    baseWidth = paper.width
    baseHeight = paper.height
    isContinuous = Boolean(paper.isContinuousRoll)
  }

  // Determine effective orientation
  let effectiveOrientation = settings.orientation
  if (effectiveOrientation === 'auto') {
    effectiveOrientation = contentAspect > 1.05 ? 'landscape' : 'portrait'
  }

  if (isContinuous) {
    // Continuous roll paper (e.g. thermal POS): width is fixed, height is flexible
    return { width: baseWidth, height: baseHeight, isContinuous: true }
  }

  if (effectiveOrientation === 'landscape') {
    return {
      width: Math.max(baseWidth, baseHeight),
      height: Math.min(baseWidth, baseHeight),
      isContinuous: false,
    }
  }

  return {
    width: Math.min(baseWidth, baseHeight),
    height: Math.max(baseWidth, baseHeight),
    isContinuous: false,
  }
}

/**
 * Resolves effective margins in millimeters.
 */
export function resolveMarginsMm(settings: PrintSettings): MarginsInMm {
  if (settings.marginPreset === 'custom' && settings.customMargins) {
    return { ...settings.customMargins }
  }

  // For A5 with normal preset, use 10mm instead of 15mm for optimal text area
  if (settings.paperSize === 'A5' && settings.marginPreset === 'normal') {
    return { top: 10, right: 10, bottom: 10, left: 10 }
  }

  // For thermal rolls, enforce minimum side margins
  if (settings.paperSize === 'Receipt80' || settings.paperSize === 'Receipt58') {
    return { top: 4, right: 3, bottom: 4, left: 3 }
  }

  // For CR80 ID cards, margin is 0mm (borderless)
  if (settings.paperSize === 'CR80') {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }

  return MARGIN_PRESETS[settings.marginPreset] || MARGIN_PRESETS.normal
}

/**
 * Calculates complete layout metrics, scale factor, readability warnings, and page counts.
 */
export function calculatePrintLayout(
  contentDimensionsPx: { width: number; height: number },
  settings: PrintSettings
): PrintLayoutCalculation {
  const contentWidth = Math.max(1, contentDimensionsPx.width)
  const contentHeight = Math.max(1, contentDimensionsPx.height)
  const contentAspect = contentWidth / contentHeight

  // 1. Resolve Paper Dimensions & Margins
  const pageDimMm = resolvePaperDimensionsMm(settings, contentAspect)
  const marginsMm = resolveMarginsMm(settings)

  const printableWidthMm = Math.max(1, pageDimMm.width - marginsMm.left - marginsMm.right)
  const printableHeightMm = Math.max(1, pageDimMm.height - marginsMm.top - marginsMm.bottom)

  const pageDimensionsPx = {
    width: mmToPx(pageDimMm.width),
    height: mmToPx(pageDimMm.height),
  }

  const marginsPx = {
    top: mmToPx(marginsMm.top),
    right: mmToPx(marginsMm.right),
    bottom: mmToPx(marginsMm.bottom),
    left: mmToPx(marginsMm.left),
  }

  const printableAreaPx = {
    width: mmToPx(printableWidthMm),
    height: mmToPx(printableHeightMm),
  }

  // 2. Compute Scale Based on Fit Option
  let computedScale = 1.0

  if (settings.autoScale) {
    switch (settings.fitOption) {
      case 'fit-one-page': {
        const scaleW = printableAreaPx.width / contentWidth
        const scaleH = printableAreaPx.height / contentHeight
        computedScale = Math.min(scaleW, scaleH)
        break
      }
      case 'fit-width': {
        computedScale = printableAreaPx.width / contentWidth
        break
      }
      case 'fit-height': {
        computedScale = printableAreaPx.height / contentHeight
        break
      }
      case 'shrink-oversized': {
        if (contentWidth > printableAreaPx.width) {
          computedScale = printableAreaPx.width / contentWidth
        } else {
          computedScale = 1.0
        }
        break
      }
      case 'original': {
        computedScale = 1.0
        break
      }
      case 'multi-page': {
        // Fit width if wider than printable area, but allow natural vertical page progression
        if (contentWidth > printableAreaPx.width) {
          computedScale = printableAreaPx.width / contentWidth
        } else {
          computedScale = 1.0
        }
        break
      }
      default:
        computedScale = 1.0
    }
  } else {
    // Manual scale slider value
    computedScale = Math.max(0.2, Math.min(2.5, settings.scale / 100))
  }

  // Round scale to 4 decimal places
  const effectiveScale = Math.round(computedScale * 10000) / 10000
  const scalePercentage = Math.round(effectiveScale * 100)
  const isScaledDown = effectiveScale < 0.999

  // 3. Readability Protection Verification
  const minThreshold = settings.minimumScaleThreshold || 50
  const isBelowReadabilityThreshold = scalePercentage < minThreshold
  let readabilityWarning: string | undefined

  if (isBelowReadabilityThreshold) {
    readabilityWarning = `Document is scaled to ${scalePercentage}%, which is below the recommended ${minThreshold}% readability threshold. Fine text and table data may be difficult to read. We recommend selecting 'Fit to Page Width' or 'Normal Multi-Page' printing.`
  }

  // 4. Estimated Page Count Calculation
  let estimatedPages = 1
  if (settings.fitOption === 'fit-one-page') {
    estimatedPages = 1
  } else if (pageDimMm.isContinuous) {
    estimatedPages = 1
  } else {
    const scaledContentHeight = contentHeight * effectiveScale
    estimatedPages = Math.max(1, Math.ceil(scaledContentHeight / printableAreaPx.height))
  }

  return {
    pageDimensionsMm: { width: pageDimMm.width, height: pageDimMm.height },
    marginsMm,
    printableAreaMm: { width: printableWidthMm, height: printableHeightMm },
    pageDimensionsPx,
    marginsPx,
    printableAreaPx,
    contentDimensionsPx: { width: contentWidth, height: contentHeight },
    effectiveScale,
    scalePercentage,
    estimatedPages,
    isScaledDown,
    isBelowReadabilityThreshold,
    readabilityWarning,
    fitModeApplied: settings.fitOption,
  }
}

/**
 * Generates comprehensive CSS string for print iframe or dynamic document injection.
 */
export function generateUniversalPrintCss(
  layout: PrintLayoutCalculation,
  settings: PrintSettings
): string {
  const { pageDimensionsMm, marginsMm, effectiveScale, pageDimensionsPx, marginsPx } = layout

  const pageCss = `@page {
    size: ${pageDimensionsMm.width}mm ${pageDimensionsMm.height}mm;
    margin: ${marginsMm.top}mm ${marginsMm.right}mm ${marginsMm.bottom}mm ${marginsMm.left}mm;
  }`

  const repeatHeaderRule = settings.repeatTableHeaders
    ? `thead { display: table-header-group !important; }
       tfoot { display: table-footer-group !important; }`
    : `thead { display: table-row-group !important; }`

  const bgGraphicsRule = settings.printBackground
    ? `* {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }`
    : `* {
        -webkit-print-color-adjust: economy !important;
        print-color-adjust: economy !important;
      }`

  // Apply scale directly to printable root container
  const scaleStyle =
    effectiveScale !== 1.0
      ? `
        #universal-print-container {
          transform: scale(${effectiveScale});
          transform-origin: top left;
          width: ${Math.round(100 / effectiveScale)}% !important;
        }
      `
      : `
        #universal-print-container {
          width: 100% !important;
        }
      `

  return `
    ${pageCss}

    ${bgGraphicsRule}

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }

    /* Print Root Wrapper */
    #universal-print-root {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }

    ${scaleStyle}

    /* Table & Page Break Safeguards */
    table {
      border-collapse: collapse !important;
    }
    ${repeatHeaderRule}

    tr, td, th {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Non-splittable Section Elements */
    .page-break-avoid,
    .no-split,
    .card,
    .signature-block,
    .stamp-seal,
    .qr-barcode-container,
    .receipt-header,
    .receipt-footer {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .page-break-before {
      page-break-before: always !important;
      break-before: page !important;
    }

    .page-break-after {
      page-break-after: always !important;
      break-after: page !important;
    }

    /* Hide screen-only interactive elements */
    .no-print,
    .print\\:hidden,
    button,
    nav,
    aside,
    .print-controls-panel,
    [role="button"] {
      display: none !important;
    }

    /* ── Canonical Two-Row Global Print Footer Standard ── */
    body {
      counter-reset: page;
      padding-bottom: 16mm !important;
      box-sizing: border-box !important;
    }

    #universal-print-root, #universal-print-container {
      padding-bottom: 16mm !important;
      box-sizing: border-box !important;
    }

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
      background: #ffffff !important;
      z-index: 9999 !important;
      padding-left: ${layout.marginsMm.left}mm !important;
      padding-right: ${layout.marginsMm.right}mm !important;
      padding-top: 4px !important;
      padding-bottom: 2mm !important;
      border-top: 1px solid #cbd5e1 !important;
      box-sizing: border-box !important;
      visibility: visible !important;
      display: block !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    [data-testid="print-footer-row-1"] {
      display: flex !important;
      justify-content: flex-end !important;
      text-align: right !important;
      color: #475569 !important;
      font-size: 8pt !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.3 !important;
      margin-bottom: 2px !important;
    }

    [data-testid="print-footer-row-2"] {
      display: block !important;
      text-align: center !important;
      color: #94a3b8 !important;
      font-size: 6.5pt !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.2 !important;
      letter-spacing: 0.015em !important;
    }

    .pratham-page-num::after {
      content: counter(page) !important;
    }

    .pratham-page-total::after {
      content: counter(pages) !important;
    }

    /* Print Header & Footer Watermarking */
    .print-branding-footer {
      display: block !important;
      text-align: center !important;
      margin-top: 12px !important;
      padding-top: 8px !important;
      border-top: 1px dashed #cbd5e1 !important;
    }
    .print-branding-footer p {
      font-size: 7.5pt !important;
      color: #64748b !important;
      margin: 0 !important;
    }
  `
}

/**
 * Executes a high-fidelity isolated print by cloning the target DOM node into a sandboxed iframe.
 */
export async function executeUniversalPrint(
  targetElement: HTMLElement,
  settings: PrintSettings,
  layout: PrintLayoutCalculation,
  documentTitle: string = 'PrathamOne EduOS Document'
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  return new Promise((resolve) => {
    try {
      // 1. Remove any previous iframe
      const existingIframe = document.getElementById('universal-print-iframe')
      if (existingIframe?.parentNode) {
        existingIframe.parentNode.removeChild(existingIframe)
      }

      // 2. Create isolated sandboxed iframe
      const iframe = document.createElement('iframe')
      iframe.id = 'universal-print-iframe'
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.style.opacity = '0'
      iframe.style.pointerEvents = 'none'
      iframe.setAttribute('aria-hidden', 'true')

      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentWindow?.document
      if (!iframeDoc) {
        console.warn('[UniversalPrint] Could not acquire iframe document; falling back to direct window.print()')
        window.print()
        resolve(false)
        return
      }

      // 3. Clone target content
      const clonedContent = targetElement.cloneNode(true) as HTMLElement

      // Strip out screen buttons & action bars from cloned node
      clonedContent.querySelectorAll('.no-print, .print\\:hidden, button, [role="button"]').forEach((el) => {
        el.parentNode?.removeChild(el)
      })

      // Automatically enforce canonical PrintFooter if not already present in cloned node
      if (!clonedContent.querySelector('.pratham-global-print-footer')) {
        const docId = settings.documentId || 'DOC-001'
        const classification = settings.confidentiality || 'Confidential'
        const softwareBranding = settings.softwareBrandingText || 'Generated by PrathamOne EduOS · © PrathamOne EduOS'
        
        const spacerDiv = document.createElement('div')
        spacerDiv.className = 'pratham-print-footer-spacer hidden print:block'
        spacerDiv.style.height = '16mm'
        spacerDiv.setAttribute('aria-hidden', 'true')
        clonedContent.appendChild(spacerDiv)

        const footerDiv = document.createElement('footer')
        footerDiv.className = 'pratham-global-print-footer'
        footerDiv.setAttribute('data-testid', 'pratham-global-print-footer')
        footerDiv.innerHTML = `
          <div data-testid="print-footer-row-1" style="display: flex; justify-content: flex-end; align-items: center; gap: 6px; font-size: 8pt; color: #475569; font-family: 'Inter', -apple-system, sans-serif; text-align: right;">
            <span>${classification}</span>
            <span style="color: #94a3b8;">·</span>
            <span>Document ID: <strong style="font-family: monospace; font-weight: normal;">${docId}</strong></span>
            <span style="color: #94a3b8;">·</span>
            <span class="pratham-pagination-wrapper">
              <span>Page 1 of ${layout.estimatedPages}</span>
            </span>
          </div>
          ${settings.showSoftwareBranding !== false ? `
          <div data-testid="print-footer-row-2" style="text-align: center; font-size: 6.5pt; color: #94a3b8; font-family: 'Inter', -apple-system, sans-serif; margin-top: 3px; letter-spacing: 0.015em;">
            ${softwareBranding}
          </div>` : ''}
        `
        clonedContent.appendChild(footerDiv)
      }

      // 4. Collect parent document stylesheets
      const parentStyles = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
        .map((el) => el.outerHTML)
        .join('\n')

      const dynamicPrintCss = generateUniversalPrintCss(layout, settings)

      // 5. Write to iframe
      iframeDoc.open()
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${documentTitle}</title>
          ${parentStyles}
          <style>
            ${dynamicPrintCss}
          </style>
        </head>
        <body>
          <div id="universal-print-root">
            <div id="universal-print-container">
              ${clonedContent.innerHTML}
            </div>
          </div>
        </body>
        </html>
      `)
      iframeDoc.close()

      // 6. Wait for resources (images/fonts) before triggering print
      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          resolve(true)
        } catch (err) {
          console.error('[UniversalPrint] Iframe print failed:', err)
          window.print()
          resolve(false)
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe)
            }
          }, 3000)
        }
      }

      const images = iframeDoc.getElementsByTagName('img')
      let loaded = 0
      const total = images.length

      if (total === 0) {
        setTimeout(triggerPrint, 150)
      } else {
        const check = () => {
          loaded++
          if (loaded >= total) triggerPrint()
        }
        for (let i = 0; i < total; i++) {
          if (images[i].complete) {
            loaded++
          } else {
            images[i].onload = check
            images[i].onerror = check
          }
        }
        if (loaded >= total) {
          setTimeout(triggerPrint, 150)
        } else {
          // Safety timeout so print never hangs indefinitely
          setTimeout(triggerPrint, 800)
        }
      }
    } catch (error) {
      console.error('[UniversalPrint] Execution error:', error)
      window.print()
      resolve(false)
    }
  })
}

