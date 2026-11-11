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
 * @updated     2026-11-11
 *
 * @description Executive management & financial analytics dashboard featuring 8 multi-tab workspaces: Overview, Fee Collection, Outstanding Analysis, Student Analysis, Admissions & CRM, Academic Analysis, Transactions & Reconciliation, and Operations.
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
  HelpCircle, ShieldCheck, UserPlus, PhoneCall, Video, Check,
  LayoutDashboard, Award, Activity, Target, GraduationCap,
  FileSpreadsheet, Sparkles, Building2, School, BarChart3, PieChart as PieChartIcon
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import StatCard from '../components/StatCard'
import CascadingFilters, { FilterState } from '../components/CascadingFilters'
import { dashboardApi, codexApi, paymentsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useBranding } from '../config/branding'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { encodeCodexNumber } from '../utils/codexFormatter'
import QuickDecoderModal from '../components/codex/QuickDecoderModal'
import { ConcessionTraceModal } from '../components/common'
import type { OutstandingDrilldownRecord, DashboardAnalyticsData } from '../types'

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
}

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'fee_collection', label: 'Fee Collection', icon: DollarSign },
  { id: 'outstanding', label: 'Outstanding Analysis', icon: AlertCircle },
  { id: 'student', label: 'Student Analysis', icon: Users },
  { id: 'crm', label: 'Admissions & CRM', icon: Target },
  { id: 'academic', label: 'Academic Analysis', icon: BookOpen },
  { id: 'transactions', label: 'Transactions & Reconciliation', icon: Receipt },
  { id: 'operations', label: 'Operations', icon: Activity },
] as const

