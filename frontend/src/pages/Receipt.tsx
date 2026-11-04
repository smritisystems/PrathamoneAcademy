/**
 * @file        Receipt.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-04
 *
 * @description Official printable fee receipt voucher page with amount-in-words converter.
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getPaymentReceipt } from '../api/endpoints';
import { printReceiptElement } from '../utils/printReceipt';

export default function Receipt() {
  const { paymentId, receiptNumber } = useParams<{ paymentId?: string; receiptNumber?: string }>();
  const identifier = receiptNumber || paymentId;

  const { data: receipt, isLoading, isError } = useQuery({
    queryKey: ['receipt', identifier],
    queryFn: () => getPaymentReceipt(identifier!),
    enabled: !!identifier,
  });

  const handlePrint = () => {
    printReceiptElement(
      'receipt-print-area',
      receipt?.receipt_number ? `Official Fee Receipt #${receipt.receipt_number}` : 'Official Fee Receipt'
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Receipt not found.</p>
        <Link to="/students" className="btn-primary mt-4 inline-block">
          Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Screen controls (hidden on print) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/fees?tab=receipts" className="text-primary-700 hover:underline text-sm font-medium">
            ← Receipts Register
          </Link>
          <span className="text-gray-300">|</span>
          <Link to={`/students/${receipt.student_id}`} className="text-gray-600 hover:underline text-sm">
            Student Profile
          </Link>
        </div>
        <button onClick={handlePrint} className="btn-primary">
          🖨️ Print Receipt
        </button>
      </div>

      {/* Receipt Card */}
      <div id="receipt-print-area" className="bg-white border-2 border-gray-200 rounded-xl p-8 shadow-lg print:shadow-none print:border-gray-300">
        {/* Header */}
        <div className="text-center border-b-2 border-blue-600 pb-6 mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">PA</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-blue-900">Prashant Academy</h1>
          <p className="text-gray-500 text-sm mt-1">Coaching Institute Management System</p>
          <div className="mt-3 inline-block bg-blue-50 border border-blue-200 rounded-lg px-6 py-2">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
              Official Fee Receipt
            </p>
            <p className="text-lg font-bold text-blue-900">{receipt.receipt_number}</p>
          </div>
        </div>

        {/* Student & Payment Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Student Information
            </h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-500">Name: </span>
                <span className="font-medium text-gray-900">{receipt.student_name || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Admission No: </span>
                <span className="font-medium text-gray-900">{receipt.admission_number || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Standard: </span>
                <span className="font-medium text-gray-900">{receipt.standard || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Batch: </span>
                <span className="font-medium text-gray-900">{receipt.division || '—'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Payment Details
            </h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-500">Date: </span>
                <span className="font-medium text-gray-900">
                  {receipt.issued_at
                    ? new Date(receipt.issued_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Invoice No: </span>
                <span className="font-medium text-gray-900">{receipt.invoice_number || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Method: </span>
                <span className="font-medium text-gray-900 capitalize">
                  {receipt.payment_method?.replace('_', ' ') || '—'}
                </span>
              </div>
              {receipt.transaction_reference && (
                <div>
                  <span className="text-gray-500">Reference: </span>
                  <span className="font-medium text-gray-900">{receipt.transaction_reference}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Amount Box */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-center mb-6">
          <p className="text-blue-100 text-sm font-medium uppercase tracking-wide mb-1">
            Amount Received
          </p>
          <p className="text-4xl font-bold text-white">
            ₹{parseFloat(String(receipt.amount || 0)).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        {/* Allocation Detail */}
        {receipt.allocations && receipt.allocations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Applied To
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Installment</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipt.allocations.map((alloc: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-gray-700">
                      Installment {alloc.installment_number || idx + 1}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ₹{parseFloat(String(alloc.amount)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Fee Balance */}
        {(receipt.total_fees !== undefined || receipt.outstanding_after !== undefined) && (
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center mb-6">
            <div>
              <p className="text-xs text-gray-500">Total Fees</p>
              <p className="font-bold text-gray-900">
                ₹{parseFloat(String(receipt.total_fees || 0)).toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="font-bold text-green-600">
                ₹{parseFloat(String(receipt.total_paid || 0)).toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="font-bold text-red-600">
                ₹{parseFloat(String(receipt.outstanding_after || 0)).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        )}

        {/* Received By */}
        <div className="flex justify-between items-end mt-8 pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-400">Collected by</p>
            <p className="text-sm font-medium text-gray-700">{receipt.collected_by || 'Staff'}</p>
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-gray-300 w-40 mb-1" />
            <p className="text-xs text-gray-400">Authorised Signature</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          This is a computer-generated receipt and does not require a physical signature.
          <br />
          For queries, contact admin@prashantacademy.edu.in
        </p>
      </div>
    </div>
  );
}

