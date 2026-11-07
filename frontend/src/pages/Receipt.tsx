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
 * @updated     2026-11-08
 *
 * @description Official printable fee receipt voucher page with historical payment details and fee summary.
 */

import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { getPaymentReceipt } from '../api/endpoints'
import PaymentReceiptView from '../components/PaymentReceiptView'

export default function Receipt() {
  const { paymentId, receiptNumber } = useParams<{ paymentId?: string; receiptNumber?: string }>()
  const identifier = receiptNumber || paymentId

  const { data: receipt, isLoading, isError } = useQuery({
    queryKey: ['receipt', identifier],
    queryFn: () => getPaymentReceipt(identifier!),
    enabled: !!identifier,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (isError || !receipt) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Receipt not found.</p>
        <Link to="/students" className="btn-primary mt-4 inline-block">
          Back to Students
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Navigation Breadcrumb Controls (hidden on print) */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/fees?tab=receipts" className="text-primary-600 hover:underline text-sm font-semibold">
            &larr; Receipts Register
          </Link>
          <span className="text-gray-300">|</span>
          <Link to={`/students/${receipt.student_id}`} className="text-gray-600 hover:underline text-sm">
            Student Profile
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/fees" className="text-gray-600 hover:underline text-sm">
            Fees Workspace
          </Link>
        </div>
      </div>

      {/* Official Receipt Card with Current Transaction, Historical Payments, and Balance Summary */}
      <PaymentReceiptView receipt={receipt} showPrintActions={true} />
    </div>
  )
}
