/**
 * @file        PrintDocumentBranding.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Canonical document branding header, statutory compliance notices, and authorized signatory layout for printable documents.
 */

import React from 'react'
import { ShieldCheck, FileCheck2 } from 'lucide-react'
import { useBranding, BRANDING_CONFIG, PRINT_SHARE_BRANDING } from '../config/branding'
import type { Institution } from '../types'

export interface PrintDocumentHeaderProps {
  title: string
  documentRef?: string
  subtitle?: string
  documentDate?: string
  academicYear?: string
  institution?: Partial<Institution> | null
  statusBadge?: string
  statusBadgeColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate'
  monogram?: string
  compact?: boolean
  className?: string
}

export function PrintDocumentHeader({
  title,
  documentRef,
  subtitle,
  documentDate,
  academicYear,
  institution,
  statusBadge,
  statusBadgeColor = 'blue',
  monogram,
  compact = false,
  className = '',
}: PrintDocumentHeaderProps) {
  const globalBranding = useBranding()

  const academyName = institution?.name || globalBranding.academyName
  const academyCode = institution?.code || globalBranding.academyCode
  const phone = institution?.phone || globalBranding.institutionPhone
  const email = institution?.email || globalBranding.institutionEmail
  const address = institution?.address
    ? `${institution.address}${institution.city ? `, ${institution.city}` : ''}${
        institution.state ? `, ${institution.state}` : ''
      }${institution.pincode ? ` - ${institution.pincode}` : ''}`
    : globalBranding.institutionAddress

  const displayMonogram = monogram || globalBranding.monogram || 'PA'
  const displaySubtitle = subtitle || globalBranding.tagline

  const badgeBg = {
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    rose: 'bg-rose-50 text-rose-900 border-rose-200',
    slate: 'bg-slate-100 text-slate-800 border-slate-300',
  }[statusBadgeColor]

  return (
    <div
      className={`border-b-2 border-slate-900 pb-3 mb-4 select-none ${
        compact ? 'text-xs pb-2 mb-3' : ''
      } ${className}`}
      data-testid="print-document-header"
    >
      {/* ── Institutional Crest & Academy Identification ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Official Emblem Monogram */}
          <div
            className={`rounded-xl bg-gradient-to-tr from-blue-900 via-indigo-900 to-slate-900 text-white font-black flex items-center justify-center shadow-sm shrink-0 border border-slate-800 ${
              compact ? 'w-11 h-11 text-lg' : 'w-14 h-14 text-2xl'
            }`}
          >
            {displayMonogram}
          </div>

          <div>
            <h1
              className={`font-black uppercase tracking-tight text-slate-950 font-serif leading-none ${
                compact ? 'text-lg' : 'text-2xl'
              }`}
            >
              {academyName}
            </h1>
            <p
              className={`font-bold tracking-wide uppercase text-blue-800 mt-1 leading-tight ${
                compact ? 'text-[9.5px]' : 'text-[11px]'
              }`}
            >
              {displaySubtitle}
            </p>
            <p
              className={`text-slate-600 mt-0.5 leading-snug font-normal ${
                compact ? 'text-[8.5px]' : 'text-[10px]'
              }`}
            >
              {address} &bull; Ph: {phone} &bull; Email: {email}
            </p>
          </div>
        </div>

        {/* Institution Code & Academic Session Meta */}
        <div className="text-right shrink-0 space-y-1">
          <span className="inline-block border border-slate-900 px-2 py-0.5 text-[9.5px] font-mono font-bold tracking-wider uppercase bg-slate-50">
            CODE: {academyCode}
          </span>
          {academicYear && (
            <p className="text-[9px] text-slate-600 font-semibold font-mono">
              SESSION: AY {academicYear}
            </p>
          )}
          {documentDate && (
            <p className="text-[9px] text-slate-500 font-mono">
              DATE: {documentDate}
            </p>
          )}
        </div>
      </div>

      {/* ── Document Title Banner & Reference Control Bar ── */}
      <div className="mt-3.5 flex items-center justify-between bg-slate-900 text-white px-3.5 py-1.5 rounded print:rounded-none">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider font-serif">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {statusBadge && (
            <span
              className={`border px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${badgeBg}`}
            >
              {statusBadge}
            </span>
          )}
          {documentRef && (
            <span className="text-[10px] font-mono font-bold bg-blue-700 text-white px-2 py-0.5 rounded print:border print:border-white">
              REF: {documentRef}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export interface PrintDocumentSignatoryProps {
  signatoryTitle?: string
  collectorName?: string
  generatedAt?: string
  disclaimer?: string
  showStampBox?: boolean
  showParentSignature?: boolean
  parentSignatoryTitle?: string
  showDPDPNotice?: boolean
  compact?: boolean
  className?: string
}

export function PrintDocumentSignatory({
  signatoryTitle = 'Authorized Signatory',
  collectorName,
  generatedAt,
  disclaimer = 'Computer-generated official academic document. Verified against PrathamOne Academy Authoritative Ledger.',
  showStampBox = true,
  showParentSignature = false,
  parentSignatoryTitle = 'Parent / Guardian Signature',
  showDPDPNotice = true,
  compact = false,
  className = '',
}: PrintDocumentSignatoryProps) {
  const globalBranding = useBranding()

  return (
    <div
      className={`mt-6 pt-4 border-t-2 border-slate-300 text-slate-800 text-xs space-y-4 select-none ${
        compact ? 'mt-4 pt-3 text-[10px] space-y-3' : ''
      } ${className}`}
      data-testid="print-document-signatory"
    >
      {/* Signatures & Seal Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end pt-2">
        {/* Parent / Candidate signature line (if applicable) */}
        {showParentSignature ? (
          <div className="text-center space-y-1">
            <div className="border-b border-slate-400 h-10 w-44 mx-auto" />
            <p className="font-bold text-slate-800 text-[11px]">{parentSignatoryTitle}</p>
            <p className="text-[9px] text-slate-500">Date: _______________</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Issued / Collected By
            </p>
            <p className="font-extrabold text-slate-900 text-sm">
              {collectorName || 'System Administrator'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              {generatedAt || new Date().toLocaleString('en-IN')}
            </p>
          </div>
        )}

        {/* Official Institute Seal / Stamp placeholder */}
        {showStampBox ? (
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full border border-dashed border-slate-400 flex flex-col items-center justify-center text-center p-1 text-slate-400 bg-slate-50/50 print:bg-transparent">
              <span className="text-[8px] font-bold uppercase tracking-tighter">Official Seal</span>
              <span className="text-[7.5px] uppercase tracking-widest mt-0.5">
                {globalBranding.monogram}
              </span>
            </div>
            <p className="text-[8.5px] text-slate-400 mt-1 uppercase">Institution Stamp</p>
          </div>
        ) : (
          <div />
        )}

        {/* Authorized Signatory Line */}
        <div className="text-right space-y-1 sm:ml-auto">
          <div className="border-b-2 border-slate-900 h-10 w-48 ml-auto" />
          <p className="font-black text-slate-950 uppercase text-[11px] tracking-wide">
            {signatoryTitle}
          </p>
          <p className="text-[9.5px] font-semibold text-slate-600">
            {globalBranding.academyName}
          </p>
        </div>
      </div>

      {/* Statutory / DPDP Privacy & Authenticity Footer */}
      <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-slate-500">
        <p className="italic text-center sm:text-left">{disclaimer}</p>

        {showDPDPNotice && (
          <div className="inline-flex items-center gap-1 text-emerald-800 font-semibold shrink-0 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>DPDP Act 2023 &bull; Encrypted Audit Trail</span>
          </div>
        )}
      </div>

      <div className="text-center text-[8.5px] text-slate-400 font-mono">
        {BRANDING_CONFIG.suiteName} &bull; {BRANDING_CONFIG.versionDisplay} &bull; {BRANDING_CONFIG.copyright}
      </div>

      {/* Global Understated Print & Share Branding */}
      <PrintBrandingFooter className="pt-1 mt-1" />
    </div>
  )
}
export interface PrintBrandingFooterProps {
  className?: string
  align?: 'center' | 'left' | 'right'
  fixedBottom?: boolean
  showDivider?: boolean
  customText?: string
}

/**
 * Consistent, understated PrathamOne branding footer for printable and shareable outputs.
 * Designed with a thin, light, low-contrast font (8-9pt print) that remains readable in grayscale.
 */
export function PrintBrandingFooter({
  className = '',
  align = 'center',
  fixedBottom = false,
  showDivider = false,
  customText,
}: PrintBrandingFooterProps) {
  const alignmentClass = {
    center: 'text-center justify-center',
    left: 'text-left justify-start',
    right: 'text-right justify-end',
  }[align]

  return (
    <div
      data-testid="print-share-branding-footer"
      className={`print-branding-footer select-none ${
        showDivider ? 'pt-2 mt-3 border-t border-slate-200/80 print:border-slate-300' : 'pt-2 mt-2'
      } ${
        fixedBottom ? 'print:fixed print:bottom-0 print:left-0 print:right-0 print:pb-1.5' : ''
      } ${alignmentClass} ${className}`}
    >
      <p
        className="font-light tracking-wide text-[8pt] text-slate-400 print:text-slate-500 print:font-normal leading-normal"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          letterSpacing: '0.025em',
        }}
      >
        {customText || PRINT_SHARE_BRANDING.text}
      </p>
    </div>
  )
}