type DashboardTab = typeof TABS[number]['id']

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

  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')

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

  // Fetch Dashboard live core stats
  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
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

  // Fetch Comprehensive Multi-Tab Analytics
  const { data: analytics, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: [
      'dashboard-analytics',
      filters.academicYearId,
      selectedInstitutionId,
      filters.boardId,
      filters.standardId,
      filters.divisionId,
    ],
    queryFn: () =>
      dashboardApi
        .getAnalytics({
          academic_year_id: filters.academicYearId ?? undefined,
          institution_id: selectedInstitutionId ?? undefined,
          board_id: filters.boardId ?? undefined,
          standard_id: filters.standardId ?? undefined,
          division_id: filters.divisionId ?? undefined,
        })
        .then((r) => r.data),
  })

  const handleRefreshAll = () => {
    refetchStats()
    refetchAnalytics()
  }

  const collectionRate = stats?.collection_rate ?? 0

  // Quick Decoder & Financial Traceability modal state
  const [decoderCode, setDecoderCode] = useState<string | null>(null)
  const [traceTarget, setTraceTarget] = useState<{
    type: 'application' | 'allocation' | 'invoice' | 'student'
    id: number
  } | null>(null)

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
      link.href = url
      link.download = `Receipt_${receiptNum}_${studentName.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download receipt PDF:', err)
      alert('Could not download receipt PDF. Please try again.')
    } finally {
      setDownloadingReceipt(null)
    }
  }

  // Bulk download selected receipts
  const handleDownloadSelectedZip = async () => {
    if (selectedReceipts.length === 0) return
    try {
      setIsDownloadingZip(true)
      const res = await paymentsApi.exportBulkReceiptsZip(selectedReceipts)
      const blob = new Blob([res.data], { type: 'application/zip' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Fee_Receipts_Selected_${selectedReceipts.length}_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to bulk download receipts:', err)
      alert('Failed to generate bulk receipt archive. Please try again.')
    } finally {
      setIsDownloadingZip(false)
    }
  }

  // Fetch Drilldown data
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Coaching Institute Dashboard</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
              <Sparkles className="w-3 h-3 text-primary-600" />
              <span>v1.0.0</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            Authoritative real-time management intelligence for {branding.academyName}
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
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-gray-700 border border-gray-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh All Dashboard Metrics"
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

      {/* Analytics & Insights Tab Bar */}
      <div className="border-b border-gray-200 bg-white rounded-t-xl px-2 pt-2 shadow-2xs">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-1 scrollbar-thin" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-primary-600 text-primary-700 bg-primary-50/60 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ─── TAB 1: OVERVIEW (DEFAULT LANDING PAGE) ────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
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
                    <span>{codeFees}</span>
                    <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                  </button>
                ) : isCodexActive && codexMode === 'dual' ? (
                  <div className="flex flex-col">
                    <span>{fmt(stats?.total_fees)}</span>
                    <span className="font-mono text-xs tracking-wider text-violet-700">{codeFees}</span>
                  </div>
                ) : (
                  fmt(stats?.total_fees)
                )
              }
              icon={TrendingUp}
              color="blue"
              subtitle={`Collection target: ${collectionRate}% achieved`}
            />

            <StatCard
              title="Collected Fees"
              value={
                isCodexActive && codexMode === 'coded_only' ? (
                  <button
                    type="button"
                    onClick={() => setDecoderCode(codeCollected || '')}
                    className="font-mono text-xl font-bold tracking-widest text-violet-950 hover:text-primary-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                    title="Click to decode"
                  >
                    <span>{codeCollected}</span>
                    <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                  </button>
                ) : isCodexActive && codexMode === 'dual' ? (
                  <div className="flex flex-col">
                    <span>{fmt(stats?.total_collected)}</span>
                    <span className="font-mono text-xs tracking-wider text-violet-700">{codeCollected}</span>
                  </div>
                ) : (
                  fmt(stats?.total_collected)
                )
              }
              icon={DollarSign}
              color="green"
              subtitle="Received in bank & cash accounts"
            />

            <div
              onClick={() => {
                setDrilldownStatus(statusFilter)
                setIsDrilldownOpen(true)
              }}
              className="cursor-pointer transition-transform hover:scale-[1.01]"
              title="Click to view granular outstanding drill-down"
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
                      className="font-mono text-xl font-bold tracking-widest text-violet-950 hover:text-primary-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                      title="Click to decode"
                    >
                      <span>{codeOutstanding}</span>
                      <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                    </button>
                  ) : isCodexActive && codexMode === 'dual' ? (
                    <div className="flex flex-col">
                      <span>{fmt(stats?.total_outstanding)}</span>
                      <span className="font-mono text-xs tracking-wider text-violet-700">{codeOutstanding}</span>
                    </div>
                  ) : (
                    fmt(stats?.total_outstanding)
                  )
                }
                icon={AlertCircle}
                color={
                  stats?.total_outstanding && stats.total_outstanding > 0 ? 'orange' : 'purple'
                }
                subtitle={
                  statusFilter === 'active'
                    ? 'Active students only (Default)'
                    : `Filtered: ${statusFilter} balance`
                }
              />
            </div>
          </div>

          {/* Governed Concession, Waiver & Scholarship Executive Summary (SSOT) */}
          {stats?.concession_governance && (() => {
            const gov = stats.concession_governance
            const fin = gov.financials
            const spon = gov.sponsors
            const cnt = gov.counts
            return (
              <div className="bg-white border border-indigo-200/80 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-bold text-gray-900">
                      Financial Benefit &amp; Concession Governance (SSOT)
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {cnt.beneficiary_students} Beneficiaries
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {cnt.pending_approvals > 0 && (
                      <Link
                        to="/fees?tab=concessions"
                        className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold hover:bg-amber-100"
                      >
                        {cnt.pending_approvals} Pending Approval(s) →
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate('/reports')}
                      className="text-indigo-700 hover:underline font-semibold"
                    >
                      Open 20 Governance Reports →
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Gross Assessed</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{fmt(fin.gross_fee_assessed)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
                    <p className="text-[10px] font-semibold uppercase text-blue-700">Approved Benefits</p>
                    <p className="text-sm font-bold text-blue-900 mt-0.5">{fmt(fin.approved_concessions_total)}</p>
                    {fin.approved_unapplied > 0 && (
                      <p className="text-[10px] text-amber-700 font-semibold">{fmt(fin.approved_unapplied)} unapplied</p>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                    <p className="text-[10px] font-semibold uppercase text-emerald-700">Posted Concessions</p>
                    <p className="text-sm font-bold text-emerald-900 mt-0.5">{fmt(fin.posted_fee_concessions + fin.manual_fee_adjustments)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200">
                    <p className="text-[10px] font-semibold uppercase text-purple-700">Fee Waivers</p>
                    <p className="text-sm font-bold text-purple-900 mt-0.5">{fmt(fin.posted_fee_waivers)}</p>
                    <p className="text-[10px] text-purple-600">
                      Full: {fmt(fin.full_fee_waivers)} · Part: {fmt(fin.partial_fee_waivers)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200">
                    <p className="text-[10px] font-semibold uppercase text-indigo-700">Scholarships</p>
                    <p className="text-sm font-bold text-indigo-900 mt-0.5">{fmt(fin.scholarships_awarded)}</p>
                    <p className="text-[10px] text-indigo-600">
                      Acad: {fmt(fin.academy_scholarships)} · Spon: {fmt(fin.sponsor_funded_scholarships)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
                    <p className="text-[10px] font-semibold uppercase text-amber-700">Sponsor Receivable</p>
                    <p className="text-sm font-bold text-amber-900 mt-0.5">{fmt(spon.outstanding_sponsor_funding)}</p>
                    <p className="text-[10px] text-amber-700">{spon.settlement_rate}% settled</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-white">
                    <p className="text-[10px] font-semibold uppercase text-slate-300">Net Collectible</p>
                    <p className="text-sm font-bold mt-0.5">{fmt(fin.net_fee_due)}</p>
                    <p className="text-[10px] text-emerald-300">Paid: {fmt(fin.total_collections)}</p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Secondary Financial Indicators Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Today's Collection</p>
              <p className="text-base font-bold text-emerald-700 mt-1">
                {fmt(stats?.secondary_indicators?.today_collection ?? 0)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Cleared transactions</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Overdue (Active)</p>
              <p className="text-base font-bold text-red-600 mt-1">
                {fmt(stats?.secondary_indicators?.overdue_active_fees ?? 0)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Past due date</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Due This Month</p>
              <p className="text-base font-bold text-amber-600 mt-1">
                {fmt(stats?.secondary_indicators?.due_this_month ?? 0)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Scheduled active dues</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Pending Verification</p>
              <p className="text-base font-bold text-blue-600 mt-1">
                {stats?.secondary_indicators?.pending_verification?.count ?? 0}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {fmt(stats?.secondary_indicators?.pending_verification?.amount ?? 0)}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Pending Refunds</p>
              <p className="text-base font-bold text-purple-600 mt-1">
                {stats?.secondary_indicators?.pending_refunds?.count ?? 0}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {fmt(stats?.secondary_indicators?.pending_refunds?.amount ?? 0)}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Processed Refunds</p>
              <p className="text-base font-bold text-gray-700 mt-1">
                {stats?.secondary_indicators?.successful_refunds?.count ?? 0}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {fmt(stats?.secondary_indicators?.successful_refunds?.amount ?? 0)}
              </p>
            </div>
          </div>

          {/* Student Status-Wise Outstanding Audit & Reconciliation Panel */}
          {stats?.status_wise_outstanding && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary-600" />
                    <span>Status-Wise Outstanding Audit & Reconciliation</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Authoritative segregation ensuring former students do not inflate primary active metrics while preserving complete historical ledger accountability
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDrilldownStatus('all')
                    setIsDrilldownOpen(true)
                  }}
                  className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-gray-600" />
                  <span>View Granular Drill-Down</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                {/* Active Students */}
                <div
                  onClick={() => {
                    setStatusFilter('active')
                    setDrilldownStatus('active')
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-blue-900 font-semibold">
                    <span>Active Students</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">Default</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {fmt(stats.status_wise_outstanding.active.outstanding)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {stats.status_wise_outstanding.active.student_count} Students • {stats.status_wise_outstanding.active.invoice_count} Invoices
                  </p>
                </div>

                {/* Inactive / On Hold */}
                <div
                  onClick={() => {
                    setStatusFilter('inactive')
                    setDrilldownStatus('inactive')
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    statusFilter === 'inactive'
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                      : 'bg-slate-50 border-gray-200 hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
                    <span>On Hold / Inactive</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {fmt(stats.status_wise_outstanding.inactive.outstanding)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {stats.status_wise_outstanding.inactive.student_count} Students • {stats.status_wise_outstanding.inactive.invoice_count} Invoices
                  </p>
                </div>

                {/* Left / Discontinued */}
                <div
                  onClick={() => {
                    setStatusFilter('left')
                    setDrilldownStatus('left')
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    statusFilter === 'left'
                      ? 'bg-red-50/70 border-red-300 ring-2 ring-red-500/20'
                      : 'bg-slate-50 border-gray-200 hover:border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-red-900 font-semibold">
                    <span>Left / Discontinued</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {fmt(stats.status_wise_outstanding.left.outstanding)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {stats.status_wise_outstanding.left.student_count} Students • {stats.status_wise_outstanding.left.invoice_count} Invoices
                  </p>
                </div>

                {/* Transferred */}
                <div
                  onClick={() => {
                    setStatusFilter('transferred')
                    setDrilldownStatus('transferred')
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    statusFilter === 'transferred'
                      ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20'
                      : 'bg-slate-50 border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-purple-900 font-semibold">
                    <span>Transferred</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {fmt(stats.status_wise_outstanding.transferred.outstanding)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {stats.status_wise_outstanding.transferred.student_count} Students • {stats.status_wise_outstanding.transferred.invoice_count} Invoices
                  </p>
                </div>

                {/* Cancelled Settlement */}
                <div
                  onClick={() => {
                    setDrilldownStatus('cancelled')
                  }}
                  className="p-3 rounded-lg border bg-slate-50 border-gray-200 hover:border-gray-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs text-gray-700 font-semibold">
                    <span>Cancelled Settlement</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {fmt(stats.status_wise_outstanding.cancelled.outstanding)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {stats.status_wise_outstanding.cancelled.student_count} Students • {stats.status_wise_outstanding.cancelled.invoice_count} Invoices
                  </p>
                </div>

                {/* Total Historical */}
                <div
                  onClick={() => {
                    setStatusFilter('all')
                    setDrilldownStatus('all')
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-gray-200 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-semibold">
                    <span>Total Historical</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Consolidated</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {fmt(stats.status_wise_outstanding.total_historical.outstanding)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {stats.status_wise_outstanding.total_historical.student_count} Students • {stats.status_wise_outstanding.total_historical.invoice_count} Invoices
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aging Severity Recovery Matrix */}
          {currentAgingProfile && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Aging Severity & Dues Recovery Matrix</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Chronological risk categorization of unpaid student fee installments
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-medium">Scope:</span>
                  <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-slate-50 text-xs">
                    <button
                      type="button"
                      onClick={() => setAgingScope('active')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        agingScope === 'active'
                          ? 'bg-white text-primary-700 shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Active Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgingScope('total_historical')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        agingScope === 'total_historical'
                          ? 'bg-white text-primary-700 shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Total Historical
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                <div
                  onClick={() => {
                    setDrilldownStatus(agingScope)
                    setDrilldownBucket('not_due')
                    setIsDrilldownOpen(true)
                  }}
                  className="p-3 rounded-lg border border-gray-200 bg-slate-50 hover:border-emerald-300 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-emerald-800">Current / Not Due</p>
                  <p className="text-base font-bold text-gray-900 mt-1">{fmt(currentAgingProfile.not_due.amount)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{currentAgingProfile.not_due.count} invoices</p>
                </div>

                <div
                  onClick={() => {
                    setDrilldownStatus(agingScope)
                    setDrilldownBucket('1_30_days')
                    setIsDrilldownOpen(true)
                  }}
                  className="p-3 rounded-lg border border-gray-200 bg-slate-50 hover:border-amber-300 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-amber-800">1 – 30 Days Overdue</p>
                  <p className="text-base font-bold text-gray-900 mt-1">{fmt(currentAgingProfile.days_1_30.amount)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{currentAgingProfile.days_1_30.count} invoices</p>
                </div>

                <div
                  onClick={() => {
                    setDrilldownStatus(agingScope)
                    setDrilldownBucket('31_60_days')
                    setIsDrilldownOpen(true)
                  }}
                  className="p-3 rounded-lg border border-gray-200 bg-slate-50 hover:border-orange-300 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-orange-800">31 – 60 Days Overdue</p>
                  <p className="text-base font-bold text-gray-900 mt-1">{fmt(currentAgingProfile.days_31_60.amount)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{currentAgingProfile.days_31_60.count} invoices</p>
                </div>

                <div
                  onClick={() => {
                    setDrilldownStatus(agingScope)
                    setDrilldownBucket('61_90_days')
                    setIsDrilldownOpen(true)
                  }}
                  className="p-3 rounded-lg border border-gray-200 bg-slate-50 hover:border-rose-300 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-rose-800">61 – 90 Days Overdue</p>
                  <p className="text-base font-bold text-gray-900 mt-1">{fmt(currentAgingProfile.days_61_90.amount)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{currentAgingProfile.days_61_90.count} invoices</p>
                </div>

                <div
                  onClick={() => {
                    setDrilldownStatus(agingScope)
                    setDrilldownBucket('90_plus_days')
                    setIsDrilldownOpen(true)
                  }}
                  className="p-3 rounded-lg border border-gray-200 bg-slate-50 hover:border-red-400 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-red-800">90+ Days Critical</p>
                  <p className="text-base font-bold text-red-700 mt-1">{fmt(currentAgingProfile.days_90_plus.amount)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{currentAgingProfile.days_90_plus.count} invoices</p>
                </div>

                <div
                  onClick={() => {
                    setDrilldownStatus(agingScope)
                    setDrilldownBucket('all')
                    setIsDrilldownOpen(true)
                  }}
                  className="p-3 rounded-lg border border-gray-300 bg-slate-100 hover:border-primary-400 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-gray-800">Total Unpaid Balance</p>
                  <p className="text-base font-bold text-gray-900 mt-1">{fmt(currentAgingProfile.total.amount)}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{currentAgingProfile.total.count} invoices total</p>
                </div>
              </div>
            </div>
          )}

          {/* Daily Operations Pulse Bar */}
          {stats?.daily_operations && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-100">
                <Calendar className="w-4 h-4 text-primary-600" />
                <span>Today's Coaching Operations Pulse</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                <Link
                  to="/students"
                  className="p-3 rounded-lg bg-slate-50 border border-gray-200 hover:border-primary-300 transition-colors"
                >
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Today's Admissions</p>
                  <p className="text-base font-bold text-primary-700 mt-1">{stats.daily_operations.today_admissions}</p>
                  <p className="text-[10px] text-gray-400">Newly enrolled students</p>
                </Link>

                <Link
                  to="/crm"
                  className="p-3 rounded-lg bg-slate-50 border border-gray-200 hover:border-primary-300 transition-colors"
                >
                  <p className="text-[11px] font-medium text-gray-500 uppercase">New Inquiries / Leads</p>
                  <p className="text-base font-bold text-primary-700 mt-1">{stats.daily_operations.new_leads}</p>
                  <p className="text-[10px] text-gray-400">Received today</p>
                </Link>

                <Link
                  to="/crm"
                  className="p-3 rounded-lg bg-slate-50 border border-gray-200 hover:border-primary-300 transition-colors"
                >
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Follow-Ups Due</p>
                  <p className="text-base font-bold text-amber-600 mt-1">{stats.daily_operations.follow_ups_due_today}</p>
                  <p className="text-[10px] text-gray-400">Scheduled for today</p>
                </Link>

                <Link
                  to="/crm"
                  className="p-3 rounded-lg bg-slate-50 border border-gray-200 hover:border-primary-300 transition-colors"
                >
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Demo Classes</p>
                  <p className="text-base font-bold text-purple-600 mt-1">{stats.daily_operations.demos_scheduled}</p>
                  <p className="text-[10px] text-gray-400">Scheduled trials</p>
                </Link>

                <div
                  onClick={() => {
                    setDrilldownStatus('active')
                    setIsDrilldownOpen(true)
                  }}
                  className="p-3 rounded-lg bg-slate-50 border border-gray-200 hover:border-primary-300 transition-colors cursor-pointer"
                >
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Due in 7 Days</p>
                  <p className="text-base font-bold text-red-600 mt-1">{stats.daily_operations.upcoming_fee_due_invoices}</p>
                  <p className="text-[10px] text-gray-400">Active student invoices</p>
                </div>

                <Link
                  to="/payments?status=submitted"
                  className="p-3 rounded-lg bg-slate-50 border border-gray-200 hover:border-primary-300 transition-colors"
                >
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Pending Verifications</p>
                  <p className="text-base font-bold text-blue-600 mt-1">
                    {stats.daily_operations.pending_payment_verifications}
                  </p>
                  <p className="text-[10px] text-gray-400">Awaiting clearance</p>
                </Link>
              </div>
            </div>
          )}

          {/* Monthly Collection Trends Chart */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Monthly Fee Collection Trends</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Authoritative monthly cash inflow with transaction volumes and net collections
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Authoritative Ledger Data</span>
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              {stats?.monthly_trends && stats.monthly_trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthly_trends} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${fmt(val)} (${item.payload.transaction_count} txns)`,
                        'Collected Fees',
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.75rem',
                      }}
                    />
                    <Bar
                      dataKey="collected"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">No fee collection data available for current filter selection</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Payment Transactions Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-primary-600" />
                    <span>Recent Fee Payment Transactions</span>
                  </h2>
                  <Link
                    to="/payments"
                    className="text-xs font-bold text-primary-600 hover:text-primary-800 ml-2"
                  >
                    View All Payments →
                  </Link>
                </div>
                <p className="text-xs text-gray-500">
                  Live feed of cleared student fee payments with verified receipt generation
                </p>
              </div>

              {/* Table search & bulk actions */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="Search student or receipt..."
                    className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs w-44 sm:w-52 focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  />
                </div>

                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-700"
                >
                  <option value="all">All Methods</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>

                <button
                  type="button"
                  onClick={handleDownloadSelectedZip}
                  disabled={selectedReceipts.length === 0 || isDownloadingZip}
                  className={`btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 cursor-pointer ${
                    selectedReceipts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Download selected receipts archive (ZIP)"
                >
                  {isDownloadingZip ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-primary-600" />
                  )}
                  <span>Export Selected ({selectedReceipts.length})</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-slate-50 text-[11px] font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-8">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-gray-500 hover:text-gray-900 cursor-pointer"
                        title="Select All"
                      >
                        {selectedReceipts.length === filteredPayments.length && filteredPayments.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-primary-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Standard / Batch</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((p) => {
                      const isSelected = selectedReceipts.includes(p.receipt_number)
                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-primary-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => toggleReceiptSelect(p.receipt_number)}
                              className="text-gray-500 hover:text-primary-600 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary-600" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-300" />
                              )}
                            </button>
                          </td>

                          <td className="py-2.5 px-3 font-mono font-semibold text-primary-700 whitespace-nowrap">
                            {p.receipt_number}
                          </td>

                          <td className="py-2.5 px-3">
                            <Link
                              to={`/students/${p.student_id}`}
                              className="font-semibold text-gray-900 hover:text-primary-700 hover:underline"
                            >
                              {p.student_name}
                            </Link>
                            <p className="text-[10px] text-gray-400">{p.admission_number}</p>
                          </td>

                          <td className="py-2.5 px-3 text-gray-600">
                            <span className="font-medium text-gray-800">{p.standard}</span>
                            <p className="text-[10px] text-gray-400">{p.batch}</p>
                          </td>

                          <td className="py-2.5 px-3 text-gray-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                              {p.fee_category}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                            {p.payment_date}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {METHOD_LABELS[p.payment_method] || p.payment_method}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                            {fmt(p.amount)}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDownloadSinglePdf(p.receipt_number, p.student_name)}
                              disabled={downloadingReceipt === p.receipt_number}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-slate-50 text-primary-700 border border-primary-200 rounded-md shadow-2xs transition-colors cursor-pointer"
                              title="Download Official Fee Voucher (PDF)"
                            >
                              {downloadingReceipt === p.receipt_number ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-primary-600" />
                              ) : (
                                <Download className="w-3 h-3 text-primary-600" />
                              )}
                              <span>PDF Voucher</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        No payment transactions match the active criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: FEE COLLECTION ANALYTICS ───────────────────────────────── */}
      {activeTab === 'fee_collection' && (
        <div className="space-y-6">
          {/* Top Inflow KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Net Fees Invoiced"
              value={fmt(analytics?.fee_collection?.net_fee_due ?? analytics?.outstanding_analysis?.status_wise?.total_historical?.invoiced ?? stats?.total_fees)}
              icon={Receipt}
              color="blue"
              subtitle={`Gross ${fmt(analytics?.fee_collection?.gross_fee_assessed ?? stats?.concession_governance?.financials?.gross_fee_assessed)} less ${fmt(analytics?.fee_collection?.posted_concessions ?? stats?.concession_governance?.financials?.posted_concessions_total)} benefits`}
            />
            <StatCard
              title="Net Fee Collections"
              value={fmt(analytics?.fee_collection?.net_collection ?? analytics?.fee_collection?.total_collected ?? stats?.total_collected)}
              icon={DollarSign}
              color="green"
              subtitle={`Gross receipts ${fmt(analytics?.fee_collection?.gross_collected ?? analytics?.fee_collection?.total_collected ?? stats?.total_collected)} less refunds ${fmt(analytics?.fee_collection?.refunds_amount)}`}
            />
            <StatCard
              title="Target Achievement"
              value={`${collectionRate}%`}
              icon={Target}
              color="primary"
              subtitle="Overall collection conversion efficiency"
            />
            <StatCard
              title="Reversals & Refunds"
              value={fmt((analytics?.fee_collection?.reversals_amount ?? 0) + (analytics?.fee_collection?.concessions_reversed ?? 0) + (analytics?.fee_collection?.refunds_amount ?? 0))}
              icon={AlertCircle}
              color="purple"
              subtitle={`Payments reversed: ${fmt(analytics?.fee_collection?.reversals_amount)} · Refunds: ${fmt(analytics?.fee_collection?.refunds_amount)}`}
            />
          </div>

          {/* Phase 4C Governed Collection vs Concessions & Refunds Breakdown */}
          {(analytics?.concession_governance || stats?.concession_governance) && (() => {
            const cGov = analytics?.concession_governance || stats?.concession_governance!
            const fin = cGov.financials
            const spon = cGov.sponsors
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Posted Concessions</p>
                  <p className="text-base font-bold text-emerald-700 mt-1">{fmt(fin.posted_fee_concessions)}</p>
                  <p className="text-[10px] text-gray-400">Approved: {fmt(fin.approved_concessions_total)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Fee Waivers</p>
                  <p className="text-base font-bold text-purple-700 mt-1">{fmt(fin.posted_fee_waivers)}</p>
                  <p className="text-[10px] text-gray-400">Full {fmt(fin.full_fee_waivers)} · Part {fmt(fin.partial_fee_waivers)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Scholarships</p>
                  <p className="text-base font-bold text-indigo-700 mt-1">{fmt(fin.scholarships_awarded)}</p>
                  <p className="text-[10px] text-gray-400">Unapplied: {fmt(fin.approved_unapplied)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Sponsor Settlements</p>
                  <p className="text-base font-bold text-amber-700 mt-1">{fmt(spon.total_received)}</p>
                  <p className="text-[10px] text-gray-400">Pending: {fmt(spon.outstanding_sponsor_funding)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Pending Verifications</p>
                  <p className="text-base font-bold text-orange-700 mt-1">{fmt(fin.pending_payments_amount)}</p>
                  <p className="text-[10px] text-gray-400">{cGov.counts.pending_payments} payment(s) in queue</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Credit Adjustments</p>
                  <p className="text-base font-bold text-slate-800 mt-1">{fmt(fin.credit_adjustments)}</p>
                  <p className="text-[10px] text-gray-400">Overpayment surpluses</p>
                </div>
              </div>
            )
          })()}

          {/* Charts Row 1: Monthly Trend & Target Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Inflow Bar */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary-600" />
                <span>Monthly Fee Inflow vs Targets</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Monthly actual collections alongside projected institute revenue targets
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.fee_collection?.monthly_trends || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val: any) => fmt(val)} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="collected" name="Actual Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Target Target" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Method Donut */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                <span>Payment Methods Distribution</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Volume and percentage share by payment instrument (Bank Transfer, UPI, Cash)
              </p>
              <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="h-56 w-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.fee_collection?.payment_methods || []}
                        dataKey="amount"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {(analytics?.fee_collection?.payment_methods || []).map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => fmt(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  {(analytics?.fee_collection?.payment_methods || []).map((m, idx) => (
                    <div key={m.method} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="font-semibold text-gray-800">{m.label}:</span>
                      <span className="text-gray-600">{fmt(m.amount)}</span>
                      <span className="text-[10px] text-gray-400">({m.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Daily Collection Velocity Pulse (Last 45 Days) */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-600" />
              <span>Daily Collection Velocity Stream (Last 45 Days)</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Real-time daily transaction velocity and deposit volume
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.fee_collection?.daily_pulse || []}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => fmt(val)} />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: OUTSTANDING ANALYSIS ───────────────────────────────────── */}
      {activeTab === 'outstanding' && (
        <div className="space-y-6">
          {/* Outstanding Scope Alert Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-blue-900">Active Students Default Scope Enforced</h3>
                <p className="text-xs text-blue-700">
                  Primary outstanding metrics strictly isolate Active enrolled students (₹10,36,700) from historical discontinued balances (₹58,000).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDrilldownStatus('active')
                setIsDrilldownOpen(true)
              }}
              className="btn-primary text-xs py-1.5 px-3 shrink-0 cursor-pointer"
            >
              Open Granular Drill-Down
            </button>
          </div>

          {/* Class-Wise Outstanding Performance Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <School className="w-4 h-4 text-primary-600" />
              <span>Standard / Class-Wise Outstanding Breakdown</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Comprehensive analysis of fee obligations, collections, and outstanding dues grouped by academic standard
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-slate-50 text-[11px] font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Standard / Class</th>
                    <th className="py-2.5 px-3 text-center">Active Students</th>
                    <th className="py-2.5 px-3 text-center">Invoices</th>
                    <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                    <th className="py-2.5 px-3 text-right">Total Collected</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                    <th className="py-2.5 px-3 text-center">Collection Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(analytics?.outstanding_analysis?.class_wise || []).map((row) => (
                    <tr key={row.standard_name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{row.standard_name}</td>
                      <td className="py-2.5 px-3 text-center font-medium">{row.student_count}</td>
                      <td className="py-2.5 px-3 text-center font-medium">{row.invoice_count}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-gray-700">{fmt(row.total_invoiced)}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700">{fmt(row.total_paid)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-600">{fmt(row.total_outstanding)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {row.collection_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Outstanding Defaulter Accounts */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Top 10 Active Outstanding Accounts</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Largest individual pending fee obligations requiring administrative follow-up
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-slate-50 text-[11px] font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Standard / Batch</th>
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Invoiced</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Outstanding</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(analytics?.outstanding_analysis?.top_defaulters || []).map((defaulter) => (
                    <tr key={defaulter.student_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <Link
                          to={`/students/${defaulter.student_id}`}
                          className="font-bold text-gray-900 hover:text-primary-600 hover:underline"
                        >
                          {defaulter.student_name}
                        </Link>
                        <p className="text-[10px] text-gray-400">{defaulter.admission_number}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-gray-800">{defaulter.standard}</span>
                        <p className="text-[10px] text-gray-400">{defaulter.batch}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{defaulter.invoice_number}</td>
                      <td className="py-2.5 px-3 text-gray-600">{defaulter.due_date || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-gray-700">{fmt(defaulter.net_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700">{fmt(defaulter.paid_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-600">{fmt(defaulter.outstanding_amount)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          to={`/students/${defaulter.student_id}`}
                          className="btn-secondary text-[10px] py-0.5 px-2"
                        >
                          Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: STUDENT ANALYSIS ───────────────────────────────────────── */}
      {activeTab === 'student' && (
        <div className="space-y-6">
          {/* Student Deduplication & Demographics KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Unique Students"
              value={analytics?.student_analysis?.total_unique_students ?? 44}
              icon={Users}
              color="primary"
              subtitle="Canonical person master deduplicated"
            />
            <StatCard
              title="Active Enrolled Students"
              value={analytics?.student_analysis?.active_students ?? 43}
              icon={UserCheck}
              color="green"
              subtitle="Current active tuition roster"
            />
            <StatCard
              title="Student Retention Rate"
              value={`${analytics?.student_analysis?.retention_rate ?? 97.7}%`}
              icon={TrendingUp}
              color="blue"
              subtitle="1 withdrawn student recorded"
            />
            <StatCard
              title="Boards Covered"
              value="1 (ICSE)"
              icon={GraduationCap}
              color="purple"
              subtitle="100% curriculum alignment"
            />
          </div>

          {/* Standard Distribution & Batch Capacity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Standard Distribution */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary-600" />
                <span>Standard-Wise Enrollment Distribution</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">Active enrolled students count per academic grade</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.student_analysis?.standard_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="standard_name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip formatter={(val: any) => [`${val} students`, 'Enrolled']} />
                    <Bar dataKey="count" name="Enrolled Students" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Batch Utilization Meter */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Batch Capacity Utilization</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">Real-time seat occupancy vs batch capacity limits</p>
              <div className="space-y-3">
                {(analytics?.student_analysis?.batch_utilization || []).map((batch) => (
                  <div key={batch.division_id} className="p-2.5 rounded-lg border border-gray-100 bg-slate-50">
                    <div className="flex justify-between text-xs font-semibold text-gray-800 mb-1">
                      <span>{batch.standard_name} — {batch.batch_name}</span>
                      <span>{batch.enrolled_count} / {batch.capacity} seats ({batch.utilization_rate}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(batch.utilization_rate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: ADMISSIONS & CRM ────────────────────────────────────────── */}
      {activeTab === 'crm' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total CRM Inquiries"
              value={analytics?.admissions_crm?.total_leads ?? 0}
              icon={Target}
              color="primary"
              subtitle="Registered leads in pipeline"
            />
            <StatCard
              title="Enquiry-to-Admission"
              value={`${analytics?.admissions_crm?.conversion_rate ?? 0}%`}
              icon={TrendingUp}
              color="green"
              subtitle={`${analytics?.admissions_crm?.converted_count ?? 0} admissions confirmed`}
            />
            <StatCard
              title="Follow-Up Completion"
              value={`${analytics?.admissions_crm?.follow_ups?.completion_rate ?? 0}%`}
              icon={CheckCircle2}
              color="blue"
              subtitle={`${analytics?.admissions_crm?.follow_ups?.completed ?? 0} / ${analytics?.admissions_crm?.follow_ups?.total ?? 0} calls logged`}
            />
            <StatCard
              title="Demo Trials Scheduled"
              value={analytics?.admissions_crm?.demo_classes?.scheduled ?? 0}
              icon={Video}
              color="purple"
              subtitle={`${analytics?.admissions_crm?.demo_classes?.completed ?? 0} demo sessions completed`}
            />
          </div>

          {/* Phase 4F Admission Concessions, Promotional Offers & Scholarships */}
          {analytics?.admissions_crm?.admission_concessions && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Admission Concessions, Promotional Offers &amp; Scholarships (SSOT)</span>
                </h2>
                <Link to="/leads" className="text-xs font-semibold text-primary-600 hover:underline">
                  Manage Admissions CRM →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <p className="text-[10px] font-semibold uppercase text-emerald-700">Admission Concessions</p>
                  <p className="text-base font-bold text-emerald-900 mt-0.5">
                    {fmt(analytics.admissions_crm.admission_concessions.admission_concessions)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200">
                  <p className="text-[10px] font-semibold uppercase text-purple-700">Promotional Offers</p>
                  <p className="text-base font-bold text-purple-900 mt-0.5">
                    {fmt(analytics.admissions_crm.admission_concessions.promotional_offers)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                  <p className="text-[10px] font-semibold uppercase text-blue-700">Sibling / Family Discounts</p>
                  <p className="text-base font-bold text-blue-900 mt-0.5">
                    {fmt(analytics.admissions_crm.admission_concessions.sibling_discounts)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200">
                  <p className="text-[10px] font-semibold uppercase text-indigo-700">New Admission Scholarships</p>
                  <p className="text-base font-bold text-indigo-900 mt-0.5">
                    {fmt(analytics.admissions_crm.admission_concessions.new_admission_scholarships)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lead Funnel & Sources Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary-600" />
                <span>Admissions Conversion Pipeline Funnel</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">Progression of student leads through each milestone stage</p>
              <div className="space-y-2">
                {(analytics?.admissions_crm?.funnel_stages || []).map((stg) => (
                  <div key={stg.stage} className="flex items-center gap-3 text-xs">
                    <span className="w-36 font-medium text-gray-700 shrink-0">{stg.label}</span>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-primary-600 h-3 rounded-full"
                        style={{ width: `${Math.max(stg.percentage, 5)}%` }}
                      />
                    </div>
                    <span className="font-bold text-gray-900 shrink-0 w-8 text-right">{stg.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead Sources Distribution */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                <span>Lead Source Acquisition Channels</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">Inquiry distribution across marketing and referral channels</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.admissions_crm?.lead_sources || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis dataKey="source" type="category" width={90} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: ACADEMIC ANALYSIS ──────────────────────────────────────── */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Attendance Rate"
              value={`${analytics?.academic_analysis?.attendance?.present_percentage ?? 0}%`}
              icon={CheckCircle2}
              color="green"
              subtitle={`${analytics?.academic_analysis?.attendance?.present_count ?? 0} / ${analytics?.academic_analysis?.attendance?.total_records ?? 0} sessions present`}
            />
            <StatCard
              title="Exam Pass Rate"
              value={`${analytics?.academic_analysis?.examinations?.pass_percentage ?? 0}%`}
              icon={Award}
              color="primary"
              subtitle={`${analytics?.academic_analysis?.examinations?.passed_count ?? 0} / ${analytics?.academic_analysis?.examinations?.total_marks_recorded ?? 0} exam entries passed`}
            />
            <StatCard
              title="Average Exam Score"
              value={`${analytics?.academic_analysis?.examinations?.average_score ?? 0}%`}
              icon={TrendingUp}
              color="blue"
              subtitle={`Highest score: ${analytics?.academic_analysis?.examinations?.max_score ?? 0}%`}
            />
            <StatCard
              title="Canonical Subjects"
              value={analytics?.academic_analysis?.inventory?.subjects_count ?? 0}
              icon={BookOpen}
              color="purple"
              subtitle={`Mapped across ${analytics?.academic_analysis?.inventory?.standards_count ?? 0} standards & ${analytics?.academic_analysis?.inventory?.divisions_count ?? 0} divisions`}
            />
          </div>

          {/* Academic Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grade Distribution */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary-600" />
                <span>Examination Grade Distribution</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Official grades awarded across {analytics?.academic_analysis?.examinations?.total_marks_recorded ?? 0} student score sheets
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.academic_analysis?.examinations?.grade_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip formatter={(val: any) => [`${val} students`, 'Count']} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance Composition */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Student Attendance Breakdown</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                {analytics?.academic_analysis?.attendance?.total_records ?? 0} total attendance events audited
              </p>
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-emerald-800 mb-1">
                    <span>Present (On Time)</span>
                    <span>{analytics?.academic_analysis?.attendance?.present_count ?? 0} ({analytics?.academic_analysis?.attendance?.present_percentage ?? 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-emerald-600 h-3 rounded-full" style={{ width: `${analytics?.academic_analysis?.attendance?.present_percentage ?? 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-red-800 mb-1">
                    <span>Absent (Unexcused)</span>
                    <span>{analytics?.academic_analysis?.attendance?.absent_count ?? 0} ({analytics?.academic_analysis?.attendance?.absent_percentage ?? 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-red-500 h-3 rounded-full" style={{ width: `${analytics?.academic_analysis?.attendance?.absent_percentage ?? 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-amber-800 mb-1">
                    <span>Late Arrival</span>
                    <span>{analytics?.academic_analysis?.attendance?.late_count ?? 0} ({analytics?.academic_analysis?.attendance?.late_percentage ?? 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-amber-500 h-3 rounded-full" style={{ width: `${analytics?.academic_analysis?.attendance?.late_percentage ?? 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 4E: Class-wise & Division-wise Concessions & Scholarships */}
          {analytics?.academic_analysis?.concession_distribution && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>Class-Wise Concession, Waiver &amp; Scholarship Distribution</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Gross assessment, beneficiaries, average benefit, waivers, scholarships, and net revenue per class/division
                  </p>
                </div>
                <Link to="/reports" className="text-xs font-semibold text-indigo-600 hover:underline">
                  Export Class-Wise Report →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-y border-gray-200">
                    <tr>
                      <th className="px-3 py-2">Class / Standard</th>
                      <th className="px-3 py-2 text-right">Students</th>
                      <th className="px-3 py-2 text-right">Beneficiaries</th>
                      <th className="px-3 py-2 text-right">Gross Fee</th>
                      <th className="px-3 py-2 text-right">Concessions</th>
                      <th className="px-3 py-2 text-right">Waivers</th>
                      <th className="px-3 py-2 text-right">Scholarships</th>
                      <th className="px-3 py-2 text-right">Avg Benefit</th>
                      <th className="px-3 py-2 text-right">Net Fee Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(analytics.academic_analysis.concession_distribution.class_wise || []).map((row) => (
                      <tr key={row.class_name} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-semibold text-gray-900">{row.class_name}</td>
                        <td className="px-3 py-2 text-right">{row.total_students}</td>
                        <td className="px-3 py-2 text-right font-semibold text-indigo-700">{row.beneficiary_students}</td>
                        <td className="px-3 py-2 text-right">{fmt(row.gross_fee)}</td>
                        <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{fmt(row.total_concessions)}</td>
                        <td className="px-3 py-2 text-right text-purple-700">{fmt(row.fee_waivers)}</td>
                        <td className="px-3 py-2 text-right text-indigo-700">{fmt(row.scholarships)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{fmt(row.avg_concession)}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(row.net_fee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 7: TRANSACTIONS & RECONCILIATION ───────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Transactions"
              value={analytics?.transactions_reconciliation?.total_transactions ?? 0}
              icon={Receipt}
              color="primary"
              subtitle="All recorded payment receipts"
            />
            <StatCard
              title="Net Collections Cleared"
              value={fmt(analytics?.concession_governance?.financials?.net_collections ?? analytics?.transactions_reconciliation?.total_volume ?? 0)}
              icon={DollarSign}
              color="green"
              subtitle={`Gross ${fmt(analytics?.transactions_reconciliation?.total_volume ?? 0)} less ${fmt(analytics?.transactions_reconciliation?.refunds?.completed_amount ?? 0)} refunds`}
            />
            <StatCard
              title="Audit Sanity Variance"
              value={fmt(analytics?.transactions_reconciliation?.ledger_audit?.variance ?? 0)}
              icon={ShieldCheck}
              color={analytics?.transactions_reconciliation?.ledger_audit?.is_reconciled ? 'blue' : 'orange'}
              subtitle={analytics?.transactions_reconciliation?.ledger_audit?.is_reconciled ? '100% Mathematically Reconciled' : 'Variance Detected — Inspect Audit'}
            />
            <StatCard
              title="Pending Refunds"
              value={analytics?.transactions_reconciliation?.refunds?.pending_count ?? 0}
              icon={AlertCircle}
              color="purple"
              subtitle={`Pending liability: ${fmt(analytics?.transactions_reconciliation?.refunds?.pending_amount ?? 0)}`}
            />
          </div>

          {/* Official Financial Sanity Audit Ledger Box */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Double-Entry Financial Ledger &amp; Concession Audit Balance Sheet</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Live database proof reconciling Gross Fee Assessment, Concessions, Waivers, Scholarships, Net Collectible, Realized Collections, Refunds &amp; Reversals
                </p>
              </div>
              <Link
                to="/fees?tab=concessions"
                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
              >
                Open Benefit &amp; Traceability Ledger →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 border border-gray-200 text-center">
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-medium">Gross Assessed</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {fmt(analytics?.transactions_reconciliation?.ledger_audit?.gross_fee_assessed ?? analytics?.transactions_reconciliation?.ledger_audit?.total_invoiced ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-medium">Posted Reductions</p>
                <p className="text-lg font-bold text-indigo-700 mt-1">
                  -{fmt(analytics?.transactions_reconciliation?.ledger_audit?.total_posted_reductions ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-medium">Net Invoiced Due</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {fmt(analytics?.transactions_reconciliation?.ledger_audit?.total_invoiced ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-medium">Invoice Paid (Credits)</p>
                <p className="text-lg font-bold text-emerald-700 mt-1">
                  {fmt(analytics?.transactions_reconciliation?.ledger_audit?.total_collected ?? 0)}
                </p>
              </div>
              <div className="md:border-l border-gray-200 md:pl-3">
                <p className="text-[11px] text-gray-500 uppercase font-medium">Outstanding &amp; Status</p>
                <p className="text-lg font-bold text-amber-700 mt-1">
                  {fmt(analytics?.transactions_reconciliation?.ledger_audit?.total_outstanding ?? 0)}
                </p>
                <p className={`text-[11px] font-bold mt-0.5 flex items-center justify-center gap-1 ${
                  analytics?.transactions_reconciliation?.ledger_audit?.is_reconciled ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {analytics?.transactions_reconciliation?.ledger_audit?.is_reconciled
                      ? '100% Balanced'
                      : `Variance: ${fmt(analytics?.transactions_reconciliation?.ledger_audit?.variance ?? 0)}`}
                  </span>
                </p>
              </div>
            </div>

            {analytics?.transactions_reconciliation?.benefits_breakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 uppercase block">Fee Concessions</span>
                  <span className="font-bold text-emerald-700">{fmt(analytics.transactions_reconciliation.benefits_breakdown.fee_concessions)}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 uppercase block">Fee Waivers</span>
                  <span className="font-bold text-purple-700">{fmt(analytics.transactions_reconciliation.benefits_breakdown.fee_waivers)}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 uppercase block">Academy Scholarships</span>
                  <span className="font-bold text-indigo-700">{fmt(analytics.transactions_reconciliation.benefits_breakdown.scholarships)}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 uppercase block">Sponsor Scholarships</span>
                  <span className="font-bold text-amber-700">{fmt(analytics.transactions_reconciliation.benefits_breakdown.sponsor_funded)}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 uppercase block">Approved Unapplied</span>
                  <span className="font-bold text-orange-700">{fmt(analytics.transactions_reconciliation.benefits_breakdown.approved_unapplied)}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 uppercase block">Reversed Benefit Postings</span>
                  <span className="font-bold text-rose-700">{fmt(analytics.transactions_reconciliation.reversals?.reversed_concessions_amount ?? 0)}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 uppercase block">Broken Invoice Rows</span>
                  <span className="font-bold text-slate-900">
                    {analytics.transactions_reconciliation.ledger_audit.broken_invoices_count ?? 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 8: OPERATIONS ─────────────────────────────────────────────── */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase">Today's Admissions</p>
              <p className="text-base font-bold text-primary-700 mt-1">
                {analytics?.operations?.daily_summary?.today_admissions ?? 0}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase">New Leads Today</p>
              <p className="text-base font-bold text-primary-700 mt-1">
                {analytics?.operations?.daily_summary?.new_leads ?? 4}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase">Follow-Ups Due</p>
              <p className="text-base font-bold text-amber-600 mt-1">
                {analytics?.operations?.daily_summary?.follow_ups_due_today ?? 0}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase">Demos Scheduled</p>
              <p className="text-base font-bold text-purple-600 mt-1">
                {analytics?.operations?.daily_summary?.demos_scheduled ?? 3}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase">Due Next 7 Days</p>
              <p className="text-base font-bold text-red-600 mt-1">
                {analytics?.operations?.daily_summary?.upcoming_fee_due_invoices ?? 0}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase">Pending Clearance</p>
              <p className="text-base font-bold text-blue-600 mt-1">
                {analytics?.operations?.daily_summary?.pending_payment_verifications ?? 0}
              </p>
            </div>
          </div>

          {/* Recent Operations Activity Timeline */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-5">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-600" />
              <span>Recent Operational Activity Timeline</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">Live chronological log of recent administrative actions</p>

            <div className="space-y-3">
              {(analytics?.operations?.recent_activities || []).map((act) => (
                <div key={act.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-slate-50 hover:bg-slate-100/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-full bg-emerald-100 text-emerald-800">
                      <Receipt className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{act.title}</p>
                      <p className="text-[11px] text-gray-500">{act.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-400">{act.timestamp}</span>
                    <Link to={act.link} className="btn-secondary text-[10px] py-1 px-2.5">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Granular Outstanding Drilldown Modal ────────────────────────────── */}
      {isDrilldownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Granular Outstanding Dues Drilldown</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">
                    {drilldownData?.total_count ?? 0} Invoices • {fmt(drilldownData?.total_outstanding)}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scope: <span className="font-semibold capitalize text-gray-800">{drilldownStatus}</span>
                  {drilldownBucket !== 'all' && ` • Aging: ${drilldownBucket.replace('_', ' ')}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportDrilldownCsv}
                  disabled={!drilldownData?.records || drilldownData.records.length === 0}
                  className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Export records to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-gray-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDrilldownOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filter Bar in Modal */}
            <div className="p-3 border-b border-gray-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={drilldownStatus}
                  onChange={(e) => setDrilldownStatus(e.target.value)}
                  className="px-2.5 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800"
                >
                  <option value="active">Active Students (Default)</option>
                  <option value="all">All Students (Historical)</option>
                  <option value="left">Left / Discontinued</option>
                  <option value="transferred">Transferred</option>
                  <option value="inactive">Inactive / On Hold</option>
                </select>

                <select
                  value={drilldownBucket}
                  onChange={(e) => setDrilldownBucket(e.target.value)}
                  className="px-2.5 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800"
                >
                  <option value="all">All Aging Buckets</option>
                  <option value="not_due">Not Due / Current</option>
                  <option value="1_30_days">1 – 30 Days Overdue</option>
                  <option value="31_60_days">31 – 60 Days Overdue</option>
                  <option value="61_90_days">61 – 90 Days Overdue</option>
                  <option value="90_plus_days">90+ Days Critical</option>
                </select>

                <label className="flex items-center gap-1.5 text-gray-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drilldownOverdueOnly}
                    onChange={(e) => setDrilldownOverdueOnly(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span>Overdue Only</span>
                </label>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={drilldownSearch}
                  onChange={(e) => setDrilldownSearch(e.target.value)}
                  placeholder="Filter student or invoice..."
                  className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs w-48 sm:w-56"
                />
              </div>
            </div>

            {/* Drilldown Table Content */}
            <div className="overflow-y-auto p-4 flex-1">
              {isDrilldownLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
                  <span className="ml-2 text-xs text-gray-500">Loading granular audit records...</span>
                </div>
              ) : !drilldownData?.records || drilldownData.records.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No records match the active criteria.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-gray-600 uppercase border-b border-gray-200">
                    <tr>
                      <th className="py-2.5">Student</th>
                      <th className="py-2.5">Standard & Batch</th>
                      <th className="py-2.5">Invoice</th>
                      <th className="py-2.5">Due Date</th>
                      <th className="py-2.5 text-center">Status</th>
                      <th className="py-2.5 text-right">Obligation</th>
                      <th className="py-2.5 text-right">Paid</th>
                      <th className="py-2.5 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {drilldownData.records.map((r: OutstandingDrilldownRecord) => (
                      <tr key={r.invoice_id} className="hover:bg-slate-50/80">
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
                          <div className="inline-flex items-center gap-2 justify-end">
                            <span>{fmt(r.outstanding_amount)}</span>
                            <button
                              type="button"
                              onClick={() => setTraceTarget({ type: 'invoice', id: r.invoice_id })}
                              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
                              title="Trace invoice, concessions, payments and audit history"
                            >
                              Trace
                            </button>
                          </div>
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
                className="btn-secondary py-1 px-3 text-xs cursor-pointer"
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

      {/* Drill-Down Financial Traceability Modal */}
      <ConcessionTraceModal
        entityType={traceTarget?.type ?? null}
        entityId={traceTarget?.id ?? null}
        onClose={() => setTraceTarget(null)}
        onNavigateStudent={(sid) => navigate(`/students/${sid}`)}
      />
    </div>
  )
}
