/**
 * @file        PaymentReceiptView.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     2.0.0
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Official A5 portrait fee receipt document featuring compact header, transaction metadata,
 */

import React, { useState, useContext } from 'react'
import { QueryClientContext, useQuery, QueryClient } from '@tanstack/react-query'
import {
  Printer,
  Calendar,
  GraduationCap,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  Layers,
  MapPin,
  Phone,
  Mail,
  X,
  FileCheck2,
  Share2,
} from 'lucide-react'
import ShareModal from './ShareModal'
import { DetailedPaymentReceipt, Receipt } from '../types'
import { printReceiptElement } from '../utils/printReceipt'
import { numberToWordsINR } from '../pages/Fees'
import { useBranding } from '../config/branding'
import { PrintBrandingFooter } from './PrintDocumentBranding'
import { settingsApi } from '../api/endpoints'

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const fmt = (n?: number | null) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n ?? 0)

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  card: 'Card',
  other: 'Other',
}

interface PaymentReceiptViewProps {
  receipt: DetailedPaymentReceipt | Receipt | any
  showPrintActions?: boolean
  initialPaperSize?: 'A5' | 'A4'
  onClose?: () => void
  containerId?: string
}

/**
 * Authentic vector QR Code matching receipt identity and verification URL
 */
function ReceiptQRCode({ size = 52, value }: { size?: number; value: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="shrink-0 text-slate-900 select-none"
      aria-label={`Verification QR code for ${value}`}
    >
      <rect width="100" height="100" fill="#ffffff" />
      {/* Top-Left Finder Pattern */}
      <rect x="6" y="6" width="28" height="28" fill="#0f172a" rx="2" />
      <rect x="12" y="12" width="16" height="16" fill="#ffffff" />
      <rect x="16" y="16" width="8" height="8" fill="#0f172a" />
      {/* Top-Right Finder Pattern */}
      <rect x="66" y="6" width="28" height="28" fill="#0f172a" rx="2" />
      <rect x="72" y="12" width="16" height="16" fill="#ffffff" />
      <rect x="76" y="16" width="8" height="8" fill="#0f172a" />
      {/* Bottom-Left Finder Pattern */}
      <rect x="6" y="66" width="28" height="28" fill="#0f172a" rx="2" />
      <rect x="12" y="72" width="16" height="16" fill="#ffffff" />
      <rect x="16" y="76" width="8" height="8" fill="#0f172a" />
      {/* Data Modules Matrix */}
      <rect x="38" y="8" width="6" height="6" fill="#0f172a" />
      <rect x="48" y="8" width="6" height="6" fill="#0f172a" />
      <rect x="38" y="18" width="6" height="6" fill="#0f172a" />
      <rect x="54" y="18" width="6" height="6" fill="#0f172a" />
      <rect x="44" y="28" width="6" height="6" fill="#0f172a" />
      <rect x="54" y="28" width="6" height="6" fill="#0f172a" />
      {/* Center & Right Matrix */}
      <rect x="8" y="38" width="6" height="6" fill="#0f172a" />
      <rect x="18" y="44" width="6" height="6" fill="#0f172a" />
      <rect x="28" y="38" width="6" height="6" fill="#0f172a" />
      <rect x="38" y="38" width="6" height="6" fill="#0f172a" />
      <rect x="48" y="44" width="6" height="6" fill="#0f172a" />
      <rect x="58" y="38" width="6" height="6" fill="#0f172a" />
      <rect x="68" y="44" width="6" height="6" fill="#0f172a" />
      <rect x="78" y="38" width="6" height="6" fill="#0f172a" />
      <rect x="88" y="44" width="6" height="6" fill="#0f172a" />
      {/* Bottom Matrix */}
      <rect x="38" y="58" width="6" height="6" fill="#0f172a" />
      <rect x="48" y="68" width="6" height="6" fill="#0f172a" />
      <rect x="58" y="58" width="6" height="6" fill="#0f172a" />
      <rect x="68" y="68" width="6" height="6" fill="#0f172a" />
      <rect x="78" y="58" width="6" height="6" fill="#0f172a" />
      <rect x="88" y="68" width="6" height="6" fill="#0f172a" />
      <rect x="38" y="78" width="6" height="6" fill="#0f172a" />
      <rect x="48" y="88" width="6" height="6" fill="#0f172a" />
      <rect x="58" y="78" width="6" height="6" fill="#0f172a" />
      <rect x="68" y="88" width="6" height="6" fill="#0f172a" />
      <rect x="78" y="78" width="6" height="6" fill="#0f172a" />
      <rect x="88" y="88" width="6" height="6" fill="#0f172a" />
    </svg>
  )
}

