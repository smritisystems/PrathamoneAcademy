/**
 * @file        InlineQuickFeeCollectionModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.fees
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-25
 * @updated     2026-11-26
 *
 * @description Inline Quick Fee Collection & Receipt Generation modal for the Batch Monthly Fee Collection Matrix.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  CreditCard,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Printer,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Calendar,
  Receipt as ReceiptIcon,
  ArrowLeft,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../Modal'
import PaymentReceiptView from '../PaymentReceiptView'
import {
  invoicesApi,
  feeCategoriesApi,
  settingsApi,
  paymentsApi,
} from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { useEditModeStore, canActivateEditMode } from '../../store/editModeStore'
import { printReceiptElement } from '../../utils/printReceipt'
import type {
  StudentMonthlyPivotRow,
  FeeInvoice,
  FeeInstallment,
  FeeCategory,
  LookupItem,
  DetailedPaymentReceipt,
} from '../../types'

export interface InlineQuickFeeCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentMonthlyPivotRow
  monthKey: string
  monthName: string
  year: number
  academicYearId?: number
  academicYears?: { id: number; name: string; is_current: boolean }[]
  fallbackPaymentMethods?: string[]
  onPaymentCommitted: () => void | Promise<void>
  onOpenCollectionDesk: (studentId: number) => void
  onOpenCollectionTerminal: (studentId: number) => void
}

type PaymentAllocationType =
  | 'regular'
  | 'installment'
  | 'previous_dues'
  | 'advance'
  | `fee_head:${string}`

const COLLECTOR_ROLES = new Set([
  'superadmin',
  'sysadmin',
  'super_admin',
  'admin',
  'principal',
  'accountant',
  'staff',
])

const getTodayIsoDate = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const makeIdempotencyKey = (studentId: number): string => {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `matrix-quick-${studentId}-${rand}`
}

const roundCurrency = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100

const formatCurrency = (val: number): string =>
  `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const formatMethodLabel = (code: string, lookupLabel?: string): string => {
  if (lookupLabel) return lookupLabel
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const InlineQuickFeeCollectionModal: React.FC<InlineQuickFeeCollectionModalProps> = ({
  isOpen,
  onClose,
  student,
  monthKey,
  monthName,
  year,
  academicYearId,
  academicYears = [],
  fallbackPaymentMethods = [],
  onPaymentCommitted,
  onOpenCollectionDesk,
  onOpenCollectionTerminal,
}) => {
  const { user } = useAuthStore()
  const editScope = 'finance:fees'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const enableEditMode = useEditModeStore((s) => s.enableEditMode)

  const userRole = (user?.role || '').trim().toLowerCase()
  const canCollectRole = COLLECTOR_ROLES.has(userRole)
  const canUnlockEdit = canActivateEditMode(user).allowed && canCollectRole

  // ─── Queries: Authoritative Invoices, Fee Categories, Payment Modes ──────────
  const {
    data: studentInvoices = [],
    isLoading: loadingInvoices,
    refetch: refetchInvoices,
  } = useQuery<FeeInvoice[]>({
    queryKey: ['quick-collect-invoices', student.student_id],
    queryFn: () => invoicesApi.list({ student_id: student.student_id }).then((r) => r.data || []),
    enabled: isOpen && !!student.student_id,
    staleTime: 0,
  })

  const { data: feeCategories = [] } = useQuery<FeeCategory[]>({
    queryKey: ['quick-collect-fee-categories'],
    queryFn: () => feeCategoriesApi.list().then((r) => r.data || []),
    enabled: isOpen,
    staleTime: 60_000,
  })

  const { data: paymentModeLookupRes } = useQuery({
    queryKey: ['quick-collect-payment-modes'],
    queryFn: () => settingsApi.getLookups('PAYMENT_METHOD').then((r) => r.data),
    enabled: isOpen,
    staleTime: 60_000,
  })

  // ─── Derived Invoices & Installments ─────────────────────────────────────────
  const payableInvoices = useMemo(
    () =>
      studentInvoices.filter(
        (inv) =>
          inv.status !== 'cancelled' &&
          inv.status !== 'written_off' &&
          Number(inv.outstanding_amount || 0) > 0
      ),
    [studentInvoices]
  )

  const defaultInvoice = useMemo(() => {
    if (student.invoice_id) {
      const matched = payableInvoices.find((i) => i.id === student.invoice_id)
      if (matched) return matched
    }
    if (academicYearId) {
      const ayMatch = payableInvoices.find((i) => i.academic_year_id === academicYearId)
      if (ayMatch) return ayMatch
    }
    return payableInvoices[0] || studentInvoices[0] || null
  }, [payableInvoices, studentInvoices, student.invoice_id, academicYearId])

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const effectiveInvoice = useMemo(() => {
    if (selectedInvoiceId) {
      const found = studentInvoices.find((i) => i.id === selectedInvoiceId)
      if (found) return found
    }
    return defaultInvoice
  }, [selectedInvoiceId, studentInvoices, defaultInvoice])

  const { data: invoiceDetail } = useQuery<FeeInvoice>({
    queryKey: ['quick-collect-invoice-detail', effectiveInvoice?.id],
    queryFn: () => invoicesApi.get(effectiveInvoice!.id).then((r) => r.data),
    enabled: isOpen && !!effectiveInvoice?.id,
    staleTime: 0,
  })

  const activeInvoice = invoiceDetail || effectiveInvoice
  const installments: FeeInstallment[] = useMemo(
    () => activeInvoice?.installments || [],
    [activeInvoice]
  )

  const unpaidInstallments = useMemo(
    () =>
      installments.filter((inst) => {
        const out = Number(inst.outstanding_amount ?? Math.max(0, inst.amount - inst.paid_amount))
        return out > 0
      }),
    [installments]
  )

  // Prior-year unpaid invoices or overdue installments prior to the clicked matrix month
  const priorYearInvoices = useMemo(() => {
    const activeAy = academicYearId || defaultInvoice?.academic_year_id
    return payableInvoices.filter(
      (inv) =>
        Boolean(
          activeAy &&
            inv.academic_year_id !== undefined &&
            inv.academic_year_id !== activeAy &&
            inv.academic_year_id < activeAy
        )
    )
  }, [payableInvoices, academicYearId, defaultInvoice])

  const overduePriorInstallments = useMemo(
    () => unpaidInstallments.filter((inst) => inst.due_date && inst.due_date.slice(0, 7) < monthKey),
    [unpaidInstallments, monthKey]
  )

  const futureInstallments = useMemo(
    () => unpaidInstallments.filter((inst) => inst.due_date && inst.due_date.slice(0, 7) > monthKey),
    [unpaidInstallments, monthKey]
  )

  const hasPreviousDues = priorYearInvoices.length > 0 || overduePriorInstallments.length > 0
  const hasFutureInstallments = futureInstallments.length > 0
  const activeOutstanding = Number(activeInvoice?.outstanding_amount ?? student.balance ?? 0)

  // Configured payment modes from settings lookup (with fallback to pivot filter_options)
  const paymentModeOptions = useMemo(() => {
    const lookupItems: LookupItem[] = (paymentModeLookupRes?.items || []).filter(
      (item) => item.category === 'PAYMENT_METHOD' && item.is_active !== false
    )
    if (lookupItems.length > 0) {
      return [...lookupItems]
        .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
        .map((item) => ({
          value: item.code.trim().toLowerCase(),
          label: item.label,
        }))
    }
    if (fallbackPaymentMethods.length > 0) {
      return fallbackPaymentMethods.map((code) => ({
        value: code.trim().toLowerCase(),
        label: formatMethodLabel(code),
      }))
    }
    return []
  }, [paymentModeLookupRes, fallbackPaymentMethods])

  // Dynamic Payment Types & Configured Fee Heads
  const configuredFeeHeads = useMemo(() => {
    const headSet = new Map<string, string>()
    const items = (invoiceDetail as any)?.items || []
    for (const item of items) {
      const label = (item.fee_category_name || item.description || '').trim()
      if (label && !headSet.has(label.toLowerCase())) {
        headSet.set(label.toLowerCase(), label)
      }
    }
    for (const cat of feeCategories) {
      if (
        (cat as { is_active?: boolean }).is_active !== false &&
        cat.name?.trim() &&
        !headSet.has(cat.name.trim().toLowerCase())
      ) {
        headSet.set(cat.name.trim().toLowerCase(), cat.name.trim())
      }
    }
    return Array.from(headSet.values())
  }, [invoiceDetail, feeCategories])

  const paymentTypeOptions = useMemo(() => {
    const opts: { value: PaymentAllocationType; label: string; disabled?: boolean }[] = [
      { value: 'regular', label: `Regular Fee (${monthName} ${year})` },
    ]
    if (unpaidInstallments.length > 0) {
      opts.push({
        value: 'installment',
        label: `Installment (${unpaidInstallments.length} pending)`,
      })
    }
    if (hasPreviousDues) {
      opts.push({
        value: 'previous_dues',
        label:
          priorYearInvoices.length > 0
            ? `Previous Dues (${priorYearInvoices.length} prior invoice${priorYearInvoices.length > 1 ? 's' : ''})`
            : `Previous Dues (${overduePriorInstallments.length} overdue inst.)`,
      })
    }
    if (activeOutstanding > 0) {
      opts.push({
        value: 'advance',
        label: hasFutureInstallments
          ? `Advance Payment (${futureInstallments.length} future inst.)`
          : 'Advance Payment (Prepay Balance)',
      })
    }
    for (const head of configuredFeeHeads) {
      opts.push({
        value: `fee_head:${head}`,
        label: `Fee Head • ${head}`,
      })
    }
    return opts
  }, [
    monthName,
    year,
    unpaidInstallments.length,
    hasPreviousDues,
    priorYearInvoices.length,
    overduePriorInstallments.length,
    activeOutstanding,
    hasFutureInstallments,
    futureInstallments.length,
    configuredFeeHeads,
  ])

  // ─── Form State ──────────────────────────────────────────────────────────────
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(getTodayIsoDate)
  const [paymentType, setPaymentType] = useState<PaymentAllocationType>('regular')
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>('auto')
  const [multiAllocations, setMultiAllocations] = useState<Record<number, string>>({})
  const [paymentMode, setPaymentMode] = useState<string>('')
  const [transactionRef, setTransactionRef] = useState<string>('')
  const [bankName, setBankName] = useState<string>('')
  const [chequeNumber, setChequeNumber] = useState<string>('')
  const [chequeDate, setChequeDate] = useState<string>('')
  const [remarks, setRemarks] = useState<string>('')
  const [formError, setFormError] = useState<string>('')

  // Receipt & Submission Lifecycle State
  const [step, setStep] = useState<'form' | 'receipt' | 'approval_pending'>('form')
  const [committedReceipt, setCommittedReceipt] = useState<DetailedPaymentReceipt | null>(null)
  const [submittedApprovalInfo, setSubmittedApprovalInfo] = useState<{
    payment_id: number
    amount: number
    message: string
  } | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState<boolean>(false)
  const shouldAutoPrintRef = useRef<boolean>(false)

  const idempotencyKeyRef = useRef<string>(makeIdempotencyKey(student.student_id))
  const submittingRef = useRef<boolean>(false)

  // Reset modal state whenever opened for a new student/month
  useEffect(() => {
    if (!isOpen) return
    setStep('form')
    setCommittedReceipt(null)
    setSubmittedApprovalInfo(null)
    shouldAutoPrintRef.current = false
    setFormError('')
    setPaymentDate(getTodayIsoDate())
    setPaymentType('regular')
    setSelectedInvoiceId(null)
    setSelectedInstallmentId('auto')
    setMultiAllocations({})
    setTransactionRef('')
    setBankName('')
    setChequeNumber('')
    setChequeDate('')
    setRemarks('')
    idempotencyKeyRef.current = makeIdempotencyKey(student.student_id)
    submittingRef.current = false
  }, [isOpen, student.student_id, monthKey])

  // Initialize default payment mode once lookup loads
  useEffect(() => {
    if (!paymentMode && paymentModeOptions.length > 0) {
      setPaymentMode(paymentModeOptions[0].value)
    }
  }, [paymentMode, paymentModeOptions])

  // Auto-select matching installment for the clicked month or initial amount
  useEffect(() => {
    if (!isOpen || !activeInvoice) return
    const monthMatchInst = unpaidInstallments.find(
      (inst) => inst.due_date && inst.due_date.slice(0, 7) === monthKey
    )
    if (paymentType === 'regular') {
      if (monthMatchInst) {
        setSelectedInstallmentId(String(monthMatchInst.id))
        const out = Number(monthMatchInst.outstanding_amount ?? monthMatchInst.amount - monthMatchInst.paid_amount)
        if (!paymentAmount && out > 0) {
          setPaymentAmount(String(out))
        }
      } else {
        setSelectedInstallmentId('auto')
        if (!paymentAmount && activeOutstanding > 0) {
          setPaymentAmount(String(activeOutstanding))
        }
      }
    }
  }, [isOpen, activeInvoice?.id, monthKey, unpaidInstallments.length])

  // Handle payment type switching intelligently
  const handlePaymentTypeChange = (nextType: PaymentAllocationType) => {
    setPaymentType(nextType)
    setFormError('')
    idempotencyKeyRef.current = makeIdempotencyKey(student.student_id)

    if (nextType === 'previous_dues') {
      if (priorYearInvoices.length > 0) {
        setSelectedInvoiceId(priorYearInvoices[0].id)
        const priorBal = Number(priorYearInvoices[0].outstanding_amount || 0)
        setPaymentAmount(priorBal > 0 ? String(priorBal) : '')
        setSelectedInstallmentId('auto')
        setMultiAllocations({})
        return
      }
      if (overduePriorInstallments.length > 0) {
        const nextMap: Record<number, string> = {}
        let total = 0
        for (const inst of overduePriorInstallments) {
          const out = Number(inst.outstanding_amount ?? inst.amount - inst.paid_amount)
          nextMap[inst.id] = String(out)
          total = roundCurrency(total + out)
        }
        setMultiAllocations(nextMap)
        setPaymentAmount(total > 0 ? String(total) : '')
        return
      }
    }

    if (nextType === 'installment') {
      // Pre-select the clicked month installment (or first unpaid installment) in multi-installment checklist
      const target =
        unpaidInstallments.find((inst) => inst.due_date && inst.due_date.slice(0, 7) === monthKey) ||
        unpaidInstallments[0]
      if (target) {
        const out = Number(target.outstanding_amount ?? target.amount - target.paid_amount)
        setMultiAllocations({ [target.id]: String(out) })
        setPaymentAmount(String(out))
      } else {
        setMultiAllocations({})
      }
      return
    }

    if (nextType === 'advance') {
      const targetInv = defaultInvoice || effectiveInvoice
      if (defaultInvoice && effectiveInvoice?.id !== defaultInvoice.id) {
        setSelectedInvoiceId(defaultInvoice.id)
      }
      const targetInstallments =
        targetInv?.id === activeInvoice?.id
          ? unpaidInstallments
          : (targetInv?.installments || []).filter((inst) => {
              const out = Number(inst.outstanding_amount ?? Math.max(0, inst.amount - inst.paid_amount))
              return out > 0
            })
      const nextFuture = targetInstallments.find(
        (inst) => inst.due_date && inst.due_date.slice(0, 7) > monthKey
      )
      if (nextFuture) {
        setSelectedInstallmentId(String(nextFuture.id))
        const out = Number(nextFuture.outstanding_amount ?? nextFuture.amount - nextFuture.paid_amount)
        setPaymentAmount(String(out))
      } else {
        setSelectedInstallmentId('auto')
        const targetBal = Number(targetInv?.outstanding_amount ?? student.balance ?? 0)
        setPaymentAmount(targetBal > 0 ? String(targetBal) : '')
      }
      setMultiAllocations({})
      return
    }

    // Regular or fee_head
    const targetInv = defaultInvoice || effectiveInvoice
    if (defaultInvoice && effectiveInvoice?.id !== defaultInvoice.id) {
      setSelectedInvoiceId(defaultInvoice.id)
    }
    const targetInstallments =
      targetInv?.id === activeInvoice?.id
        ? unpaidInstallments
        : (targetInv?.installments || []).filter((inst) => {
            const out = Number(inst.outstanding_amount ?? Math.max(0, inst.amount - inst.paid_amount))
            return out > 0
          })
    const monthMatch = targetInstallments.find(
      (inst) => inst.due_date && inst.due_date.slice(0, 7) === monthKey
    )
    setSelectedInstallmentId(monthMatch ? String(monthMatch.id) : 'auto')
    if (monthMatch) {
      const out = Number(monthMatch.outstanding_amount ?? monthMatch.amount - monthMatch.paid_amount)
      setPaymentAmount(String(out))
    }
    setMultiAllocations({})
  }

  // Sync multi-installment total into paymentAmount
  const toggleMultiInstallment = (inst: FeeInstallment) => {
    const out = roundCurrency(Number(inst.outstanding_amount ?? inst.amount - inst.paid_amount))
    setMultiAllocations((prev) => {
      const next = { ...prev }
      if (next[inst.id] !== undefined) {
        delete next[inst.id]
      } else {
        next[inst.id] = String(out)
      }
      const sum = Object.values(next).reduce((acc, v) => roundCurrency(acc + (parseFloat(v) || 0)), 0)
      setPaymentAmount(sum > 0 ? String(sum) : '')
      return next
    })
    setFormError('')
    idempotencyKeyRef.current = makeIdempotencyKey(student.student_id)
  }

  const updateMultiInstallmentAmount = (instId: number, val: string) => {
    setMultiAllocations((prev) => {
      const next = { ...prev, [instId]: val }
      const sum = Object.values(next).reduce((acc, v) => roundCurrency(acc + (parseFloat(v) || 0)), 0)
      setPaymentAmount(sum > 0 ? String(sum) : '')
      return next
    })
    setFormError('')
    idempotencyKeyRef.current = makeIdempotencyKey(student.student_id)
  }

  // ─── Financial Calculations ──────────────────────────────────────────────────
  const invoiceObligation = Number(activeInvoice?.net_amount ?? student.package_fee ?? 0)
  const existingRealized = Number(activeInvoice?.paid_amount ?? student.total_collected ?? 0)
  const currentPendingBalance = Number(activeInvoice?.outstanding_amount ?? student.balance ?? 0)
  const parsedAmount = parseFloat(paymentAmount)
  const enteredAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? roundCurrency(parsedAmount) : 0
  const remainingAfter = Math.max(0, roundCurrency(currentPendingBalance - enteredAmount))
  const isOverpayment = enteredAmount > roundCurrency(currentPendingBalance + 0.001)

  const statusAfterCollection: 'paid' | 'partial' | 'unpaid' | 'invalid' = useMemo(() => {
    if (isOverpayment) return 'invalid'
    if (currentPendingBalance <= 0 && invoiceObligation > 0) return 'paid'
    if (enteredAmount <= 0) return existingRealized > 0 ? 'partial' : 'unpaid'
    if (remainingAfter <= 0) return 'paid'
    return 'partial'
  }, [isOverpayment, currentPendingBalance, invoiceObligation, enteredAmount, remainingAfter, existingRealized])

  const useChecklistMode =
    paymentType === 'installment' ||
    (paymentType === 'previous_dues' && priorYearInvoices.length === 0 && overduePriorInstallments.length > 0)

  const checklistInstallments = useMemo(() => {
    if (paymentType === 'previous_dues' && overduePriorInstallments.length > 0) {
      return overduePriorInstallments
    }
    return unpaidInstallments
  }, [paymentType, overduePriorInstallments, unpaidInstallments])

  // ─── Auto-print effect once authoritative receipt is rendered in DOM ─────────
  useEffect(() => {
    if (step === 'receipt' && committedReceipt && shouldAutoPrintRef.current) {
      shouldAutoPrintRef.current = false
      const timer = setTimeout(() => {
        printReceiptElement({
          elementId: 'inline-matrix-receipt-print-area',
          documentTitle: `Official Fee Receipt #${committedReceipt.receipt_number}`,
          paperSize: 'A5',
        })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [step, committedReceipt])

  // ─── Payment Mutation ────────────────────────────────────────────────────────
  const createPaymentMutation = useMutation({
    mutationFn: (payload: Parameters<typeof paymentsApi.create>[0]) => paymentsApi.create(payload),
  })

  const isChequeLike = paymentMode === 'cheque' || paymentMode === 'demand_draft'
  const showRefField = paymentMode !== 'cash'

  const getAcademicYearLabel = (ayId?: number): string => {
    const found = academicYears.find((a) => a.id === ayId)
    return found ? found.name : ayId ? `AY #${ayId}` : 'Current AY'
  }

  const handleSavePayment = async (printOnSuccess: boolean) => {
    if (submittingRef.current || createPaymentMutation.isPending) return
    setFormError('')

    if (!canCollectRole) {
      setFormError('Permission restricted: Your role does not have authorization to record fee payments.')
      return
    }
    if (!isEditMode) {
      setFormError('Locked in View Mode: Click "Unlock Edit Mode" above before recording a payment.')
      return
    }
    if (!activeInvoice || activeInvoice.status === 'cancelled' || activeInvoice.status === 'written_off') {
      setFormError('No active payable invoice found for this student. Please issue an invoice first.')
      return
    }
    if (currentPendingBalance <= 0) {
      setFormError('This invoice has ₹0 pending balance. Overpayment is prohibited by accounting rules.')
      return
    }
    if (!paymentDate) {
      setFormError('Please select the actual payment date.')
      return
    }
    if (!paymentMode) {
      setFormError('Please select a valid payment mode.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid payment amount greater than ₹0.')
      return
    }
    if (Math.abs(parsedAmount * 100 - Math.round(parsedAmount * 100)) > 1e-6) {
      setFormError('Payment amount may have at most 2 decimal places.')
      return
    }
    if (enteredAmount > roundCurrency(currentPendingBalance + 0.001)) {
      setFormError(
        `Overpayment blocked: Entered amount (${formatCurrency(enteredAmount)}) exceeds current pending balance (${formatCurrency(currentPendingBalance)}).`
      )
      return
    }
    if (isChequeLike && !chequeNumber.trim()) {
      setFormError('Cheque / Demand Draft number is required for cheque payments.')
      return
    }

    // Build authoritative allocations
    let allocationsPayload: { invoice_id: number; installment_id?: number; amount: number }[] = []

    if (useChecklistMode) {
      const selectedEntries = Object.entries(multiAllocations)
        .map(([idStr, amtStr]) => ({
          installment_id: Number(idStr),
          amount: roundCurrency(parseFloat(amtStr) || 0),
        }))
        .filter((e) => e.amount > 0)

      if (selectedEntries.length === 0) {
        setFormError('Select at least one installment and enter an allocation amount.')
        return
      }

      for (const entry of selectedEntries) {
        const instObj = unpaidInstallments.find((i) => i.id === entry.installment_id)
        if (!instObj) {
          setFormError('Selected installment is no longer valid for this invoice.')
          return
        }
        const instRemaining = roundCurrency(
          Number(instObj.outstanding_amount ?? instObj.amount - instObj.paid_amount)
        )
        if (entry.amount > instRemaining + 0.001) {
          setFormError(
            `Installment ${instObj.installment_number} allocation (${formatCurrency(entry.amount)}) exceeds its pending balance (${formatCurrency(instRemaining)}).`
          )
          return
        }
      }

      const allocSum = selectedEntries.reduce((sum, e) => roundCurrency(sum + e.amount), 0)
      if (Math.abs(allocSum - enteredAmount) > 0.01) {
        setFormError(
          `Installment allocation total (${formatCurrency(allocSum)}) must equal payment amount (${formatCurrency(enteredAmount)}).`
        )
        return
      }

      allocationsPayload = selectedEntries.map((e) => ({
        invoice_id: activeInvoice.id,
        installment_id: e.installment_id,
        amount: e.amount,
      }))
    } else if (selectedInstallmentId !== 'auto' && unpaidInstallments.length > 0) {
      const targetInstId = Number(selectedInstallmentId)
      const instObj = unpaidInstallments.find((i) => i.id === targetInstId)
      if (!instObj) {
        setFormError('Selected installment was not found.')
        return
      }
      const instRemaining = roundCurrency(
        Number(instObj.outstanding_amount ?? instObj.amount - instObj.paid_amount)
      )
      if (enteredAmount > instRemaining + 0.001) {
        setFormError(
          `Amount (${formatCurrency(enteredAmount)}) exceeds Installment ${instObj.installment_number} balance (${formatCurrency(instRemaining)}). Switch to "Installment" mode to split across multiple installments or choose "Auto-allocate".`
        )
        return
      }
      allocationsPayload = [
        {
          invoice_id: activeInvoice.id,
          installment_id: targetInstId,
          amount: enteredAmount,
        },
      ]
    } else {
      allocationsPayload = [
        {
          invoice_id: activeInvoice.id,
          amount: enteredAmount,
        },
      ]
    }

    // Preserve structured allocation metadata cleanly in notes without modifying DB schema
    const contextTags: string[] = []
    if (paymentType === 'advance') contextTags.push('Advance Payment')
    else if (paymentType === 'previous_dues') contextTags.push('Previous Dues')
    else if (paymentType.startsWith('fee_head:')) contextTags.push(paymentType.replace('fee_head:', ''))
    contextTags.push(`Fee Period: ${monthName} ${year}`)

    const trimmedRemarks = remarks.trim()
    const finalNotes = trimmedRemarks
      ? `${trimmedRemarks} [${contextTags.join(' • ')}]`
      : `[${contextTags.join(' • ')}]`

    submittingRef.current = true
    try {
      const res = await createPaymentMutation.mutateAsync({
        student_id: student.student_id,
        academic_year_id: activeInvoice.academic_year_id || academicYearId || 1,
        amount: enteredAmount,
        payment_date: paymentDate,
        payment_method: paymentMode,
        transaction_reference: !isChequeLike ? transactionRef.trim() || undefined : undefined,
        bank_name: bankName.trim() || undefined,
        cheque_number: isChequeLike ? chequeNumber.trim() || undefined : undefined,
        cheque_date: isChequeLike && chequeDate ? chequeDate : undefined,
        notes: finalNotes,
        action: 'post',
        idempotency_key: idempotencyKeyRef.current,
        allocations: allocationsPayload,
      })

      const data = res.data

      // Refresh matrix & student invoices in background without full page reload
      await Promise.allSettled([refetchInvoices(), Promise.resolve(onPaymentCommitted())])

      if (data.status === 'submitted' || !data.receipt_number) {
        setSubmittedApprovalInfo({
          payment_id: data.payment_id,
          amount: data.amount,
          message:
            data.message ||
            'Payment submitted for approval under Standard ERP workflow rules. Receipt will be issued once approved and posted.',
        })
        setStep('approval_pending')
        toast.success('Payment submitted for approval.')
        return
      }

      // Only load & show receipt AFTER payment transaction is committed and receipt_number is issued
      setLoadingReceipt(true)
      try {
        const receiptRes = await paymentsApi.getReceipt(data.receipt_number)
        setCommittedReceipt(receiptRes.data as DetailedPaymentReceipt)
      } catch {
        setCommittedReceipt({
          receipt_number: data.receipt_number,
          payment_id: data.payment_id,
          student_id: student.student_id,
          student_name: student.student_name,
          admission_number: student.admission_number,
          board: student.board_name,
          standard: student.standard_name,
          batch: student.batch_name,
          amount: enteredAmount,
          payment_date: paymentDate,
          payment_method: paymentMode,
          transaction_reference: !isChequeLike ? transactionRef.trim() || undefined : undefined,
          cheque_number: isChequeLike ? chequeNumber.trim() || undefined : undefined,
          invoice_number: activeInvoice.invoice_number,
          status: data.status,
          fee_summary: {
            total_fee_amount: invoiceObligation,
            previous_payments_total: existingRealized,
            current_payment_amount: enteredAmount,
            total_paid_to_date: roundCurrency(existingRealized + enteredAmount),
            outstanding_balance: remainingAfter,
          },
        } as DetailedPaymentReceipt)
      } finally {
        setLoadingReceipt(false)
      }

      if (printOnSuccess) {
        shouldAutoPrintRef.current = true
      }
      setStep('receipt')
      toast.success(`Payment recorded! Receipt #${data.receipt_number}`)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to record payment.'
      setFormError(detail)
      toast.error(detail)
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'receipt' && committedReceipt
          ? `Official Fee Receipt • #${committedReceipt.receipt_number}`
          : `Receive Fee Payment • ${monthName} ${year}`
      }
      size={step === 'receipt' ? 'xl' : 'lg'}
    >
      <div className="space-y-4">
        {/* ─── Student Context & Summary Card (Always Visible) ───────────────── */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">{student.student_name}</h4>
              <p className="font-mono text-xs text-slate-500">
                {student.admission_number} • Batch {student.batch_name}
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
              {student.board_name} • {student.standard_name}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Agreed Package</span>
              <div className="font-mono font-bold text-slate-800">{formatCurrency(invoiceObligation)}</div>
            </div>
            <div>
              <span className="text-[10px] text-emerald-700 uppercase font-semibold">Existing Realized</span>
              <div className="font-mono font-bold text-emerald-700">{formatCurrency(existingRealized)}</div>
            </div>
            <div>
              <span className="text-[10px] text-rose-600 uppercase font-semibold">Pending Balance</span>
              <div className="font-mono font-bold text-rose-600">{formatCurrency(currentPendingBalance)}</div>
            </div>
          </div>
        </div>

        {/* ─── Follow-up Remark Banner ───────────────────────────────────────── */}
        {step === 'form' && student.remark && (
          <div className="p-2.5 bg-white border border-emerald-200 rounded-lg text-xs flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">
                Follow-up Remark ({student.priority?.toUpperCase() || 'NORMAL'}):
              </span>{' '}
              <span className="text-slate-600">{student.remark}</span>
            </div>
          </div>
        )}

        {/* ─── STEP 2: INLINE RECEIPT PREVIEW (After Committed Payment) ──────── */}
        {step === 'receipt' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Payment committed &amp; receipt #{committedReceipt?.receipt_number} generated. Matrix updated.
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Matrix</span>
              </button>
            </div>

            {loadingReceipt ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600 mx-auto mb-2" />
                Loading official receipt preview...
              </div>
            ) : committedReceipt ? (
              <PaymentReceiptView
                receipt={committedReceipt}
                showPrintActions={true}
                showReprintButton={true}
                onReceiptUpdated={(updated) => setCommittedReceipt(updated)}
                containerId="inline-matrix-receipt-print-area"
              />
            ) : null}
          </div>
        )}

        {/* ─── STEP 2B: STANDARD ERP APPROVAL PENDING CONFIRMATION ───────────── */}
        {step === 'approval_pending' && submittedApprovalInfo && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Payment #{submittedApprovalInfo.payment_id} Submitted for Approval</span>
              </div>
              <p className="text-amber-800">{submittedApprovalInfo.message}</p>
              <p className="font-mono font-bold text-amber-900">
                Amount: {formatCurrency(submittedApprovalInfo.amount)}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Matrix</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 1: INLINE PAYMENT FORM ───────────────────────────────────── */}
        {step === 'form' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSavePayment(false)
            }}
            className="space-y-3.5"
            noValidate
          >
            {/* View-First & RBAC Lock Banner */}
            {!canCollectRole ? (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Permission Restricted:</strong> Your role ({user?.role || 'viewer'}) has read-only access to the fee matrix and cannot collect payments.
                </span>
              </div>
            ) : !isEditMode ? (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>View Mode Active:</strong> Enable Edit Mode to record this fee collection.
                  </span>
                </div>
                {canUnlockEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const res = enableEditMode(editScope, user)
                      if (res.success) {
                        setFormError('')
                        toast.success('Edit Mode enabled for fee collection.')
                      } else {
                        setFormError(res.reason || 'Insufficient privileges to unlock Edit Mode.')
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Unlock Edit Mode</span>
                  </button>
                )}
              </div>
            ) : null}

            {/* Target Invoice Selector (shown when student has multiple payable invoices e.g. Previous Dues) */}
            {payableInvoices.length > 1 && (
              <div>
                <label
                  htmlFor="quick-collect-invoice"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Target Invoice
                </label>
                <select
                  id="quick-collect-invoice"
                  value={activeInvoice?.id ?? ''}
                  onChange={(e) => {
                    setSelectedInvoiceId(Number(e.target.value))
                    setMultiAllocations({})
                    setSelectedInstallmentId('auto')
                    setFormError('')
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {payableInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} ({getAcademicYearLabel(inv.academic_year_id)}) — Balance{' '}
                      {formatCurrency(Number(inv.outstanding_amount || 0))}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Loading / No Invoice Warning */}
            {loadingInvoices ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                Loading student invoices &amp; installment schedule...
              </div>
            ) : !activeInvoice || currentPendingBalance <= 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  {!activeInvoice
                    ? 'No issued fee invoice was found for this student. Issue an invoice in Fee Invoicing before collecting payment.'
                    : 'All invoices for this student are fully settled (₹0 pending balance). Overpayment is not permitted.'}
                </div>
              </div>
            ) : null}

            {/* Row 1: Payment Amount & Actual Payment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="quick-collect-amount"
                    className="text-[11px] font-bold text-slate-700"
                  >
                    Payment Amount (₹) *
                  </label>
                  {currentPendingBalance > 0 && !useChecklistMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentAmount(String(currentPendingBalance))
                        setFormError('')
                        idempotencyKeyRef.current = makeIdempotencyKey(student.student_id)
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      Pay Full ({formatCurrency(currentPendingBalance)})
                    </button>
                  )}
                </div>
                <input
                  id="quick-collect-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentPendingBalance > 0 ? currentPendingBalance : undefined}
                  value={paymentAmount}
                  readOnly={useChecklistMode}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value)
                    setFormError('')
                    idempotencyKeyRef.current = makeIdempotencyKey(student.student_id)
                  }}
                  placeholder="Enter amount (₹)"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 ${
                    isOverpayment
                      ? 'bg-rose-50 border-rose-300 text-rose-800 focus:ring-rose-400/30'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-emerald-500/30'
                  }`}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="quick-collect-date"
                  className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1"
                >
                  <span>Actual Payment Date *</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Period: {monthName} {year}
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="quick-collect-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => {
                      setPaymentDate(e.target.value)
                      setFormError('')
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Payment Type / Fee Allocation & Payment Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="quick-collect-type"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Payment Type / Fee Allocation *
                </label>
                <select
                  id="quick-collect-type"
                  value={paymentType}
                  onChange={(e) => handlePaymentTypeChange(e.target.value as PaymentAllocationType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {paymentTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="quick-collect-mode"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Payment Mode *
                </label>
                <select
                  id="quick-collect-mode"
                  value={paymentMode}
                  onChange={(e) => {
                    setPaymentMode(e.target.value)
                    setFormError('')
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                >
                  {paymentModeOptions.length === 0 ? (
                    <option value="">No configured payment modes</option>
                  ) : (
                    paymentModeOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Row 3: Fee Month / Installment Selection */}
            {unpaidInstallments.length > 0 && !useChecklistMode && (
              <div>
                <label
                  htmlFor="quick-collect-installment"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Fee Month / Installment Allocation
                </label>
                <select
                  id="quick-collect-installment"
                  value={selectedInstallmentId}
                  onChange={(e) => {
                    const val = e.target.value
                    setSelectedInstallmentId(val)
                    setFormError('')
                    if (val !== 'auto') {
                      const inst = unpaidInstallments.find((i) => i.id === Number(val))
                      if (inst) {
                        const out = roundCurrency(
                          Number(inst.outstanding_amount ?? inst.amount - inst.paid_amount)
                        )
                        setPaymentAmount(String(out))
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="auto">
                    Auto-allocate across due installments ({monthName} {year} priority)
                  </option>
                  {unpaidInstallments.map((inst) => {
                    const out = roundCurrency(
                      Number(inst.outstanding_amount ?? inst.amount - inst.paid_amount)
                    )
                    return (
                      <option key={inst.id} value={String(inst.id)}>
                        Inst #{inst.installment_number} — {inst.description} (Due {inst.due_date}) • Bal{' '}
                        {formatCurrency(out)}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Multi-Installment Checklist */}
            {useChecklistMode && checklistInstallments.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Select Installment(s) to Allocate</span>
                  <span className="font-mono text-emerald-700">
                    Allocated: {formatCurrency(enteredAmount)}
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {checklistInstallments.map((inst) => {
                    const out = roundCurrency(
                      Number(inst.outstanding_amount ?? inst.amount - inst.paid_amount)
                    )
                    const isChecked = multiAllocations[inst.id] !== undefined
                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${
                          isChecked ? 'bg-emerald-50/60' : ''
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMultiInstallment(inst)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-800">
                              Inst #{inst.installment_number}
                            </span>{' '}
                            <span className="text-slate-500">• {inst.description}</span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Due {inst.due_date} • Pending {formatCurrency(out)}
                            </div>
                          </div>
                        </label>
                        {isChecked && (
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={out}
                            aria-label={`Amount for Installment ${inst.installment_number}`}
                            value={multiAllocations[inst.id] ?? ''}
                            onChange={(e) => updateMultiInstallmentAmount(inst.id, e.target.value)}
                            className="w-24 px-2 py-1 text-right font-mono font-bold text-xs border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Row 4: Conditional Transaction Reference / Cheque Number */}
            {showRefField && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="quick-collect-ref"
                    className="block text-[11px] font-bold text-slate-700 mb-1"
                  >
                    {isChequeLike
                      ? 'Cheque / DD Number *'
                      : paymentMode === 'upi'
                      ? 'UPI Transaction / UTR Ref'
                      : paymentMode === 'card'
                      ? 'Card Auth / Approval Code'
                      : 'Transaction Reference / UTR'}
                  </label>
                  <input
                    id="quick-collect-ref"
                    type="text"
                    value={isChequeLike ? chequeNumber : transactionRef}
                    onChange={(e) => {
                      if (isChequeLike) setChequeNumber(e.target.value)
                      else setTransactionRef(e.target.value)
                      setFormError('')
                    }}
                    placeholder={
                      isChequeLike ? 'Enter 6-digit cheque / DD #' : 'Enter UTR / transaction ID'
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required={isChequeLike}
                  />
                </div>

                {(isChequeLike || paymentMode === 'bank_transfer') && (
                  <div>
                    <label
                      htmlFor="quick-collect-bank"
                      className="block text-[11px] font-bold text-slate-700 mb-1"
                    >
                      Bank Name {isChequeLike ? '(Issuing Bank)' : '(Optional)'}
                    </label>
                    <input
                      id="quick-collect-bank"
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, SBI..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                )}

                {isChequeLike && (
                  <div>
                    <label
                      htmlFor="quick-collect-cheque-date"
                      className="block text-[11px] font-bold text-slate-700 mb-1"
                    >
                      Cheque Date (Optional)
                    </label>
                    <input
                      id="quick-collect-cheque-date"
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Row 5: Remarks */}
            <div>
              <label
                htmlFor="quick-collect-remarks"
                className="block text-[11px] font-bold text-slate-700 mb-1"
              >
                Remarks
              </label>
              <input
                id="quick-collect-remarks"
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={`Optional collection note for ${monthName} ${year}...`}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Live Payment Calculations Summary */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <span>Live Payment Calculation</span>
                <span
                  data-testid="post-payment-status-badge"
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    statusAfterCollection === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : statusAfterCollection === 'partial'
                      ? 'bg-amber-100 text-amber-800'
                      : statusAfterCollection === 'invalid'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  After Collection:{' '}
                  {statusAfterCollection === 'invalid'
                    ? 'OVERPAYMENT'
                    : statusAfterCollection.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-white border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 block">Realized</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatCurrency(existingRealized)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 block">Current Pending</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(currentPendingBalance)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 block">Entered Payment</span>
                  <span
                    data-testid="calc-entered-amount"
                    className={`font-mono font-bold ${
                      isOverpayment ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(enteredAmount)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 block">Remaining After</span>
                  <span
                    data-testid="calc-remaining-balance"
                    className="font-mono font-bold text-slate-900"
                  >
                    {formatCurrency(remainingAfter)}
                  </span>
                </div>
              </div>
            </div>

            {/* Inline Validation Error Banner */}
            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Primary Save & Print Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={createPaymentMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  createPaymentMutation.isPending ||
                  !canCollectRole ||
                  !isEditMode ||
                  !activeInvoice ||
                  currentPendingBalance <= 0
                }
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{createPaymentMutation.isPending ? 'Saving...' : 'Save Payment'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSavePayment(true)}
                disabled={
                  createPaymentMutation.isPending ||
                  !canCollectRole ||
                  !isEditMode ||
                  !activeInvoice ||
                  currentPendingBalance <= 0
                }
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  {createPaymentMutation.isPending
                    ? 'Processing...'
                    : 'Save Payment & Print Receipt'}
                </span>
              </button>
            </div>

            {/* Secondary Advanced Workflows */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Advanced Secondary Workflows
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenCollectionDesk(student.student_id)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-800">
                      Open Collection Desk (Current Tab)
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenCollectionTerminal(student.student_id)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-700 group-hover:text-primary-700">
                      Open Collection Terminal (New Window)
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

export default InlineQuickFeeCollectionModal
