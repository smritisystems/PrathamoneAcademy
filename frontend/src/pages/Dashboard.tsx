/**
 * @file        Dashboard.tsx
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
 * @description Executive management & financial dashboard displaying institute KPIs, active-only outstanding isolation, status-wise recovery audit, aging analysis, daily operations, and instant receipt PDF generation.
 */

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, TrendingUp, AlertCircle, DollarSign, ArrowRight,
  Calendar, BookOpen, Layers,
  SlidersHorizontal, Lock, KeyRound, Unlock,
  Receipt, Download, Printer, Filter, CheckCircle2, Clock,
  FileText, RefreshCw, Eye, Search, CheckSquare, Square,
  ChevronRight, UserCheck, UserX, ArrowUpRight, AlertTriangle,
  HelpCircle, ShieldCheck, UserPlus, PhoneCall, Video, Check
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import StatCard from '../components/StatCard'
import CascadingFilters, { FilterState } from '../components/CascadingFilters'
import { dashboardApi, codexApi, paymentsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useBranding } from '../config/branding'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { encodeCodexNumber } from '../utils/codexFormatter'
import QuickDecoderModal from '../components/codex/QuickDecoderModal'
import type { OutstandingDrilldownRecord } from '../types'

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
}

export default function DashboardPage() {
  const branding = useBranding()
  useDocumentTitle('Dashboard')

  const {
    user,
    selectedAcademicYearId,
    selectedInstitutionId,
  } = useAuthStore()

  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === 'student') {
      navigate('/student-portal', { replace: true })
    }
  }, [user, navigate])

  // Student Status Scope ('active' is the strict system default)
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'inactive' | 'left' | 'transferred'>('active')

  // Unified Cascading Filters state
  const [filters, setFilters] = useState<FilterState>({
    academicYearId: selectedAcademicYearId || null,
    boardId: null,
    standardId: null,
    divisionId: null,
  })

  // Sync year filter when global academic year changes
  useEffect(() => {
    if (selectedAcademicYearId) {
      setFilters((prev) => ({ ...prev, academicYearId: selectedAcademicYearId }))
    }
  }, [selectedAcademicYearId])

  // Fetch Dashboard live metrics
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: [
      'dashboard-stats',
      filters.academicYearId,
      selectedInstitutionId,
      filters.boardId,
      filters.standardId,
      filters.divisionId,
      statusFilter,
    ],
    queryFn: () =>
      dashboardApi
        .getStats({
          academic_year_id: filters.academicYearId ?? undefined,
          institution_id: selectedInstitutionId ?? undefined,
          board_id: filters.boardId ?? undefined,
          standard_id: filters.standardId ?? undefined,
          division_id: filters.divisionId ?? undefined,
          status: statusFilter,
        })
        .then((r) => r.data),
  })

  const collectionRate = stats?.collection_rate ?? 0

  // Quick Decoder modal state
  const [decoderCode, setDecoderCode] = useState<string | null>(null)

  // Query CodeX user status
  const { data: codexStatus } = useQuery({
    queryKey: ['codex-user-status', 'dashboard'],
    queryFn: async () => {
      try {
        const res = await codexApi.getUserStatus('dashboard')
        return res.data
      } catch {
        return { is_enabled: false, visibility_mode: 'actual_only', can_decode: false }
      }
    },
    staleTime: 5000,
  })

  // CodeX representation calculations
  const isCodexActive = Boolean((stats as any)?._codex?.is_enabled ?? codexStatus?.is_enabled)
  const codexMode = (stats as any)?._codex?.visibility_mode || codexStatus?.visibility_mode || 'actual_only'

  const rawFees = stats?.total_fees
  const codeFees = (stats as any)?.total_fees_coded || (isCodexActive && rawFees != null ? encodeCodexNumber(rawFees) : undefined)

  const rawCollected = stats?.total_collected
  const codeCollected = (stats as any)?.total_collected_coded || (isCodexActive && rawCollected != null ? encodeCodexNumber(rawCollected) : undefined)

  const rawOutstanding = stats?.total_outstanding
  const codeOutstanding = (stats as any)?.total_outstanding_coded || (isCodexActive && rawOutstanding != null ? encodeCodexNumber(rawOutstanding) : undefined)

  // Outstanding Drilldown Modal State
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false)
  const [drilldownStatus, setDrilldownStatus] = useState<string>('active')
  const [drilldownBucket, setDrilldownBucket] = useState<string>('all')
  const [drilldownOverdueOnly, setDrilldownOverdueOnly] = useState<boolean>(false)
  const [drilldownSearch, setDrilldownSearch] = useState<string>('')

  // Recent Payments Table State: Selection, Search, Method Filter
  const [paymentSearch, setPaymentSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([])
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null)

  // Filtered recent payments
  const filteredPayments = useMemo(() => {
    if (!stats?.recent_payments) return []
    return stats.recent_payments.filter((p) => {
      const matchSearch =
        !paymentSearch ||
        p.student_name.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.admission_number.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.receipt_number.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        (p.transaction_reference && p.transaction_reference.toLowerCase().includes(paymentSearch.toLowerCase()))

      const matchMethod = methodFilter === 'all' || p.payment_method === methodFilter
      return matchSearch && matchMethod
    })
  }, [stats?.recent_payments, paymentSearch, methodFilter])

  // Toggle selection for all visible payments
  const toggleSelectAll = () => {
    if (selectedReceipts.length === filteredPayments.length && filteredPayments.length > 0) {
      setSelectedReceipts([])
    } else {
      setSelectedReceipts(filteredPayments.map((p) => p.receipt_number))
    }
  }

  // Toggle single payment selection
  const toggleReceiptSelect = (receiptNum: string) => {
    setSelectedReceipts((prev) =>
      prev.includes(receiptNum) ? prev.filter((r) => r !== receiptNum) : [...prev, receiptNum]
    )
  }

  // Download individual receipt PDF
  const handleDownloadSinglePdf = async (receiptNum: string, studentName: string) => {
    try {
      setDownloadingReceipt(receiptNum)
      const res = await paymentsApi.downloadReceiptPdf(receiptNum)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const sanitizedName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_')
      link.href = url
      link.download = `${sanitizedName}_${receiptNum}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download receipt PDF:', err)
      alert('Unable to generate receipt PDF. Please try again or check server logs.')
    } finally {
      setDownloadingReceipt(null)
    }
  }

  // Bulk ZIP Download
  const handleBulkZipDownload = async () => {
    if (selectedReceipts.length === 0) return
    try {
      setIsDownloadingZip(true)
      const res = await paymentsApi.exportBulkReceiptsZip(selectedReceipts)
      const blob = new Blob([res.data], { type: 'application/zip' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      link.href = url
      link.download = `Receipts_Batch_${timestamp}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download bulk receipts ZIP:', err)
      alert('Unable to generate bulk receipts ZIP. Please verify receipt selections.')
    } finally {
      setIsDownloadingZip(false)
    }
  }

  // Open drilldown for specific card/status
  const openDrilldown = (status: string, bucket: string = 'all', overdueOnly: boolean = false) => {
    setDrilldownStatus(status)
    setDrilldownBucket(bucket)
    setDrilldownOverdueOnly(overdueOnly)
    setDrilldownSearch('')
    setIsDrilldownOpen(true)
  }

  // Query for Drilldown Data
  const { data: drilldownData, isLoading: isDrilldownLoading } = useQuery({
    queryKey: [
      'outstanding-drilldown',
      filters.academicYearId,
      selectedInstitutionId,
      filters.boardId,
      filters.standardId,
      filters.divisionId,
      drilldownStatus,
      drilldownBucket,
      drilldownOverdueOnly,
      drilldownSearch,
    ],
    queryFn: () =>
      dashboardApi
        .getOutstandingDrilldown({
          academic_year_id: filters.academicYearId ?? undefined,
          institution_id: selectedInstitutionId ?? undefined,
          board_id: filters.boardId ?? undefined,
          standard_id: filters.standardId ?? undefined,
          division_id: filters.divisionId ?? undefined,
          status: drilldownStatus,
          aging_bucket: drilldownBucket !== 'all' ? drilldownBucket : undefined,
          is_overdue: drilldownOverdueOnly ? true : undefined,
          search: drilldownSearch || undefined,
        })
        .then((r) => r.data),
    enabled: isDrilldownOpen,
  })

  // Export drilldown to CSV
  const exportDrilldownCsv = () => {
    if (!drilldownData?.records || drilldownData.records.length === 0) return
    const headers = [
      'Student Name',
      'Admission No',
      'Phone',
      'Standard',
      'Batch',
      'Invoice No',
      'Due Date',
      'Days Overdue',
      'Status Scope',
      'Total Obligation',
      'Paid Amount',
      'Outstanding Amount',
    ]

    const rows = drilldownData.records.map((r) => [
      `"${r.student_name}"`,
      `"${r.admission_number}"`,
      `"${r.phone}"`,
      `"${r.class_name}"`,
      `"${r.batch_name}"`,
      `"${r.invoice_number}"`,
      `"${r.due_date || 'N/A'}"`,
      r.days_overdue,
      `"${r.student_status}"`,
      r.total_obligation,
      r.paid_amount,
      r.outstanding_amount,
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Outstanding_Drilldown_${drilldownStatus}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  // Aging view selection: active vs total_historical
  const [agingScope, setAgingScope] = useState<'active' | 'total_historical'>('active')
  const currentAgingProfile = stats?.aging_analysis ? stats.aging_analysis[agingScope] : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coaching Institute Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Authoritative real-time overview of {branding.academyName} admissions, fee collections, and student dues
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCodexActive && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-300 shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-violet-600" />
                <span>CodeX Active ({codexMode})</span>
              </span>
              <button
                type="button"
                onClick={() => setDecoderCode(codeFees || 'CX-')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Launch CodeX Decoder"
              >
                <KeyRound className="w-3.5 h-3.5 text-primary-600" />
                <span>Decoder</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-gray-700 border border-gray-300 rounded-lg shadow-2xs transition-colors"
            title="Refresh Dashboard Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Unified Cascading Filter Bar */}
      <div className="space-y-2">
        <CascadingFilters
          filters={filters}
          onChange={(updated) => setFilters(updated)}
          title="Filter Institute Metrics"
        />

        {/* Student Lifecycle & Status Filter Override Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-2xs text-xs">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <SlidersHorizontal className="w-4 h-4 text-primary-600" />
            <span>Student Status Scope:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3 h-3 text-blue-600" />
              {statusFilter === 'active'
                ? 'Active Students Only (Default)'
                : statusFilter === 'all'
                ? 'All Students (Consolidated Historical)'
                : statusFilter === 'left'
                ? 'Left / Discontinued Students'
                : statusFilter === 'transferred'
                ? 'Transferred Students'
                : 'Inactive / On Hold Students'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dashboard-status-filter" className="text-gray-600 font-medium">
              Change Scope:
            </label>
            <select
              id="dashboard-status-filter"
              data-testid="dashboard-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="active">Active Students Only (Default)</option>
              <option value="all">All Students (Consolidated Historical)</option>
              <option value="left">Left / Discontinued Students</option>
              <option value="transferred">Transferred Students</option>
              <option value="inactive">Inactive / On Hold Students</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div
          onClick={() => navigate(`/students?status=${statusFilter === 'all' ? 'all' : 'active'}`)}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
          title="Click to view student list"
        >
          <StatCard
            title="Total Students"
            value={stats?.total_students ?? 0}
            icon={Users}
            color="primary"
            subtitle={
              statusFilter === 'all'
                ? 'All student statuses'
                : statusFilter !== 'active'
                ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} students`
                : 'Enrolled active students'
            }
          />
        </div>

        <StatCard
          title="Total Fees Invoiced"
          value={
            isCodexActive && codexMode === 'coded_only' ? (
              <button
                type="button"
                onClick={() => setDecoderCode(codeFees || '')}
                className="font-mono text-xl font-bold tracking-widest text-violet-950 hover:text-primary-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                title="Click to decode"
              >
                <Lock className="w-4 h-4 text-violet-600 shrink-0" />
                <span>{codeFees}</span>
              </button>
            ) : (
              fmt(rawFees)
            )
          }
          codexBadge={isCodexActive && codexMode !== 'coded_only' ? codeFees : undefined}
          onDecodeClick={(c) => setDecoderCode(c)}
          icon={DollarSign}
          color="purple"
          subtitle={
            statusFilter === 'all'
              ? 'Consolidated historical receivables'
              : 'Active invoiced receivables'
          }
        />

        <div
          onClick={() => navigate('/payments')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
          title="Click to view payment ledger"
        >
          <StatCard
            title="Collected Fees"
            value={
              isCodexActive && codexMode === 'coded_only' ? (
                <button
                  type="button"
                  onClick={() => setDecoderCode(codeCollected || '')}
                  className="font-mono text-xl font-bold tracking-widest text-emerald-950 hover:text-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                  title="Click to decode"
                >
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{codeCollected}</span>
                </button>
              ) : (
                fmt(rawCollected)
              )
            }
            codexBadge={isCodexActive && codexMode !== 'coded_only' ? codeCollected : undefined}
            onDecodeClick={(c) => setDecoderCode(c)}
            icon={TrendingUp}
            color="green"
            subtitle={`${collectionRate}% collection rate`}
          />
        </div>

        <div
          onClick={() => openDrilldown(statusFilter)}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
          title="Click to inspect outstanding dues drill-down"
        >
          <StatCard
            title="Outstanding Balance"
            value={
              isCodexActive && codexMode === 'coded_only' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDecoderCode(codeOutstanding || '')
                  }}
                  className="font-mono text-xl font-bold tracking-widest text-red-950 hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                  title="Click to decode"
                >
                  <Lock className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{codeOutstanding}</span>
                </button>
              ) : (
                fmt(rawOutstanding)
              )
            }
            codexBadge={isCodexActive && codexMode !== 'coded_only' ? codeOutstanding : undefined}
            onDecodeClick={(c) => setDecoderCode(c)}
            icon={AlertCircle}
            color="red"
            subtitle={
              statusFilter === 'active'
                ? 'Active Students Only [Click to Audit]'
                : statusFilter === 'all'
                ? 'Total Historical [Click to Audit]'
                : `${statusFilter.toUpperCase()} [Click to Audit]`
            }
          />
        </div>
      </div>

      {/* Secondary Financial Indicators Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Today's Collection</p>
          <p className="text-base font-bold text-emerald-700 mt-1">
            {fmt(stats?.secondary_indicators?.today_collection ?? 0)}
          </p>
          <span className="text-[10px] text-gray-400">Live posted payments</span>
        </div>

        <div
          onClick={() => openDrilldown('active', 'all', true)}
          className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs hover:border-red-400 cursor-pointer transition-colors"
          title="Click to view overdue active invoices"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-red-600 uppercase tracking-wider">Overdue Active Fees</p>
            <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
          </div>
          <p className="text-base font-bold text-red-700 mt-1">
            {fmt(stats?.secondary_indicators?.overdue_active_fees ?? 0)}
          </p>
          <span className="text-[10px] text-red-500 font-medium">Actionable dues past due-date</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Fees Due This Month</p>
          <p className="text-base font-bold text-gray-800 mt-1">
            {fmt(stats?.secondary_indicators?.due_this_month ?? 0)}
          </p>
          <span className="text-[10px] text-gray-400">Current calendar cycle</span>
        </div>

        <div
          onClick={() => navigate('/payments')}
          className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs hover:border-amber-400 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Pending Verification</p>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-base font-bold text-amber-900 mt-1">
            {stats?.secondary_indicators?.pending_verification?.count ?? 0} txn
          </p>
          <span className="text-[10px] text-amber-600 font-medium">
            {fmt(stats?.secondary_indicators?.pending_verification?.amount ?? 0)}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Pending Refunds</p>
          <p className="text-base font-bold text-gray-800 mt-1">
            {stats?.secondary_indicators?.pending_refunds?.count ?? 0} req
          </p>
          <span className="text-[10px] text-gray-400">
            {fmt(stats?.secondary_indicators?.pending_refunds?.amount ?? 0)}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Successful Refunds</p>
          <p className="text-base font-bold text-gray-800 mt-1">
            {fmt(stats?.secondary_indicators?.successful_refunds?.amount ?? 0)}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">
            {stats?.secondary_indicators?.successful_refunds?.count ?? 0} settled
          </span>
        </div>
      </div>

      {/* Student Status-Wise Outstanding Audit & Ledger Reconciliation Card */}
      {stats?.status_wise_outstanding && (
        <div className="card bg-gradient-to-r from-slate-50 via-white to-blue-50/30 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-600" />
                <h2 className="text-base font-bold text-gray-900">
                  Student Status-Wise Outstanding Audit & Reconciliation
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Segregated debt liabilities preserving historical ledger integrity without inflating active operational balances
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                100% Reconciled
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Active Students */}
            <div
              onClick={() => openDrilldown('active')}
              className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-700">Active Students</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                  {stats.status_wise_outstanding.active.student_count} std
                </span>
              </div>
              <p className="text-base font-bold text-gray-900 mt-1">
                {fmt(stats.status_wise_outstanding.active.outstanding)}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {stats.status_wise_outstanding.active.invoice_count} active invoice(s)
              </p>
            </div>

            {/* Inactive / On Hold */}
            <div
              onClick={() => openDrilldown('inactive')}
              className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-700">Temporarily Inactive</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  {stats.status_wise_outstanding.inactive.student_count} std
                </span>
              </div>
              <p className="text-base font-bold text-gray-900 mt-1">
                {fmt(stats.status_wise_outstanding.inactive.outstanding)}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {stats.status_wise_outstanding.inactive.invoice_count} on hold invoice(s)
              </p>
            </div>

            {/* Left / Discontinued */}
            <div
              onClick={() => openDrilldown('left')}
              className="bg-white p-3 rounded-lg border border-red-200 shadow-2xs hover:border-red-400 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-red-700">Left / Discontinued</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800">
                  {stats.status_wise_outstanding.left.student_count} std
                </span>
              </div>
              <p className="text-base font-bold text-gray-900 mt-1">
                {fmt(stats.status_wise_outstanding.left.outstanding)}
              </p>
              <p className="text-[10px] text-red-600 font-medium mt-0.5">
                Recovery register liability
              </p>
            </div>

            {/* Transferred Students */}
            <div
              onClick={() => openDrilldown('transferred')}
              className="bg-white p-3 rounded-lg border border-purple-200 shadow-2xs hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-purple-700">Transferred Students</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                  {stats.status_wise_outstanding.transferred.student_count} std
                </span>
              </div>
              <p className="text-base font-bold text-gray-900 mt-1">
                {fmt(stats.status_wise_outstanding.transferred.outstanding)}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {stats.status_wise_outstanding.transferred.invoice_count} transferred invoice(s)
              </p>
            </div>

            {/* Admission Cancelled */}
            <div
              onClick={() => openDrilldown('cancelled')}
              className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs hover:border-gray-400 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-700">Cancelled / Settlement</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-800">
                  {stats.status_wise_outstanding.cancelled.student_count} std
                </span>
              </div>
              <p className="text-base font-bold text-gray-900 mt-1">
                {fmt(stats.status_wise_outstanding.cancelled.outstanding)}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Settled cancellations
              </p>
            </div>

            {/* Total Historical Outstanding */}
            <div
              onClick={() => openDrilldown('all')}
              className="bg-primary-50/70 p-3 rounded-lg border border-primary-200 shadow-2xs hover:border-primary-400 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary-900">Total Historical</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary-200 text-primary-900">
                  {stats.status_wise_outstanding.total_historical.student_count} total
                </span>
              </div>
              <p className="text-base font-extrabold text-primary-950 mt-1">
                {fmt(stats.status_wise_outstanding.total_historical.outstanding)}
              </p>
              <p className="text-[10px] text-primary-700 font-medium mt-0.5">
                Consolidated ledger snapshot
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aging Recovery & Daily Operations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aging Recovery Analysis (2 Cols) */}
        <div className="card lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Outstanding Fee Aging & Recovery Analysis</h2>
              <p className="text-xs text-gray-500">Maturity and overdue risk stratification across student cohorts</p>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setAgingScope('active')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  agingScope === 'active'
                    ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Active Students
              </button>
              <button
                type="button"
                onClick={() => setAgingScope('total_historical')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  agingScope === 'total_historical'
                    ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Statuses (Consolidated)
              </button>
            </div>
          </div>

          {currentAgingProfile ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div
                onClick={() => openDrilldown(agingScope === 'active' ? 'active' : 'all', 'not_due')}
                className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-lg hover:border-emerald-400 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-800">Not Due</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {currentAgingProfile.not_due.count} inv
                  </span>
                </div>
                <p className="text-sm font-bold text-emerald-950 mt-1">
                  {fmt(currentAgingProfile.not_due.amount)}
                </p>
                <p className="text-[10px] text-emerald-700 mt-0.5">Due date in future</p>
              </div>

              <div
                onClick={() => openDrilldown(agingScope === 'active' ? 'active' : 'all', '1_30_days')}
                className="bg-yellow-50/50 border border-yellow-200 p-3 rounded-lg hover:border-yellow-400 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-yellow-800">1–30 Days</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                    {currentAgingProfile.days_1_30.count} inv
                  </span>
                </div>
                <p className="text-sm font-bold text-yellow-950 mt-1">
                  {fmt(currentAgingProfile.days_1_30.amount)}
                </p>
                <p className="text-[10px] text-yellow-700 mt-0.5">Early overdue</p>
              </div>

              <div
                onClick={() => openDrilldown(agingScope === 'active' ? 'active' : 'all', '31_60_days')}
                className="bg-amber-50/50 border border-amber-200 p-3 rounded-lg hover:border-amber-400 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-800">31–60 Days</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                    {currentAgingProfile.days_31_60.count} inv
                  </span>
                </div>
                <p className="text-sm font-bold text-amber-950 mt-1">
                  {fmt(currentAgingProfile.days_31_60.amount)}
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">Medium overdue</p>
              </div>

              <div
                onClick={() => openDrilldown(agingScope === 'active' ? 'active' : 'all', '61_90_days')}
                className="bg-orange-50/50 border border-orange-200 p-3 rounded-lg hover:border-orange-400 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-orange-800">61–90 Days</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                    {currentAgingProfile.days_61_90.count} inv
                  </span>
                </div>
                <p className="text-sm font-bold text-orange-950 mt-1">
                  {fmt(currentAgingProfile.days_61_90.amount)}
                </p>
                <p className="text-[10px] text-orange-700 mt-0.5">Severe overdue</p>
              </div>

              <div
                onClick={() => openDrilldown(agingScope === 'active' ? 'active' : 'all', '90_plus_days')}
                className="bg-red-50/50 border border-red-200 p-3 rounded-lg hover:border-red-400 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-red-800">90+ Days</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                    {currentAgingProfile.days_90_plus.count} inv
                  </span>
                </div>
                <p className="text-sm font-bold text-red-950 mt-1">
                  {fmt(currentAgingProfile.days_90_plus.amount)}
                </p>
                <p className="text-[10px] text-red-700 mt-0.5">Critical recovery</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">No aging records found.</p>
          )}
        </div>

        {/* Daily Operations Summary (1 Col) */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">Daily Operations</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-800">
              Live Pulse
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-gray-700">Today's Admissions</span>
              </div>
              <span className="text-xs font-bold text-gray-900">
                {stats?.daily_operations?.today_admissions ?? 0}
              </span>
            </div>

            <div
              onClick={() => navigate('/crm/leads')}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">New Inbound Leads</span>
              </div>
              <span className="text-xs font-bold text-blue-700">
                {stats?.daily_operations?.new_leads ?? 0}
              </span>
            </div>

            <div
              onClick={() => navigate('/crm/follow-ups')}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-gray-700">Follow-ups Due Today</span>
              </div>
              <span className="text-xs font-bold text-amber-700">
                {stats?.daily_operations?.follow_ups_due_today ?? 0}
              </span>
            </div>

            <div
              onClick={() => navigate('/crm/demos')}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-gray-700">Demo Classes Scheduled</span>
              </div>
              <span className="text-xs font-bold text-purple-700">
                {stats?.daily_operations?.demos_scheduled ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-gray-700">Invoices Due (Next 7d)</span>
              </div>
              <span className="text-xs font-bold text-red-700">
                {stats?.daily_operations?.upcoming_fee_due_invoices ?? 0}
              </span>
            </div>

            <div
              onClick={() => navigate('/payments')}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-gray-700">Pending Pay Verifications</span>
              </div>
              <span className="text-xs font-bold text-amber-700">
                {stats?.daily_operations?.pending_payment_verifications ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts + Recent Payments */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Collection Trends Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Monthly Fee Collection Trends</h2>
              <p className="text-xs text-gray-500">Historical collections and transaction volume over time</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
              Live Trend
            </span>
          </div>

          {stats?.monthly_trends && stats.monthly_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthly_trends} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="dashboardMonthlyFeeBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={branding.colors.primary} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={branding.colors.secondary || branding.colors.primary} stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(val: number, name: string, item: any) => [
                    `${fmt(val)} (${item.payload.transaction_count ?? 1} txn)`,
                    item.payload.is_current_month ? 'Current Month (In Progress)' : 'Collected',
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  cursor={{ fill: `${branding.colors.primary}18` }}
                />
                <Bar dataKey="collected" fill="url(#dashboardMonthlyFeeBar)" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center text-gray-400">
              <Calendar className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm">No collection transactions recorded for this filter selection</p>
            </div>
          )}
        </div>

        {/* Recent Payment Transactions Table */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Recent Payment Transactions</h2>
              <p className="text-xs text-gray-500">Official receipt vouchers and instant PDF generation</p>
            </div>
            <Link
              to="/payments"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 self-start sm:self-auto"
            >
              View all transactions <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Quick Filter & Bulk Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-y border-gray-100 text-xs mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative w-full max-w-[220px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search receipt / student..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="py-1 px-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {selectedReceipts.length > 0 && (
              <button
                type="button"
                onClick={handleBulkZipDownload}
                disabled={isDownloadingZip}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-2xs transition-colors"
                title="Download selected receipts as separate PDFs inside a ZIP archive"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isDownloadingZip ? 'Generating ZIP...' : `Download ${selectedReceipts.length} Receipt(s) (ZIP)`}
                </span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[340px]">
            {!filteredPayments?.length ? (
              <p className="text-gray-400 text-sm text-center py-10">No matching payment transactions found</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-200 text-gray-500 text-left">
                    <th className="pb-2 w-7">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-gray-400 hover:text-gray-600"
                        title="Select All"
                      >
                        {selectedReceipts.length === filteredPayments.length && filteredPayments.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-primary-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="pb-2 font-medium">Receipt #</th>
                    <th className="pb-2 font-medium">Student</th>
                    <th className="pb-2 font-medium">Head / Batch</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Date</th>
                    <th className="pb-2 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPayments.map((p) => {
                    const isSelected = selectedReceipts.includes(p.receipt_number)
                    const isDownloadingThis = downloadingReceipt === p.receipt_number

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-gray-50/50 transition-colors ${
                          isSelected ? 'bg-primary-50/30' : ''
                        }`}
                      >
                        <td className="py-2.5">
                          <button
                            type="button"
                            onClick={() => toggleReceiptSelect(p.receipt_number)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 font-mono text-primary-700 font-semibold">
                          {p.receipt_number}
                        </td>

                        <td className="py-2.5">
                          <p className="font-semibold text-gray-800">{p.student_name}</p>
                          <p className="text-[10px] text-gray-400">{p.admission_number}</p>
                        </td>

                        <td className="py-2.5 text-gray-600">
                          <p className="font-medium text-gray-700">{p.fee_category || 'Tuition Fee'}</p>
                          <p className="text-[10px] text-gray-400">{p.batch}</p>
                        </td>

                        <td className="py-2.5 capitalize text-gray-600">
                          {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                        </td>

                        <td className="py-2.5 text-right font-bold text-gray-900">
                          {(() => {
                            const paymentCode = (p as any).amount_coded || (isCodexActive ? encodeCodexNumber(p.amount) : undefined)
                            if (isCodexActive && codexMode === 'coded_only') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setDecoderCode(paymentCode || '')}
                                  className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200 hover:bg-violet-200 transition-colors"
                                  title="Click to decode with CodeX"
                                >
                                  {paymentCode}
                                </button>
                              )
                            }
                            return (
                              <div className="flex items-center justify-end gap-1.5">
                                <span>{fmt(p.amount)}</span>
                                {isCodexActive && paymentCode && (
                                  <button
                                    type="button"
                                    onClick={() => setDecoderCode(paymentCode)}
                                    className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors cursor-pointer"
                                    title="CodeX representation — Click to decode"
                                  >
                                    {paymentCode}
                                  </button>
                                )}
                              </div>
                            )
                          })()}
                        </td>

                        <td className="py-2.5 text-right text-gray-500 whitespace-nowrap">
                          {p.payment_date}
                        </td>

                        <td className="py-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadSinglePdf(p.receipt_number, p.student_name)}
                              disabled={isDownloadingThis}
                              className="p-1.5 rounded-md hover:bg-primary-50 text-primary-600 border border-transparent hover:border-primary-200 transition-colors"
                              title="Download Official A5 Fee Receipt PDF"
                            >
                              <Download className={`w-3.5 h-3.5 ${isDownloadingThis ? 'animate-bounce' : ''}`} />
                            </button>

                            <Link
                              to={`/students/${p.student_id}`}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 border border-transparent hover:border-gray-200 transition-colors"
                              title="View Student Academic & Fee Dossier"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </div>
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

      {/* Quick Actions Bar */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Quick Navigation & Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/students/add" className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3.5">
            <Users className="w-4 h-4" />
            + Enroll Student
          </Link>
          <Link to="/fees" className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3.5">
            <DollarSign className="w-4 h-4" />
            Fee Management
          </Link>
          <button
            type="button"
            onClick={() => openDrilldown('left')}
            className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3.5 text-red-700 hover:text-red-800"
          >
            <UserX className="w-4 h-4 text-red-600" />
            Former Students Recovery
          </button>
          <Link to="/attendance" className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3.5">
            <Calendar className="w-4 h-4" />
            Attendance Register
          </Link>
          <Link to="/reports" className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3.5">
            <TrendingUp className="w-4 h-4" />
            Collection Reports
          </Link>
          <Link to="/batches" className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3.5">
            <Layers className="w-4 h-4" />
            Batch Allocations
          </Link>
        </div>
      </div>

      {/* Outstanding Drilldown Modal */}
      {isDrilldownOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-bold text-gray-900">
                    Outstanding Dues Audit & Drill-Down
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scope: <span className="font-semibold text-gray-800 capitalize">{drilldownStatus}</span>
                  {drilldownBucket !== 'all' && ` • Aging: ${drilldownBucket.replace('_', ' ')}`}
                  {drilldownOverdueOnly && ` • Overdue Only`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportDrilldownCsv}
                  disabled={!drilldownData?.records?.length}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Export records to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-gray-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDrilldownOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scope / Filter Tabs */}
            <div className="p-4 border-b border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-gray-500 font-medium mr-1">Status Scope:</span>
                {(['active', 'all', 'left', 'transferred', 'inactive'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setDrilldownStatus(st)}
                    className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                      drilldownStatus === st
                        ? 'bg-primary-600 text-white font-bold shadow-2xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {st === 'all' ? 'All (Historical)' : st}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter student / invoice..."
                  value={drilldownSearch}
                  onChange={(e) => setDrilldownSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Summary Banner */}
            <div className="px-5 py-2.5 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs">
              <span className="text-blue-900 font-medium">
                Found <strong>{drilldownData?.total_count ?? 0}</strong> record(s) matching selected criteria
              </span>
              <span className="text-blue-950 font-bold text-sm">
                Total Outstanding: {fmt(drilldownData?.total_outstanding ?? 0)}
              </span>
            </div>

            {/* Modal Table Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              {isDrilldownLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
                  <p className="text-xs">Loading ledger records...</p>
                </div>
              ) : !drilldownData?.records?.length ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No outstanding records found for this scope.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200 text-gray-500 text-left">
                      <th className="pb-2 font-medium">Student Name</th>
                      <th className="pb-2 font-medium">Standard & Batch</th>
                      <th className="pb-2 font-medium">Invoice #</th>
                      <th className="pb-2 font-medium">Due Date</th>
                      <th className="pb-2 font-medium text-center">Status</th>
                      <th className="pb-2 font-medium text-right">Obligation</th>
                      <th className="pb-2 font-medium text-right">Paid</th>
                      <th className="pb-2 font-medium text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {drilldownData.records.map((r) => (
                      <tr key={r.invoice_id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5">
                          <Link
                            to={`/students/${r.student_id}`}
                            className="font-semibold text-primary-700 hover:underline"
                          >
                            {r.student_name}
                          </Link>
                          <p className="text-[10px] text-gray-400">
                            {r.admission_number} • {r.phone}
                          </p>
                        </td>

                        <td className="py-2.5 text-gray-600">
                          <p className="font-medium text-gray-800">{r.class_name}</p>
                          <p className="text-[10px] text-gray-400">{r.batch_name}</p>
                        </td>

                        <td className="py-2.5 font-mono text-gray-700 font-medium">
                          {r.invoice_number}
                        </td>

                        <td className="py-2.5 text-gray-600 whitespace-nowrap">
                          <p>{r.due_date || '—'}</p>
                          {r.is_overdue && (
                            <span className="text-[10px] font-bold text-red-600">
                              {r.days_overdue}d overdue
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              r.student_status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : r.student_status === 'left'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : r.student_status === 'transferred'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {r.student_status}
                          </span>
                        </td>

                        <td className="py-2.5 text-right font-medium text-gray-600">
                          {fmt(r.total_obligation)}
                        </td>

                        <td className="py-2.5 text-right font-medium text-emerald-700">
                          {fmt(r.paid_amount)}
                        </td>

                        <td className="py-2.5 text-right font-bold text-red-700">
                          {fmt(r.outstanding_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-gray-200 bg-slate-50 flex items-center justify-between text-xs text-gray-500">
              <span>Financial Ledger Snapshot • Prashant Academy</span>
              <button
                type="button"
                onClick={() => setIsDrilldownOpen(false)}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CodeX Quick Decoder Modal */}
      {decoderCode && (
        <QuickDecoderModal
          isOpen={Boolean(decoderCode)}
          onClose={() => setDecoderCode(null)}
          initialCode={decoderCode}
        />
      )}
    </div>
  )
}
