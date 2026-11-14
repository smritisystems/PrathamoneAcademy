/**
 * @file        PrintFooter.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.printing
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     2.1.0
 * @created     2026-11-07
 * @updated     2026-11-14
 *
 * @description Canonical Global Print Footer component enforcing two-row right/center aligned standard with absolute bottom positioning and spacer reservation across all printable outputs.
 */

import React from 'react'
import { BRANDING_CONFIG, PRINT_FOOTER_BRANDING_TEXT } from '../../config/branding'
import { useEnvironmentStore } from '../../store/environmentStore'

export interface PrintFooterProps {
  /**
   * Unique document reference identifier (e.g., DOC-001, RCP-2026-0042, EMP-014).
   * Dynamically resolved from document data or fallback identifier.
   */
  documentId?: string

  /**
   * Current page number (for preview or static rendering).
   */
  pageNumber?: number

  /**
   * Total pages count (for preview or static rendering).
   */
  totalPages?: number

  /**
   * Confidentiality classification label (e.g., Confidential, Strictly Confidential, Official Fee Voucher).
   */
  classification?: string

  /**
   * Attribution label displayed beside the PrathamOne logo.
   * Defaults to 'Created by'.
   */
  softwareBrandingText?: string

  /**
   * Whether to include the full PrathamOne logo lockup beside its attribution.
   * Defaults to true; set false for statutory or contractual exceptions.
   */
  showSoftwareLogo?: boolean

  /**
   * Optional override for the full software logo lockup.
   */
  softwareLogoUrl?: string

  /**
   * Whether to display the subtle software branding row.
   * Defaults to true.
   */
  showSoftwareBranding?: boolean

  /**
   * Whether to display page numbering.
   * Defaults to true.
   */
  showPagination?: boolean

  /**
   * Whether to display document reference ID.
   * Defaults to true.
   */
  showDocumentId?: boolean

  /**
   * Whether this footer should be fixed to the absolute physical bottom on every printed page.
   * Defaults to TRUE (global print governance policy).
   */
  fixedBottom?: boolean

  /**
   * Optional custom border styling or divider.
   * Defaults to true (subtle top divider).
   */
  showDivider?: boolean

  /**
   * Optional override text for Row 1.
   */
  customRow1Text?: string

  /**
   * Layout mode: 'single-row' (distributed modern footer: Left = Document ID, Center = Page, Right = Software Branding)
   * or 'two-row' (stacked right-aligned metadata + centered branding).
   * Defaults to 'single-row' for receipts and vouchers, 'two-row' for full multi-page reports.
   */
  layoutMode?: 'single-row' | 'two-row'

  /**
   * Additional custom CSS classes.
   */
  className?: string
}

/**
 * Standard Two-Row Global Print Footer:
 *
 * - Row 1 (Right-Aligned): Confidential · Document ID: DOC-001 · Page 1 of 2
 *   Readable text size (~9.5px / 8pt), dark-grey (#475569 / slate-600), right-aligned.
 *
 * - Row 2 (Center-Aligned): Created by [PrathamOne logo lockup]
 *   Very small typography (7–8px / 6–6.5pt), subtle light-grey (#94a3b8 / slate-400), center-aligned.
 *
 * Anchored to the physical bottom of every page with reserved document-flow spacer to prevent overlap.
 */
