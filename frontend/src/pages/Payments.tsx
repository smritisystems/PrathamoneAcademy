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
 * @version     2.0.0
 * @created     2026-11-03
 * @updated     2026-11-07
 *
 * @description Standalone payment transactions ledger, ERP payment workflow lifecycle, receipt supersession, audited corrections, and refund management.
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  DollarSign, CheckCircle, AlertTriangle, Printer, RotateCcw,
  Download, CreditCard, ArrowRight, FileText, Share2, Edit3,
  Send, CheckCheck, Undo2, History, AlertCircle, RefreshCw,
  Clock, ShieldAlert, Sparkles, ChevronRight
} from 'lucide-react'
import ShareModal from '../components/ShareModal'
import { paymentsApi } from '../api/endpoints'
import { useAuthStore, isUserSysAdmin, hasPermission, canUserEditPosted } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import { Lock } from 'lucide-react'
import CascadingFilters, { FilterState } from '../components/CascadingFilters'
import Modal from '../components/Modal'
import type { PaymentTransactionItem, PaymentAuditLog } from '../types'
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

const APPROVER_ROLES = ['superadmin', 'sysadmin', 'admin', 'director', 'principal']

export default function Payments() {
  const { user, selectedAcademicYearId } = useAuthStore()
  const editScope = 'finance:payments'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const queryClient = useQueryClient()
  const userRole = (user?.role || '').toLowerCase()
  const isSysAdmin = isUserSysAdmin(user)

  // Query: Resolved payment permissions for current user from backend
  const { data: userPerms } = useQuery({
    queryKey: ['my-payment-permissions'],
    queryFn: async () => {
      const res = await paymentsApi.getMyPermissions()
      return res.data
    },
    staleTime: 30000,
  })

  // Granular capability flags verified against API and store
  const canEditPosted = userPerms ? userPerms.can_edit_posted : canUserEditPosted(user)
  const canApprove = userPerms ? userPerms.can_approve_refund : APPROVER_ROLES.includes(userRole)
  const canRefund = userPerms ? userPerms.can_process_refund : ['superadmin', 'sysadmin', 'admin', 'principal', 'accountant'].includes(userRole)
  const canEditSubmitted = userPerms ? userPerms.can_edit_submitted : true
  const canViewAudit = userPerms ? userPerms.can_view_audit : true

  // Sysadmin Toggle Permission Modal State
  const [togglePermModalOpen, setTogglePermModalOpen] = useState(false)
  const [togglePermReason, setTogglePermReason] = useState('')

  const togglePermMutation = useMutation({
    mutationFn: (granted: boolean) =>
      paymentsApi.toggleEditPosted({
        role_name: 'sysadmin',
        granted,
        reason: togglePermReason.trim() || 'SysAdmin administrative security authorization',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-payment-permissions'] })
      queryClient.invalidateQueries({ queryKey: ['payments-page'] })
      setTogglePermModalOpen(false)
      setTogglePermReason('')
      toast.success(res.data.message)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to toggle permission')
    },
  })

  const [filters, setFilters] = useState<FilterState>({
    academicYearId: selectedAcademicYearId || null,
    boardId: null,
    standardId: null,
    divisionId: null,
    status: '',
    search: '',
  })

  // Modal states
  const [reversalModalOpen, setReversalModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransactionItem | null>(null)
  const [reversalReason, setReversalReason] = useState('')
  const [sharingPayment, setSharingPayment] = useState<PaymentTransactionItem | null>(null)

  // Edit Payment Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentTransactionItem | null>(null)
  const [editForm, setEditForm] = useState({
    amount: 0,
    payment_date: '',
    payment_method: 'cash',
    transaction_reference: '',
    bank_name: '',
    cheque_number: '',
    cheque_date: '',
    notes: '',
    edit_reason: '',
  })

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundingPayment, setRefundingPayment] = useState<PaymentTransactionItem | null>(null)
  const [refundForm, setRefundForm] = useState({
    amount: 0,
    refund_method: 'bank_transfer',
    reason: '',
    reference_note: '',
  })

  // Approval Modal State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [approvingPayment, setApprovingPayment] = useState<PaymentTransactionItem | null>(null)
  const [approvalRemarks, setApprovalRemarks] = useState('')

  // Audit Trail Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [auditedPayment, setAuditedPayment] = useState<PaymentTransactionItem | null>(null)

  // Query: Payments List
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

  // Query: Audit Trail for selected payment
  const { data: auditTrail = [], isLoading: isAuditLoading } = useQuery({
    queryKey: ['payment-audit-trail', auditedPayment?.id],
    queryFn: async () => {
      if (!auditedPayment) return []
      const res = await paymentsApi.getAuditTrail(auditedPayment.id)
      return res.data
    },
    enabled: !!auditedPayment && auditModalOpen,
  })

  const invalidatePaymentQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['payments-page'] })
    queryClient.invalidateQueries({ queryKey: ['payments-list'] })
    queryClient.invalidateQueries({ queryKey: ['fees-overview'] })
    queryClient.invalidateQueries({ queryKey: ['fee-register'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  // Mutation: Reverse
  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      paymentsApi.reverse(id, reason),
    onSuccess: () => {
      toast.success('Payment successfully reversed and balances restored')
      invalidatePaymentQueries()
      setReversalModalOpen(false)
      setSelectedPayment(null)
      setReversalReason('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to reverse payment')
    },
  })

  // Mutation: Submit
  const submitMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.submit(id),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Payment submitted successfully')
      invalidatePaymentQueries()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to submit payment')
    },
  })

  // Mutation: Approve
  const approveMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      paymentsApi.approve(id, { remarks }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Payment approved successfully')
      invalidatePaymentQueries()
      setApprovalModalOpen(false)
      setApprovingPayment(null)
      setApprovalRemarks('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to approve payment')
    },
  })

  // Mutation: Post
  const postMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.postPayment(id),
    onSuccess: (res) => {
      toast.success(res.data.message || `Payment posted! Receipt #${res.data.receipt_number}`)
      invalidatePaymentQueries()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to post payment')
    },
  })

  // Mutation: Audited Edit
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      paymentsApi.update(id, data),
    onSuccess: (res) => {
      if (res.data.is_superseded) {
        toast.success(`Payment updated! Receipt was superseded: New #${res.data.receipt_number}`)
      } else {
        toast.success('Payment details updated successfully')
      }
      invalidatePaymentQueries()
      setEditModalOpen(false)
      setEditingPayment(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update payment')
    },
  })

  // Mutation: Refund Request
  const refundMutation = useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: number; data: any }) =>
      paymentsApi.requestRefund(paymentId, data),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Refund recorded successfully')
      invalidatePaymentQueries()
      setRefundModalOpen(false)
      setRefundingPayment(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to process refund')
    },
  })

  const handleOpenReverse = (payment: PaymentTransactionItem) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to reverse payments.')
      return
    }
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

  const handleOpenEdit = (payment: PaymentTransactionItem) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to modify payment records.')
      return
    }
    setEditingPayment(payment)
    setEditForm({
      amount: Number(payment.amount),
      payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
      payment_method: payment.payment_method || 'cash',
      transaction_reference: payment.transaction_reference || '',
      bank_name: '',
      cheque_number: '',
      cheque_date: '',
      notes: payment.notes || '',
      edit_reason: '',
    })
    setEditModalOpen(true)
  }

  const handleConfirmEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPayment) return
    if (editingPayment.status !== 'draft' && !editForm.edit_reason.trim()) {
      toast.error('An audit reason is required for editing submitted or posted payments')
      return
    }
    editMutation.mutate({
      id: editingPayment.id,
      data: {
        amount: Number(editForm.amount),
        payment_date: editForm.payment_date,
        payment_method: editForm.payment_method,
        transaction_reference: editForm.transaction_reference,
        bank_name: editForm.bank_name || undefined,
        cheque_number: editForm.cheque_number || undefined,
        cheque_date: editForm.cheque_date || undefined,
        notes: editForm.notes,
        reason: editForm.edit_reason.trim() || 'Payment details update',
        edit_reason: editForm.edit_reason.trim() || 'Payment details update',
      },
    })
  }

  const handleOpenRefund = (payment: PaymentTransactionItem) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to process refunds.')
      return
    }
    setRefundingPayment(payment)
    const maxRefund = Number(payment.refundable_balance ?? payment.amount)
    setRefundForm({
      amount: maxRefund,
      refund_method: 'bank_transfer',
      reason: '',
      reference_note: '',
    })
    setRefundModalOpen(true)
  }

  const handleConfirmRefund = (e: React.FormEvent) => {
    e.preventDefault()
    if (!refundingPayment) return
    const maxRefund = Number(refundingPayment.refundable_balance ?? refundingPayment.amount)
    if (refundForm.amount <= 0 || refundForm.amount > maxRefund) {
      toast.error(`Refund amount must be between ₹1 and ₹${maxRefund.toLocaleString('en-IN')}`)
      return
    }
    if (!refundForm.reason.trim()) {
      toast.error('Please specify a reason for the refund')
      return
    }
    refundMutation.mutate({
      paymentId: refundingPayment.id,
      data: {
        amount: Number(refundForm.amount),
        refund_method: refundForm.refund_method,
        reason: refundForm.reason.trim(),
        reference_note: refundForm.reference_note.trim() || undefined,
      },
    })
  }

  const handleOpenApproval = (payment: PaymentTransactionItem) => {
    setApprovingPayment(payment)
    setApprovalRemarks('')
    setApprovalModalOpen(true)
  }

  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault()
    if (!approvingPayment) return
    approveMutation.mutate({
      id: approvingPayment.id,
      remarks: approvalRemarks.trim() || undefined,
    })
  }

  const handleOpenAudit = (payment: PaymentTransactionItem) => {
    setAuditedPayment(payment)
    setAuditModalOpen(true)
  }

  const exportPaymentsCsv = () => {
    if (!payments.length) {
      toast.error('No payment transactions to export')
      return
    }
    const headers = [
      'Receipt No', 'Admission No', 'Student Name', 'Board', 'Standard',
      'Batch', 'Amount (INR)', 'Payment Date', 'Method', 'Reference', 'Status', 'Edits',
    ]
    const rows = payments.map((p) => [
      `"${p.receipt_number || 'PENDING'}"`,
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
      p.edit_count || 0,
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
    .filter((p) => p.status === 'posted' || p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const pendingWorkflowCount = payments.filter((p) =>
    ['draft', 'submitted', 'approved'].includes(p.status)
  ).length

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Payment History & Transactions Ledger" isDirty={editModalOpen || refundModalOpen || reversalModalOpen} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Payment History & Transactions</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Audit Ledger
            </span>
            {isSysAdmin && (
              canEditPosted ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  <span>Posted Edits: Unlocked</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTogglePermReason('Administrative lock applied')
                      togglePermMutation.mutate(false)
                    }}
                    className="ml-1 text-xs underline font-medium text-amber-800 hover:text-amber-900"
                    title="Lock Posted Payment Editing"
                  >
                    Lock
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                  <span>Posted Edits: Protected</span>
                  <button
                    type="button"
                    onClick={() => setTogglePermModalOpen(true)}
                    className="ml-1 text-xs underline font-medium text-primary-700 hover:text-primary-800"
                    title="Grant Explicit Permission to Edit Posted Payments"
                  >
                    Unlock
                  </button>
                </div>
              )
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Immutable transaction ledger, multi-stage ERP payment workflow, receipt versioning, and refunds
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
          { value: 'draft', label: 'Draft' },
          { value: 'submitted', label: 'Submitted' },
          { value: 'approved', label: 'Approved' },
          { value: 'posted', label: 'Posted / Completed' },
          { value: 'reversed', label: 'Reversed' },
        ]}
        title="Filter Transactions"
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card bg-white border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Collected
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {fmt(totalCollected)}
          </p>
          <p className="text-xs text-gray-400 mt-1">From active posted vouchers</p>
        </div>

        <div className="card bg-white border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Pending Workflow
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {pendingWorkflowCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">Draft, submitted & approved</p>
        </div>

        <div className="card bg-white border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Posted Transactions
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {payments.filter((p) => p.status === 'posted' || p.status === 'completed').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Valid collection receipts</p>
        </div>

        <div className="card bg-white border border-gray-200 shadow-sm p-4">
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
                {payments.map((p) => {
                  const isPosted = p.status === 'posted' || p.status === 'completed'
                  const isDraft = p.status === 'draft'
                  const isSubmitted = p.status === 'submitted'
                  const isApproved = p.status === 'approved'
                  const isReversed = p.status === 'reversed'

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-primary-700">
                        {p.receipt_number ? (
                          <Link
                            to={`/receipts/${p.receipt_number}`}
                            className="hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {p.receipt_number}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400 italic flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending Post
                          </span>
                        )}
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
                        <div className="inline-flex items-center gap-1">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              isPosted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isApproved
                                ? 'bg-purple-100 text-purple-800'
                                : isSubmitted
                                ? 'bg-blue-100 text-blue-800'
                                : isDraft
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isPosted ? 'Posted' : p.status}
                          </span>
                          {Boolean(p.edit_count && p.edit_count > 0) && (
                            <span
                              className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded font-bold"
                              title={`Payment modified ${p.edit_count} time(s)`}
                            >
                              v{Number(p.edit_count) + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* DRAFT ACTIONS */}
                          {isDraft && (
                            <>
                              <button
                                type="button"
                                onClick={() => submitMutation.mutate(p.id)}
                                disabled={submitMutation.isPending}
                                className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1 text-blue-700 hover:text-blue-800"
                                title="Submit draft payment for review/posting"
                              >
                                <Send className="w-3 h-3 text-blue-600" />
                                <span>Submit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1 text-gray-700"
                                title="Edit draft payment"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => postMutation.mutate(p.id)}
                                disabled={postMutation.isPending}
                                className="btn-primary text-xs py-1 px-2.5 inline-flex items-center gap-1 shadow-2xs"
                                title="Post payment and issue official receipt"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Post</span>
                              </button>
                            </>
                          )}

                          {/* SUBMITTED ACTIONS */}
                          {isSubmitted && (
                            <>
                              {canApprove && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenApproval(p)}
                                  className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1 text-purple-700 hover:text-purple-800"
                                  title="Approve payment voucher"
                                >
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                  <span>Approve</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => postMutation.mutate(p.id)}
                                disabled={postMutation.isPending}
                                className="btn-primary text-xs py-1 px-2 inline-flex items-center gap-1"
                                title="Post payment directly"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Post</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                                title="Edit payment details (Audited)"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            </>
                          )}

                          {/* APPROVED ACTIONS */}
                          {isApproved && (
                            <>
                              <button
                                type="button"
                                onClick={() => postMutation.mutate(p.id)}
                                disabled={postMutation.isPending}
                                className="btn-primary text-xs py-1 px-2.5 inline-flex items-center gap-1 shadow-2xs"
                                title="Post approved voucher and generate official receipt"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Post & Issue Receipt</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                                title="Edit approved payment"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            </>
                          )}

                          {/* POSTED / COMPLETED ACTIONS */}
                          {isPosted && (
                            <>
                              <Link
                                to={`/receipts/${p.receipt_number}`}
                                className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                                title="Print / View Receipt"
                              >
                                <Printer className="w-3 h-3 text-primary-600" />
                                <span>Receipt</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => setSharingPayment(p)}
                                className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"
                                title="Share Receipt"
                              >
                                <Share2 className="w-3 h-3 text-emerald-600" />
                                <span>Share</span>
                              </button>
                              {canEditPosted && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(p)}
                                  className="text-xs text-gray-700 hover:text-gray-900 font-medium py-1 px-2 border border-gray-200 rounded hover:bg-gray-50 inline-flex items-center gap-1"
                                  title="Audited correction on posted payment"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              )}
                              {canRefund && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRefund(p)}
                                  className="text-xs text-amber-700 hover:text-amber-900 font-medium py-1 px-2 border border-amber-200 rounded hover:bg-amber-50 inline-flex items-center gap-1"
                                  title="Process partial or full refund"
                                >
                                  <Undo2 className="w-3 h-3 text-amber-600" />
                                  <span>Refund</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenReverse(p)}
                                className="text-xs text-red-600 hover:text-red-800 font-medium py-1 px-2 border border-red-200 rounded hover:bg-red-50 inline-flex items-center gap-1"
                                title="Reverse Payment"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reverse</span>
                              </button>
                            </>
                          )}

                          {/* AUDIT TRAIL ACTION (All payments) */}
                          {canViewAudit && (
                            <button
                              type="button"
                              onClick={() => handleOpenAudit(p)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                              title="View Lifecycle Audit Trail"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
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

      {/* Audited Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Payment #${editingPayment?.id} (${editingPayment?.status?.toUpperCase()})`}
        size="lg"
      >
        <form onSubmit={handleConfirmEdit} className="space-y-4">
          {editingPayment && (editingPayment.status === 'posted' || editingPayment.status === 'completed') && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-950 text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Receipt Versioning & Supersession Notice
              </p>
              <p>
                Editing the <strong>amount</strong> or <strong>payment method</strong> of a posted payment will void receipt #{editingPayment.receipt_number} and automatically generate a new superseded receipt version. Minor corrections (date, reference notes) will retain the current receipt number.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Payment Amount (₹) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={editForm.amount}
                onChange={(e) => setEditForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="label">Payment Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={editForm.payment_date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="label">Payment Method <span className="text-red-500">*</span></label>
              <select
                value={editForm.payment_method}
                onChange={(e) => setEditForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                className="input w-full bg-white"
                required
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR Code</option>
                <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="cheque">Cheque / Demand Draft</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Transaction Reference / UTR</label>
              <input
                type="text"
                value={editForm.transaction_reference}
                onChange={(e) => setEditForm((prev) => ({ ...prev, transaction_reference: e.target.value }))}
                placeholder="e.g. UPI-123456789 or Chq #456"
                className="input w-full"
              />
            </div>

            {editForm.payment_method === 'cheque' && (
              <>
                <div>
                  <label className="label">Bank Name</label>
                  <input
                    type="text"
                    value={editForm.bank_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="e.g. HDFC Bank, SBI..."
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">Cheque Number</label>
                  <input
                    type="text"
                    value={editForm.cheque_number}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, cheque_number: e.target.value }))}
                    placeholder="6-digit cheque number"
                    className="input w-full"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="label">Remarks / Voucher Notes</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional voucher remarks..."
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="label">
              Mandatory Reason for Edit {editingPayment?.status !== 'draft' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={editForm.edit_reason}
              onChange={(e) => setEditForm((prev) => ({ ...prev, edit_reason: e.target.value }))}
              placeholder="e.g. Corrected parent cash payment typo, updated UTR number after reconciliation..."
              rows={2}
              className="input w-full"
              required={editingPayment?.status !== 'draft'}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Logged immutably in system audit logs with old vs new diff and timestamp.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending}
              className="btn-primary text-sm flex items-center gap-1"
            >
              {editMutation.isPending ? 'Saving...' : 'Save & Audit Update'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Process Refund Modal */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title={`Process Refund — Payment #${refundingPayment?.id}`}
        size="md"
      >
        <form onSubmit={handleConfirmRefund} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-lg text-xs text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-blue-950 text-sm">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Refund Limits & Balance Protection
            </p>
            <p>
              Original Amount: <strong>{fmt(refundingPayment?.amount)}</strong>
              {' · '}
              Max Refundable: <strong>{fmt(refundingPayment?.refundable_balance ?? refundingPayment?.amount)}</strong>
            </p>
          </div>

          <div>
            <label className="label">Refund Amount (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.01"
              min="1"
              max={Number(refundingPayment?.refundable_balance ?? refundingPayment?.amount ?? 0)}
              value={refundForm.amount}
              onChange={(e) => setRefundForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="label">Refund Method <span className="text-red-500">*</span></label>
            <select
              value={refundForm.refund_method}
              onChange={(e) => setRefundForm((prev) => ({ ...prev, refund_method: e.target.value }))}
              className="input w-full bg-white"
              required
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="upi">UPI / IMPS</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="label">Audited Reason for Refund <span className="text-red-500">*</span></label>
            <textarea
              value={refundForm.reason}
              onChange={(e) => setRefundForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Student withdrawn from batch, excess payment received, discount adjustment..."
              rows={2}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="label">Bank UTR / Cheque Reference (Optional)</label>
            <input
              type="text"
              value={refundForm.reference_note}
              onChange={(e) => setRefundForm((prev) => ({ ...prev, reference_note: e.target.value }))}
              placeholder="e.g. Refund UTR #987654321"
              className="input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setRefundModalOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={refundMutation.isPending}
              className="btn-primary text-sm flex items-center gap-1"
            >
              {refundMutation.isPending ? 'Processing...' : 'Submit Refund'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Approval Modal */}
      <Modal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        title={`Approve Payment Voucher #${approvingPayment?.id}`}
        size="md"
      >
        <form onSubmit={handleConfirmApproval} className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-lg text-xs text-purple-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-purple-950 text-sm">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Standard ERP Verification Sign-Off
            </p>
            <p>
              Student: <strong>{approvingPayment?.student_name}</strong>
              {' · '}
              Amount: <strong>{fmt(approvingPayment?.amount)}</strong>
              {' · '}
              Method: <strong>{approvingPayment?.payment_method?.toUpperCase()}</strong>
            </p>
          </div>

          <div>
            <label className="label">Approval Remarks / Sign-Off Notes (Optional)</label>
            <textarea
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder="e.g. Cheque verified with bank ledger, approved as per management concessions policy..."
              rows={3}
              className="input w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setApprovalModalOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={approveMutation.isPending}
              className="btn-primary text-sm flex items-center gap-1 bg-purple-700 hover:bg-purple-800"
            >
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lifecycle Audit Trail Modal */}
      <Modal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        title={`Audit Trail & Version History — Payment #${auditedPayment?.id}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex items-center justify-between text-xs text-gray-700">
            <div>
              <span className="font-semibold text-gray-900">{auditedPayment?.student_name}</span>
              {' · '}
              <span>Admission #{auditedPayment?.admission_number}</span>
            </div>
            <div className="font-mono font-bold text-gray-900">
              {auditedPayment?.receipt_number ? `#${auditedPayment.receipt_number}` : 'No Receipt Yet'}
            </div>
          </div>

          {isAuditLoading ? (
            <div className="py-8 text-center text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" />
              <p className="text-xs text-gray-500 mt-2">Loading audit trail...</p>
            </div>
          ) : auditTrail.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              No audit log entries recorded for this payment yet.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 border-l-2 border-gray-200">
              {auditTrail.map((log: any, idx: number) => {
                const details = log.details || {}
                return (
                  <div key={log.id || idx} className="relative group">
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-primary-600 group-hover:scale-125 transition-transform" />
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-2xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900 capitalize">
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                        <span>Actor: <strong>{log.user_name || 'System / Staff'}</strong></span>
                        {details.reason && (
                          <span className="text-gray-500 italic">· Reason: "{details.reason}"</span>
                        )}
                      </div>

                      {/* Details & Diff Breakdown */}
                      {details.diff && Object.keys(details.diff).length > 0 && (
                        <div className="mt-2 bg-gray-50 rounded p-2 text-[11px] font-mono space-y-1">
                          <p className="font-bold text-gray-700 font-sans">Changed Values:</p>
                          {Object.entries(details.diff).map(([k, v]: [string, any]) => (
                            <div key={k} className="flex items-center gap-1.5 text-gray-600">
                              <span className="text-gray-500">{k}:</span>
                              <span className="line-through text-red-500">{String(v.old ?? 'null')}</span>
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                              <span className="text-emerald-600 font-bold">{String(v.new ?? 'null')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {details.superseded_receipt && (
                        <div className="mt-1.5 text-[11px] text-amber-800 bg-amber-50 rounded px-2 py-1">
                          Superseded Receipt: #{details.superseded_receipt} → New Receipt: #{details.new_receipt}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t">
            <button
              type="button"
              onClick={() => setAuditModalOpen(false)}
              className="btn-secondary text-sm"
            >
              Close
            </button>
          </div>
        </div>
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
      {/* MODAL: SysAdmin Explicit Permission Toggle */}
      {togglePermModalOpen && (
        <Modal
          isOpen={togglePermModalOpen}
          onClose={() => setTogglePermModalOpen(false)}
          title="Explicit Permission Authorization: Edit Posted Payments"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Audited Financial Security Control
              </p>
              <p>
                In compliance with strict ERP separation of duties, modifying posted financial transactions requires the explicit <strong>Edit Posted Payments</strong> permission. Wildcard privileges do not bypass this rule.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Administrative Justification / Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={togglePermReason}
                onChange={(e) => setTogglePermReason(e.target.value)}
                placeholder="Specify reason for temporarily unlocking posted payment corrections (e.g. Bank reconciliation discrepancy remediation)..."
                rows={3}
                className="w-full text-xs rounded border border-gray-300 p-2 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTogglePermModalOpen(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!togglePermReason.trim() || togglePermMutation.isPending}
                onClick={() => togglePermMutation.mutate(true)}
                className="btn-primary text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {togglePermMutation.isPending ? 'Authorizing...' : 'Authorize & Unlock'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
