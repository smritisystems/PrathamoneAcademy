/**
 * @file        Payments.tsx
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
 * @updated     2026-11-05
 *
 * @description Standalone payment transactions ledger and audit log page.
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  DollarSign, CheckCircle, AlertTriangle, Printer, RotateCcw,
  Download, CreditCard, ArrowRight, FileText, Share2
} from 'lucide-react'
import ShareModal from '../components/ShareModal'
import { paymentsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import CascadingFilters, { FilterState } from '../components/CascadingFilters'
import Modal from '../components/Modal'
import type { PaymentTransactionItem } from '../types'
import toast from 'react-hot-toast'

const fmt = (n: number | string | undefined | null) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0))

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
}

export default function Payments() {
  const { selectedAcademicYearId } = useAuthStore()
  const queryClient = useQueryClient()

  const [filters, setFilters] = useState<FilterState>({
    academicYearId: selectedAcademicYearId || null,
    boardId: null,
    standardId: null,
    divisionId: null,
    status: '',
    search: '',
  })

  const [reversalModalOpen, setReversalModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransactionItem | null>(null)
  const [reversalReason, setReversalReason] = useState('')
  const [sharingPayment, setSharingPayment] = useState<PaymentTransactionItem | null>(null)

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments-page', filters],
    queryFn: async () => {
      const res = await paymentsApi.list({
        academic_year_id: filters.academicYearId ?? undefined,
        board_id: filters.boardId ?? undefined,
        standard_id: filters.standardId ?? undefined,
        division_id: filters.divisionId ?? undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
      })
      return res.data
    },
  })

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      paymentsApi.reverse(id, reason),
    onSuccess: () => {
      toast.success('Payment successfully reversed and balances restored')
      queryClient.invalidateQueries({ queryKey: ['payments-page'] })
      queryClient.invalidateQueries({ queryKey: ['payments-list'] })
      queryClient.invalidateQueries({ queryKey: ['fees-overview'] })
      queryClient.invalidateQueries({ queryKey: ['fee-register'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setReversalModalOpen(false)
      setSelectedPayment(null)
      setReversalReason('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to reverse payment')
    },
  })

  const handleOpenReverse = (payment: PaymentTransactionItem) => {
    setSelectedPayment(payment)
    setReversalReason('')
    setReversalModalOpen(true)
  }

  const handleConfirmReverse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayment) return
    if (!reversalReason.trim()) {
      toast.error('Please provide a reason for reversal')
      return
    }
    reverseMutation.mutate({ id: selectedPayment.id, reason: reversalReason.trim() })
  }

  const exportPaymentsCsv = () => {
    if (!payments.length) {
      toast.error('No payment transactions to export')
      return
    }
    const headers = [
      'Receipt No', 'Admission No', 'Student Name', 'Board', 'Standard',
      'Batch', 'Amount (INR)', 'Payment Date', 'Method', 'Reference', 'Status',
    ]
    const rows = payments.map((p) => [
      `"${p.receipt_number}"`,
      `"${p.admission_number}"`,
      `"${p.student_name}"`,
      `"${p.board_name}"`,
      `"${p.standard_name}"`,
      `"${p.batch_name}"`,
      p.amount,
      `"${p.payment_date}"`,
      `"${p.payment_method}"`,
      `"${p.transaction_reference || 'N/A'}"`,
      `"${p.status}"`,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `payments_ledger_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success('Payments Ledger exported successfully')
  }

  const totalCollected = payments
    .filter((p) => p.status !== 'reversed')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Payment History & Transactions</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Audit Ledger
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Immutable transaction ledger, payment vouchers, receipts, and reversal audit history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/fees?tab=collect" className="btn-primary text-sm flex items-center gap-1.5 shadow-sm">
            <CreditCard className="w-4 h-4" />
            <span>Collect Fee</span>
          </Link>

          <Link to="/fees?tab=register" className="btn-secondary text-sm flex items-center gap-1.5 shadow-sm">
            <span>Fee Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Cascading Dynamic Filters */}
      <CascadingFilters
        filters={filters}
        onChange={(updated) => setFilters(updated)}
        showSearch={true}
        searchPlaceholder="Search by student name, admission #, receipt #, or ref..."
        showStatus={true}
        statusOptions={[
          { value: '', label: 'All Statuses' },
          { value: 'completed', label: 'Completed' },
          { value: 'reversed', label: 'Reversed' },
        ]}
        title="Filter Transactions"
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-white border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Collected
          </p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {fmt(totalCollected)}
          </p>
          <p className="text-xs text-gray-400 mt-1">From active completed payments</p>
        </div>

        <div className="card bg-white border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Completed Transactions
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {payments.filter((p) => p.status !== 'reversed').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Valid collection receipts</p>
        </div>

        <div className="card bg-white border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Reversals Recorded
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {payments.filter((p) => p.status === 'reversed').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Audited voided vouchers</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="text-sm text-gray-600">
          Showing <strong className="text-gray-900">{payments.length}</strong> transaction record(s)
        </div>
        <button
          onClick={exportPaymentsCsv}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-primary-600" />
          Export CSV
        </button>
      </div>

      {/* Payments Table */}
      <div className="card bg-white border border-gray-200 shadow-sm overflow-hidden p-0">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading payments ledger...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base font-semibold text-gray-600">No payment transactions found.</p>
            <p className="text-xs text-gray-400 mt-1">
              Payments recorded from the Fee Register or Collect Fee terminal will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Batch / Course</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-primary-700">
                      <Link
                        to={`/receipts/${p.receipt_number}`}
                        className="hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {p.receipt_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/students/${p.student_id}`}
                        className="font-bold text-gray-900 hover:text-primary-600"
                      >
                        {p.student_name}
                      </Link>
                      <span className="block text-xs font-mono text-gray-400">
                        {p.admission_number}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-800">{p.batch_name}</span>
                      <span className="block text-xs text-gray-400">
                        {p.board_name} · {p.standard_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                      {fmt(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">{p.payment_date}</td>
                    <td className="py-3.5 px-4 text-xs capitalize text-gray-600">
                      {METHOD_LABELS[p.payment_method] || p.payment_method}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 font-mono">
                      {p.transaction_reference || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          p.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/receipts/${p.receipt_number}`}
                          className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5 text-primary-600" />
                          <span>Receipt</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setSharingPayment(p)}
                          className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"
                          title="Share Receipt via WhatsApp, Email or Link"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Share</span>
                        </button>
                        {p.status !== 'reversed' && (
                          <button
                            type="button"
                            onClick={() => handleOpenReverse(p)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium py-1 px-2 border border-red-200 rounded hover:bg-red-50 inline-flex items-center gap-1"
                            title="Reverse Payment"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audited Reversal Modal */}
      <Modal
        isOpen={reversalModalOpen}
        onClose={() => setReversalModalOpen(false)}
        title="Confirm Audited Payment Reversal"
        size="md"
      >
        <form onSubmit={handleConfirmReverse} className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-3.5 rounded-lg text-xs text-red-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-red-900 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Audited Financial Correction
            </p>
            <p>
              Reversing receipt <strong>{selectedPayment?.receipt_number}</strong> for{' '}
              <strong>{fmt(selectedPayment?.amount)}</strong> will void the receipt and
              restore the outstanding balance on the student invoice.
            </p>
          </div>

          <div>
            <label className="label">
              Audited Reason for Reversal <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="e.g. Cheque bounced, duplicate entry, incorrect amount recorded..."
              rows={3}
              className="input w-full"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setReversalModalOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reverseMutation.isPending}
              className="btn-danger text-sm flex items-center gap-1"
            >
              {reverseMutation.isPending ? 'Reversing...' : 'Confirm Reversal'}
            </button>
          </div>
        </form>
      </Modal>

      {sharingPayment && (
        <ShareModal
          isOpen={!!sharingPayment}
          onClose={() => setSharingPayment(null)}
          documentType="RECEIPT"
          recordId={sharingPayment.id}
          title={`Fee Receipt #${sharingPayment.receipt_number}`}
          recipientName={sharingPayment.student_name}
          defaultMessage={`Dear Parent, official fee receipt #${sharingPayment.receipt_number} for ${sharingPayment.student_name} (Amount: ₹${sharingPayment.amount?.toLocaleString('en-IN')}) is ready.`}
        />
      )}
    </div>
  )
}
