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
 * @version     1.0.0
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Official fee receipt component displaying current transaction, chronological previous payments, and ledger balance summary.
 */

import React, { useState } from 'react'
import { Printer, AlertTriangle, CheckCircle, Clock, ShieldCheck, FileText } from 'lucide-react'
import { DetailedPaymentReceipt, Receipt } from '../types'
import { printReceiptElement } from '../utils/printReceipt'
import { numberToWordsINR } from '../pages/Fees'

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
  other: 'Other',
}

interface PaymentReceiptViewProps {
  receipt: DetailedPaymentReceipt | Receipt | any
  showPrintActions?: boolean
  initialPaperSize?: 'A4' | 'A5'
  onClose?: () => void
  containerId?: string
}

export default function PaymentReceiptView({
  receipt,
  showPrintActions = true,
  initialPaperSize = 'A4',
  onClose,
  containerId = 'receipt-print-area',
}: PaymentReceiptViewProps) {
  const [paperSize, setPaperSize] = useState<'A4' | 'A5'>(initialPaperSize)

  const isReversed = receipt.status === 'reversed' || receipt.is_reversed

  // Reconciled fee summary values
  const feeSummary = receipt.fee_summary || {
    total_fee_amount: receipt.total_fees ?? receipt.amount,
    previous_payments_total: receipt.previous_paid ?? 0,
    current_payment_amount: receipt.amount,
    total_paid_to_date: receipt.total_paid ?? receipt.amount,
    outstanding_balance: receipt.outstanding_after ?? 0,
  }

  const historicalPayments = receipt.historical_payments || []

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
    : '—'

  return (
    <div className="space-y-4">
      {/* Screen Control Bar (Hidden on Print) */}
      {showPrintActions && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Print Paper Format:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
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
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable Receipt Canvas Container */}
      <div
        id={containerId}
        className={`bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-sm print:shadow-none print:border-slate-300 space-y-5 mx-auto ${
          paperSize === 'A5' ? 'max-w-[145mm]' : 'max-w-3xl'
        }`}
      >
        {/* Reversal / Voided Stamp (if applicable) */}
        {isReversed && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 text-center text-red-800">
            <div className="flex items-center justify-center gap-1.5 font-black uppercase tracking-wider text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>VOIDED / REVERSED TRANSACTION</span>
            </div>
            <p className="text-xs text-red-700 mt-0.5">
              This receipt was reversed on{' '}
              {receipt.reversed_at
                ? new Date(receipt.reversed_at).toLocaleDateString('en-IN')
                : 'Prior Session'}{' '}
              {receipt.reversal_reason ? `• Reason: ${receipt.reversal_reason}` : ''}
            </p>
          </div>
        )}

        {/* 1. Official Academy Header */}
        <div className="text-center border-b-2 border-blue-600 pb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl text-white font-black text-xl flex items-center justify-center shadow-md print:shadow-none">
              PA
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                PRASHANT ACADEMY
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Coaching Institute Management System • Official Fee Voucher
              </p>
            </div>
          </div>

          <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-extrabold text-blue-900">
            <span>OFFICIAL RECEIPT:</span>
            <span className="font-mono tracking-wider">{receipt.receipt_number}</span>
          </div>
        </div>

        {/* 2. Section A: Current Payment & Student Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wide">
              Student Details
            </p>
            <p className="font-extrabold text-slate-900 text-sm">{receipt.student_name || '—'}</p>
            <p className="text-slate-600">
              Admission No:{' '}
              <span className="font-mono font-bold text-slate-800">
                {receipt.admission_number || '—'}
              </span>
            </p>
            <p className="text-slate-600">
              Standard / Batch:{' '}
              <span className="font-semibold text-slate-800">
                {receipt.standard || '—'} ({receipt.division || receipt.batch || 'General'})
              </span>
            </p>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wide">
              Transaction Details
            </p>
            <p className="font-extrabold text-slate-900 text-sm">{formattedDate}</p>
            <p className="text-slate-600">
              Invoice Ref:{' '}
              <span className="font-mono font-bold text-slate-800">
                {receipt.invoice_number || 'N/A'}
              </span>
            </p>
            <p className="text-slate-600">
              Payment Mode:{' '}
              <span className="font-bold text-slate-800 capitalize">
                {METHOD_LABELS[receipt.payment_method] || receipt.payment_method?.replace('_', ' ')}
              </span>
            </p>
            {(receipt.transaction_reference || receipt.cheque_number) && (
              <p className="text-slate-600">
                Ref No:{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {receipt.transaction_reference || receipt.cheque_number}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* 3. Current Amount Received Box */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4 text-center shadow-xs print:shadow-none print:bg-blue-600">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-0.5">
            Current Amount Received
          </p>
          <p className="text-3xl font-black tracking-tight">{fmt(receipt.amount)}</p>
          <p className="text-xs italic text-blue-100 mt-1 font-medium">
            ({numberToWordsINR(Number(receipt.amount))})
          </p>
        </div>

        {/* 4. Section B: Historical Payment Details (Same Fee Obligation) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Historical Payment Details (Previous Installments)</span>
            </div>
            {historicalPayments.length > 0 && (
              <span className="text-[11px] font-semibold text-slate-500">
                {historicalPayments.length} previous payment{historicalPayments.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="receipt-history-table w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3 border border-slate-200">Date</th>
                  <th className="py-2 px-3 border border-slate-200">Receipt No.</th>
                  <th className="py-2 px-3 border border-slate-200">Payment Method</th>
                  <th className="py-2 px-3 border border-slate-200 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {historicalPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-3 px-3 text-center text-slate-500 italic bg-white"
                    >
                      No previous payments. (This is the initial payment against this fee obligation.)
                    </td>
                  </tr>
                ) : (
                  historicalPayments.map((p: any, idx: number) => (
                    <tr key={p.payment_id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 border border-slate-200 font-medium">
                        {p.date
                          ? new Date(p.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-2 px-3 border border-slate-200 font-mono font-semibold text-blue-900">
                        {p.receipt_number}
                      </td>
                      <td className="py-2 px-3 border border-slate-200 capitalize">
                        {METHOD_LABELS[p.payment_method] || p.payment_method?.replace('_', ' ')}
                      </td>
                      <td className="py-2 px-3 border border-slate-200 text-right font-bold text-slate-900">
                        {fmt(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {historicalPayments.length > 0 && (
                <tfoot className="bg-slate-50 font-bold text-slate-900 text-xs">
                  <tr>
                    <td colSpan={3} className="py-2 px-3 border border-slate-200 text-right">
                      Previous Payments Total:
                    </td>
                    <td className="py-2 px-3 border border-slate-200 text-right font-black text-blue-950">
                      {fmt(feeSummary.previous_payments_total)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* 5. Section C: Fee Ledger & Account Balance Summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 uppercase tracking-wide pb-1 border-b border-slate-200">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Fee Account & Balance Summary</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Fee</p>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                {fmt(feeSummary.total_fee_amount)}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Previous Paid</p>
              <p className="font-extrabold text-slate-700 text-sm mt-0.5">
                {fmt(feeSummary.previous_payments_total)}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-blue-700 uppercase">Current Paid</p>
              <p className="font-black text-blue-900 text-sm mt-0.5">
                {fmt(feeSummary.current_payment_amount)}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Total Paid to Date</p>
              <p className="font-black text-emerald-800 text-sm mt-0.5">
                {fmt(feeSummary.total_paid_to_date)}
              </p>
            </div>
            <div
              className={`rounded-xl p-2.5 border col-span-2 sm:col-span-1 ${
                feeSummary.outstanding_balance <= 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <p className="text-[10px] font-bold uppercase">Outstanding Balance</p>
              <p className="font-black text-sm mt-0.5">
                {feeSummary.outstanding_balance <= 0
                  ? '₹0.00 (Paid in Full)'
                  : fmt(feeSummary.outstanding_balance)}
              </p>
            </div>
          </div>
        </div>

        {/* 6. Installment Allocations (if available) */}
        {receipt.allocations && receipt.allocations.length > 0 && (
          <div className="text-xs text-slate-600 bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5">
            <span className="font-bold text-slate-700 mr-2">Allocated To:</span>
            {receipt.allocations.map((a: any, idx: number) => (
              <span key={a.id || idx} className="inline-block mr-3">
                Installment {a.installment_number || idx + 1}:{' '}
                <strong className="text-slate-900">{fmt(a.amount)}</strong>
              </span>
            ))}
          </div>
        )}

        {/* 7. Verification & Signatory Section */}
        <div className="pt-4 border-t-2 border-slate-200 flex items-end justify-between text-xs">
          <div>
            <p className="text-slate-400 font-bold uppercase text-[10px]">Received & Verified By</p>
            <p className="font-extrabold text-slate-800 mt-0.5">{receipt.collected_by || 'Academy Accounts Office'}</p>
            <p className="text-[10px] text-slate-400">Timestamp: {receipt.generated_at ? new Date(receipt.generated_at).toLocaleString('en-IN') : 'Official Stamp'}</p>
          </div>

          <div className="text-right">
            <div className="h-8 border-b border-slate-400 w-44 mx-auto mb-1" />
            <p className="font-extrabold text-slate-800 uppercase tracking-wide text-[10px]">
              Authorized Signatory
            </p>
            <p className="text-[9px] text-slate-400">For Prashant Academy Coaching Institute</p>
          </div>
        </div>

        {/* 8. Disclaimer & Compliance Footer */}
        <div className="pt-2 border-t border-slate-100 text-center text-[10px] text-slate-400 leading-tight">
          <p>
            This is a computer-generated official receipt voucher and does not require a physical signature.
            <br />
            Prashant Academy IMS &bull; DPDP Compliance Certified &bull; Ref: {receipt.receipt_number} &bull; For queries: admin@prashantacademy.edu.in
          </p>
        </div>
      </div>
    </div>
  )
}
