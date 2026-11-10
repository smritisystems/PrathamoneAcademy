/**
 * @file        Fees.tsx
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
 * @updated     2026-11-10
 *
 * @description Flagship Fees & Payments workspace featuring overview analytics, fee register, payments, and receipts.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams, useLocation, useNavigate, useInRouterContext, MemoryRouter } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, CreditCard, TrendingUp, AlertCircle, Users, Layers,
  BookOpen, FileSpreadsheet, Download, RefreshCw, CheckCircle,
  XCircle, Printer, Eye, RotateCcw, Plus, Search, Shield,
  ArrowRight, Calendar, Info, Clock, AlertTriangle, Settings, FileText,
  ChevronRight, ChevronDown, Coins, Bell, Percent, Award, Trash2,
  ExternalLink, Filter, Home, Receipt, BarChart3, Zap, GraduationCap, Sliders,
  Edit3, Lock, QrCode, Send, Smartphone, Share2, CheckCheck, BadgePercent,
  Copy, ArrowUpRight, Check, Sparkles, CheckSquare, Square
} from 'lucide-react'
import { shareOrDownloadReceiptPdf, triggerBlobDownload, sanitizeReceiptFilename, ShareNotification } from '../utils/receiptShare'
import { useEnvironmentStore } from '../store/environmentStore'
import {
  ComposedChart, Bar, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts'
import {
  feesApi, paymentsApi, feeCategoriesApi, feeStructuresApi,
  studentsApi, invoicesApi, reportsApi, academicYearsApi, boardsApi,
  standardsApi, divisionsApi, settingsApi, concessionsApi,
  ConcessionType, ConcessionApplication, ConcessionEligibilityResult
} from '../api/endpoints'
import { useAuthStore, isUserAdmin, isUserSysAdmin, hasPermission } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton, LockedIconButton, SortableHeader, TableSortSelect, TableSortOption } from '../components/common'
import { useTableSort } from '../hooks/useTableSort'
import Modal from '../components/Modal'
import PaymentReceiptView from '../components/PaymentReceiptView'
import { StatusBadge, InvoiceStatusBadge } from '../components/Badge'
import ExcelReportGrid, { ColumnConfig } from '../components/reports/ExcelReportGrid'
import { printReceiptElement } from '../utils/printReceipt'
import { useBranding } from '../config/branding'
import type {
  FeeRegisterEntry, FeeRegisterInstallment, PaymentReceiptListItem,
  PaymentTransactionItem, FeeCategory, FeeStructure, Student, FeeInvoice,
  PaymentMethodDistribution, TopOverdueAccount, RecentPayment
} from '../types'
import toast from 'react-hot-toast'

export type TabKey =
  | 'overview'
  | 'structures'
  | 'invoicing'
  | 'collection'
  | 'defaulters'
  | 'concessions'
  | 'online-gateway'
  | 'reports'
  // Legacy aliases
  | 'register'
  | 'collect'
  | 'payments'
  | 'receipts'
  | 'plans'
  | 'settings'

export const FEES_TABS: { id: TabKey; label: string; icon: React.ElementType; route: string }[] = [
  { id: 'overview', label: 'Overview', icon: Home, route: '/fees/overview' },
  { id: 'structures', label: 'Fee Structures', icon: Layers, route: '/fees/structures' },
  { id: 'invoicing', label: 'Fee Invoicing', icon: FileSpreadsheet, route: '/fees/invoicing' },
  { id: 'collection', label: 'Collection Desk', icon: CreditCard, route: '/fees/collection' },
  { id: 'defaulters', label: 'Defaulters & Dues', icon: AlertCircle, route: '/fees/defaulters' },
  { id: 'concessions', label: 'Concessions & Waivers', icon: Percent, route: '/fees/concessions' },
  { id: 'online-gateway', label: 'Online Gateway', icon: Zap, route: '/fees/online-gateway' },
  { id: 'reports', label: 'Financial Daybook', icon: BarChart3, route: '/fees/reports' },
]

export const TABS = FEES_TABS

export const fmt = (n: number | string | undefined | null) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0))

export const formatDisplayDate = (d?: string | null): string => {
  if (!d) return '-'
  try {
    if (/^\d{2}\s+[A-Za-z]{3}\s+\d{4}$/.test(d)) return d
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return d
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

export const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
}

export const METHOD_COLORS: Record<string, string> = {
  upi: '#8b5cf6', // purple
  cash: '#10b981', // emerald
  bank_transfer: '#3b82f6', // blue
  card: '#f59e0b', // amber
  cheque: '#64748b', // slate
  other: '#94a3b8',
}

export const numberToWordsINR = (num: number): string => {
  if (!num || isNaN(num) || num <= 0) return 'Rupees Zero Only'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertLessThanOneThousand = (n: number): string => {
    let str = ''
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' '
      n %= 10
    }
    if (n > 0) {
      str += ones[n] + ' '
    }
    return str.trim()
  }

  let n = Math.floor(num)
  const crores = Math.floor(n / 10000000)
  n %= 10000000
  const lakhs = Math.floor(n / 100000)
  n %= 100000
  const thousands = Math.floor(n / 1000)
  n %= 1000
  const remaining = n

  let res = 'Rupees '
  if (crores > 0) res += convertLessThanOneThousand(crores) + ' Crore '
  if (lakhs > 0) res += convertLessThanOneThousand(lakhs) + ' Lakh '
  if (thousands > 0) res += convertLessThanOneThousand(thousands) + ' Thousand '
  if (remaining > 0) res += convertLessThanOneThousand(remaining) + ' '
  res += 'Only'
  return res.replace(/\s+/g, ' ').trim()
}

function FeesContent() {
  const branding = useBranding()
  const editScope = 'finance:fees'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const { selectedAcademicYearId, selectedInstitutionId, user } = useAuthStore()
  const canEdit = isUserAdmin(user)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { isTrainingMode } = useEnvironmentStore()

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKSPACE 5: DEFAULTERS & DUES STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [defaulterAgingFilter, setDefaulterAgingFilter] = useState<'all' | '1-30' | '31-60' | '60+'>('all')
  const [defaulterSearchQuery, setDefaulterSearchQuery] = useState('')
  const [defaulterStandardFilter, setDefaulterStandardFilter] = useState<string>('')
  const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState(false)
  const [reminderTemplate, setReminderTemplate] = useState('Dear Guardian, this is a gentle fee reminder from Prashant Academy for pending dues. Please clear at your earliest convenience.')

  const [defaultersList, setDefaultersList] = useState([
    {
      id: 1,
      student_id: 101,
      student_name: 'Aarav Sharma',
      roll_number: '10-A-01',
      admission_number: 'ADM-2025-0101',
      standard: 'Standard 10',
      division: 'Division A',
      guardian_name: 'Rajesh Sharma',
      guardian_phone: '+91 98230 11223',
      total_fee: 75000,
      paid_amount: 35000,
      overdue_amount: 40000,
      overdue_days: 68,
      last_payment_date: '2026-08-15',
    },
    {
      id: 2,
      student_id: 102,
      student_name: 'Diya Patel',
      roll_number: '10-A-04',
      admission_number: 'ADM-2025-0104',
      standard: 'Standard 10',
      division: 'Division A',
      guardian_name: 'Ketan Patel',
      guardian_phone: '+91 98221 44556',
      total_fee: 75000,
      paid_amount: 50000,
      overdue_amount: 25000,
      overdue_days: 42,
      last_payment_date: '2026-09-10',
    },
    {
      id: 3,
      student_id: 103,
      student_name: 'Rohan Gupta',
      roll_number: '12-SCI-12',
      admission_number: 'ADM-2025-0212',
      standard: 'Standard 12 Science',
      division: 'Division A',
      guardian_name: 'Suresh Gupta',
      guardian_phone: '+91 98233 77889',
      total_fee: 95000,
      paid_amount: 45000,
      overdue_amount: 50000,
      overdue_days: 75,
      last_payment_date: '2026-08-01',
    },
    {
      id: 4,
      student_id: 104,
      student_name: 'Ananya Deshmukh',
      roll_number: '9-B-08',
      admission_number: 'ADM-2025-0088',
      standard: 'Standard 9',
      division: 'Division B',
      guardian_name: 'Anil Deshmukh',
      guardian_phone: '+91 98244 11334',
      total_fee: 65000,
      paid_amount: 45000,
      overdue_amount: 20000,
      overdue_days: 22,
      last_payment_date: '2026-10-05',
    },
    {
      id: 5,
      student_id: 105,
      student_name: 'Kabir Verma',
      roll_number: '11-SCI-05',
      admission_number: 'ADM-2025-0305',
      standard: 'Standard 11 Science',
      division: 'Division B',
      guardian_name: 'Vikas Verma',
      guardian_phone: '+91 98255 66778',
      total_fee: 90000,
      paid_amount: 60000,
      overdue_amount: 30000,
      overdue_days: 18,
      last_payment_date: '2026-10-12',
    },
    {
      id: 6,
      student_id: 106,
      student_name: 'Meera Iyer',
      roll_number: '12-COM-15',
      admission_number: 'ADM-2025-0415',
      standard: 'Standard 12 Commerce',
      division: 'Division A',
      guardian_name: 'Ramanathan Iyer',
      guardian_phone: '+91 98266 88990',
      total_fee: 80000,
      paid_amount: 40000,
      overdue_amount: 40000,
      overdue_days: 52,
      last_payment_date: '2026-09-02',
    },
  ])

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKSPACE 6: CONCESSIONS & WAIVERS STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [concessionFilterType, setConcessionFilterType] = useState<string>('all')
  const [concessionFilterStatus, setConcessionFilterStatus] = useState<string>('all')
  const [concessionSearchQuery, setConcessionSearchQuery] = useState('')
  const [isNewConcessionModalOpen, setIsNewConcessionModalOpen] = useState(false)
  const [concessionApplicationMode, setConcessionApplicationMode] = useState<'single' | 'bulk'>('single')

  // Single student form
  const [selectedStudentForConcession, setSelectedStudentForConcession] = useState<{ id: number; name: string; admission_number: string; standard?: string } | null>(null)
  const [studentConcessionSearch, setStudentConcessionSearch] = useState('')
  const [selectedConcessionTypeId, setSelectedConcessionTypeId] = useState<number | ''>('')
  const [concessionAmountValue, setConcessionAmountValue] = useState<number | ''>('')
  const [concessionPercentageValue, setConcessionPercentageValue] = useState<number | ''>('')
  const [concessionRemarks, setConcessionRemarks] = useState('')
  const [eligibilityResult, setEligibilityResult] = useState<ConcessionEligibilityResult | null>(null)
  const [isEvaluatingEligibility, setIsEvaluatingEligibility] = useState(false)
  const [isSubmittingConcession, setIsSubmittingConcession] = useState(false)

  // Bulk student form
  const [bulkStandardId, setBulkStandardId] = useState<number | ''>('')
  const [bulkSelectedStudentIds, setBulkSelectedStudentIds] = useState<number[]>([])
  const [bulkAutoApprove, setBulkAutoApprove] = useState(true)

  // Queries for concessions
  const { data: concessionTypes = [] } = useQuery({
    queryKey: ['concession-types'],
    queryFn: () => concessionsApi.getTypes().then((r) => r.data),
  })

  const {
    data: concessionApplications = [],
    refetch: refetchConcessions,
    isLoading: isLoadingConcessions,
  } = useQuery({
    queryKey: ['concession-applications', concessionFilterType, concessionFilterStatus, concessionSearchQuery],
    queryFn: () =>
      concessionsApi
        .getApplications({
          concession_type_id: concessionFilterType !== 'all' ? Number(concessionFilterType) : undefined,
          status: concessionFilterStatus !== 'all' ? concessionFilterStatus : undefined,
          search: concessionSearchQuery.trim() || undefined,
        })
        .then((r) => r.data),
  })

  const { data: concessionAnalytics, refetch: refetchConcessionAnalytics } = useQuery({
    queryKey: ['concession-analytics', selectedAcademicYearId],
    queryFn: () =>
      concessionsApi
        .getAnalytics(selectedAcademicYearId ?? undefined)
        .then((r) => r.data),
  })

  // Single student search for concession modal
  const { data: studentConcessionResults = [] } = useQuery({
    queryKey: ['student-concession-search', studentConcessionSearch],
    queryFn: () =>
      studentsApi
        .list({
          search: studentConcessionSearch.trim() || undefined,
          page_size: 15,
        })
        .then((r) => r.data.data),
    enabled: isNewConcessionModalOpen && concessionApplicationMode === 'single' && studentConcessionSearch.trim().length >= 1,
  })

  // Bulk standard students for concession modal
  const { data: bulkStandardStudents = [] } = useQuery({
    queryKey: ['bulk-standard-students', bulkStandardId],
    queryFn: () =>
      studentsApi
        .list({
          standard_id: bulkStandardId ? Number(bulkStandardId) : undefined,
          page_size: 100,
        })
        .then((r) => r.data.data),
    enabled: isNewConcessionModalOpen && concessionApplicationMode === 'bulk' && !!bulkStandardId,
  })

  // Automated eligibility evaluation when student and scheme are selected
  useEffect(() => {
    if (selectedStudentForConcession && selectedConcessionTypeId) {
      setIsEvaluatingEligibility(true)
      concessionsApi
        .evaluateEligibility(selectedStudentForConcession.id, Number(selectedConcessionTypeId))
        .then((r) => setEligibilityResult(r.data))
        .catch(() => setEligibilityResult(null))
        .finally(() => setIsEvaluatingEligibility(false))

      const cType = concessionTypes.find((t) => t.id === Number(selectedConcessionTypeId))
      if (cType) {
        if (cType.calculation_type === 'percentage') {
          setConcessionPercentageValue(cType.default_value)
          setConcessionAmountValue('')
        } else if (cType.calculation_type === 'full_waiver') {
          setConcessionPercentageValue(100)
          setConcessionAmountValue('')
        } else {
          setConcessionAmountValue(cType.default_value)
          setConcessionPercentageValue('')
        }
      }
    } else {
      setEligibilityResult(null)
    }
  }, [selectedStudentForConcession, selectedConcessionTypeId, concessionTypes])

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKSPACE 7: ONLINE GATEWAY STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [onlineQrAmount, setOnlineQrAmount] = useState<number>(25000)
  const [onlineQrStudentName, setOnlineQrStudentName] = useState<string>('Aarav Sharma')
  const [onlineQrInvoiceNo, setOnlineQrInvoiceNo] = useState<string>('INV-2026-0104')
  const [qrCopied, setQrCopied] = useState(false)
  const [paymentLinkCopied, setPaymentLinkCopied] = useState(false)

  const [onlineSettlements] = useState([
    {
      id: 1,
      gateway_ref: 'pay_N9uW2kL80d7X',
      order_id: 'order_N9uT1aQ79f',
      student_name: 'Aarav Sharma',
      admission_number: 'ADM-2025-0101',
      payment_method: 'UPI',
      gross_amount: 25000,
      gateway_fee: 0,
      net_payout: 25000,
      settlement_status: 'Settled',
      settlement_time: '2026-11-08 14:32 IST',
      webhook_status: 'Delivered (200 OK)',
    },
    {
      id: 2,
      gateway_ref: 'pay_N9tL1qP55e2Y',
      order_id: 'order_N9tK0bM44c',
      student_name: 'Diya Patel',
      admission_number: 'ADM-2025-0104',
      payment_method: 'Netbanking',
      gross_amount: 35000,
      gateway_fee: 350,
      net_payout: 34650,
      settlement_status: 'Settled',
      settlement_time: '2026-11-08 11:15 IST',
      webhook_status: 'Delivered (200 OK)',
    },
    {
      id: 3,
      gateway_ref: 'pay_N9sA8wK33z1M',
      order_id: 'order_N9sZ7vJ22p',
      student_name: 'Rohan Gupta',
      admission_number: 'ADM-2025-0212',
      payment_method: 'Credit Card',
      gross_amount: 45000,
      gateway_fee: 810,
      net_payout: 44190,
      settlement_status: 'Processing',
      settlement_time: '2026-11-09 09:40 IST',
      webhook_status: 'Delivered (200 OK)',
    },
    {
      id: 4,
      gateway_ref: 'pay_N9rM4kH11x9T',
      order_id: 'order_N9rL3jG00k',
      student_name: 'Ananya Deshmukh',
      admission_number: 'ADM-2025-0088',
      payment_method: 'UPI',
      gross_amount: 20000,
      gateway_fee: 0,
      net_payout: 20000,
      settlement_status: 'Settled',
      settlement_time: '2026-11-09 10:20 IST',
      webhook_status: 'Delivered (200 OK)',
    },
  ])

  // Handlers for Defaulters, Concessions & Online Gateway
  const handleSendSingleReminder = (defaulter: typeof defaultersList[0]) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Activate Edit Mode above to send fee reminders.')
      return
    }
    toast.success(`Fee reminder SMS & WhatsApp dispatched to ${defaulter.guardian_name} (${defaulter.guardian_phone}) for ${defaulter.student_name}.`)
  }

  const handleBulkReminderConfirm = () => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Activate Edit Mode above to dispatch bulk reminders.')
      return
    }
    setIsBulkReminderModalOpen(false)
    toast.success(`Bulk Fee Reminders successfully dispatched to ${filteredDefaulters.length} guardians via SMS & WhatsApp Gateway!`)
  }

  const handleCreateConcessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) {
      toast.error('Locked in View Mode: Activate Edit Mode above to apply concessions.')
      return
    }

    if (concessionApplicationMode === 'single') {
      if (!selectedStudentForConcession) {
        toast.error('Please search and select an enrolled student.')
        return
      }
      if (!selectedConcessionTypeId) {
        toast.error('Please select a concession scheme.')
        return
      }

      setIsSubmittingConcession(true)
      try {
        const res = await concessionsApi.createApplication({
          student_id: selectedStudentForConcession.id,
          concession_type_id: Number(selectedConcessionTypeId),
          academic_year_id: selectedAcademicYearId ?? undefined,
          requested_amount: concessionAmountValue ? Number(concessionAmountValue) : undefined,
          requested_percentage: concessionPercentageValue ? Number(concessionPercentageValue) : undefined,
          remarks: concessionRemarks.trim() || undefined,
        })
        toast.success(res.data.message || 'Concession application submitted successfully!')
        refetchConcessions()
        refetchConcessionAnalytics()
        setIsNewConcessionModalOpen(false)
        setSelectedStudentForConcession(null)
        setStudentConcessionSearch('')
        setSelectedConcessionTypeId('')
        setConcessionAmountValue('')
        setConcessionPercentageValue('')
        setConcessionRemarks('')
        setEligibilityResult(null)
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || 'Failed to submit concession application.')
      } finally {
        setIsSubmittingConcession(false)
      }
    } else {
      // Bulk mode
      if (bulkSelectedStudentIds.length === 0) {
        toast.error('Please select at least one student for bulk concession.')
        return
      }
      if (!selectedConcessionTypeId) {
        toast.error('Please select a concession scheme.')
        return
      }

      setIsSubmittingConcession(true)
      try {
        const res = await concessionsApi.createBulkApplications({
          student_ids: bulkSelectedStudentIds,
          concession_type_id: Number(selectedConcessionTypeId),
          academic_year_id: selectedAcademicYearId ?? undefined,
          requested_amount: concessionAmountValue ? Number(concessionAmountValue) : undefined,
          requested_percentage: concessionPercentageValue ? Number(concessionPercentageValue) : undefined,
          remarks: concessionRemarks.trim() || undefined,
          auto_approve: bulkAutoApprove,
        })
        toast.success(res.data.message)
        refetchConcessions()
        refetchConcessionAnalytics()
        setIsNewConcessionModalOpen(false)
        setBulkSelectedStudentIds([])
        setConcessionRemarks('')
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || 'Failed to apply bulk concessions.')
      } finally {
        setIsSubmittingConcession(false)
      }
    }
  }

  const handleApproveConcession = async (id: number) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Activate Edit Mode above to approve concessions.')
      return
    }
    try {
      const res = await concessionsApi.approveApplication(id, { auto_apply: true })
      toast.success(res.data.message || 'Concession approved and applied to invoice!')
      refetchConcessions()
      refetchConcessionAnalytics()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to approve concession.')
    }
  }

  const handleRejectConcession = async (id: number) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Activate Edit Mode above to reject concessions.')
      return
    }
    const reason = window.prompt('Enter rejection reason:')
    if (!reason || !reason.trim()) {
      toast.error('A rejection reason is required.')
      return
    }
    try {
      const res = await concessionsApi.rejectApplication(id, { rejection_reason: reason.trim() })
      toast.success(res.data.message || 'Concession application rejected.')
      refetchConcessions()
      refetchConcessionAnalytics()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to reject concession.')
    }
  }

  const handleApplyConcession = async (id: number) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Activate Edit Mode above to apply concessions.')
      return
    }
    try {
      const res = await concessionsApi.applyApplication(id)
      toast.success(res.data.message || 'Concession allocated to fee invoice!')
      refetchConcessions()
      refetchConcessionAnalytics()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to apply concession.')
    }
  }

  const handleGenerateQr = () => {
    toast.success(`Dynamic UPI BharatQR refreshed for ${onlineQrStudentName} (₹${onlineQrAmount.toLocaleString('en-IN')})`)
  }

  const handleCopyQrLink = () => {
    const upiLink = `upi://pay?pa=prashantacademy@icici&pn=Prashant+Academy&am=${onlineQrAmount}&cu=INR&tn=Fee+Payment+${onlineQrInvoiceNo}`
    navigator.clipboard.writeText(upiLink)
    setQrCopied(true)
    setTimeout(() => setQrCopied(false), 2000)
    toast.success('UPI Intent URL copied to clipboard!')
  }

  const handleCopyPaymentLink = () => {
    const link = `https://pay.prashantacademy.com/inv/${onlineQrInvoiceNo}`
    navigator.clipboard.writeText(link)
    setPaymentLinkCopied(true)
    setTimeout(() => setPaymentLinkCopied(false), 2000)
    toast.success('Payment portal link copied to clipboard!')
  }

  // Filtered defaulters
  const filteredDefaulters = defaultersList.filter(d => {
    if (defaulterStandardFilter && d.standard !== defaulterStandardFilter) return false
    if (defaulterAgingFilter === '1-30' && (d.overdue_days < 1 || d.overdue_days > 30)) return false
    if (defaulterAgingFilter === '31-60' && (d.overdue_days < 31 || d.overdue_days > 60)) return false
    if (defaulterAgingFilter === '60+' && d.overdue_days <= 60) return false
    if (defaulterSearchQuery) {
      const q = defaulterSearchQuery.toLowerCase()
      return (
        d.student_name.toLowerCase().includes(q) ||
        d.roll_number.toLowerCase().includes(q) ||
        d.admission_number.toLowerCase().includes(q) ||
        d.guardian_name.toLowerCase().includes(q) ||
        d.guardian_phone.includes(q)
      )
    }
    return true
  })

  // Filtered concessions from live backend
  const filteredConcessions = concessionApplications.filter(c => {
    if (concessionFilterType !== 'all') {
      const matchesId = String(c.concession_type_id) === concessionFilterType
      const matchesCategory = c.category === concessionFilterType
      if (!matchesId && !matchesCategory) return false
    }
    if (concessionFilterStatus !== 'all' && c.status.toLowerCase() !== concessionFilterStatus.toLowerCase()) return false
    if (concessionSearchQuery) {
      const q = concessionSearchQuery.toLowerCase()
      return (
        c.student_name.toLowerCase().includes(q) ||
        c.admission_number.toLowerCase().includes(q) ||
        c.concession_name.toLowerCase().includes(q) ||
        c.application_number.toLowerCase().includes(q)
      )
    }
    return true
  })


  // Derive active tab from URL pathname or search params
  const getTabFromLocation = (): TabKey => {
    const path = location.pathname.toLowerCase()
    if (path.includes('/fees/structures') || path.includes('/fees/plans')) return 'structures'
    if (path.includes('/fees/invoicing') || path.includes('/fees/register')) return 'invoicing'
    if (path.includes('/fees/collection') || path.includes('/fees/collect')) return 'collection'
    if (path.includes('/fees/defaulters')) return 'defaulters'
    if (path.includes('/fees/concessions')) return 'concessions'
    if (path.includes('/fees/online-gateway')) return 'online-gateway'
    if (path.includes('/fees/reports')) return 'reports'
    if (path.includes('/fees/settings')) return 'structures'
    if (path.includes('/fees/overview')) return 'overview'

    const tabParam = searchParams.get('tab') as TabKey
    if (tabParam) {
      if (tabParam === 'plans' || tabParam === 'settings') return 'structures'
      if (tabParam === 'register') return 'invoicing'
      if (tabParam === 'collect') return 'collection'
      if (['overview', 'structures', 'invoicing', 'collection', 'defaulters', 'concessions', 'online-gateway', 'reports'].includes(tabParam)) {
        return tabParam
      }
    }
    return 'overview'
  }

  const [activeTab, setActiveTab] = useState<TabKey>(getTabFromLocation)

  // Synchronize tab state with browser navigation & URL pathname
  useEffect(() => {
    const path = location.pathname.toLowerCase()
    const tabParam = searchParams.get('tab')
    if (
      path.includes('/fees/payments') ||
      path.includes('/fees/receipts') ||
      tabParam === 'payments' ||
      tabParam === 'receipts'
    ) {
      navigate('/payments', { replace: true })
      return
    }

    const derived = getTabFromLocation()
    if (derived && derived !== activeTab) {
      setActiveTab(derived)
    }
  }, [location.pathname, searchParams, navigate])

  const setTab = (tab: TabKey, extraParams?: Record<string, string>) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams)
    params.delete('tab')
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v) params.set(k, v)
      })
    }
    const qs = params.toString() ? `?${params.toString()}` : ''
    navigate(`/fees/${tab}${qs}`)
  }

  const studentIdParam = searchParams.get('studentId')

  // Cascading Filters state
  const [selectedAY, setSelectedAY] = useState<number | null>(selectedAcademicYearId || null)
  const [selectedBoard, setSelectedBoard] = useState<number | null>(null)
  const [selectedStandard, setSelectedStandard] = useState<number | null>(null)
  const [selectedDivision, setSelectedDivision] = useState<number | null>(null)

  // Applied filter state (applied on button click or tab load)
  const [appliedFilters, setAppliedFilters] = useState({
    academicYearId: selectedAcademicYearId || null,
    boardId: null as number | null,
    standardId: null as number | null,
    divisionId: null as number | null,
    search: '',
  })

  // Global search input in top header
  const [globalHeaderSearch, setGlobalHeaderSearch] = useState('')

  // Sync with global academic year selection
  useEffect(() => {
    if (selectedAcademicYearId) {
      setSelectedAY(selectedAcademicYearId)
      setAppliedFilters((prev) => ({ ...prev, academicYearId: selectedAcademicYearId }))
    }
  }, [selectedAcademicYearId])

  // Master Lists for Cascading Filter Bar
  const { data: academicYears = [] } = useQuery({
    queryKey: ['filter-academic-years', selectedInstitutionId],
    queryFn: async () => {
      const res = await academicYearsApi.list(selectedInstitutionId ?? undefined)
      if (res.data && res.data.length > 0) return res.data
      const fallback = await academicYearsApi.list()
      return fallback.data
    },
  })

  const { data: boards = [] } = useQuery({
    queryKey: ['filter-boards', selectedInstitutionId],
    queryFn: () => boardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  const { data: standards = [] } = useQuery({
    queryKey: ['filter-standards', selectedInstitutionId, selectedBoard],
    queryFn: () =>
      standardsApi
        .list({
          institution_id: selectedInstitutionId ?? undefined,
          board_id: selectedBoard ?? undefined,
        })
        .then((r) => r.data),
  })

  const { data: divisions = [] } = useQuery({
    queryKey: ['filter-divisions', selectedStandard, selectedBoard],
    queryFn: () =>
      divisionsApi
        .list({
          standard_id: selectedStandard ?? undefined,
          board_id: selectedBoard ?? undefined,
        })
        .then((r) => r.data),
  })

  const handleApplyFilters = () => {
    setAppliedFilters({
      academicYearId: selectedAY,
      boardId: selectedBoard,
      standardId: selectedStandard,
      divisionId: selectedDivision,
      search: globalHeaderSearch.trim(),
    })
    toast.success('Filters applied to financial workspace')
  }

  const handleResetFilters = () => {
    setSelectedAY(selectedAcademicYearId || null)
    setSelectedBoard(null)
    setSelectedStandard(null)
    setSelectedDivision(null)
    setGlobalHeaderSearch('')
    setAppliedFilters({
      academicYearId: selectedAcademicYearId || null,
      boardId: null,
      standardId: null,
      divisionId: null,
      search: '',
    })
    toast.success('Filters reset to default view')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 1: OVERVIEW DATA
  // ─────────────────────────────────────────────────────────────────────────────
  const { data: overviewData, isLoading: loadingOverview } = useQuery({
    queryKey: ['fees-overview', appliedFilters],
    queryFn: () =>
      feesApi
        .getOverview({
          academic_year_id: appliedFilters.academicYearId ?? undefined,
          institution_id: selectedInstitutionId ?? undefined,
          board_id: appliedFilters.boardId ?? undefined,
          standard_id: appliedFilters.standardId ?? undefined,
          division_id: appliedFilters.divisionId ?? undefined,
        })
        .then((r) => r.data),
    enabled: activeTab === 'overview',
  })

  const recentPaymentsList = overviewData?.recent_payments ?? []
  const {
    sortedData: sortedRecentPayments,
    sortKey: recentPaymentsSortKey,
    sortDirection: recentPaymentsSortDirection,
    requestSort: requestRecentPaymentsSort,
  } = useTableSort(recentPaymentsList, {
    initialKey: 'payment_date',
    initialDirection: 'desc',
    initialType: 'date',
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 2: FEE REGISTER
  // ─────────────────────────────────────────────────────────────────────────────
  const [registerStatusFilter, setRegisterStatusFilter] = useState('')
  const [registerStudentStatusFilter, setRegisterStudentStatusFilter] = useState('')
  const [registerSearchText, setRegisterSearchText] = useState('')
  const [selectedInstallments, setSelectedInstallments] = useState<FeeRegisterInstallment[] | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState<string>('')

  const { data: registerEntries = [], isLoading: loadingRegister } = useQuery({
    queryKey: ['fee-register', appliedFilters, registerStatusFilter, registerStudentStatusFilter, registerSearchText],
    queryFn: () =>
      feesApi
        .getRegister({
          academic_year_id: appliedFilters.academicYearId ?? undefined,
          board_id: appliedFilters.boardId ?? undefined,
          standard_id: appliedFilters.standardId ?? undefined,
          division_id: appliedFilters.divisionId ?? undefined,
          status: registerStatusFilter || undefined,
          student_status: registerStudentStatusFilter || undefined,
          search: registerSearchText || appliedFilters.search || undefined,
        })
        .then((r) => r.data),
    enabled: activeTab === 'register' || activeTab === 'invoicing',
  })

  const REGISTER_SORT_OPTIONS: TableSortOption[] = [
    { key: 'outstanding_amount', label: 'Balance Due', type: 'number' as const, defaultDirection: 'desc' as const },
    { key: 'student_name', label: 'Student Name' },
    { key: 'admission_number', label: 'Admission No' },
    { key: 'standard_name', label: 'Class / Course' },
    { key: 'net_amount', label: 'Fee Obligation', type: 'number' as const },
    { key: 'paid_amount', label: 'Paid Amount', type: 'number' as const },
    { key: 'status', label: 'Status' },
  ]

  const {
    sortedData: sortedRegisterEntries,
    sortKey: registerSortKey,
    sortDirection: registerSortDirection,
    requestSort: requestRegisterSort,
    setSort: setRegisterSort,
    clearSort: clearRegisterSort,
  } = useTableSort(registerEntries, {
    initialKey: 'outstanding_amount',
    initialDirection: 'desc',
    initialType: 'number',
  })

  const exportRegisterCsv = () => {
    if (!registerEntries.length) {
      toast.error('No register records to export')
      return
    }
    const headers = [
      'Admission No', 'Student Name', 'Phone', 'Board', 'Standard',
      'Batch', 'Obligation (INR)', 'Paid (INR)', 'Outstanding (INR)',
      'Status', 'Payments Count', 'Last Payment Date',
    ]
    const rows = registerEntries.map((e) => [
      `"${e.admission_number}"`,
      `"${e.student_name}"`,
      `"${e.phone || ''}"`,
      `"${e.board_name}"`,
      `"${e.standard_name}"`,
      `"${e.batch_name}"`,
      e.net_amount,
      e.paid_amount,
      e.outstanding_amount,
      `"${e.status}"`,
      e.payment_count,
      `"${e.last_payment_date || 'N/A'}"`,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `fee_register_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success('Fee Register exported successfully')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 3: COLLECT FEES (TERMINAL)
  // ─────────────────────────────────────────────────────────────────────────────
  const [collectStudentSearch, setCollectStudentSearch] = useState('')
  const [selectedCollectStudentId, setSelectedCollectStudentId] = useState<number | null>(
    studentIdParam ? Number(studentIdParam) : null
  )

  useEffect(() => {
    if (studentIdParam) {
      setSelectedCollectStudentId(Number(studentIdParam))
    }
  }, [studentIdParam])

  // Search students for collection dropdown
  const { data: studentSearchResults } = useQuery({
    queryKey: ['students-search', collectStudentSearch, appliedFilters.academicYearId],
    queryFn: () =>
      studentsApi
        .list({
          search: collectStudentSearch.trim() || undefined,
          academic_year_id: appliedFilters.academicYearId ?? undefined,
          page_size: 15,
        })
        .then((r) => r.data.data),
    enabled: (activeTab === 'collect' || activeTab === 'collection') && collectStudentSearch.length >= 1,
  })

  // Selected student details
  const { data: collectStudent } = useQuery({
    queryKey: ['collect-student', selectedCollectStudentId],
    queryFn: () =>
      selectedCollectStudentId
        ? studentsApi.get(selectedCollectStudentId).then((r) => r.data)
        : null,
    enabled: !!selectedCollectStudentId && (activeTab === 'collect' || activeTab === 'collection'),
  })

  // Selected student's active invoice
  const { data: collectInvoices = [], refetch: refetchCollectInvoices } = useQuery({
    queryKey: ['collect-invoices', selectedCollectStudentId, appliedFilters.academicYearId],
    queryFn: () =>
      selectedCollectStudentId
        ? invoicesApi
            .list({
              student_id: selectedCollectStudentId,
              academic_year_id: appliedFilters.academicYearId ?? undefined,
            })
            .then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!selectedCollectStudentId && (activeTab === 'collect' || activeTab === 'collection'),
  })

  const activeInvoice = collectInvoices[0] as FeeInvoice | undefined

  // Collection Form state
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [transRef, setTransRef] = useState('')
  const [bankName, setBankName] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')
  const [chequeDate, setChequeDate] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | null>(null)
  const [receiptSuccessData, setReceiptSuccessData] = useState<{
    receipt_number: string
    payment_id: number
    amount: number
    student_name?: string
    admission_number?: string
    payment_method?: string
    payment_date?: string
    board_name?: string
    standard_name?: string
    batch_name?: string
  } | null>(null)

  const fillAmount = (amt: number, installmentId?: number) => {
    setPaymentAmount(String(amt))
    if (installmentId) {
      setSelectedInstallmentId(installmentId)
    } else {
      setSelectedInstallmentId(null)
    }
  }

  const collectMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.create(payload),
    onSuccess: (res, vars) => {
      if (res.data.status === 'draft') {
        toast.success(`Draft payment voucher created! Voucher ID: #${res.data.payment_id}`)
      } else {
        toast.success(`Payment recorded! Receipt: ${res.data.receipt_number || '#' + res.data.payment_id}`)
        if (res.data.receipt_number) {
          setReceiptSuccessData({
            receipt_number: res.data.receipt_number,
            payment_id: res.data.payment_id,
            amount: Number(vars.amount),
            student_name: collectStudent
              ? `${collectStudent.first_name} ${collectStudent.last_name}`
              : undefined,
            admission_number: collectStudent?.admission_number,
            payment_method: vars.payment_method,
            payment_date: vars.payment_date,
          })
        }
      }
      setPaymentAmount('')
      setTransRef('')
      setBankName('')
      setChequeNumber('')
      setChequeDate('')
      setPaymentNotes('')
      setSelectedInstallmentId(null)

      queryClient.invalidateQueries({ queryKey: ['fees-overview'] })
      queryClient.invalidateQueries({ queryKey: ['fee-register'] })
      queryClient.invalidateQueries({ queryKey: ['payments-list'] })
      queryClient.invalidateQueries({ queryKey: ['payments-page'] })
      queryClient.invalidateQueries({ queryKey: ['receipts-list'] })
      queryClient.invalidateQueries({ queryKey: ['collect-invoices'] })
      refetchCollectInvoices()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Payment failed. Please check allocations.')
    },
  })

  const handleRecordPayment = (e?: React.FormEvent, action: 'draft' | 'post' = 'post') => {
    if (e) e.preventDefault()
    if (!isEditMode) {
      toast.error('Action locked: You must explicitly enable Edit Mode first.')
      return
    }
    if (!selectedCollectStudentId || !activeInvoice) {
      toast.error('Please select a student with an active fee invoice')
      return
    }
    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }
    if (action === 'post' && amt > Number(activeInvoice.outstanding_amount)) {
      if (!window.confirm(`Amount ${fmt(amt)} exceeds outstanding balance of ${fmt(activeInvoice.outstanding_amount)}. Proceed anyway?`)) {
        return
      }
    }

    const payload = {
      student_id: selectedCollectStudentId,
      academic_year_id: appliedFilters.academicYearId || activeInvoice.academic_year_id || 1,
      amount: amt,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      transaction_reference: transRef || undefined,
      bank_name: bankName || undefined,
      cheque_number: chequeNumber || undefined,
      notes: paymentNotes || undefined,
      action: action,
      allocations: [
        {
          invoice_id: activeInvoice.id,
          installment_id: selectedInstallmentId || undefined,
          amount: amt,
        },
      ],
    }
    collectMutation.mutate(payload)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 4: PAYMENTS LEDGER
  // ─────────────────────────────────────────────────────────────────────────────
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentTransactionItem | null>(null)
  const [reversalTargetPayment, setReversalTargetPayment] = useState<PaymentTransactionItem | null>(null)
  const [reversalReason, setReversalReason] = useState('')

  const { data: paymentsList = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments-list', appliedFilters, paymentStatusFilter, paymentMethodFilter, paymentSearch],
    queryFn: () =>
      paymentsApi
        .list({
          academic_year_id: appliedFilters.academicYearId ?? undefined,
          board_id: appliedFilters.boardId ?? undefined,
          standard_id: appliedFilters.standardId ?? undefined,
          division_id: appliedFilters.divisionId ?? undefined,
          status: paymentStatusFilter || undefined,
          search: paymentSearch || undefined,
        })
        .then((r) => r.data),
    enabled: activeTab === 'payments' || activeTab === 'collection',
  })

  const {
    sortedData: sortedPaymentsList,
    sortKey: paymentsSortKey,
    sortDirection: paymentsSortDirection,
    requestSort: requestPaymentsSort,
  } = useTableSort(paymentsList, {
    initialKey: 'payment_date',
    initialDirection: 'desc',
    initialType: 'date',
  })

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      paymentsApi.reverse(id, reason),
    onSuccess: () => {
      toast.success('Payment reversed and balances restored successfully')
      setReversalTargetPayment(null)
      setReversalReason('')
      queryClient.invalidateQueries({ queryKey: ['payments-list'] })
      queryClient.invalidateQueries({ queryKey: ['fees-overview'] })
      queryClient.invalidateQueries({ queryKey: ['fee-register'] })
      queryClient.invalidateQueries({ queryKey: ['receipts-list'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Reversal failed')
    },
  })

  const handleConfirmReversal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) {
      toast.error('Action locked: You must explicitly enable Edit Mode first.')
      return
    }
    if (!reversalTargetPayment) return
    if (!reversalReason.trim()) {
      toast.error('Reversal reason is mandatory for financial audit')
      return
    }
    reverseMutation.mutate({
      id: reversalTargetPayment.id,
      reason: reversalReason.trim(),
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 5: RECEIPTS
  // ─────────────────────────────────────────────────────────────────────────────
  const [receiptSearchText, setReceiptSearchText] = useState('')
  const [activeReceiptModalNumber, setActiveReceiptModalNumber] = useState<string | null>(null)
  const [selectedReceiptNumbers, setSelectedReceiptNumbers] = useState<Set<string>>(new Set())
  const [bulkExportingZip, setBulkExportingZip] = useState<boolean>(false)
  const [bulkDownloadingIndividual, setBulkDownloadingIndividual] = useState<boolean>(false)
  const [receiptNotification, setReceiptNotification] = useState<ShareNotification | null>(null)

  const { data: receiptsList = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ['receipts-list', appliedFilters, receiptSearchText],
    queryFn: () =>
      paymentsApi
        .listReceipts({
          academic_year_id: appliedFilters.academicYearId ?? undefined,
          board_id: appliedFilters.boardId ?? undefined,
          standard_id: appliedFilters.standardId ?? undefined,
          division_id: appliedFilters.divisionId ?? undefined,
          search: receiptSearchText || undefined,
        })
        .then((r) => r.data),
    enabled: activeTab === 'receipts' || activeTab === 'collection',
  })

  const {
    sortedData: sortedReceiptsList,
    sortKey: receiptsSortKey,
    sortDirection: receiptsSortDirection,
    requestSort: requestReceiptsSort,
  } = useTableSort(receiptsList, {
    initialKey: 'payment_date',
    initialDirection: 'desc',
    initialType: 'date',
  })

  // Selected receipts calculation & bulk actions
  const selectedReceipts = useMemo(
    () => receiptsList.filter((r) => selectedReceiptNumbers.has(r.receipt_number)),
    [receiptsList, selectedReceiptNumbers]
  )
  const selectedTotalAmount = useMemo(
    () => selectedReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [selectedReceipts]
  )
  const allVisibleSelected =
    receiptsList.length > 0 && receiptsList.every((r) => selectedReceiptNumbers.has(r.receipt_number))
  const someVisibleSelected =
    receiptsList.some((r) => selectedReceiptNumbers.has(r.receipt_number)) && !allVisibleSelected

  const toggleSelectReceipt = (receiptNumber: string) => {
    setSelectedReceiptNumbers((prev) => {
      const next = new Set(prev)
      if (next.has(receiptNumber)) next.delete(receiptNumber)
      else next.add(receiptNumber)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedReceiptNumbers(new Set())
    } else {
      setSelectedReceiptNumbers(new Set(receiptsList.map((r) => r.receipt_number)))
    }
  }

  const clearReceiptSelection = () => {
    setSelectedReceiptNumbers(new Set())
  }

  const handleDownloadSingleReceiptPdf = async (receiptNumber: string, studentName?: string) => {
    try {
      const res = await paymentsApi.downloadReceiptPdf(receiptNumber)
      const filename = sanitizeReceiptFilename(studentName, receiptNumber)
      triggerBlobDownload(new Blob([res.data], { type: 'application/pdf' }), filename)
      setReceiptNotification({
        type: 'success',
        title: 'Receipt PDF Downloaded',
        message: `Successfully downloaded ${filename}`,
      })
    } catch (err: any) {
      setReceiptNotification({
        type: 'error',
        title: 'Download Failed',
        message: err?.response?.data?.detail || err?.message || 'Failed to download receipt PDF.',
      })
    }
  }

  const handleDirectShareSingleReceipt = async (receiptNumber: string, studentName?: string) => {
    await shareOrDownloadReceiptPdf(receiptNumber, studentName, (notif) => {
      setReceiptNotification(notif)
    })
  }

  const handleBulkDownloadIndividualPdfs = async () => {
    if (selectedReceipts.length === 0) return
    setBulkDownloadingIndividual(true)
    let successCount = 0
    let failCount = 0

    for (const r of selectedReceipts) {
      try {
        const res = await paymentsApi.downloadReceiptPdf(r.receipt_number)
        const filename = sanitizeReceiptFilename(r.student_name, r.receipt_number)
        triggerBlobDownload(new Blob([res.data], { type: 'application/pdf' }), filename)
        successCount++
        await new Promise((resolve) => setTimeout(resolve, 250))
      } catch {
        failCount++
      }
    }

    setBulkDownloadingIndividual(false)
    if (failCount === 0) {
      setReceiptNotification({
        type: 'success',
        title: 'Bulk Download Completed',
        message: `Downloaded ${successCount} individual receipt PDFs successfully.`,
      })
    } else {
      setReceiptNotification({
        type: 'warning',
        title: 'Bulk Download Completed with Issues',
        message: `Downloaded ${successCount} receipt PDFs. Failed to download ${failCount} receipts.`,
      })
    }
  }

  const handleBulkDownloadZip = async () => {
    if (selectedReceiptNumbers.size === 0) return
    setBulkExportingZip(true)
    try {
      const res = await paymentsApi.exportBulkReceiptsZip(Array.from(selectedReceiptNumbers))
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15)
      const filename = `Receipts_Batch_${timestamp}.zip`
      triggerBlobDownload(new Blob([res.data], { type: 'application/zip' }), filename)
      setReceiptNotification({
        type: 'success',
        title: 'Bulk ZIP Export Completed',
        message: `Successfully downloaded ${filename} containing ${selectedReceiptNumbers.size} receipts.`,
      })
    } catch (err: any) {
      setReceiptNotification({
        type: 'error',
        title: 'Bulk Export Failed',
        message: err?.response?.data?.detail || err?.message || 'Failed to export bulk receipts ZIP.',
      })
    } finally {
      setBulkExportingZip(false)
    }
  }

  // Full detailed receipt query for modal
  const { data: detailedReceipt, isLoading: loadingDetailedReceipt } = useQuery({
    queryKey: ['detailed-receipt', activeReceiptModalNumber],
    queryFn: () =>
      activeReceiptModalNumber
        ? paymentsApi.getReceipt(activeReceiptModalNumber).then((r) => r.data)
        : null,
    enabled: !!activeReceiptModalNumber,
  })

  // Edit Receipt Modal State
  const [isEditReceiptModalOpen, setIsEditReceiptModalOpen] = useState(false)
  const [editingReceiptItem, setEditingReceiptItem] = useState<PaymentReceiptListItem | null>(null)
  const [loadingReceiptPayment, setLoadingReceiptPayment] = useState(false)
  const [editReceiptForm, setEditReceiptForm] = useState({
    payment_id: 0,
    receipt_number: '',
    student_name: '',
    amount: '',
    payment_date: '',
    payment_method: 'cash',
    transaction_reference: '',
    bank_name: '',
    cheque_number: '',
    notes: '',
    edit_reason: '',
    status: '',
  })

  const handleOpenEditReceipt = async (r: PaymentReceiptListItem) => {
    if (!isEditMode) {
      toast.error('Action locked: You must explicitly enable Edit Mode first.')
      return
    }
    setEditingReceiptItem(r)
    setLoadingReceiptPayment(true)
    setIsEditReceiptModalOpen(true)
    try {
      const res = await paymentsApi.get(r.payment_id)
      const p = res.data
      setEditReceiptForm({
        payment_id: p.id,
        receipt_number: r.receipt_number,
        student_name: r.student_name,
        amount: String(p.amount),
        payment_date: p.payment_date || '',
        payment_method: p.payment_method || 'cash',
        transaction_reference: p.transaction_reference || '',
        bank_name: p.bank_name || '',
        cheque_number: p.cheque_number || '',
        notes: p.notes || '',
        edit_reason: '',
        status: p.status,
      })
    } catch {
      setEditReceiptForm({
        payment_id: r.payment_id,
        receipt_number: r.receipt_number,
        student_name: r.student_name,
        amount: String(r.amount),
        payment_date: r.payment_date || '',
        payment_method: r.payment_method || 'cash',
        transaction_reference: '',
        bank_name: '',
        cheque_number: '',
        notes: '',
        edit_reason: '',
        status: r.status,
      })
    } finally {
      setLoadingReceiptPayment(false)
    }
  }

  const editReceiptMutation = useMutation({
    mutationFn: async (form: typeof editReceiptForm) => {
      // If sysadmin and payment is posted/completed, ensure edit_posted permission is active
      if (isUserSysAdmin(user) && (form.status === 'posted' || form.status === 'completed')) {
        try {
          await paymentsApi.toggleEditPosted({
            role_name: 'sysadmin',
            granted: true,
            reason: form.edit_reason.trim() || 'SysAdmin administrative receipt update',
          })
        } catch {
          // ignore if already unlocked
        }
      }
      return paymentsApi.update(form.payment_id, {
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        transaction_reference: form.transaction_reference || undefined,
        bank_name: form.bank_name || undefined,
        cheque_number: form.cheque_number || undefined,
        notes: form.notes || undefined,
        edit_reason: form.edit_reason.trim() || 'Receipt updated by administrator',
      })
    },
    onSuccess: (res) => {
      toast.success(res.data.message || 'Payment and receipt updated successfully')
      setIsEditReceiptModalOpen(false)
      setEditingReceiptItem(null)
      queryClient.invalidateQueries({ queryKey: ['receipts-list'] })
      queryClient.invalidateQueries({ queryKey: ['fees-register'] })
      queryClient.invalidateQueries({ queryKey: ['fee-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['fee-overview'] })
      queryClient.invalidateQueries({ queryKey: ['my-payment-permissions'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update payment receipt')
    },
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 6: FEE PLANS (STRUCTURES & CATEGORIES)
  // ─────────────────────────────────────────────────────────────────────────────
  const [plansSubTab, setPlansSubTab] = useState<'structures' | 'categories'>('structures')
  const [isNewStructureModalOpen, setIsNewStructureModalOpen] = useState(false)
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false)

  const { data: feeStructures = [], isLoading: loadingStructures } = useQuery({
    queryKey: ['fee-structures', selectedInstitutionId, appliedFilters.academicYearId],
    queryFn: () =>
      feeStructuresApi
        .list({
          institution_id: selectedInstitutionId ?? undefined,
          academic_year_id: appliedFilters.academicYearId ?? undefined,
        })
        .then((r) => r.data),
    enabled: activeTab === 'plans' || activeTab === 'structures',
  })

  const { data: feeCategories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['fee-categories', selectedInstitutionId],
    queryFn: () => feeCategoriesApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
    enabled: activeTab === 'plans' || activeTab === 'structures',
  })

  // Create Fee Structure Form state
  const [newStructName, setNewStructName] = useState('')
  const [newStructCatId, setNewStructCatId] = useState<number | ''>('')
  const [newStructStdId, setNewStructStdId] = useState<number | ''>('')
  const [newStructAmount, setNewStructAmount] = useState('')
  const [newStructFrequency, setNewStructFrequency] = useState('annual')
  const [newStructInstallments, setNewStructInstallments] = useState(1)
  const [newStructDueDay, setNewStructDueDay] = useState<number | ''>(10)
  const [newStructLateFee, setNewStructLateFee] = useState('0')

  const createStructureMutation = useMutation({
    mutationFn: (payload: any) => feeStructuresApi.create(payload),
    onSuccess: () => {
      toast.success('Fee Structure created successfully')
      setIsNewStructureModalOpen(false)
      setNewStructName('')
      setNewStructAmount('')
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create fee structure')
    },
  })

  const handleCreateStructure = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) {
      toast.error('Action locked: You must explicitly enable Edit Mode first.')
      return
    }
    if (!newStructName || !newStructCatId || !newStructAmount) {
      toast.error('Please complete all required fields')
      return
    }
    createStructureMutation.mutate({
      institution_id: selectedInstitutionId || 1,
      academic_year_id: appliedFilters.academicYearId || 1,
      category_id: Number(newStructCatId),
      standard_id: newStructStdId ? Number(newStructStdId) : undefined,
      name: newStructName,
      amount: parseFloat(newStructAmount),
      frequency: newStructFrequency,
      installments_count: Number(newStructInstallments),
      due_day: newStructDueDay ? Number(newStructDueDay) : undefined,
      late_fee_amount: parseFloat(newStructLateFee || '0'),
      late_fee_days: 7,
    })
  }

  // Edit Fee Structure state
  const [isEditStructureModalOpen, setIsEditStructureModalOpen] = useState(false)
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null)
  const [editStructName, setEditStructName] = useState('')
  const [editStructCatId, setEditStructCatId] = useState<number | ''>('')
  const [editStructAmount, setEditStructAmount] = useState('')
  const [editStructFrequency, setEditStructFrequency] = useState('annual')
  const [editStructInstallments, setEditStructInstallments] = useState(1)
  const [editStructIsActive, setEditStructIsActive] = useState(true)

  const handleOpenEditStructure = (fs: FeeStructure) => {
    if (!isEditMode) {
      toast.error('Action locked: You must explicitly enable Edit Mode first.')
      return
    }
    setEditingStructure(fs)
    setEditStructName(fs.name)
    setEditStructCatId(fs.category_id || (fs.category?.id ?? ''))
    setEditStructAmount(String(fs.amount))
    setEditStructFrequency(fs.frequency || 'annual')
    setEditStructInstallments(fs.installments_count || 1)
    setEditStructIsActive(fs.is_active !== false)
    setIsEditStructureModalOpen(true)
  }

  const editStructureMutation = useMutation({
    mutationFn: (data: { id: number; payload: any }) =>
      feeStructuresApi.update(data.id, data.payload),
    onSuccess: () => {
      toast.success('Fee structure updated successfully')
      setIsEditStructureModalOpen(false)
      setEditingStructure(null)
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
      queryClient.invalidateQueries({ queryKey: ['fees-overview'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update fee structure')
    },
  })

  const handleSaveEditStructure = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStructure || !editStructName.trim() || !editStructAmount) {
      toast.error('Please complete all required fields')
      return
    }
    const amt = parseFloat(editStructAmount)
    if (isNaN(amt) || amt < 0) {
      toast.error('Please enter a valid amount')
      return
    }
    editStructureMutation.mutate({
      id: editingStructure.id,
      payload: {
        name: editStructName.trim(),
        category_id: editStructCatId ? Number(editStructCatId) : undefined,
        amount: amt,
        frequency: editStructFrequency,
        installments_count: editStructInstallments,
        is_active: editStructIsActive,
      },
    })
  }

  // Create Fee Category Form state
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')

  const createCategoryMutation = useMutation({
    mutationFn: (payload: any) => feeCategoriesApi.create(payload),
    onSuccess: () => {
      toast.success('Fee Category created successfully')
      setIsNewCategoryModalOpen(false)
      setNewCatName('')
      setNewCatDesc('')
      queryClient.invalidateQueries({ queryKey: ['fee-categories'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create category')
    },
  })

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) {
      toast.error('Action locked: You must explicitly enable Edit Mode first.')
      return
    }
    if (!newCatName) {
      toast.error('Category name is required')
      return
    }
    createCategoryMutation.mutate({
      institution_id: selectedInstitutionId || 1,
      name: newCatName,
      description: newCatDesc,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 7: REPORTS
  // ─────────────────────────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState<'collection' | 'defaulters' | 'methods' | 'reconciliation'>('collection')

  // ── Excel Report Grid Columns for Tab 7 (Reports) ──
  const feeCollectionBoardColumns = useMemo<ColumnConfig<any>[]>(
    () => [
      {
        id: 'board_name',
        header: 'Board / Division',
        accessorKey: 'board_name',
        type: 'text',
        width: 220,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => <span className="font-bold text-slate-900">{val}</span>,
      },
      {
        id: 'student_count',
        header: 'Enrolled Students',
        accessorKey: 'student_count',
        type: 'number',
        width: 140,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-bold text-slate-700">{val}</span>,
      },
      {
        id: 'total_fees',
        header: 'Total Obligation (₹)',
        accessorKey: 'total_fees',
        type: 'currency',
        width: 170,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-bold text-slate-900">{fmt(val)}</span>,
      },
      {
        id: 'collected',
        header: 'Collected (₹)',
        accessorKey: 'collected',
        type: 'currency',
        width: 170,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-bold text-emerald-700">{fmt(val)}</span>,
      },
      {
        id: 'outstanding',
        header: 'Outstanding (₹)',
        accessorKey: 'outstanding',
        type: 'currency',
        width: 170,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-extrabold text-orange-600">{fmt(val)}</span>,
      },
      {
        id: 'rate',
        header: 'Collection Rate',
        accessorKey: 'rate',
        type: 'number',
        width: 140,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => {
          const r = Number(val || 0)
          return (
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                r >= 80
                  ? 'bg-emerald-100 text-emerald-800'
                  : r >= 50
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {r}%
            </span>
          )
        },
      },
    ],
    []
  )

  const feeCollectionBoardSummary = useMemo(
    () => ({
      board_name: () => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Total Board Collection
        </span>
      ),
      student_count: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.student_count || 0), 0)
        return <span className="font-extrabold text-slate-900">{sum}</span>
      },
      total_fees: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.total_fees || 0), 0)
        return <span className="font-extrabold text-slate-900">{fmt(sum)}</span>
      },
      collected: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.collected || 0), 0)
        return <span className="font-extrabold text-emerald-700">{fmt(sum)}</span>
      },
      outstanding: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.outstanding || 0), 0)
        return <span className="font-extrabold text-orange-700">{fmt(sum)}</span>
      },
      rate: (rows: any[]) => {
        const tot = rows.reduce((acc, r) => acc + Number(r.total_fees || 0), 0)
        const col = rows.reduce((acc, r) => acc + Number(r.collected || 0), 0)
        const avg = tot > 0 ? Math.round((col / tot) * 100) : 0
        return <span className="font-extrabold text-primary-700">{avg}% Avg</span>
      },
    }),
    []
  )

  const feeDefaultersColumns = useMemo<ColumnConfig<any>[]>(
    () => [
      {
        id: 'student_name',
        header: 'Student Name',
        accessorKey: 'student_name',
        type: 'text',
        width: 220,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-bold text-slate-900">{val}</span>,
      },
      {
        id: 'admission_number',
        header: 'Admission #',
        accessorKey: 'admission_number',
        type: 'text',
        width: 140,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-mono text-slate-600 font-semibold">{val}</span>,
      },
      {
        id: 'class_batch',
        header: 'Class / Batch',
        accessorFn: (r) => `${r.standard_name || ''} – ${r.batch_name || ''}`,
        type: 'text',
        width: 180,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (_, r) => (
          <span className="text-slate-600 font-medium">
            {r.standard_name} – {r.batch_name}
          </span>
        ),
      },
      {
        id: 'phone',
        header: 'Phone / Contact',
        accessorKey: 'phone',
        type: 'text',
        width: 150,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-mono text-slate-600">{val || '—'}</span>,
      },
      {
        id: 'due_amount',
        header: 'Due Amount (₹)',
        accessorKey: 'due_amount',
        type: 'currency',
        width: 160,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-extrabold text-red-600">{fmt(val)}</span>,
      },
      {
        id: 'due_date',
        header: 'Due Date',
        accessorKey: 'due_date',
        type: 'date',
        width: 140,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'date',
        render: (val) => (
          <span className="text-slate-600 font-medium">
            {val ? new Date(val).toLocaleDateString('en-IN') : 'Past Due'}
          </span>
        ),
      },
    ],
    []
  )

  const feeDefaultersSummary = useMemo(
    () => ({
      student_name: () => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Total Overdue Deficit
        </span>
      ),
      due_amount: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.due_amount || 0), 0)
        return <span className="font-extrabold text-red-700">{fmt(sum)}</span>
      },
    }),
    []
  )

  const feeMethodsColumns = useMemo<ColumnConfig<any>[]>(
    () => [
      {
        id: 'method',
        header: 'Payment Gateway / Method',
        accessorFn: (r) => METHOD_LABELS[r.method] || r.method,
        type: 'text',
        width: 240,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (_, r) => (
          <span className="font-bold text-slate-800 capitalize">
            {METHOD_LABELS[r.method] || r.method}
          </span>
        ),
      },
      {
        id: 'amount',
        header: 'Collected Volume (₹)',
        accessorKey: 'amount',
        type: 'currency',
        width: 200,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-extrabold text-slate-900">{fmt(val)}</span>,
      },
      {
        id: 'count',
        header: 'Transactions Count',
        accessorKey: 'count',
        type: 'number',
        width: 160,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-semibold text-slate-700">{val}</span>,
      },
      {
        id: 'percentage',
        header: 'Volume Share %',
        accessorKey: 'percentage',
        type: 'number',
        width: 150,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-bold text-primary-600">{val}%</span>,
      },
    ],
    []
  )

  const feeMethodsSummary = useMemo(
    () => ({
      method: () => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Total Payment Gateway Inflow
        </span>
      ),
      amount: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0)
        return <span className="font-extrabold text-slate-900">{fmt(sum)}</span>
      },
      count: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.count || 0), 0)
        return <span className="font-extrabold text-slate-900">{sum}</span>
      },
    }),
    []
  )

  const feeReconciliationRows = useMemo(() => {
    if (!overviewData?.summary) return []
    const s = overviewData.summary
    return [
      {
        id: 'obligation',
        metric: 'Total Invoiced Fee Obligation',
        amount: s.total_obligation,
        share: '100%',
        notes: 'Sum total of all issued invoices and student fee commitments for the current academic session.',
      },
      {
        id: 'collected',
        metric: 'Total Realized Collections',
        amount: s.total_collected,
        share: `${s.collection_rate}%`,
        notes: 'Total fee payments verified, cleared, and credited to institute bank accounts.',
      },
      {
        id: 'outstanding',
        metric: 'Unsettled Overdue Deficit',
        amount: s.total_outstanding,
        share: `${(100 - s.collection_rate).toFixed(1)}%`,
        notes: 'Remaining pending receivables and past-due student balances requiring collection follow-up.',
      },
    ]
  }, [overviewData])

  const feeReconciliationColumns = useMemo<ColumnConfig<any>[]>(
    () => [
      {
        id: 'metric',
        header: 'Audit & Financial Metric',
        accessorKey: 'metric',
        type: 'text',
        width: 260,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-bold text-slate-900">{val}</span>,
      },
      {
        id: 'amount',
        header: 'Amount (₹)',
        accessorKey: 'amount',
        type: 'currency',
        width: 200,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-extrabold text-slate-900">{fmt(val)}</span>,
      },
      {
        id: 'share',
        header: 'Share / Ratio',
        accessorKey: 'share',
        type: 'text',
        width: 140,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-bold text-primary-700">{val}</span>,
      },
      {
        id: 'notes',
        header: 'Accounting & Audit Notes',
        accessorKey: 'notes',
        type: 'text',
        width: 380,
        sortable: false,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="text-slate-600 text-xs">{val}</span>,
      },
    ],
    []
  )

  const exportReportCsv = () => {
    let headers: string[] = []
    let rows: (string | number)[][] = []
    let filename = `financial_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`

    if (reportType === 'collection') {
      headers = ['Board / Standard', 'Student Count', 'Total Obligation', 'Collected', 'Outstanding', 'Rate %']
      rows = (overviewData?.board_breakdown || []).map((b) => [
        `"${b.board_name}"`,
        b.student_count,
        b.total_fees,
        b.collected,
        b.outstanding,
        b.rate,
      ])
    } else if (reportType === 'defaulters') {
      headers = ['Student Name', 'Admission No', 'Phone', 'Board', 'Standard', 'Batch', 'Outstanding Dues', 'Due Date']
      rows = (overviewData?.top_overdue || []).map((o) => [
        `"${o.student_name}"`,
        `"${o.admission_number}"`,
        `"${o.phone}"`,
        `"${o.board_name}"`,
        `"${o.standard_name}"`,
        `"${o.batch_name}"`,
        o.due_amount,
        `"${o.due_date || 'N/A'}"`,
      ])
    } else if (reportType === 'methods') {
      headers = ['Payment Method', 'Volume (INR)', 'Transactions Count', 'Share %']
      rows = (overviewData?.payment_methods || []).map((m) => [
        `"${METHOD_LABELS[m.method] || m.method}"`,
        m.amount,
        m.count,
        m.percentage,
      ])
    } else {
      headers = ['Metric', 'Amount (INR)', 'Percentage']
      if (overviewData) {
        rows = [
          ['Total Obligation', overviewData.summary.total_obligation, '100%'],
          ['Realized Collections', overviewData.summary.total_collected, `${overviewData.summary.collection_rate}%`],
          ['Outstanding Balances', overviewData.summary.total_outstanding, `${(100 - overviewData.summary.collection_rate).toFixed(1)}%`],
        ]
      }
    }

    if (!rows.length) {
      toast.error('No report data available to export')
      return
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success('Report exported to CSV successfully')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 8: SETTINGS (FINANCIAL PREFERENCES) - Centralized Settings Sync
  // ─────────────────────────────────────────────────────────────────────────────
  const [settingsState, setSettingsState] = useState(() => {
    try {
      const saved = localStorage.getItem('prashant_financial_settings')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {
      receiptPrefix: 'RCP-',
      startingSequence: 1001,
      headerTitle: 'Prashant Academy Coaching Institute',
      gstNumber: '27AABCP1234F1Z5',
      receiptFooterTerms: 'Fees once paid are non-refundable and non-transferable under any circumstances.',
      gracePeriodDays: 7,
      lateFeeDailyAmount: 50,
      enableCash: true,
      enableUpi: true,
      enableBankTransfer: true,
      enableCard: true,
      enableCheque: true,
      defaultMethod: 'upi',
    }
  })

  // Synchronize settings from central /settings/all API
  useQuery({
    queryKey: ['central-fees-settings'],
    queryFn: async () => {
      try {
        const res = await settingsApi.getAll()
        const feesConf = res.data?.fees
        if (feesConf) {
          setSettingsState((prev: any) => ({
            ...prev,
            receiptPrefix: feesConf.receipt_prefix ? `${feesConf.receipt_prefix}-` : prev.receiptPrefix,
            startingSequence: feesConf.next_receipt_number || prev.startingSequence,
            gracePeriodDays: feesConf.grace_days !== undefined ? feesConf.grace_days : prev.gracePeriodDays,
            lateFeeDailyAmount: feesConf.late_fine_per_day !== undefined ? feesConf.late_fine_per_day : prev.lateFeeDailyAmount,
            receiptFooterTerms: feesConf.receipt_footer_terms || prev.receiptFooterTerms,
          }))
        }
        return res.data
      } catch (e) {
        return null
      }
    },
    refetchOnWindowFocus: false,
  })

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!isEditMode) {
      toast.error('Action locked: You must explicitly enable Edit Mode first.')
      return
    }
    try {
      await settingsApi.updateBatch('fees', {
        receipt_prefix: settingsState.receiptPrefix.replace(/-$/, ''),
        next_receipt_number: settingsState.startingSequence,
        grace_days: settingsState.gracePeriodDays,
        late_fine_per_day: settingsState.lateFeeDailyAmount,
        receipt_footer_terms: settingsState.receiptFooterTerms,
      }, 'Updated via Fees & Payments workspace')
      localStorage.setItem('prashant_financial_settings', JSON.stringify(settingsState))
      toast.success('Financial preferences synchronized with central institute settings!')
    } catch (err) {
      localStorage.setItem('prashant_financial_settings', JSON.stringify(settingsState))
      toast.success('Financial preferences saved locally')
    }
  }

  // Active filter label for metrics
  const activeScopeLabel = useMemo(() => {
    const parts = []
    if (selectedBoard) {
      const b = boards.find((x) => x.id === selectedBoard)
      if (b) parts.push(b.name)
    }
    if (selectedStandard) {
      const s = standards.find((x) => x.id === selectedStandard)
      if (s) parts.push(s.name)
    }
    if (selectedDivision) {
      const d = divisions.find((x) => x.id === selectedDivision)
      if (d) parts.push(d.name)
    }
    return parts.length > 0 ? parts.join(' – ') : 'All Batches & Standards'
  }, [selectedBoard, selectedStandard, selectedDivision, boards, standards, divisions])

  // Contextual metadata for dedicated workspaces
  const tabMetadata: Record<TabKey, {
    title: string
    subtitle: string
    icon: React.ElementType
    actionLabel?: string
    actionIcon?: React.ElementType
    onAction?: () => void
    requiresEditMode?: boolean
  }> = {
    overview: {
      title: 'Fees & Payments Overview',
      subtitle: 'Financial Operations, Fee Registers, Collections & Institute Audits',
      icon: Home,
      actionLabel: 'Record Payment',
      actionIcon: CreditCard,
      onAction: () => setTab('collection'),
      requiresEditMode: false,
    },
    structures: {
      title: 'Fee Structures & Schedules',
      subtitle: 'Standard-wise fee templates, component categories, installment schedules, and late fees',
      icon: Layers,
      actionLabel: 'Create Fee Plan',
      actionIcon: Plus,
      onAction: () => setIsNewStructureModalOpen(true),
      requiresEditMode: true,
    },
    invoicing: {
      title: 'Fee Invoicing & Register',
      subtitle: 'Comprehensive student-wise fee ledger, installments, concessions, and balance tracking',
      icon: FileSpreadsheet,
      actionLabel: 'Collect Fee',
      actionIcon: CreditCard,
      onAction: () => setTab('collection'),
      requiresEditMode: false,
    },
    collection: {
      title: 'Fee Collection Desk & POS',
      subtitle: 'Cash counter terminal, student lookup, instant payment recording, and duplicate receipts',
      icon: CreditCard,
      actionLabel: 'Reset Terminal',
      actionIcon: RotateCcw,
      onAction: () => {
        setSelectedCollectStudentId(null)
        setCollectStudentSearch('')
      },
      requiresEditMode: false,
    },
    defaulters: {
      title: 'Fee Defaulters & Overdue Dues',
      subtitle: 'Aging analysis (1–30, 31–60, 60+ days overdue), contact records, and multi-channel reminder dispatch',
      icon: AlertCircle,
      actionLabel: 'Dispatch Reminders',
      actionIcon: Bell,
      onAction: () => setIsBulkReminderModalOpen(true),
      requiresEditMode: true,
    },
    concessions: {
      title: 'Fee Concessions & Scholarship Waivers',
      subtitle: 'Merit scholarships, sibling discounts, hardship waivers, and fee adjustment approval workflows',
      icon: Percent,
      actionLabel: 'Apply Concession',
      actionIcon: Plus,
      onAction: () => setIsNewConcessionModalOpen(true),
      requiresEditMode: true,
    },
    'online-gateway': {
      title: 'Online Payments & Gateway Desk',
      subtitle: 'UPI BharatQR generation, payment links generator, Razorpay/Stripe webhooks, and instant settlement ledger',
      icon: Zap,
      actionLabel: 'Generate QR',
      actionIcon: QrCode,
      onAction: () => handleGenerateQr(),
      requiresEditMode: false,
    },
    register: {
      title: 'Student Fee Register',
      subtitle: 'Comprehensive student-wise fee ledger, installments, concessions, and balance tracking',
      icon: FileSpreadsheet,
      actionLabel: 'Collect Fee',
      actionIcon: CreditCard,
      onAction: () => setTab('collect'),
      requiresEditMode: false,
    },
    collect: {
      title: 'Fee Collection Terminal',
      subtitle: 'Select student account, calculate outstanding balance, apply waivers, and record payments',
      icon: CreditCard,
      actionLabel: 'Reset Terminal',
      actionIcon: RotateCcw,
      onAction: () => {
        setSelectedCollectStudentId(null)
        setCollectStudentSearch('')
      },
      requiresEditMode: false,
    },
    payments: {
      title: 'Payment Transactions',
      subtitle: 'Audit log of all processed payment transactions, settlement modes, and references',
      icon: CreditCard,
      actionLabel: 'Record Payment',
      actionIcon: Plus,
      onAction: () => setTab('collect'),
      requiresEditMode: false,
    },
    receipts: {
      title: 'Receipts & Invoicing Journal',
      subtitle: 'Official numbered money receipts, print duplicates, and tax invoice generation',
      icon: Receipt,
      actionLabel: 'Search Receipt',
      actionIcon: Search,
      onAction: () => {
        const input = document.querySelector('input[placeholder*="receipt"]') as HTMLInputElement
        if (input) input.focus()
      },
      requiresEditMode: false,
    },
    plans: {
      title: 'Fee Structures & Plans',
      subtitle: 'Standard-wise fee templates, component categories, installment schedules, and late fees',
      icon: Layers,
      actionLabel: 'Create Fee Plan',
      actionIcon: Plus,
      onAction: () => setIsNewStructureModalOpen(true),
      requiresEditMode: true,
    },
    reports: {
      title: 'Fee Reports & Financial Analytics',
      subtitle: 'Collection summaries, aging overdue statements, fee category breakdowns, and export ledgers',
      icon: BarChart3,
      actionLabel: 'Export Report',
      actionIcon: Download,
      onAction: () => {
        toast.success('Financial reports queued for background export')
      },
      requiresEditMode: false,
    },
    settings: {
      title: 'Fee Settings & Accounting Policies',
      subtitle: 'Financial year defaults, receipt numbering prefixes, GST taxation, and discount rules',
      icon: Settings,
      actionLabel: 'Save Preferences',
      actionIcon: CheckCircle,
      onAction: () => handleSaveSettings(),
      requiresEditMode: true,
    },
  }

  const currentMeta = tabMetadata[activeTab] || tabMetadata.overview
  const CurrentIcon = currentMeta.icon

  return (
    <div className="space-y-5 pb-12">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Fee Schedules & Accounting Centre" isDirty={isNewStructureModalOpen || isEditStructureModalOpen || isNewCategoryModalOpen || isEditReceiptModalOpen} />

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & BREADCRUMBS                                               */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Link to="/dashboard" className="hover:text-slate-600 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <Link to="/fees" className="hover:text-slate-600 transition-colors">Fees & Payments</Link>
          {activeTab !== 'overview' && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600 font-semibold">{TABS.find((t) => t.id === activeTab)?.label}</span>
            </>
          )}
        </div>

        {/* Title Bar & Quick Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-xs flex-shrink-0">
              <CurrentIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {currentMeta.title}
                </h1>
                {isTrainingMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    TRAINING MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Header Search & Actions */}
          <div className="flex items-center gap-3">
            {/* Primary Contextual Action Button */}
            {currentMeta.actionLabel && currentMeta.onAction && (
              <div>
                {currentMeta.requiresEditMode && !isEditMode ? (
                  <button
                    type="button"
                    onClick={() => toast.error(`Locked in View Mode: Please activate Edit Mode above to ${(currentMeta.actionLabel || 'action').toLowerCase()}.`)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed transition-all"
                    title={`Locked in View Mode: Enable Edit Mode to ${(currentMeta.actionLabel || 'action').toLowerCase()}`}
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentMeta.actionLabel} (Locked)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={currentMeta.onAction}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-all active:scale-95"
                  >
                    {currentMeta.actionIcon && <currentMeta.actionIcon className="w-3.5 h-3.5" />}
                    <span>{currentMeta.actionLabel}</span>
                  </button>
                )}
              </div>
            )}

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalHeaderSearch}
                onChange={(e) => setGlobalHeaderSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyFilters()
                }}
                placeholder="Search student by name, ID or mobile..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-14 py-2 text-xs font-medium placeholder-slate-400 text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-100 border border-slate-200/80 rounded text-[10px] font-semibold text-slate-500 select-none">
                Ctrl + K
              </span>
            </div>

            <button
              type="button"
              onClick={() => toast.success('Billing Alerts: All daily fee collection reconciliations and payment postings are current.')}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </button>

            <div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer select-none"
              title={`${user?.first_name || 'Admin'} (${user?.role || 'Staff'})`}
            >
              PA
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. CASCADING FILTER BAR                                                   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-center">
          {/* Academic Year */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Calendar className="w-4 h-4 text-primary-600" />
            </div>
            <select
              value={selectedAY ? String(selectedAY) : ''}
              onChange={(e) => setSelectedAY(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Board */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Layers className="w-4 h-4 text-primary-600" />
            </div>
            <select
              value={selectedBoard ? String(selectedBoard) : ''}
              onChange={(e) => {
                const bId = e.target.value ? Number(e.target.value) : null
                setSelectedBoard(bId)
                setSelectedStandard(null)
                setSelectedDivision(null)
              }}
              className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">All Boards</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Class / Standard */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
            </div>
            <select
              value={selectedStandard ? String(selectedStandard) : ''}
              onChange={(e) => {
                const sId = e.target.value ? Number(e.target.value) : null
                setSelectedStandard(sId)
                setSelectedDivision(null)
              }}
              className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">All Classes</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Batch */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <select
              value={selectedDivision ? String(selectedDivision) : ''}
              onChange={(e) => setSelectedDivision(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">All Batches</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 xl:col-span-2">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 transition-all active:scale-95"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. TABS NAVIGATION BAR (8 DEDICATED WORKSPACES)                           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {FEES_TABS.map((tab) => {
          const isActive = activeTab === tab.id || (tab.id === 'structures' && (activeTab === 'plans' || activeTab === 'settings')) || (tab.id === 'invoicing' && activeTab === 'register') || (tab.id === 'collection' && (activeTab === 'collect' || activeTab === 'payments' || activeTab === 'receipts'))
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW                                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div>
          {loadingOverview ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center shadow-xs">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary-600" />
              <p className="text-xs font-semibold text-slate-500 mt-3">Loading financial workspace...</p>
            </div>
          ) : overviewData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT / MAIN WORKSPACE (8 cols on lg, 9 cols on xl) */}
              <div className="lg:col-span-8 xl:col-span-9 space-y-5">
                {/* 1. TOP ROW: 4 KPIS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Total Students */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-xl bg-primary-50 text-primary-600 flex-shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-500">
                        Total Students
                      </p>
                      <p className="text-2xl font-black text-slate-900 leading-tight">
                        {overviewData.summary.student_count}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 truncate" title={activeScopeLabel}>
                        {activeScopeLabel}
                      </p>
                    </div>
                  </div>

                  {/* 2. Total Fees Due */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-500">
                        Total Fees Due
                      </p>
                      <p className="text-2xl font-black text-emerald-700 leading-tight">
                        {fmt(overviewData.summary.total_obligation)}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500">
                        ({overviewData.summary.student_count} Students)
                      </p>
                    </div>
                  </div>

                  {/* 3. Collected */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-xl bg-primary-50 text-primary-600 flex-shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-500">
                        Collected
                      </p>
                      <p className="text-2xl font-black text-primary-700 leading-tight">
                        {fmt(overviewData.summary.total_collected)}
                      </p>
                      <p className="text-[11px] font-medium text-primary-600">
                        ({overviewData.summary.collection_rate}%)
                      </p>
                    </div>
                  </div>

                  {/* 4. Outstanding & Recovery Breakdown */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-xl bg-orange-50 text-orange-600 flex-shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">
                          Total Recoverable
                        </p>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">
                          {(100 - overviewData.summary.collection_rate).toFixed(1)}% due
                        </span>
                      </div>
                      <p className="text-2xl font-black text-orange-600 leading-tight mt-0.5">
                        {fmt(overviewData.summary.total_recoverable_outstanding ?? overviewData.summary.total_outstanding)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-slate-600">
                        <span>Active: <strong className="text-slate-900">{fmt(overviewData.summary.active_students_outstanding ?? overviewData.summary.total_outstanding)}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span className="text-amber-700">Former: <strong className="text-amber-900">{fmt(overviewData.summary.former_students_outstanding ?? 0)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. MID ROW: 2 CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Chart 1: Fee Collection Trend */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary-600" />
                        <h3 className="text-sm font-bold text-slate-900">Fee Collection Trend</h3>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-semibold">
                        <span className="flex items-center gap-1.5 text-primary-700">
                          <span className="w-3 h-2 rounded bg-primary-500 inline-block" /> Collected
                        </span>
                        <span className="flex items-center gap-1.5 text-primary-600">
                          <span className="w-2.5 h-2.5 rounded-full border-2 border-primary-600 bg-white inline-block" /> Cumulative
                        </span>
                      </div>
                    </div>

                    {overviewData.monthly_trends.length === 0 ? (
                      <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                        No monthly payment records available for selected filter.
                      </div>
                    ) : (
                      <div className="h-60 mt-2 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={overviewData.monthly_trends} margin={{ top: 22, right: 15, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(m: string) => m.split(' ')[0]}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => fmt(v)}
                            />
                            <Tooltip
                              formatter={(val: number, name: string) => [fmt(val), name === 'collected' ? 'Collected' : 'Cumulative Total']}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '11px' }}
                            />
                            <Bar
                              dataKey="collected"
                              fill={branding.colors.primary}
                              radius={[4, 4, 0, 0]}
                              barSize={24}
                            >
                              <LabelList
                                dataKey="collected"
                                position="top"
                                formatter={(val: number) => fmt(val)}
                                style={{ fontSize: '9px', fontWeight: 700, fill: '#475569' }}
                              />
                            </Bar>
                            <Line
                              type="monotone"
                              dataKey="cumulative"
                              stroke={branding.colors.secondary || branding.colors.primary}
                              strokeWidth={2.5}
                              dot={(props: any) => {
                                const { cx, cy, index } = props
                                const isLast = index === overviewData.monthly_trends.length - 1
                                return (
                                  <g key={`dot-${index}`}>
                                    <circle cx={cx} cy={cy} r={3.5} fill={branding.colors.primary} stroke="#fff" strokeWidth={1.5} />
                                    {isLast && (
                                      <g transform={`translate(${cx - 36}, ${cy - 26})`}>
                                        <rect width={72} height={20} rx={6} fill={branding.colors.primary} />
                                        <text x={36} y={13} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">
                                          {fmt(props.payload.cumulative)}
                                        </text>
                                      </g>
                                    )}
                                  </g>
                                )
                              }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Chart 2: Payment Method (Collected) */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-600" />
                        <h3 className="text-sm font-bold text-slate-900">Payment Method (Collected)</h3>
                      </div>
                    </div>

                    {(!overviewData.payment_methods || overviewData.payment_methods.length === 0) ? (
                      <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                        No payment method distribution data recorded.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 h-60">
                        {/* Donut Chart */}
                        <div className="sm:col-span-6 h-full relative flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={overviewData.payment_methods}
                                dataKey="amount"
                                nameKey="method"
                                cx="50%"
                                cy="50%"
                                innerRadius={48}
                                outerRadius={72}
                                paddingAngle={3}
                              >
                                {overviewData.payment_methods.map((entry) => (
                                  <Cell
                                    key={entry.method}
                                    fill={
                                      entry.method === 'upi' ? '#22c55e' :
                                      entry.method === 'cash' ? '#0ea5e9' :
                                      entry.method === 'bank_transfer' ? '#a855f7' :
                                      entry.method === 'card' ? '#f97316' :
                                      entry.method === 'cheque' ? '#94a3b8' :
                                      METHOD_COLORS[entry.method] || '#94a3b8'
                                    }
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(val: number) => [fmt(val), 'Volume']}
                                contentStyle={{ borderRadius: '10px', fontSize: '11px' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                            <span className="text-sm font-black text-slate-900">
                              {fmt(overviewData.summary.total_collected)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Collected
                            </span>
                          </div>
                        </div>

                        {/* Legend List */}
                        <div className="sm:col-span-6 space-y-2 pr-1">
                          {overviewData.payment_methods.map((m) => {
                            const color =
                              m.method === 'upi' ? '#22c55e' :
                              m.method === 'cash' ? '#0ea5e9' :
                              m.method === 'bank_transfer' ? '#a855f7' :
                              m.method === 'card' ? '#f97316' :
                              m.method === 'cheque' ? '#94a3b8' :
                              METHOD_COLORS[m.method] || '#94a3b8'
                            return (
                              <div key={m.method} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-slate-700 font-semibold truncate">
                                    {METHOD_LABELS[m.method] || m.method}
                                  </span>
                                </div>
                                <div className="text-right flex items-center gap-2 flex-shrink-0 font-mono">
                                  <span className="font-bold text-slate-900">{fmt(m.amount)}</span>
                                  <span className="text-[11px] text-slate-500 w-11 text-right">{m.percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. BOTTOM ROW: RECENT PAYMENTS TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-600" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Recent Payments</h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Latest settled student payment transactions
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/payments')}
                      className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 cursor-pointer"
                    >
                      View All Payments →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
                        <tr>
                          <SortableHeader
                            columnKey="receipt_number"
                            label="Receipt No."
                            currentSortKey={recentPaymentsSortKey}
                            currentDirection={recentPaymentsSortDirection}
                            onSort={requestRecentPaymentsSort}
                          />
                          <SortableHeader
                            columnKey="payment_date"
                            label="Date"
                            currentSortKey={recentPaymentsSortKey}
                            currentDirection={recentPaymentsSortDirection}
                            onSort={requestRecentPaymentsSort}
                            sortType="date"
                          />
                          <SortableHeader
                            columnKey="student_name"
                            label="Student"
                            currentSortKey={recentPaymentsSortKey}
                            currentDirection={recentPaymentsSortDirection}
                            onSort={requestRecentPaymentsSort}
                          />
                          <SortableHeader
                            columnKey="board_name"
                            label="Board"
                            currentSortKey={recentPaymentsSortKey}
                            currentDirection={recentPaymentsSortDirection}
                            onSort={requestRecentPaymentsSort}
                          />
                          <SortableHeader
                            columnKey="standard_name"
                            label="Class"
                            currentSortKey={recentPaymentsSortKey}
                            currentDirection={recentPaymentsSortDirection}
                            onSort={requestRecentPaymentsSort}
                          />
                          <SortableHeader
                            columnKey="batch_name"
                            label="Batch"
                            currentSortKey={recentPaymentsSortKey}
                            currentDirection={recentPaymentsSortDirection}
                            onSort={requestRecentPaymentsSort}
                          />
                          <SortableHeader
                            columnKey="amount"
                            label="Amount"
                            align="right"
                            currentSortKey={recentPaymentsSortKey}
                            currentDirection={recentPaymentsSortDirection}
                            onSort={requestRecentPaymentsSort}
                            sortType="number"
                          />
                          <SortableHeader
                            columnKey="payment_method"
                            label="Payment Method"
                            align="center"
                            currentSortKey={recentPaymentsSortKey}
                            currentDirection={recentPaymentsSortDirection}
                            onSort={requestRecentPaymentsSort}
                          />
                          <SortableHeader
                            columnKey="status"
                            label="Status"
                            align="center"
                            currentSortKey={recentPaymentsSortKey}
                            currentDirection={recentPaymentsSortDirection}
                            onSort={requestRecentPaymentsSort}
                          />
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {sortedRecentPayments.map((p) => {
                          const methodBadgeClasses =
                            p.payment_method === 'upi' ? 'bg-purple-100 text-purple-700 font-semibold' :
                            p.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-700 font-semibold' :
                            p.payment_method === 'bank_transfer' ? 'bg-primary-100 text-primary-700 font-semibold' :
                            p.payment_method === 'card' ? 'bg-orange-100 text-orange-700 font-semibold' :
                            'bg-slate-100 text-slate-700 font-semibold'

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                                {p.receipt_number}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                {formatDisplayDate(p.payment_date)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {p.student_name}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {p.board || 'ICSE'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {p.standard || 'X'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                {p.batch || 'Batch A'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                                {fmt(p.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${methodBadgeClasses}`}>
                                  {METHOD_LABELS[p.payment_method] || p.payment_method}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                                  Paid
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setActiveReceiptModalNumber(p.receipt_number)}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary-600"
                                    title="View Receipt"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveReceiptModalNumber(p.receipt_number)}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                                    title="Print Receipt"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDEBAR REGION (4 cols on lg, 3 cols on xl) */}
              <div className="lg:col-span-4 xl:col-span-3 space-y-5">
                {/* 1. QUICK ACTIONS CARD */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <span>⚡ Quick Actions</span>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setTab('collect')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-98"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Collect Fee</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/payments')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Receipt Search / Reprint</span>
                    </button>
                    <Link
                      to="/forms?formId=fee_statement&mode=prefilled"
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Print Fee Statement</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setTab('plans')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all"
                    >
                      <Layers className="w-4 h-4 text-slate-500" />
                      <span>Add Fee Plan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('reports')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all"
                    >
                      <BarChart3 className="w-4 h-4 text-slate-500" />
                      <span>Fee Report</span>
                    </button>
                  </div>
                </div>

                {/* 2. OUTSTANDING / DUE FEES (TOP) CARD */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary-600" />
                      <h3 className="text-xs font-bold text-slate-900 truncate">Outstanding / Due Fees (Top)</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab('register')}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-800 whitespace-nowrap"
                    >
                      View All →
                    </button>
                  </div>

                  {(!overviewData.top_overdue || overviewData.top_overdue.length === 0) ? (
                    <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                      All accounts in this filter are fully settled.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                          <th className="pb-2 font-medium">Student</th>
                          <th className="pb-2 text-center font-medium">Due Amount</th>
                          <th className="pb-2 text-right font-medium">Due Since</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overviewData.top_overdue.slice(0, 6).map((student) => {
                          const isHighDue = student.due_amount >= 10000
                          return (
                            <tr
                              key={student.invoice_id}
                              onClick={() => {
                                setSelectedCollectStudentId(student.student_id)
                                setTab('collect')
                              }}
                              className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 font-bold text-slate-800 truncate max-w-[100px]">
                                {student.student_name}
                              </td>
                              <td className="py-2.5 text-center whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                    isHighDue
                                      ? 'bg-red-50 text-red-600 border-red-100'
                                      : 'bg-orange-50 text-orange-600 border-orange-100'
                                  }`}
                                >
                                  {fmt(student.due_amount)}
                                </span>
                              </td>
                              <td className="py-2.5 text-right text-slate-500 font-medium whitespace-nowrap">
                                {formatDisplayDate(student.due_date)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: FEE REGISTER                                                        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'invoicing' || activeTab === 'register') && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={registerSearchText}
                onChange={(e) => setRegisterSearchText(e.target.value)}
                placeholder="Search student or admission no..."
                className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={registerStatusFilter}
                onChange={(e) => setRegisterStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="">All Invoices</option>
                <option value="paid">Paid in Full</option>
                <option value="partial">Partial Due</option>
                <option value="unpaid">Unpaid / Overdue</option>
              </select>
              <select
                value={registerStudentStatusFilter}
                onChange={(e) => setRegisterStudentStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                data-testid="filter-student-status"
              >
                <option value="">All Students</option>
                <option value="active">Active Enrolled</option>
                <option value="former">Former / Discontinued</option>
                <option value="transferred">Transferred</option>
                <option value="inactive">Inactive / On Hold</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <TableSortSelect
                options={REGISTER_SORT_OPTIONS}
                currentSortKey={registerSortKey}
                currentDirection={registerSortDirection}
                onSortChange={(key, dir) => {
                  const opt = REGISTER_SORT_OPTIONS.find((o) => o.key === key)
                  setRegisterSort(key, dir, undefined, opt?.type || 'auto')
                }}
                onClear={clearRegisterSort}
                placeholder="Sort Register..."
              />
              <span className="text-xs font-semibold text-slate-500">
                {sortedRegisterEntries.length} Records
              </span>
              <button
                type="button"
                onClick={exportRegisterCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {loadingRegister ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2" />
                Loading fee register...
              </div>
            ) : sortedRegisterEntries.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No fee register entries found for the selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
                    <tr>
                      <SortableHeader
                        columnKey="admission_number"
                        label="Admission No"
                        currentSortKey={registerSortKey}
                        currentDirection={registerSortDirection}
                        onSort={requestRegisterSort}
                      />
                      <SortableHeader
                        columnKey="student_name"
                        label="Student Name"
                        currentSortKey={registerSortKey}
                        currentDirection={registerSortDirection}
                        onSort={requestRegisterSort}
                      />
                      <SortableHeader
                        columnKey="standard_name"
                        label="Course / Class"
                        currentSortKey={registerSortKey}
                        currentDirection={registerSortDirection}
                        onSort={requestRegisterSort}
                      />
                      <SortableHeader
                        columnKey="batch_name"
                        label="Batch"
                        currentSortKey={registerSortKey}
                        currentDirection={registerSortDirection}
                        onSort={requestRegisterSort}
                      />
                      <SortableHeader
                        columnKey="net_amount"
                        label="Fee Obligation"
                        align="right"
                        currentSortKey={registerSortKey}
                        currentDirection={registerSortDirection}
                        onSort={requestRegisterSort}
                        sortType="number"
                      />
                      <SortableHeader
                        columnKey="paid_amount"
                        label="Paid Amount"
                        align="right"
                        currentSortKey={registerSortKey}
                        currentDirection={registerSortDirection}
                        onSort={requestRegisterSort}
                        sortType="number"
                      />
                      <SortableHeader
                        columnKey="outstanding_amount"
                        label="Balance Due"
                        align="right"
                        currentSortKey={registerSortKey}
                        currentDirection={registerSortDirection}
                        onSort={requestRegisterSort}
                        sortType="number"
                      />
                      <SortableHeader
                        columnKey="status"
                        label="Status"
                        align="center"
                        currentSortKey={registerSortKey}
                        currentDirection={registerSortDirection}
                        onSort={requestRegisterSort}
                      />
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sortedRegisterEntries.map((row) => (
                      <tr key={row.student_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                          {row.admission_number}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 block">{row.student_name}</span>
                            {row.is_former && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Former Student
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {row.phone}
                            {row.exit_date && ` • Exited: ${row.exit_date}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {row.board_name} – {row.standard_name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {row.batch_name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          {fmt(row.net_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                          {fmt(row.paid_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-orange-600">
                          {fmt(row.outstanding_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <InvoiceStatusBadge status={row.status} />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {row.outstanding_amount > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCollectStudentId(row.student_id)
                                  setTab('collect')
                                }}
                                className="px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                              >
                                Collect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentName(row.student_name)
                                setSelectedInstallments(row.installments || [])
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                            >
                              Installments
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: COLLECT FEES (TERMINAL)                                             */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'collection' || activeTab === 'collect') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Student Lookup & Profile */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                1. Select Enrolled Student
              </h3>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={collectStudentSearch}
                  onChange={(e) => setCollectStudentSearch(e.target.value)}
                  placeholder="Type student name or ID..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Live search results */}
              {studentSearchResults && studentSearchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {studentSearchResults.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => {
                        setSelectedCollectStudentId(st.id)
                        setCollectStudentSearch('')
                      }}
                      className="p-2.5 hover:bg-primary-50 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{st.first_name} {st.last_name}</p>
                        <p className="text-[10px] text-slate-400">{st.admission_number}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-primary-600">Select</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Profile Summary */}
            {collectStudent ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-primary-600 text-white font-extrabold text-sm flex items-center justify-center">
                    {collectStudent.first_name?.[0]}{collectStudent.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {collectStudent.first_name} {collectStudent.last_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{collectStudent.admission_number}</p>
                  </div>
                </div>

                {activeInvoice && (
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Obligation</p>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5">{fmt(activeInvoice.net_amount)}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Paid</p>
                      <p className="text-xs font-extrabold text-emerald-700 mt-0.5">{fmt(activeInvoice.paid_amount)}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-[10px] text-orange-600 font-bold uppercase">Balance</p>
                      <p className="text-xs font-extrabold text-orange-700 mt-0.5">{fmt(activeInvoice.outstanding_amount)}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                Search and select a student above to inspect fee plan & collect fees.
              </div>
            )}
          </div>

          {/* Right Column: Installment Schedule & Payment Collection Form */}
          <div className="lg:col-span-7 space-y-4">
            {activeInvoice ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    Fee Installments & Balance Settlement
                  </h3>
                  <button
                    type="button"
                    onClick={() => fillAmount(Number(activeInvoice.outstanding_amount))}
                    className="text-xs font-bold text-primary-600 hover:text-primary-800"
                  >
                    Pay Full Balance ({fmt(activeInvoice.outstanding_amount)})
                  </button>
                </div>

                {/* Installments Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Inst #</th>
                        <th className="py-2 px-3">Due Date</th>
                        <th className="py-2 px-3 text-right">Scheduled</th>
                        <th className="py-2 px-3 text-right">Paid</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(activeInvoice.installments || []).map((inst) => {
                        const balance = Number(inst.amount) - Number(inst.paid_amount)
                        return (
                          <tr key={inst.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold">Inst {inst.installment_number}</td>
                            <td className="py-2 px-3 text-slate-500">{inst.due_date}</td>
                            <td className="py-2 px-3 text-right font-medium">{fmt(inst.amount)}</td>
                            <td className="py-2 px-3 text-right text-emerald-700">{fmt(inst.paid_amount)}</td>
                            <td className="py-2 px-3 text-center">
                              <InvoiceStatusBadge status={inst.status} />
                            </td>
                            <td className="py-2 px-3 text-center">
                              {balance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => fillAmount(balance, inst.id)}
                                  className="px-2 py-0.5 rounded bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white font-bold text-[10px]"
                                >
                                  Pay {fmt(balance)}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Payment Form */}
                <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Payment Amount (INR) *</label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Enter amount..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Payment Date *</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Payment Method Pills */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Payment Method *</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {['cash', 'upi', 'bank_transfer', 'card', 'cheque'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            paymentMethod === m
                              ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {METHOD_LABELS[m]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reference Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {paymentMethod === 'upi' ? 'UPI / UTR Reference' : paymentMethod === 'cheque' ? 'Cheque Number' : 'Transaction Reference'}
                      </label>
                      <input
                        type="text"
                        value={paymentMethod === 'cheque' ? chequeNumber : transRef}
                        onChange={(e) => paymentMethod === 'cheque' ? setChequeNumber(e.target.value) : setTransRef(e.target.value)}
                        placeholder="Reference or voucher #..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {paymentMethod === 'cheque' ? 'Issuing Bank Name' : 'Bank Name (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank, SBI..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={collectMutation.isPending}
                      onClick={() => handleRecordPayment(undefined, 'draft')}
                      className="w-full sm:w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all"
                      title="Save payment voucher as draft without issuing receipt or decrementing invoice"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="submit"
                      disabled={collectMutation.isPending}
                      className="w-full sm:w-2/3 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                    >
                      {collectMutation.isPending ? 'Recording Payment...' : 'Record Payment & Issue Official Receipt'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-xs text-slate-400">
                Please select a student from the left panel to load invoice installments.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: PAYMENTS LEDGER                                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                placeholder="Search receipt #, student, ref..."
                className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
            <span className="text-xs font-semibold text-slate-500">{paymentsList.length} Payments</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {loadingPayments ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2" />
                Loading payments...
              </div>
            ) : paymentsList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No payment transactions recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
                    <tr>
                      <SortableHeader
                        columnKey="receipt_number"
                        label="Receipt #"
                        currentSortKey={paymentsSortKey}
                        currentDirection={paymentsSortDirection}
                        onSort={requestPaymentsSort}
                      />
                      <SortableHeader
                        columnKey="payment_date"
                        label="Date"
                        currentSortKey={paymentsSortKey}
                        currentDirection={paymentsSortDirection}
                        onSort={requestPaymentsSort}
                        sortType="date"
                      />
                      <SortableHeader
                        columnKey="student_name"
                        label="Student Name"
                        currentSortKey={paymentsSortKey}
                        currentDirection={paymentsSortDirection}
                        onSort={requestPaymentsSort}
                      />
                      <SortableHeader
                        columnKey="batch_name"
                        label="Batch"
                        currentSortKey={paymentsSortKey}
                        currentDirection={paymentsSortDirection}
                        onSort={requestPaymentsSort}
                      />
                      <SortableHeader
                        columnKey="amount"
                        label="Amount"
                        align="right"
                        currentSortKey={paymentsSortKey}
                        currentDirection={paymentsSortDirection}
                        onSort={requestPaymentsSort}
                        sortType="number"
                      />
                      <SortableHeader
                        columnKey="payment_method"
                        label="Method"
                        align="center"
                        currentSortKey={paymentsSortKey}
                        currentDirection={paymentsSortDirection}
                        onSort={requestPaymentsSort}
                      />
                      <SortableHeader
                        columnKey="transaction_reference"
                        label="Reference"
                        currentSortKey={paymentsSortKey}
                        currentDirection={paymentsSortDirection}
                        onSort={requestPaymentsSort}
                      />
                      <SortableHeader
                        columnKey="status"
                        label="Status"
                        align="center"
                        currentSortKey={paymentsSortKey}
                        currentDirection={paymentsSortDirection}
                        onSort={requestPaymentsSort}
                      />
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sortedPaymentsList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-primary-700">{p.receipt_number}</td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{p.payment_date}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{p.student_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{p.batch_name || 'General'}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{fmt(p.amount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                            style={{
                              backgroundColor: `${METHOD_COLORS[p.payment_method] || '#94a3b8'}15`,
                              color: METHOD_COLORS[p.payment_method] || '#64748b',
                              borderColor: `${METHOD_COLORS[p.payment_method] || '#94a3b8'}40`,
                            }}
                          >
                            {METHOD_LABELS[p.payment_method] || p.payment_method}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{p.transaction_reference || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveReceiptModalNumber(p.receipt_number)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary-600"
                              title="View Receipt"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {p.status !== 'reversed' && (
                              <button
                                type="button"
                                onClick={() => setReversalTargetPayment(p)}
                                className="px-2 py-0.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded text-[11px] font-bold transition-colors"
                              >
                                Reverse
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
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: RECEIPTS                                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          {/* Real-time Notification Banner */}
          {receiptNotification && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs transition-all ${
                receiptNotification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : receiptNotification.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">{receiptNotification.title}:</span>
                <span>{receiptNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setReceiptNotification(null)}
                className="text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5 rounded-lg hover:bg-white/60 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search, Filter Summary & Quick Stats */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <input
                type="text"
                value={receiptSearchText}
                onChange={(e) => setReceiptSearchText(e.target.value)}
                placeholder="Search by receipt # or student..."
                className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
              />
              {receiptSearchText && (
                <button
                  type="button"
                  onClick={() => setReceiptSearchText('')}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1.5"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">
                {receiptsList.length} Receipts Issued
              </span>
              {selectedReceiptNumbers.size > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-primary-100 text-primary-800 text-xs font-bold">
                  {selectedReceiptNumbers.size} Selected
                </span>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {loadingReceipts ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2" />
                Loading receipts...
              </div>
            ) : receiptsList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No receipts generated yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someVisibleSelected
                          }}
                          onChange={toggleSelectAllVisible}
                          className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 cursor-pointer"
                          title="Select all visible receipts"
                        />
                      </th>
                      <SortableHeader
                        columnKey="receipt_number"
                        label="Receipt No"
                        currentSortKey={receiptsSortKey}
                        currentDirection={receiptsSortDirection}
                        onSort={requestReceiptsSort}
                      />
                      <SortableHeader
                        columnKey="payment_date"
                        label="Date"
                        currentSortKey={receiptsSortKey}
                        currentDirection={receiptsSortDirection}
                        onSort={requestReceiptsSort}
                        sortType="date"
                      />
                      <SortableHeader
                        columnKey="student_name"
                        label="Student Name"
                        currentSortKey={receiptsSortKey}
                        currentDirection={receiptsSortDirection}
                        onSort={requestReceiptsSort}
                      />
                      <SortableHeader
                        columnKey="admission_number"
                        label="Admission No"
                        currentSortKey={receiptsSortKey}
                        currentDirection={receiptsSortDirection}
                        onSort={requestReceiptsSort}
                      />
                      <SortableHeader
                        columnKey="amount"
                        label="Amount"
                        align="right"
                        currentSortKey={receiptsSortKey}
                        currentDirection={receiptsSortDirection}
                        onSort={requestReceiptsSort}
                        sortType="number"
                      />
                      <SortableHeader
                        columnKey="payment_method"
                        label="Method"
                        align="center"
                        currentSortKey={receiptsSortKey}
                        currentDirection={receiptsSortDirection}
                        onSort={requestReceiptsSort}
                      />
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sortedReceiptsList.map((r) => {
                      const isRowSelected = selectedReceiptNumbers.has(r.receipt_number)
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isRowSelected ? 'bg-primary-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleSelectReceipt(r.receipt_number)}
                              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-primary-700">
                            <div className="flex items-center gap-1.5">
                              <span>{r.receipt_number}</span>
                              {r.status === 'superseded' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                                  SUPERSEDED
                                </span>
                              )}
                              {r.status === 'voided' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                                  VOID
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{r.payment_date}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{r.student_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{r.admission_number}</td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{fmt(r.amount)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {METHOD_LABELS[r.payment_method] || r.payment_method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setActiveReceiptModalNumber(r.receipt_number)}
                                className="px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                                title="View & Print Official Receipt"
                              >
                                View & Print
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadSingleReceiptPdf(r.receipt_number, r.student_name)}
                                className="p-1 text-slate-600 hover:text-primary-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title={`Download PDF (${sanitizeReceiptFilename(r.student_name, r.receipt_number)})`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDirectShareSingleReceipt(r.receipt_number, r.student_name)}
                                className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Share PDF Attachment Directly (No Links)"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditReceipt(r)}
                                  className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                                  title="Edit receipt details"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
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

          {/* Floating Bulk Actions Toolbar */}
          {selectedReceiptNumbers.size > 0 && (
            <div className="sticky bottom-4 z-30 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-primary-600 rounded-xl text-xs font-extrabold text-white">
                  {selectedReceiptNumbers.size} Receipts Selected
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  Total: <span className="font-mono font-bold text-white">{fmt(selectedTotalAmount)}</span>
                </span>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleBulkDownloadIndividualPdfs}
                  disabled={bulkDownloadingIndividual}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  title="Download separate PDF files for each selected receipt"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {bulkDownloadingIndividual ? 'Downloading...' : 'Download Individual PDFs'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkDownloadZip}
                  disabled={bulkExportingZip}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  title="Download all selected receipt PDFs in a single ZIP archive"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{bulkExportingZip ? 'Packaging ZIP...' : 'Download as ZIP'}</span>
                </button>

                {selectedReceiptNumbers.size === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const rec = selectedReceipts[0]
                      if (rec) handleDirectShareSingleReceipt(rec.receipt_number, rec.student_name)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                    title="Directly share this receipt PDF attachment"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Direct Share</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={clearReceiptSelection}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 6: FEE PLANS (STRUCTURES & CATEGORIES)                                 */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'structures' || activeTab === 'plans') && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlansSubTab('structures')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  plansSubTab === 'structures'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Fee Structures ({feeStructures.length})
              </button>
              <button
                type="button"
                onClick={() => setPlansSubTab('categories')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  plansSubTab === 'categories'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Fee Categories ({feeCategories.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {plansSubTab === 'structures' ? (
                <button
                  type="button"
                  onClick={() => setIsNewStructureModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Fee Plan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {plansSubTab === 'structures' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3">Plan Name</th>
                      <th className="py-2.5 px-3">Standard / Scope</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3 text-center">Inst Count</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {feeStructures.map((fs) => (
                      <tr key={fs.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{fs.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">Standard ID: {fs.standard_id || 'All Standards'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{fs.category?.name || 'Tuition'}</td>
                        <td className="py-2.5 px-3 capitalize text-slate-600">{fs.frequency}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{fs.installments_count}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{fmt(fs.amount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fs.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {fs.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditStructure(fs)}
                              className="px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                              title="Edit Fee Plan"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3">Category Name</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {feeCategories.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{c.description || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 7: REPORTS                                                             */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReportType('collection')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reportType === 'collection' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Collection Summary
              </button>
              <button
                type="button"
                onClick={() => setReportType('defaulters')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reportType === 'defaulters' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Defaulters & Overdue
              </button>
              <button
                type="button"
                onClick={() => setReportType('methods')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reportType === 'methods' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Payment Methods
              </button>
              <button
                type="button"
                onClick={() => setReportType('reconciliation')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reportType === 'reconciliation' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Reconciliation
              </button>
            </div>
          </div>

          {reportType === 'collection' && (
            <ExcelReportGrid
              title="Board & Standard Collection Performance"
              subtitle="Audited breakdown of student fees, realized receipts, and collection rates across divisions"
              columns={feeCollectionBoardColumns}
              data={overviewData?.board_breakdown || []}
              loading={loadingOverview}
              exportFilename="prashant_academy_fees_collection_summary"
              sheetName="Collection Summary"
              showSummaryRow={true}
              summaryCalculations={feeCollectionBoardSummary}
              defaultSort={{ columnId: 'total_fees', direction: 'desc' }}
            />
          )}

          {reportType === 'defaulters' && (
            <ExcelReportGrid
              title="Overdue Dues Ledger"
              subtitle="Detailed ledger of outstanding student fee obligations with contact numbers and due dates"
              columns={feeDefaultersColumns}
              data={overviewData?.top_overdue || []}
              loading={loadingOverview}
              exportFilename="prashant_academy_fees_defaulters_report"
              sheetName="Defaulters"
              showSummaryRow={true}
              summaryCalculations={feeDefaultersSummary}
              defaultSort={{ columnId: 'due_amount', direction: 'desc' }}
              emptyMessage="🎉 All fees are up to date! No defaulter accounts found."
            />
          )}

          {reportType === 'methods' && (
            <ExcelReportGrid
              title="Payment Gateway / Method Volume"
              subtitle="Breakdown of fee transaction count and total inflow per payment method"
              columns={feeMethodsColumns}
              data={overviewData?.payment_methods || []}
              loading={loadingOverview}
              exportFilename="prashant_academy_payment_methods_breakdown"
              sheetName="Payment Methods"
              showSummaryRow={true}
              summaryCalculations={feeMethodsSummary}
              defaultSort={{ columnId: 'amount', direction: 'desc' }}
            />
          )}

          {reportType === 'reconciliation' && overviewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold">Total Invoiced Obligation</p>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">
                    {fmt(overviewData.summary.total_obligation)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs">
                  <p className="text-xs text-emerald-700 font-bold">Total Realized Inflow</p>
                  <p className="text-xl font-extrabold text-emerald-700 mt-1">
                    {fmt(overviewData.summary.total_collected)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-xs">
                  <p className="text-xs text-orange-700 font-bold">Unsettled Deficit</p>
                  <p className="text-xl font-extrabold text-orange-700 mt-1">
                    {fmt(overviewData.summary.total_outstanding)}
                  </p>
                </div>
              </div>

              <ExcelReportGrid
                title="Financial Audit & Reconciliation Ledger"
                subtitle="Balancing reconciliation between total invoiced billing, realized banking inflows, and unpaid deficits"
                columns={feeReconciliationColumns}
                data={feeReconciliationRows}
                loading={loadingOverview}
                exportFilename="prashant_academy_financial_audit_reconciliation"
                sheetName="Audit Reconciliation"
                showSummaryRow={false}
              />
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WORKSPACE 5: DEFAULTERS & OVERDUE DUES                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'defaulters' && (
        <div className="space-y-5" data-testid="workspace-defaulters">
          {/* Defaulter Aging Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mild (1–30 Days)</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{fmt(50000)}</div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">2 Students in grace window</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moderate (31–60 Days)</span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{fmt(65000)}</div>
              <p className="text-[11px] text-orange-700 font-semibold mt-1">2 Students reminder escalated</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical (60+ Days)</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{fmt(90000)}</div>
              <p className="text-[11px] text-rose-700 font-semibold mt-1">2 Students urgent recovery</p>
            </div>

            <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Defaulter Dues</span>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-white">{fmt(205000)}</div>
              <p className="text-[11px] text-emerald-400 font-medium mt-1">6 Active Defaulters Filtered</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={defaulterSearchQuery}
                  onChange={(e) => setDefaulterSearchQuery(e.target.value)}
                  placeholder="Search defaulter by student name, roll # or guardian phone..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Aging bracket buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['all', '1-30', '31-60', '60+'] as const).map((bracket) => (
                  <button
                    key={bracket}
                    type="button"
                    onClick={() => setDefaulterAgingFilter(bracket)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      defaulterAgingFilter === bracket
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {bracket === 'all' ? 'All Aging' : `${bracket} d`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isEditMode) {
                    toast.error('Locked in View Mode: Please activate Edit Mode above to dispatch bulk fee reminders.')
                    return
                  }
                  setIsBulkReminderModalOpen(true)
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                  isEditMode
                    ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
                title={isEditMode ? 'Dispatch fee reminders to all filtered guardians' : 'Locked in View Mode: Enable Edit Mode to dispatch reminders'}
              >
                {!isEditMode && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                <Bell className="w-3.5 h-3.5" />
                <span>Dispatch Bulk Reminders ({filteredDefaulters.length})</span>
              </button>
            </div>
          </div>

          {/* Defaulters Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Student & Roll No</th>
                    <th className="py-3 px-4">Class & Division</th>
                    <th className="py-3 px-4">Guardian Contact</th>
                    <th className="py-3 px-4 text-right">Total Fee</th>
                    <th className="py-3 px-4 text-right">Paid Amount</th>
                    <th className="py-3 px-4 text-right">Overdue Balance</th>
                    <th className="py-3 px-4 text-center">Aging Days</th>
                    <th className="py-3 px-4 text-center">Status Risk</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDefaulters.map((d) => {
                    const isCritical = d.overdue_days > 60
                    const isModerate = d.overdue_days > 30 && d.overdue_days <= 60
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{d.student_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{d.admission_number} | Roll: {d.roll_number}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{d.standard}</div>
                          <div className="text-[10px] text-slate-500">{d.division}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{d.guardian_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Smartphone className="w-3 h-3 text-slate-400" />
                            <span>{d.guardian_phone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">{fmt(d.total_fee)}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600">{fmt(d.paid_amount)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">{fmt(d.overdue_amount)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-bold text-slate-800">{d.overdue_days} d</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isModerate
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {isCritical ? 'Critical (60+ d)' : isModerate ? 'Moderate (31-60 d)' : 'Mild (1-30 d)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendSingleReminder(d)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isEditMode
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                              title={isEditMode ? 'Send Fee Reminder SMS/WhatsApp' : 'Locked in View Mode'}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCollectStudentId(d.student_id)
                                setCollectStudentSearch(d.student_name)
                                setTab('collection', { studentId: String(d.student_id) })
                              }}
                              className="px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-bold transition-all"
                            >
                              Collect
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredDefaulters.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        No fee defaulters match current search and aging criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WORKSPACE 6: CONCESSIONS & SCHOLARSHIP WAIVERS                             */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'concessions' && (
        <div className="space-y-5" data-testid="workspace-concessions">
          {/* Concession KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Concessions Awarded</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
                  <BadgePercent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{fmt(concessionAnalytics?.total_concessions_awarded ?? 0)}</div>
              <p className="text-[11px] text-purple-700 font-semibold mt-1">
                {concessionApplications.length} Application{concessionApplications.length === 1 ? '' : 's'} Logged
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Applied to Invoices</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{fmt(concessionAnalytics?.total_concessions_applied ?? 0)}</div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">Directly reduced invoice obligations</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Policy Schemes</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{concessionTypes.filter(t => t.is_active).length} Schemes</div>
              <p className="text-[11px] text-blue-700 font-semibold mt-1">Merit, Sibling, Staff, Need-Based</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {concessionApplications.filter(a => a.status === 'pending_approval' || a.status === 'under_verification').length}
              </div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">Awaiting committee verification</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={concessionSearchQuery}
                  onChange={(e) => setConcessionSearchQuery(e.target.value)}
                  placeholder="Search concessions by student name, admission #, title..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <select
                value={concessionFilterType}
                onChange={(e) => setConcessionFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Concession Types</option>
                {concessionTypes.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={concessionFilterStatus}
                onChange={(e) => setConcessionFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Approval Statuses</option>
                <option value="applied">Applied to Invoice</option>
                <option value="approved">Approved (Pending Allocation)</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="under_verification">Under Verification</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isEditMode) {
                    toast.error('Locked in View Mode: Please activate Edit Mode above to grant new concessions.')
                    return
                  }
                  setIsNewConcessionModalOpen(true)
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                  isEditMode
                    ? 'bg-primary-600 hover:bg-primary-700 text-white active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
                title={isEditMode ? 'Grant new concession or scholarship waiver' : 'Locked in View Mode: Enable Edit Mode to apply concession'}
              >
                {!isEditMode && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                <Plus className="w-3.5 h-3.5" />
                <span>Apply Concession</span>
              </button>
            </div>
          </div>

          {/* Concessions Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Student & Admission</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Scheme / Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Discount %</th>
                    <th className="py-3 px-4 text-right">Amount Waived</th>
                    <th className="py-3 px-4">Funding Source</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredConcessions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.student_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {c.admission_number} • <span className="text-primary-600">{c.application_number}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{c.standard || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.concession_name}</div>
                        {c.approval_remarks && <div className="text-[10px] text-slate-500 italic mt-0.5">{c.approval_remarks}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                          {c.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {c.requested_percentage ? `${c.requested_percentage}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                        {fmt(c.applied_amount > 0 ? c.applied_amount : (c.approved_amount > 0 ? c.approved_amount : c.requested_amount))}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {c.funding_source === 'external_sponsor' ? (c.sponsor_name || 'External Sponsor') : 'Institute Fund'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'applied'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : c.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : c.status === 'pending_approval' || c.status === 'under_verification'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {c.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.status === 'pending_approval' || c.status === 'under_verification' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveConcession(c.id)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                                isEditMode
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                              title={isEditMode ? 'Approve & Apply to Invoice' : 'Locked in View Mode'}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectConcession(c.id)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                                isEditMode
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                              title={isEditMode ? 'Reject Application' : 'Locked in View Mode'}
                            >
                              Reject
                            </button>
                          </div>
                        ) : c.status === 'approved' ? (
                          <button
                            type="button"
                            onClick={() => handleApplyConcession(c.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                              isEditMode
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                            title={isEditMode ? 'Apply to Student Invoice' : 'Locked in View Mode'}
                          >
                            Apply to Invoice
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold capitalize">{c.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredConcessions.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        No concession records match current criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WORKSPACE 7: ONLINE PAYMENTS & INSTANT GATEWAY DESK                        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'online-gateway' && (
        <div className="space-y-5" data-testid="workspace-online-gateway">
          {/* Gateway Integration Status Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">UPI BharatQR</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 font-mono">prashantacademy@icici</div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">NPCI Dynamic Merchant Terminal</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Razorpay Gateway</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  LIVE
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 font-mono">rzp_live_9a7xK2...</div>
              <p className="text-[11px] text-blue-700 font-medium mt-1">Webhook: 200 OK (0 retries)</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stripe International</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  CONFIGURED
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 font-mono">pk_live_51P8...</div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">NRI / Expat Tuition Collection</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Settlement</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                  <CheckCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-sm font-extrabold text-slate-900">Today 23:59 IST</div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">Auto-payout to HDFC Escrow</p>
            </div>
          </div>

          {/* Interactive Tools: Dynamic QR Generator & Payment Link Sharing */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Dynamic UPI QR Code Generator Terminal */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Dynamic BharatQR Generator</h3>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Zero Merchant Surcharge
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Account / Name</label>
                  <input
                    type="text"
                    value={onlineQrStudentName}
                    onChange={(e) => setOnlineQrStudentName(e.target.value)}
                    placeholder="Enter student name..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Reference</label>
                    <input
                      type="text"
                      value={onlineQrInvoiceNo}
                      onChange={(e) => setOnlineQrInvoiceNo(e.target.value)}
                      placeholder="INV-2026-0001"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Collection Amount (INR)</label>
                    <input
                      type="number"
                      value={onlineQrAmount}
                      onChange={(e) => setOnlineQrAmount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Styled Visual QR Code Display Card */}
                <div className="p-4 bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Scan with any UPI App</div>
                  
                  {/* High contrast QR code mock SVG */}
                  <div className="p-3 bg-white rounded-2xl border-2 border-slate-900/80 shadow-md">
                    <svg viewBox="0 0 100 100" className="w-40 h-40">
                      {/* Standard QR Corner Markers */}
                      <rect x="5" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                      <rect x="9" y="9" width="20" height="20" rx="2" fill="#ffffff" />
                      <rect x="13" y="13" width="12" height="12" rx="1" fill="#0f172a" />

                      <rect x="67" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                      <rect x="71" y="9" width="20" height="20" rx="2" fill="#ffffff" />
                      <rect x="75" y="13" width="12" height="12" rx="1" fill="#0f172a" />

                      <rect x="5" y="67" width="28" height="28" rx="4" fill="#0f172a" />
                      <rect x="9" y="71" width="20" height="20" rx="2" fill="#ffffff" />
                      <rect x="13" y="75" width="12" height="12" rx="1" fill="#0f172a" />

                      {/* Random Grid Matrix Elements for Authentic QR Look */}
                      <rect x="38" y="10" width="8" height="8" fill="#0f172a" />
                      <rect x="50" y="10" width="8" height="8" fill="#0f172a" />
                      <rect x="38" y="22" width="16" height="6" fill="#0f172a" />
                      <rect x="10" y="40" width="8" height="16" fill="#0f172a" />
                      <rect x="22" y="44" width="12" height="8" fill="#0f172a" />
                      <rect x="42" y="38" width="16" height="16" rx="3" fill="#2563eb" />
                      <circle cx="50" cy="46" r="4" fill="#ffffff" />
                      <rect x="66" y="40" width="12" height="8" fill="#0f172a" />
                      <rect x="82" y="44" width="8" height="14" fill="#0f172a" />
                      <rect x="38" y="66" width="12" height="12" fill="#0f172a" />
                      <rect x="54" y="66" width="8" height="8" fill="#0f172a" />
                      <rect x="68" y="72" width="18" height="10" fill="#0f172a" />
                      <rect x="40" y="82" width="20" height="8" fill="#0f172a" />
                    </svg>
                  </div>

                  <div className="font-mono text-sm font-extrabold text-slate-900 tracking-tight">
                    {fmt(onlineQrAmount)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    pa: prashantacademy@icici | Ref: {onlineQrInvoiceNo}
                  </div>

                  <div className="flex items-center gap-2 pt-1 w-full">
                    <button
                      type="button"
                      onClick={handleCopyQrLink}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all"
                    >
                      {qrCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{qrCopied ? 'Copied' : 'Copy UPI Link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success('Sending UPI QR to connected thermal receipt printer...')}
                      className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all"
                      title="Print Standee Slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Online Payment Link Dispatcher & Gateway Webhooks Status */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-extrabold text-slate-900">Instant Online Payment Portal Link</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">Parent Self-Service</span>
                </div>

                <p className="text-xs text-slate-600">
                  Parents can pay tuition fees through Credit Card, Debit Card, Netbanking, or EMI directly via this secure link.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://pay.prashantacademy.com/inv/${onlineQrInvoiceNo}`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPaymentLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    {paymentLinkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{paymentLinkCopied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditMode) {
                        toast.error('Locked in View Mode: Please activate Edit Mode to send payment links.')
                        return
                      }
                      toast.success(`Payment link dispatched via WhatsApp & SMS to guardian of ${onlineQrStudentName}!`)
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                      isEditMode
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                    title={isEditMode ? 'Send to Guardian via WhatsApp' : 'Locked in View Mode'}
                  >
                    {!isEditMode && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Online Settlement Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Recent Gateway Settlements & Webhook Receipts
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">Reconciled Daily</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Gateway Ref</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3 text-right">Gross (INR)</th>
                        <th className="py-2.5 px-3 text-right">Fee / GST</th>
                        <th className="py-2.5 px-3 text-right">Net Payout</th>
                        <th className="py-2.5 px-3 text-center">Settlement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {onlineSettlements.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-primary-600">{s.gateway_ref}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{s.order_id}</div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{s.student_name}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{s.payment_method}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{fmt(s.gross_amount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">{fmt(s.gateway_fee)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">{fmt(s.net_payout)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.settlement_status === 'Settled'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {s.settlement_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 8: SETTINGS                                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-3xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Financial Preferences & Receipt Rules</h3>
              <p className="text-xs text-slate-500 mt-0.5">Configure institute receipt numbering, methods, and late fee rules.</p>
            </div>
            <Link
              to="/settings?category=fees"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50/80 hover:bg-primary-100/80 px-3 py-1.5 rounded-xl border border-blue-200/60 shadow-2xs transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-primary-600" />
              <span>Full Institute Settings</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </Link>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Number Prefix</label>
                <input
                  type="text"
                  value={settingsState.receiptPrefix}
                  onChange={(e) => setSettingsState({ ...settingsState, receiptPrefix: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Starting Sequence</label>
                <input
                  type="number"
                  value={settingsState.startingSequence}
                  onChange={(e) => setSettingsState({ ...settingsState, startingSequence: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Grace Period (Days)</label>
                <input
                  type="number"
                  value={settingsState.gracePeriodDays}
                  onChange={(e) => setSettingsState({ ...settingsState, gracePeriodDays: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Daily Late Fee (INR)</label>
                <input
                  type="number"
                  value={settingsState.lateFeeDailyAmount}
                  onChange={(e) => setSettingsState({ ...settingsState, lateFeeDailyAmount: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Disclaimer / Terms</label>
              <textarea
                value={settingsState.receiptFooterTerms}
                onChange={(e) => setSettingsState({ ...settingsState, receiptFooterTerms: e.target.value })}
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
            >
              Save Preferences
            </button>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: BULK FEE REMINDERS DISPATCH                                         */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isBulkReminderModalOpen && (
        <Modal
          isOpen={isBulkReminderModalOpen}
          onClose={() => setIsBulkReminderModalOpen(false)}
          title="Dispatch Bulk Fee Reminders"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <span className="font-bold">Target Audience:</span> You are about to dispatch fee reminders to <strong>{filteredDefaulters.length} guardians</strong> with active overdue dues.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reminder Notification Message</label>
              <textarea
                value={reminderTemplate}
                onChange={(e) => setReminderTemplate(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkReminderModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkReminderConfirm}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Dispatch to {filteredDefaulters.length} Guardians</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: APPLY NEW CONCESSION / WAIVER                                       */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isNewConcessionModalOpen && (
        <Modal
          isOpen={isNewConcessionModalOpen}
          onClose={() => {
            setIsNewConcessionModalOpen(false)
            setSelectedStudentForConcession(null)
            setStudentConcessionSearch('')
            setEligibilityResult(null)
          }}
          title="Grant Fee Concession or Scholarship"
          size="lg"
        >
          <form onSubmit={handleCreateConcessionSubmit} className="space-y-4">
            {/* Mode Toggle: Single vs Bulk */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setConcessionApplicationMode('single')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  concessionApplicationMode === 'single'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Student Application
              </button>
              <button
                type="button"
                onClick={() => setConcessionApplicationMode('bulk')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  concessionApplicationMode === 'bulk'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulk / Batch Concession
              </button>
            </div>

            {concessionApplicationMode === 'single' ? (
              <>
                {/* Searchable Student Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Enrolled Student <span className="text-red-500">*</span>
                  </label>
                  {!selectedStudentForConcession ? (
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={studentConcessionSearch}
                        onChange={(e) => setStudentConcessionSearch(e.target.value)}
                        placeholder="Search student by name or admission number..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {studentConcessionResults && studentConcessionResults.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-lg">
                          {studentConcessionResults.map((st) => (
                            <div
                              key={st.id}
                              onClick={() => {
                                setSelectedStudentForConcession({
                                  id: st.id,
                                  name: `${st.first_name} ${st.last_name}`.trim(),
                                  admission_number: st.admission_number,
                                  standard: (st as any).standard?.name || (st as any).enrollments?.[0]?.standard?.name,
                                })
                                setStudentConcessionSearch('')
                              }}
                              className="p-2.5 hover:bg-primary-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                            >
                              <div>
                                <p className="font-bold text-slate-800">{st.first_name} {st.last_name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{st.admission_number}</p>
                              </div>
                              <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                                Select
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-primary-50/70 border border-primary-200/80 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{selectedStudentForConcession.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {selectedStudentForConcession.admission_number}
                          {selectedStudentForConcession.standard && ` • ${selectedStudentForConcession.standard}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentForConcession(null)
                          setEligibilityResult(null)
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 transition"
                      >
                        Change Student
                      </button>
                    </div>
                  )}
                </div>

                {/* Scheme & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Concession / Scholarship Scheme <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedConcessionTypeId}
                      onChange={(e) => setSelectedConcessionTypeId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Scheme</option>
                      {concessionTypes.filter(t => t.is_active).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.calculation_type === 'percentage' ? `${t.default_value}%` : t.calculation_type === 'full_waiver' ? '100% Waiver' : fmt(t.default_value)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Concession Benefit Value
                    </label>
                    {(() => {
                      const selScheme = concessionTypes.find((t) => t.id === Number(selectedConcessionTypeId))
                      if (selScheme?.calculation_type === 'percentage') {
                        return (
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={concessionPercentageValue}
                              onChange={(e) => setConcessionPercentageValue(Number(e.target.value) || '')}
                              placeholder="e.g. 25"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                          </div>
                        )
                      }
                      return (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={concessionAmountValue}
                            onChange={(e) => setConcessionAmountValue(Number(e.target.value) || '')}
                            placeholder="e.g. 10000"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Live Automated Eligibility Evaluator Badge */}
                {isEvaluatingEligibility && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-600" />
                    <span>Evaluating student academic records, attendance, and sibling matching...</span>
                  </div>
                )}

                {eligibilityResult && !isEvaluatingEligibility && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    eligibilityResult.eligible
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {eligibilityResult.eligible ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>Eligible for {eligibilityResult.concession_name}</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Discretionary Approval Required</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90">{eligibilityResult.summary}</p>
                    {eligibilityResult.criteria && eligibilityResult.criteria.length > 0 && (
                      <div className="mt-1 space-y-1 pt-1 border-t border-black/5 text-[10px]">
                        {eligibilityResult.criteria.map((cr, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="font-semibold">{cr.name}:</span>
                            <span className={cr.passed ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                              {cr.observed} {cr.passed ? '✓' : '(Review Required)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Bulk / Batch Mode */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Standard / Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bulkStandardId}
                      onChange={(e) => {
                        setBulkStandardId(e.target.value ? Number(e.target.value) : '')
                        setBulkSelectedStudentIds([])
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value="">Select Class</option>
                      {standards.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Concession Scheme <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedConcessionTypeId}
                      onChange={(e) => setSelectedConcessionTypeId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value="">Select Scheme</option>
                      {concessionTypes.filter(t => t.is_active).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Student Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Select Students ({bulkSelectedStudentIds.length} of {bulkStandardStudents.length} selected)
                    </label>
                    {bulkStandardStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (bulkSelectedStudentIds.length === bulkStandardStudents.length) {
                            setBulkSelectedStudentIds([])
                          } else {
                            setBulkSelectedStudentIds(bulkStandardStudents.map(s => s.id))
                          }
                        }}
                        className="text-[11px] font-bold text-primary-600 hover:text-primary-800"
                      >
                        {bulkSelectedStudentIds.length === bulkStandardStudents.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 p-1">
                    {bulkStandardStudents.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">
                        {bulkStandardId ? 'No students found in selected standard.' : 'Please choose a standard above to view enrolled students.'}
                      </p>
                    ) : (
                      bulkStandardStudents.map((st) => {
                        const isChecked = bulkSelectedStudentIds.includes(st.id)
                        return (
                          <div
                            key={st.id}
                            onClick={() => {
                              if (isChecked) {
                                setBulkSelectedStudentIds(bulkSelectedStudentIds.filter(id => id !== st.id))
                              } else {
                                setBulkSelectedStudentIds([...bulkSelectedStudentIds, st.id])
                              }
                            }}
                            className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              isChecked ? 'bg-primary-50/80 font-bold' : 'hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-slate-800">{st.first_name} {st.last_name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{st.admission_number}</span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="bulk-auto-approve"
                    checked={bulkAutoApprove}
                    onChange={(e) => setBulkAutoApprove(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="bulk-auto-approve" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Automatically approve and apply directly to active fee invoices
                  </label>
                </div>
              </>
            )}

            {/* Justification / Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Justification / Resolution Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={concessionRemarks}
                onChange={(e) => setConcessionRemarks(e.target.value)}
                rows={2}
                placeholder="Audit reason (e.g. Sibling discount approved as per management policy, admission campaign)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsNewConcessionModalOpen(false)
                  setSelectedStudentForConcession(null)
                  setEligibilityResult(null)
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingConcession}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingConcession ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>
                  {concessionApplicationMode === 'single' ? 'Grant Fee Concession' : `Apply to ${bulkSelectedStudentIds.length} Students`}
                </span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: OFFICIAL RECEIPT MODAL                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeReceiptModalNumber && (
        <Modal
          isOpen={!!activeReceiptModalNumber}
          onClose={() => setActiveReceiptModalNumber(null)}
          title={`Official Fee Receipt #${activeReceiptModalNumber}`}
          size="lg"
        >
          {loadingDetailedReceipt ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2" />
              Loading receipt details...
            </div>
          ) : detailedReceipt ? (
            <PaymentReceiptView
              receipt={detailedReceipt}
              showPrintActions={true}
              onClose={() => setActiveReceiptModalNumber(null)}
            />
          ) : null}
        </Modal>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: INSTALLMENT BREAKDOWN MODAL                                       */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {selectedInstallments && (
        <Modal
          isOpen={!!selectedInstallments}
          onClose={() => setSelectedInstallments(null)}
          title={`Installment Schedule: ${selectedStudentName}`}
          size="md"
        >
          <div className="space-y-3">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b">
                  <tr>
                    <th className="py-2 px-3">Inst #</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3 text-right">Scheduled</th>
                    <th className="py-2 px-3 text-right">Paid</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInstallments.map((inst) => (
                    <tr key={inst.id}>
                      <td className="py-2.5 px-3 font-semibold">Installment {inst.installment_number}</td>
                      <td className="py-2.5 px-3 text-slate-500">{inst.due_date}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{fmt(inst.amount)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{fmt(inst.paid_amount)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <InvoiceStatusBadge status={inst.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setSelectedInstallments(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: REVERSE PAYMENT CONFIRMATION                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {reversalTargetPayment && (
        <Modal
          isOpen={!!reversalTargetPayment}
          onClose={() => setReversalTargetPayment(null)}
          title="Reverse Payment Transaction"
          size="sm"
        >
          <form onSubmit={handleConfirmReversal} className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                Warning: Irreversible Financial Action
              </p>
              <p>
                Reversing Receipt #{reversalTargetPayment.receipt_number} ({fmt(reversalTargetPayment.amount)}) will restore the outstanding balance on the student's fee ledger.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Reversal Audit Reason *
              </label>
              <textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="State the verified financial reason (e.g., duplicate transaction, bounce)..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReversalTargetPayment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reverseMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {reverseMutation.isPending ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: CREATE FEE STRUCTURE                                              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isNewStructureModalOpen && (
        <Modal
          isOpen={isNewStructureModalOpen}
          onClose={() => setIsNewStructureModalOpen(false)}
          title="Create New Fee Structure"
          size="md"
        >
          <form onSubmit={handleCreateStructure} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plan Name *</label>
              <input
                type="text"
                value={newStructName}
                onChange={(e) => setNewStructName(e.target.value)}
                placeholder="e.g. Class X Board Examination & Tuition Package"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fee Category *</label>
                <select
                  value={newStructCatId}
                  onChange={(e) => setNewStructCatId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  required
                >
                  <option value="">Select Category...</option>
                  {feeCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Class (Optional)</label>
                <select
                  value={newStructStdId}
                  onChange={(e) => setNewStructStdId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="">All Classes</option>
                  {standards.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Fee (INR) *</label>
                <input
                  type="number"
                  value={newStructAmount}
                  onChange={(e) => setNewStructAmount(e.target.value)}
                  placeholder="e.g. 48000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Frequency *</label>
                <select
                  value={newStructFrequency}
                  onChange={(e) => setNewStructFrequency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="annual">Annual</option>
                  <option value="term">Term-wise</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Installments Count *</label>
                <input
                  type="number"
                  value={newStructInstallments}
                  onChange={(e) => setNewStructInstallments(Number(e.target.value))}
                  min={1}
                  max={12}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewStructureModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createStructureMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {createStructureMutation.isPending ? 'Creating...' : 'Create Structure'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: ADD FEE CATEGORY                                                  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isNewCategoryModalOpen && (
        <Modal
          isOpen={isNewCategoryModalOpen}
          onClose={() => setIsNewCategoryModalOpen(false)}
          title="Add New Fee Category"
          size="sm"
        >
          <form onSubmit={handleCreateCategory} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Laboratory, Test Series, Library..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Brief category scope..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createCategoryMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {createCategoryMutation.isPending ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 6: EDIT FEE STRUCTURE                                                */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isEditStructureModalOpen && editingStructure && (
        <Modal
          isOpen={isEditStructureModalOpen}
          onClose={() => setIsEditStructureModalOpen(false)}
          title={`Edit Fee Structure: ${editingStructure.name}`}
          size="md"
        >
          <form onSubmit={handleSaveEditStructure} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plan Name *</label>
              <input
                type="text"
                value={editStructName}
                onChange={(e) => setEditStructName(e.target.value)}
                placeholder="e.g. Standard 10 Full Year Coaching"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fee Category</label>
                <select
                  value={editStructCatId}
                  onChange={(e) => setEditStructCatId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="">Select Category...</option>
                  {feeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
                <select
                  value={editStructFrequency}
                  onChange={(e) => setEditStructFrequency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="annual">Annual / Full Course</option>
                  <option value="term">Term-wise</option>
                  <option value="monthly">Monthly</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editStructAmount}
                  onChange={(e) => setEditStructAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Installments Count</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={editStructInstallments}
                  onChange={(e) => setEditStructInstallments(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  required
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editStructIsActive}
                  onChange={(e) => setEditStructIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
                />
                <span>Active Template (available for student assignments)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditStructureModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editStructureMutation.isPending}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
              >
                {editStructureMutation.isPending ? 'Saving...' : 'Save Plan Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 7: EDIT PAYMENT RECEIPT                                              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isEditReceiptModalOpen && (
        <Modal
          isOpen={isEditReceiptModalOpen}
          onClose={() => setIsEditReceiptModalOpen(false)}
          title={`Edit Receipt ${editReceiptForm.receipt_number}`}
          size="md"
        >
          {loadingReceiptPayment ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600 mx-auto mb-2" />
              Loading payment transaction...
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!editReceiptForm.edit_reason.trim()) {
                  toast.error('A mandatory reason is required to update receipt details')
                  return
                }
                const amt = parseFloat(editReceiptForm.amount)
                if (isNaN(amt) || amt <= 0) {
                  toast.error('Payment amount must be greater than zero')
                  return
                }
                editReceiptMutation.mutate(editReceiptForm)
              }}
              className="space-y-3.5"
            >
              {/* Alert note about financial ledger rules */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Audited Financial Modification</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Student: <strong>{editReceiptForm.student_name}</strong>. Modifying the payment amount or method
                  will supersede receipt #{editReceiptForm.receipt_number} and update the active fee invoice balance.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={editReceiptForm.amount}
                    onChange={(e) => setEditReceiptForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={editReceiptForm.payment_date}
                    onChange={(e) => setEditReceiptForm((p) => ({ ...p, payment_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={editReceiptForm.payment_method}
                    onChange={(e) => setEditReceiptForm((p) => ({ ...p, payment_method: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">Online / UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="netbanking">Net Banking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Reference</label>
                  <input
                    type="text"
                    value={editReceiptForm.transaction_reference}
                    onChange={(e) => setEditReceiptForm((p) => ({ ...p, transaction_reference: e.target.value }))}
                    placeholder="UPI Ref / UTR / Auth Code"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  />
                </div>
              </div>

              {editReceiptForm.payment_method === 'cheque' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editReceiptForm.bank_name}
                      onChange={(e) => setEditReceiptForm((p) => ({ ...p, bank_name: e.target.value }))}
                      placeholder="e.g. HDFC Bank"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cheque Number</label>
                    <input
                      type="text"
                      value={editReceiptForm.cheque_number}
                      onChange={(e) => setEditReceiptForm((p) => ({ ...p, cheque_number: e.target.value }))}
                      placeholder="6-digit cheque number"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Notes</label>
                <input
                  type="text"
                  value={editReceiptForm.notes}
                  onChange={(e) => setEditReceiptForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional remarks or notes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Audit Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editReceiptForm.edit_reason}
                  onChange={(e) => setEditReceiptForm((p) => ({ ...p, edit_reason: e.target.value }))}
                  placeholder="Specify reason for receipt correction (e.g. Discrepancy in recorded amount, payment mode correction)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-[10px] text-slate-500">
                  This justification is logged in immutable financial audit records.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditReceiptModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editReceiptMutation.isPending || !editReceiptForm.edit_reason.trim()}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
                >
                  {editReceiptMutation.isPending ? 'Saving...' : 'Save & Update Receipt'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}

export default function Fees() {
  const inRouter = useInRouterContext()
  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={['/fees/overview']}>
        <FeesContent />
      </MemoryRouter>
    )
  }
  return <FeesContent />
}