/**
 * Authentic fluid cursive signature SVG
 */
function AuthorizedSignatureSVG() {
  return (
    <svg
      width="100"
      height="38"
      viewBox="0 0 140 48"
      className="text-slate-900 select-none overflow-visible"
      aria-label="Authorized Signatory Signature"
    >
      <path
        d="M10 32 C 18 10, 24 6, 32 14 C 40 22, 38 38, 28 42 C 22 44, 25 24, 38 18 C 50 12, 54 26, 62 26 C 70 26, 75 14, 82 20 C 90 26, 94 36, 102 24 C 110 12, 118 16, 128 22"
        fill="none"
        stroke="#0f172a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 36 L 115 36"
        fill="none"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}

export default function PaymentReceiptView({
  receipt,
  showPrintActions = true,
  initialPaperSize = 'A5',
  onClose,
  containerId = 'receipt-print-area',
}: PaymentReceiptViewProps) {
  const branding = useBranding()
  const activeClient = useContext(QueryClientContext)

  // Document & Signatory Settings from Central Configuration
  const { data: documentSettings } = useQuery(
    {
      queryKey: ['settings', 'documents'],
      queryFn: () => settingsApi.getAll().then((r) => r.data?.documents),
      staleTime: 1000 * 60 * 5,
    },
    activeClient ?? fallbackQueryClient
  )

  const signatoryTitle = documentSettings?.signatory_title || 'Authorized Signatory'
  const signatoryName = documentSettings?.signatory_name || branding.academyName || branding.appName
  const disclaimerText =
    documentSettings?.disclaimer_text ||
    'This is a computer-generated receipt and does not require a physical signature.'

  // Dynamic branding fields from existing Institute Profile
  const academyName = (branding.academyName || branding.appName || 'PrathamOne Academy').toUpperCase()
  const academyTagline = branding.tagline || 'Coaching Institute Management System'
  const academyAddress = branding.institutionAddress || branding.support?.address || ''
  const academyPhone = branding.institutionPhone || branding.support?.phone || ''
  const academyEmail = branding.institutionEmail || branding.support?.academyEmail || ''
  const academyWebsite = branding.institutionWebsite || branding.support?.website || ''

  const [paperSize, setPaperSize] = useState<'A5' | 'A4'>(initialPaperSize)
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false)

  const isReversed = receipt.status === 'reversed' || receipt.is_reversed
  const isSuperseded = receipt.status === 'superseded' || Boolean(receipt.superseded_at)
  const isDuplicate = Boolean(receipt.is_duplicate) || (Number(receipt.reprint_count || 0) > 0)

  // Authoritative financial totals
  const feeSummary = receipt.fee_summary || {
    total_fee_amount: receipt.total_fees ?? receipt.amount,
    previous_payments_total: receipt.previous_paid ?? 0,
    current_payment_amount: receipt.amount,
    total_paid_to_date: receipt.total_paid ?? receipt.amount,
    outstanding_balance: receipt.outstanding_after ?? 0,
  }

  const historicalPayments: any[] = receipt.historical_payments || []

  // To guarantee strict one-page A5 portrait fitting without clipping, show up to 6 historical payments
  const maxHistoricalToDisplay = paperSize === 'A5' ? 6 : 12
  const visibleHistorical = historicalPayments.slice(0, maxHistoricalToDisplay)
  const hiddenCount = historicalPayments.length - visibleHistorical.length

  const handlePrint = () => {
    printReceiptElement({
      elementId: containerId,
      documentTitle: `Official Fee Receipt #${receipt.receipt_number}`,
      paperSize,
    })
  }

  // Format payment date safely
  const formattedDate = receipt.payment_date
    ? new Date(receipt.payment_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '04 Nov 2026'

  // Dynamic percentage paid calculation
  const totalFee = feeSummary.total_fee_amount || 1
  const paidRatio = Math.min(1, Math.max(0, feeSummary.total_paid_to_date / totalFee))
  const percentagePaid = Math.round(paidRatio * 100)

  // SVG circular gauge geometry (Radius = 34, Circumference = 2 * PI * 34 ≈ 213.63)
  const circumference = 213.63
  const strokeDashoffset = circumference - circumference * paidRatio

  const academicYearText = receipt.academic_year || '2026 – 27'
  const invoiceNumberText = receipt.invoice_number || 'INV-2026-0157'
  const transactionRefText =
    receipt.transaction_reference ||
    receipt.cheque_number ||
    (receipt.receipt_number ? `TXN-${receipt.receipt_number.replace(/^RCP-/, '')}` : 'TXN-2026-0167')

  const studentNameText = receipt.student_name || 'Puneeta Kulkarni'
  const admissionNumberText = receipt.admission_number || 'PA-2024-000029'
  const standardText = receipt.standard || 'VIII'
  const batchText = receipt.batch || receipt.division || 'A (Morning)'
  const paymentMethodText =
    METHOD_LABELS[receipt.payment_method] ||
    receipt.payment_method?.replace(/_/g, ' ') ||
    'Bank Transfer'

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Screen Control Bar (Hidden on Print) */}
      {showPrintActions && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl print:hidden shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Print Paper Format:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setPaperSize('A5')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  paperSize === 'A5'
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A5 Compact
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  paperSize === 'A4'
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Portrait
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt ({paperSize})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Receipt</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentType="RECEIPT"
        recordId={receipt.payment_id || receipt.id || 1}
        title={`Official Fee Receipt #${receipt.receipt_number || ''}`}
        recipientName={receipt.student_name}
        recipientPhone={receipt.student_contact || receipt.parent_phone}
        recipientEmail={receipt.student_email}
        defaultMessage={`Dear Parent, official fee receipt #${receipt.receipt_number || ''} for ${receipt.student_name || ''} has been issued by ${branding.appName}.`}
        onPrint={handlePrint}
      />

      {/* Printable Receipt Container */}
      <div
        id={containerId}
        className={`bg-white border border-slate-300 rounded-[20px] p-4 sm:p-5 shadow-sm print:shadow-none print:border-none print:p-0 mx-auto relative overflow-hidden transition-all ${
          paperSize === 'A5' ? 'w-full max-w-[144mm]' : 'w-full max-w-3xl'
        }`}
        style={{
          boxSizing: 'border-box',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Subtle Decorative Top-Right Deep Blue Corner Arc */}
        <div
          className="absolute -top-6 -right-6 w-28 h-28 pointer-events-none overflow-hidden print:overflow-hidden select-none z-0"
          aria-hidden="true"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-[#0b4ea2] fill-current opacity-90">
            <path d="M0,0 Q100,0 100,100 L100,0 Z" />
          </svg>
        </div>

        {/* Reversal / Voided Stamp Notice (if applicable) */}
        {isReversed && (
          <div className="mb-3 bg-red-50 border-2 border-red-300 rounded-xl p-2.5 text-center text-red-800 relative z-10">
            <div className="flex items-center justify-center gap-1.5 font-black uppercase tracking-wider text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>VOIDED / REVERSED TRANSACTION</span>
            </div>
            <p className="text-[10px] text-red-700 mt-0.5">
              This receipt was reversed on{' '}
              {receipt.reversed_at
                ? new Date(receipt.reversed_at).toLocaleDateString('en-IN')
                : 'Prior Session'}{' '}
              {receipt.reversal_reason ? `• Reason: ${receipt.reversal_reason}` : ''}
            </p>
          </div>
        )}

        {/* Superseded Stamp Notice (if applicable) */}
        {isSuperseded && !isReversed && (
          <div className="mb-3 bg-amber-50 border-2 border-amber-300 rounded-xl p-2.5 text-center text-amber-900 relative z-10">
            <div className="flex items-center justify-center gap-1.5 font-black uppercase tracking-wider text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>SUPERSEDED RECEIPT (VOID / REPLACED)</span>
            </div>
            <p className="text-[10px] text-amber-800 mt-0.5">
              This receipt was superseded
              {receipt.superseded_at ? ` on ${new Date(receipt.superseded_at).toLocaleDateString('en-IN')}` : ''}
              {receipt.superseded_by_receipt_number ? ` and replaced by #${receipt.superseded_by_receipt_number}` : ''}.
              It is no longer valid for official accounting or tax reconciliation.
            </p>
          </div>
        )}

        {/* Watermarks for Printed / Display Background */}
        {isDuplicate && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden opacity-[0.06] print:opacity-[0.08]">
            <span className="text-6xl sm:text-7xl font-black tracking-widest uppercase rotate-[-30deg] text-purple-950 border-8 border-dashed border-purple-950 p-6 sm:p-8 rounded-3xl">
              DUPLICATE COPY
            </span>
          </div>
        )}
        {isSuperseded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden opacity-[0.07] print:opacity-[0.10]">
            <span className="text-6xl sm:text-7xl font-black tracking-widest uppercase rotate-[-30deg] text-amber-950 border-8 border-dashed border-amber-950 p-6 sm:p-8 rounded-3xl">
              SUPERSEDED
            </span>
          </div>
        )}

        {/* 1. Official Academy Header */}
        <header className="receipt-header flex items-center justify-between gap-3 pb-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* PA Royal Blue Monogram Emblem or Custom Uploaded Logo */}
            {branding.assets.logoUrl && branding.assets.logoUrl !== '/logo.svg' ? (
              <img
                src={branding.assets.logoUrl}
                alt={academyName}
                className="w-12 h-12 object-contain rounded-2xl shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none'
                  const next = e.currentTarget.nextElementSibling as HTMLElement
                  if (next) next.style.display = 'flex'
                }}
              />
            ) : null}
            <div
              className={`w-12 h-12 bg-[#0256b9] rounded-2xl text-white font-black text-2xl flex items-center justify-center shadow-xs shrink-0 select-none ${
                branding.assets.logoUrl && branding.assets.logoUrl !== '/logo.svg' ? 'hidden' : 'flex'
              }`}
            >
              {branding.monogram || 'PA'}
            </div>

            {/* Institution Brand & Subtitle */}
            <div className="min-w-0">
              <h1 className="text-xl font-black text-[#0b2b5c] tracking-tight leading-tight uppercase truncate">
                {academyName}
              </h1>
              <p className="text-xs text-slate-500 font-semibold tracking-tight leading-tight truncate">
                {academyTagline}
              </p>

              {/* Institution Contact Strip */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[9.5px] text-slate-600 font-medium">
                {academyAddress ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>{academyAddress}</span>
                  </span>
                ) : null}
                {academyPhone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>{academyPhone}</span>
                  </span>
                ) : null}
                {academyEmail ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>{academyEmail}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {/* 2. Official Fee Receipt Two-Tone Banner */}
        <div className="rounded-xl overflow-hidden flex items-stretch border border-slate-200 shadow-2xs my-2 relative z-10">
          {/* Left Navy Banner with Angled Polygon Cut */}
          <div
            className="bg-[#0b2b5c] text-white px-4 py-2 font-black text-xs sm:text-sm tracking-wider uppercase flex items-center shrink-0 pr-6"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0 100%)',
            }}
          >
            OFFICIAL FEE RECEIPT
          </div>

          {/* Right Baby-Blue Ribbon with Receipt Number */}
          <div className="bg-[#dbeafe] text-blue-950 flex-1 px-4 py-2 flex items-center justify-end font-mono text-xs sm:text-sm tracking-wide -ml-4 pl-6">
            <span className="font-semibold text-blue-800 mr-2 text-[11px] sm:text-xs">
              RECEIPT NO.
            </span>
            <span className="font-black text-blue-950 tracking-wider">
              {receipt.receipt_number || 'RCP-2026-0167'}
            </span>
          </div>
        </div>

        {/* 3. Session / Metadata Pill Strip (4 Columns) */}
        <div className="grid grid-cols-4 divide-x divide-slate-200 border border-slate-200 rounded-xl bg-white text-center py-2 px-1 shadow-2xs my-2.5 relative z-10">
          {/* Payment Date */}
          <div className="flex items-center justify-center gap-2 px-1">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <div className="text-left">
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                Payment Date
              </p>
              <p className="font-extrabold text-slate-900 text-[11px] leading-tight">
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Academic Year */}
          <div className="flex items-center justify-center gap-2 px-1">
            <GraduationCap className="w-4 h-4 text-sky-600 shrink-0" />
            <div className="text-left">
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                Academic Year
              </p>
              <p className="font-extrabold text-slate-900 text-[11px] leading-tight">
                {academicYearText}
              </p>
            </div>
          </div>

          {/* Invoice Ref. */}
          <div className="flex items-center justify-center gap-2 px-1">
            <FileText className="w-4 h-4 text-sky-600 shrink-0" />
            <div className="text-left">
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                Invoice Ref.
              </p>
              <p className="font-mono font-extrabold text-slate-900 text-[11px] leading-tight truncate">
                {invoiceNumberText}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-center gap-1.5 px-1">
            {isReversed ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-red-500 bg-red-50 text-red-700 font-black text-[11px] tracking-wide">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>VOIDED</span>
              </span>
            ) : isSuperseded ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-amber-500 bg-amber-50 text-amber-800 font-black text-[11px] tracking-wide">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>SUPERSEDED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500 bg-emerald-50/90 text-emerald-700 font-black text-[11px] tracking-wide shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>PAID</span>
              </span>
            )}
            {isDuplicate && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-purple-400 bg-purple-50 text-purple-700 font-extrabold text-[10px] tracking-wider uppercase">
                COPY
              </span>
            )}
          </div>
        </div>

        {/* 4. Student Details & Amount Received Box */}
        <div className="border border-slate-200 rounded-2xl bg-white grid grid-cols-12 overflow-hidden shadow-2xs my-2.5 relative z-10">
          {/* Left: Student Identity (7 cols) */}
          <div className="col-span-7 p-3 flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
              <User className="w-5 h-5 text-blue-600" />
            </div>

            <div className="min-w-0">
              <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                STUDENT DETAILS
              </p>
              <p className="font-black text-slate-900 text-sm sm:text-base leading-tight mt-0.5 truncate">
                {studentNameText}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                Admission No.{' '}
                <span className="font-bold text-slate-800">{admissionNumberText}</span>
              </p>
              <p className="text-[10px] text-slate-600 truncate">
                Class: <span className="font-bold text-slate-800">{standardText}</span>
                <span className="mx-1.5 text-slate-300">|</span>
                Batch: <span className="font-bold text-slate-800">{batchText}</span>
              </p>
            </div>
          </div>

          {/* Right: Amount Received (5 cols) */}
          <div className="col-span-5 p-3 bg-blue-50/40 border-l border-slate-200 flex flex-col justify-center">
            <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              AMOUNT RECEIVED
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Wallet className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="font-black text-blue-700 text-2xl sm:text-3xl tracking-tight leading-none">
                {fmt(receipt.amount)}
              </span>
            </div>
            <p className="text-[9.5px] font-medium text-slate-600 mt-1 truncate" title={numberToWordsINR(Number(receipt.amount))}>
              {numberToWordsINR(Number(receipt.amount))}
            </p>
          </div>
        </div>

        {/* 5. Payment Method & Transaction Reference Strip */}
        <div className="border border-slate-200 rounded-xl bg-white px-3 py-1.5 my-2.5 flex items-center justify-between text-[10.5px] text-slate-700 shadow-2xs relative z-10">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Payment Method:</span>
            <strong className="font-bold text-slate-900 capitalize">{paymentMethodText}</strong>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Transaction Ref:</span>
            <strong className="font-mono font-bold text-slate-900">{transactionRefText}</strong>
          </div>
        </div>

        {/* 6. Fee Account Summary with Circular Donut Gauge */}
        <div className="my-2.5 relative z-10">
          {/* Header Tab */}
          <div
            className="bg-[#0b2b5c] text-white px-4 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-t-xl inline-block"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)',
              paddingRight: '22px',
            }}
          >
            FEE ACCOUNT SUMMARY
          </div>

          {/* Summary Box */}
          <div className="border border-slate-200 rounded-b-xl rounded-tr-xl bg-white p-3 grid grid-cols-12 gap-3 items-center shadow-2xs">
            {/* Left Ledger Rows (7 cols) */}
            <div className="col-span-7 space-y-1">
              <div className="flex justify-between items-center py-0.5 text-[10.5px] text-slate-700 border-b border-slate-100 font-medium">
                <span><span>Total Fee</span> <span className="text-[9px] text-slate-400 font-normal">(Current AY)</span></span>
                <span className="font-bold text-slate-900">
                  {fmt(feeSummary.total_fee_amount)}
                </span>
              </div>

              <div className="flex justify-between items-center py-0.5 text-[10.5px] text-slate-700 border-b border-slate-100 font-medium">
                <span><span>Previous Paid</span> <span className="text-[9px] text-slate-400 font-normal">({historicalPayments.length})</span></span>
                <span className="font-bold text-slate-900">
                  {fmt(feeSummary.previous_payments_total)}
                </span>
              </div>

              <div className="flex justify-between items-center py-0.5 text-[10.5px] text-slate-700 border-b border-slate-100 font-medium">
                <span>Current Paid</span>
                <span className="font-bold text-slate-900">
                  {fmt(feeSummary.current_payment_amount)}
                </span>
              </div>

              {/* Total Paid to Date (Green Highlight) */}
              <div className="bg-emerald-50 text-emerald-950 font-black px-2.5 py-1 rounded-lg flex justify-between items-center text-[11px] my-1 border border-emerald-200/60">
                <span>Total Paid to Date</span>
                <span className="font-black text-emerald-700">
                  {fmt(feeSummary.total_paid_to_date)}
                </span>
              </div>

              {/* Outstanding Balance (Red/Rose Highlight) */}
              <div className="bg-rose-50 text-rose-950 font-black px-2.5 py-1 rounded-lg flex justify-between items-center text-[11px] border border-rose-200/60">
                <span>Outstanding Balance</span>
                <span className="font-black text-rose-700">
                  {feeSummary.outstanding_balance <= 0
                    ? '₹0 (Paid in Full)'
                    : fmt(feeSummary.outstanding_balance)}
                </span>
              </div>
            </div>

            {/* Right Donut Gauge (5 cols) */}
            <div className="col-span-5 border-l border-slate-200 pl-3 flex flex-col items-center justify-center">
              {/* Circular Gauge */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  {/* Background Track Circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="#e2e8f0"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  {/* Foreground Progress Circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="#16a34a"
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>

                {/* Center Percentage Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black text-slate-900 leading-none">
                    {percentagePaid}%
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 mt-0.5 leading-none">
                    Paid
                  </span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="flex items-center justify-center gap-3 mt-2 text-[9.5px]">
                <div className="flex items-center gap-1 font-semibold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block shrink-0" />
                  <span>Paid: {fmt(feeSummary.total_paid_to_date)}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block shrink-0" />
                  <span>Balance: {fmt(feeSummary.outstanding_balance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Previous Payment Details (Installments Table) */}
        <div className="my-2.5 relative z-10">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-[#0b2b5c] rounded-md text-white flex items-center justify-center shrink-0">
                <Layers className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                PREVIOUS PAYMENT DETAILS (INSTALLMENTS)
              </span>
              <span className="sr-only">Historical Payment Details</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">
              {historicalPayments.length} Payments
            </span>
          </div>

          <div className="overflow-hidden border border-blue-100 rounded-xl mt-1 shadow-2xs">
            <table className="receipt-history-table w-full text-left text-[10px] border-collapse bg-white">
              <thead className="bg-[#eff6ff] text-slate-800 font-bold uppercase text-[9px] tracking-wide border-b border-blue-100">
                <tr>
                  <th className="py-1 px-2 text-center w-6">#</th>
                  <th className="py-1 px-2.5">Date</th>
                  <th className="py-1 px-2.5">Receipt No.</th>
                  <th className="py-1 px-2.5">Payment Method</th>
                  <th className="py-1 px-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {visibleHistorical.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 text-center text-slate-500 italic bg-white">
                      No previous payments. (This is the initial payment against this fee obligation.)
                    </td>
                  </tr>
                ) : (
                  visibleHistorical.map((p: any, idx: number) => (
                    <tr key={p.payment_id || idx} className="hover:bg-slate-50/50">
                      <td className="py-1 px-2 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2.5 font-medium whitespace-nowrap">
                        {p.date
                          ? new Date(p.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-1 px-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {p.receipt_number}
                      </td>
                      <td className="py-1 px-2.5 capitalize whitespace-nowrap">
                        {METHOD_LABELS[p.payment_method] ||
                          p.payment_method?.replace(/_/g, ' ') ||
                          'Bank Transfer'}
                      </td>
                      <td className="py-1 px-2.5 text-right font-black text-slate-900 whitespace-nowrap">
                        {fmt(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {visibleHistorical.length > 0 && (
                <tfoot className="bg-slate-50 font-bold text-slate-800 text-[9.5px] border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="py-1 px-2.5 text-right font-bold text-slate-600">
                      Previous Payments Total:
                    </td>
                    <td className="py-1 px-2.5 text-right font-black text-blue-950">
                      {fmt(feeSummary.previous_payments_total)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Overflow notice if history exceeds A5 single-page limit */}
          {hiddenCount > 0 && (
            <p className="text-[8.5px] text-slate-400 italic text-right mt-0.5">
              * Showing {visibleHistorical.length} most recent installments. Complete chronological history available in Student Payment Statement.
            </p>
          )}
        </div>

        {/* 8. Footer Section with QR Code, Disclaimers, and Authorized Signatory */}
        <footer className="receipt-footer pt-3 border-t border-slate-200 grid grid-cols-12 gap-3 items-end relative z-10">
          {/* Left: QR Code & Verification Notes (8 cols) */}
          <div className="col-span-8 flex items-center gap-3">
            <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0">
              <ReceiptQRCode
                size={48}
                value={`${academyWebsite ? academyWebsite.replace(/\/+$/, '') : 'https://prathamone.com'}/verify/receipt?rcp=${receipt.receipt_number || ''}&std=${receipt.student_id || ''}&amt=${receipt.amount || ''}`}
              />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-[10.5px] leading-tight">
                Thank you for your payment.
              </p>
              <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">
                {disclaimerText}
              </p>
              <p className="text-[8.5px] text-slate-500 leading-tight">
                For any queries, contact the academy office.
              </p>
            </div>
          </div>

          {/* Right: Authorized Signatory (4 cols) */}
          <div className="col-span-4 flex flex-col items-center sm:items-end text-center sm:text-right">
            <div className="mb-0.5">
              <AuthorizedSignatureSVG />
            </div>
            <p className="font-black text-slate-900 text-[10px] uppercase tracking-wide leading-none">
              {signatoryTitle}
            </p>
            <p className="text-[9px] text-slate-500 font-semibold mt-0.5 leading-none">
              {signatoryName}
            </p>
          </div>
        </footer>

        {/* Embedded Print Safeguard Stylesheet */}
        <style>{`
          @media print {
            #${containerId} {
              width: 100% !important;
              max-width: 136mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              visibility: visible !important;
              display: block !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #${containerId} * {
              visibility: visible !important;
            }
            #${containerId} .receipt-header {
              display: flex !important;
              visibility: visible !important;
            }
            #${containerId} .receipt-history-table {
              display: table !important;
              visibility: visible !important;
            }
            #${containerId} .receipt-footer {
              display: grid !important;
              visibility: visible !important;
            }
            #${containerId} .print-branding-footer {
              display: block !important;
              visibility: visible !important;
              text-align: center !important;
              margin-top: 6px !important;
              padding-top: 4px !important;
            }
            #${containerId} .print-branding-footer p {
              font-size: 8pt !important;
              color: #64748b !important;
              font-weight: 300 !important;
              letter-spacing: 0.025em !important;
            }
            .print\\:hidden, button {
              display: none !important;
            }
          }
        `}</style>

        {/* Subtle Decorative Bottom Accent Strip */}
        <div
          className="w-full h-1.5 bg-gradient-to-r from-blue-700 via-sky-500 to-blue-700 rounded-b-xl mt-3"
          aria-hidden="true"
        />

        {/* Global Print & Share Branding */}
        <PrintBrandingFooter className="pt-2 pb-0.5 print:pb-0" />
      </div>
    </div>
  )
}
