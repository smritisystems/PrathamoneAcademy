/**
 * @file        StudentExitModal.tsx
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
 * @description Modal dialog for recording formal student withdrawal, exit reason, and processing refund.
 */

import React, { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from './Modal'
import { studentsApi } from '../api/endpoints'
import type { StudentExitPayload } from '../types'

export interface StudentExitModalProps {
  isOpen: boolean
  onClose: () => void
  student: {
    id: number
    admission_number?: string
    first_name?: string
    last_name?: string
    full_name?: string
  } | null
  onSuccess: () => void
}

const EXIT_REASONS = [
  'Relocated / Moved Away',
  'Joined Another Institute / School',
  'Financial Difficulties',
  'Academic / Course Difficulty',
  'Medical / Health Issues',
  'Personal / Family Reasons',
  'Course Completed Early',
  'Dissatisfied with Service',
  'Other',
]

export default function StudentExitModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: StudentExitModalProps) {
  const [exitDate, setExitDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState(EXIT_REASONS[0])
  const [notes, setNotes] = useState('')
  const [issueRefund, setIssueRefund] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'upi'>('bank_transfer')
  const [refundReference, setRefundReference] = useState('')
  const [refundNotes, setRefundNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!student) return null

  const studentName = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!exitDate) {
      setErrorMsg('Effective exit date is required.')
      return
    }

    if (!reason.trim()) {
      setErrorMsg('Withdrawal reason is required.')
      return
    }

    let parsedRefund: number | undefined = undefined
    if (issueRefund) {
      parsedRefund = parseFloat(refundAmount)
      if (isNaN(parsedRefund) || parsedRefund <= 0) {
        setErrorMsg('Please specify a valid refund amount greater than 0.')
        return
      }
    }

    const payload: StudentExitPayload = {
      exit_date: exitDate,
      reason,
      notes: notes.trim() || undefined,
      refund_amount: parsedRefund,
      refund_method: issueRefund ? refundMethod : undefined,
      refund_reference: issueRefund && refundReference.trim() ? refundReference.trim() : undefined,
      refund_notes: issueRefund && refundNotes.trim() ? refundNotes.trim() : undefined,
    }

    try {
      setSubmitting(true)
      await studentsApi.exit(student.id, payload)
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to exit student.'
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Student Withdrawal / Exit" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning Banner */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Confirming withdrawal for: </span>
            {studentName} ({student.admission_number}).
            This action will mark the active enrollment as <span className="font-semibold">Withdrawn</span> and
            deactivate the student account while retaining all historical fee ledgers and audit records.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Effective Exit Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="input w-full text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Withdrawal Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input w-full text-sm"
            >
              {EXIT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Exit Notes / Justification
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input w-full text-sm"
            placeholder="Administrative explanation, exit interview notes, or remarks..."
          />
        </div>

        {/* Refund Section */}
        <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50/50 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={issueRefund}
              onChange={(e) => setIssueRefund(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <span className="text-xs font-semibold text-gray-800">
              Process Fee Refund for this Student
            </span>
          </label>

          {issueRefund && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Refund Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="input w-full text-sm font-mono"
                  placeholder="e.g. 5000"
                  required={issueRefund}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Refund Method
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="input w-full text-sm"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reference # / Cheque No.
                </label>
                <input
                  type="text"
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="e.g. UTR / CHQ-1049"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Refund Notes
                </label>
                <input
                  type="text"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="Reason for refund approval, bank account details..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? 'Processing...' : 'Confirm Student Exit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