export function PrintFooter({
  documentId = 'DOC-001',
  pageNumber = 1,
  totalPages = 1,
  classification: propClassification,

  softwareBrandingText = PRINT_FOOTER_BRANDING_TEXT,
  showSoftwareLogo = true,
  softwareLogoUrl = BRANDING_CONFIG.assets.softwareLogoSvgUrl,
  showSoftwareBranding = true,
  showPagination = true,
  showDocumentId = true,
  fixedBottom = true,
  showDivider = true,
  customRow1Text,
  layoutMode,
  className = '',
}: PrintFooterProps) {
  const isTraining = useEnvironmentStore((s) => s.isTrainingMode)
  const classification = isTraining ? 'DEMO / TRAINING ONLY' : (propClassification || 'Confidential')

  const resolvedLayout =
    layoutMode ||
    (classification?.toLowerCase().includes('receipt')
      ? 'single-row'
      : 'two-row')
  const softwareAttribution = (
    <span className="inline-flex items-center gap-1.5">
      <span>{softwareBrandingText || PRINT_FOOTER_BRANDING_TEXT}</span>
      {showSoftwareLogo && (
        <img
          data-testid="pratham-software-footer-logo"
          src={softwareLogoUrl}
          alt="PrathamOne EduOS logo"
          className="h-[7pt] w-auto max-w-[42pt] shrink-0 object-contain"
        />
      )}
    </span>
  )

  // Build Row 1 components: Classification · Document ID: ID · Page X of Y
  const row1Parts: React.ReactNode[] = []

  if (customRow1Text) {
    row1Parts.push(<span key="custom">{customRow1Text}</span>)
  } else {
    if (classification) {
      row1Parts.push(<span key="class">{classification}</span>)
    }

    if (showDocumentId && documentId) {
      row1Parts.push(
        <span key="doc-id">Document ID: {documentId}</span>
      )
    }

    if (showPagination) {
      row1Parts.push(
        <span key="pagination" className="pratham-pagination-wrapper">
          <span>Page {pageNumber} of {totalPages}</span>
        </span>
      )
    }
  }

  return (
    <>
      {/* ── Document Flow Spacer: Reserves 16mm height so content never overlaps bottom footer ── */}
      {fixedBottom && (
        <div
          data-testid="pratham-print-footer-spacer"
          className="pratham-print-footer-spacer hidden print:block w-full select-none pointer-events-none"
          style={{ height: '16mm' }}
          aria-hidden="true"
        />
      )}

      {/* ── Canonical Global Print Footer ── */}
      <footer
        data-testid="pratham-global-print-footer"
        className={`pratham-global-print-footer select-none w-full ${
          showDivider
            ? 'border-t border-slate-200/90 pt-2 mt-3 print:border-slate-300 print:pt-1.5 print:mt-0'
            : 'pt-1.5 mt-2'
        } ${
          fixedBottom
            ? 'print:fixed print:bottom-0 print:left-0 print:right-0 print:bg-white print:z-50 print:pb-1.5 print:px-6'
            : ''
        } ${className}`}
      >
        {resolvedLayout === 'single-row' ? (
          /* ── Single-Row Distributed Layout: Left = Document ID, Center = Page, Right = Software Branding ── */
          <div
            data-testid="print-footer-single-row"
            className="flex items-center justify-between gap-2 text-slate-500 print:text-slate-500 text-[8.5px] print:text-[7pt] font-sans font-normal leading-tight w-full"
            style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              color: '#64748b',
            }}
          >
            {/* Left: Classification & Document ID */}
            <div className="flex items-center gap-1.5 text-left shrink-0">
              {classification && <span className="font-medium text-slate-600">{classification}</span>}
              {classification && showDocumentId && documentId && <span className="text-slate-400 select-none">·</span>}
              {showDocumentId && documentId && <span className="font-mono text-slate-600">Doc ID: {documentId}</span>}
            </div>

            {/* Center: Pagination */}
            {showPagination && (
              <div className="text-center text-slate-400 text-[8px] print:text-[6.5pt] grow">
                Page {pageNumber} of {totalPages}
              </div>
            )}

            {/* Right: Subtle Software Attribution */}
            {showSoftwareBranding && (
              <div
                className="text-right text-slate-400 print:text-slate-400 text-[7px] print:text-[6pt] font-light tracking-wide shrink-0 select-none"
                style={{ color: '#94a3b8' }}
              >
                {softwareAttribution}
              </div>
            )}
          </div>
        ) : (
          /* ── Legacy Two-Row Stacked Layout ── */
          <>
            <div
              data-testid="print-footer-row-1"
              className="flex items-center justify-end gap-1.5 text-slate-600 print:text-slate-600 text-[9.5px] print:text-[8pt] font-sans font-normal leading-tight text-right"
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: '#475569',
              }}
            >
              {row1Parts.map((part, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="text-slate-400 print:text-slate-400 px-0.5 select-none">·</span>}
                  {part}
                </React.Fragment>
              ))}
            </div>

            {showSoftwareBranding && (
              <div
                data-testid="print-footer-row-2"
                className="flex items-center justify-center text-center text-slate-400 print:text-slate-400 text-[7.5px] print:text-[6.5pt] mt-1 print:mt-0.5 leading-none tracking-normal font-light select-none"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  color: '#94a3b8',
                  letterSpacing: '0.015em',
                }}
              >
                {softwareAttribution}
              </div>
            )}
          </>
        )}
      </footer>
    </>
  )
}

export default PrintFooter
