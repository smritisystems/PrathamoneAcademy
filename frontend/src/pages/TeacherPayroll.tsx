/**
 * @file        TeacherPayroll.tsx
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
 * @created     2026-11-06
 * @updated     2026-11-12
 *
 * @description Complete Teacher Payroll & Payment Management workspace:
 */

import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, Calendar, Clock, CheckCircle2, XCircle, AlertCircle,
  Search, Filter, Printer, Download, Plus, ChevronRight, Eye, Edit3,
  Shield, Layers, BookOpen, AlertTriangle, RefreshCw, FileText,
  UserCheck, UserX, ArrowUpRight, Lock, Unlock, CreditCard, ChevronDown,
  FileCheck
} from 'lucide-react'
import { teacherPayrollApi, divisionsApi, subjectsApi } from '../api/endpoints'
import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton, LockedIconButton, SortableHeader, TableSortSelect, TableSortOption, ContextualHelpButton } from '../components/common'
import { useTableSort } from '../hooks/useTableSort'
import { PrintFooter, useUniversalPrint } from '../components/printing'
import { PrintDocumentHeader } from '../components/PrintDocumentBranding'
import toast from 'react-hot-toast'

export default function TeacherPayroll() {
  const { openPrint, PrintModal } = useUniversalPrint()
  const { user } = useAuthStore()
  const editScope = 'workforce:payroll'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const queryClient = useQueryClient()
  const isAdmin = isUserAdmin(user)
  const isSysAdmin = isUserSysAdmin(user)
  const isTeacher = user?.role === 'teacher'

  // Workspace Tabs: 'monthly' | 'sessions' | 'profiles' | 'vouchers' | 'reports'
  const [activeTab, setActiveTab] = useState<'monthly' | 'sessions' | 'profiles' | 'vouchers' | 'reports'>('monthly')

  // Date & Period state
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [showLogSessionModal, setShowLogSessionModal] = useState(false)
  const [showCalculateModal, setShowCalculateModal] = useState(false)
  const [showRateModal, setShowRateModal] = useState(false)
  const [showRateHistoryModal, setShowRateHistoryModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showSubstituteModal, setShowSubstituteModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPrintStatementModal, setShowPrintStatementModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)

  // Selected entities for modals
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [selectedProfileTeacher, setSelectedProfileTeacher] = useState<any>(null)
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<any>(null)

  // Form states
  const [rejectReason, setRejectReason] = useState('')
  const [substituteTeacherId, setSubstituteTeacherId] = useState('')
  const [substituteReason, setSubstituteReason] = useState('')
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([])

  // Payment Form state
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('bank_transfer')
  const [payRef, setPayRef] = useState('')
  const [payBank, setPayBank] = useState('')
  const [payNotes, setPayNotes] = useState('')

  // Adjustment Form state
  const [adjIncentives, setAdjIncentives] = useState('0')
  const [adjAdditional, setAdjAdditional] = useState('0')
  const [adjDeductions, setAdjDeductions] = useState('0')
  const [adjWithholdings, setAdjWithholdings] = useState('0')
  const [adjNotes, setAdjNotes] = useState('')

  // Rate Revision Form state
  const [newPayMethod, setNewPayMethod] = useState('hourly')
  const [newRateValue, setNewRateValue] = useState('')
  const [rateEffectiveFrom, setRateEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0])
  const [rateRevisionReason, setRateRevisionReason] = useState('')

  // Session Logging Form state
  const [logTeacherId, setLogTeacherId] = useState('')
  const [logDivisionId, setLogDivisionId] = useState('')
  const [logSubjectId, setLogSubjectId] = useState('')
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0])
  const [logStartTime, setLogStartTime] = useState('09:00')
  const [logEndTime, setLogEndTime] = useState('10:30')
  const [logBreakMins, setLogBreakMins] = useState('0')
  const [logTopic, setLogTopic] = useState('')
  const [logStudentsCount, setLogStudentsCount] = useState('')
  const [logRemarks, setLogRemarks] = useState('')

  // Report tab selection
  const [activeReport, setActiveReport] = useState('monthly-register')
  const [reportStartDate, setReportStartDate] = useState(() => `${currentDate.getFullYear()}-01-01`)
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // ── Queries ──
  const { data: teachers = [] } = useQuery({
    queryKey: ['teacher-payroll-teachers'],
    queryFn: async () => (await teacherPayrollApi.getTeachers()).data,
  })

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions-list'],
    queryFn: async () => (await divisionsApi.list()).data,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => (await subjectsApi.list()).data,
  })

  // Monthly Payroll Query
  const { data: monthlyPayrolls = [], isLoading: isLoadingMonthly, error: monthlyError, refetch: refetchMonthly } = useQuery({
    queryKey: ['teacher-monthly-payroll', selectedMonth, selectedYear, selectedStatus, selectedTeacherId],
    queryFn: async () => {
      const params: any = { month: selectedMonth, year: selectedYear }
      if (selectedStatus) params.status = selectedStatus
      if (selectedTeacherId) params.teacher_id = selectedTeacherId
      return (await teacherPayrollApi.getMonthlyPayrolls(params)).data
    },
  })

  const PAYROLL_SORT_OPTIONS: TableSortOption[] = [
    { key: 'payroll_number', label: 'Payroll #' },
    { key: 'teacher_name', label: 'Teacher Name' },
    { key: 'net_payable', label: 'Net Payable', type: 'number', defaultDirection: 'desc' },
    { key: 'total_teaching_hours', label: 'Teaching Hours', type: 'number' },
    { key: 'base_earnings', label: 'Base Earnings', type: 'number' },
    { key: 'paid_amount', label: 'Paid Amount', type: 'number' },
    { key: 'status', label: 'Status' },
  ]

  const {
    sortedData: sortedPayrolls,
    sortKey: payrollSortKey,
    sortDirection: payrollSortDirection,
    requestSort: requestPayrollSort,
    setSort: setPayrollSort,
    clearSort: clearPayrollSort,
  } = useTableSort(monthlyPayrolls, {
    initialKey: 'payroll_number',
    initialDirection: 'asc',
  })

  // Teaching Sessions Query
  const { data: sessionsResponse, isLoading: isLoadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['teaching-sessions', selectedTeacherId, selectedStatus],
    queryFn: async () => {
      const params: any = { limit: 100 }
      if (selectedTeacherId) params.teacher_id = selectedTeacherId
      if (selectedStatus) params.approval_status = selectedStatus
      return (await teacherPayrollApi.getSessions(params)).data
    },
  })
  const sessions = sessionsResponse?.items || []

  // Profiles Query
  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError, refetch: refetchProfiles } = useQuery({
    queryKey: ['teacher-payment-profiles'],
    queryFn: async () => (await teacherPayrollApi.getProfiles()).data,
  })

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles
    const q = searchQuery.toLowerCase()
    return profiles.filter((p: any) =>
      p.teacher_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.designation?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q)
    )
  }, [profiles, searchQuery])

  // Vouchers Query
  const { data: vouchers = [], isLoading: isLoadingVouchers, refetch: refetchVouchers } = useQuery({
    queryKey: ['teacher-payment-vouchers', selectedTeacherId],
    queryFn: async () => {
      const params: any = {}
      if (selectedTeacherId) params.teacher_id = selectedTeacherId
      return (await teacherPayrollApi.getVouchers(params)).data
    },
  })

  // Active Report Query
  const { data: reportData = [], isLoading: isLoadingReport, refetch: refetchReport } = useQuery({
    queryKey: ['teacher-payroll-report', activeReport, selectedMonth, selectedYear, reportStartDate, reportEndDate, selectedTeacherId],
    queryFn: async () => {
      const params: any = {
        month: selectedMonth,
        year: selectedYear,
        start_date: reportStartDate,
        end_date: reportEndDate,
      }
      if (selectedTeacherId) params.teacher_id = selectedTeacherId
      return (await teacherPayrollApi.getReport(activeReport, params)).data
    },
    enabled: activeTab === 'reports',
  })

  // ── Summary KPI Calculations ──
  const kpis = useMemo(() => {
    let totalNet = 0
    let totalHours = 0
    let totalLectures = 0
    let totalPaid = 0
    let totalPending = 0

    monthlyPayrolls.forEach((p: any) => {
      totalNet += Number(p.net_payable || 0)
      totalHours += Number(p.total_teaching_hours || 0)
      totalLectures += Number(p.total_completed_lectures || 0)
      totalPaid += Number(p.paid_amount || 0)
      totalPending += Number(p.pending_amount || 0)
    })

    return { totalNet, totalHours: round(totalHours, 1), totalLectures, totalPaid, totalPending }
  }, [monthlyPayrolls])

  function round(val: number, decimals: number) {
    return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals)
  }

  // ── Mutations ──
  const calculateMutation = useMutation({
    mutationFn: (data: any) => teacherPayrollApi.calculatePayroll(data),
    onSuccess: () => {
      refetchMonthly()
      setShowCalculateModal(false)
    },
  })

  const bulkCalculateMutation = useMutation({
    mutationFn: (data: any) => teacherPayrollApi.bulkCalculatePayroll(data),
    onSuccess: () => {
      refetchMonthly()
      setShowCalculateModal(false)
    },
  })

  const submitMutation = useMutation({
    mutationFn: (id: number) => teacherPayrollApi.submitPayroll(id),
    onSuccess: () => refetchMonthly(),
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => teacherPayrollApi.approvePayroll(id),
    onSuccess: () => refetchMonthly(),
  })

  const finalizeMutation = useMutation({
    mutationFn: (id: number) => teacherPayrollApi.finalizePayroll(id),
    onSuccess: () => refetchMonthly(),
  })

  const logSessionMutation = useMutation({
    mutationFn: (data: any) => teacherPayrollApi.createSession(data),
    onSuccess: () => {
      refetchSessions()
      setShowLogSessionModal(false)
    },
  })

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: number[]) => teacherPayrollApi.bulkApproveSessions(ids),
    onSuccess: () => {
      refetchSessions()
      setSelectedSessionIds([])
    },
  })

  const rejectSessionMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      teacherPayrollApi.rejectSession(id, reason),
    onSuccess: () => {
      refetchSessions()
      setShowRejectModal(false)
      setRejectReason('')
    },
  })

  const assignSubstituteMutation = useMutation({
    mutationFn: ({ id, subId, reason }: { id: number; subId: number; reason?: string }) =>
      teacherPayrollApi.assignSubstitute(id, subId, reason),
    onSuccess: () => {
      refetchSessions()
      setShowSubstituteModal(false)
      setSubstituteReason('')
    },
  })

  const recordVoucherMutation = useMutation({
    mutationFn: ({ payrollId, data }: { payrollId: number; data: any }) =>
      teacherPayrollApi.recordVoucher(payrollId, data),
    onSuccess: () => {
      refetchMonthly()
      refetchVouchers()
      setShowPaymentModal(false)
    },
  })

  const adjustMutation = useMutation({
    mutationFn: ({ payrollId, data }: { payrollId: number; data: any }) =>
      teacherPayrollApi.adjustPayroll(payrollId, data),
    onSuccess: () => {
      refetchMonthly()
      setShowAdjustModal(false)
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: ({ teacherUserId, data }: { teacherUserId: number; data: any }) =>
      teacherPayrollApi.updateProfile(teacherUserId, data),
    onSuccess: () => {
      refetchProfiles()
      setShowRateModal(false)
    },
  })

  // ── Month Names ──
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Teacher Hourly & Session Payroll Engine" isDirty={showLogSessionModal || showCalculateModal || showAdjustModal} />

      {/* ── Top Header & Product Identity Banner ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-500/30 text-blue-200 border border-blue-400/30">
              Coaching Institute Edition • v1.0.0
            </span>
            <span className="text-xs text-slate-300">PrathamOne EduOS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            Teacher Payroll & Payment Management
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Verified teaching sessions, hourly/lecture/fixed compensation engines, approval controls, and double-entry payment ledger.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <ContextualHelpButton moduleKey="staff" variant="pill" label="Payroll Help" />
          <LockedButton
            isEditMode={isEditMode}
            onClick={() => setShowCalculateModal(true)}
            icon={RefreshCw}
            size="md"
            className={isEditMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}
          >
            Calculate Payroll
          </LockedButton>
          <LockedButton
            isEditMode={isEditMode}
            onClick={() => setShowLogSessionModal(true)}
            icon={Plus}
            size="md"
            className={isEditMode ? 'bg-primary-600 hover:bg-primary-500 text-white' : ''}
          >
            Log Teaching Session
          </LockedButton>
        </div>
      </div>

      {/* ── Main Tab Navigation Bar ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2">
        {[
          { key: 'monthly', label: 'Monthly Payroll', icon: DollarSign },
          { key: 'sessions', label: 'Teaching Session Register', icon: Clock },
          { key: 'profiles', label: 'Teacher Profiles & Rates', icon: UserCheck },
          { key: 'vouchers', label: 'Payment Vouchers & Ledger', icon: CreditCard },
          { key: 'reports', label: 'Reports & Cost Analytics', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: MONTHLY PAYROLL                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Gross / Net Payroll</span>
              <p className="text-xl font-bold text-slate-900 mt-1">₹{kpis.totalNet.toLocaleString()}</p>
              <span className="text-xs text-primary-600 font-medium">Month Total</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Teaching Hours</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{kpis.totalHours} hrs</p>
              <span className="text-xs text-emerald-600 font-medium">{kpis.totalLectures} lectures</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Total Paid</span>
              <p className="text-xl font-bold text-emerald-600 mt-1">₹{kpis.totalPaid.toLocaleString()}</p>
              <span className="text-xs text-slate-500">Disbursed</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Pending Payable</span>
              <p className="text-xl font-bold text-amber-600 mt-1">₹{kpis.totalPending.toLocaleString()}</p>
              <span className="text-xs text-amber-500 font-medium">Pending disbursement</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Teachers Covered</span>
              <p className="text-xl font-bold text-primary-600 mt-1">{monthlyPayrolls.length}</p>
              <span className="text-xs text-slate-500">Records in period</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Period:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Teacher:</span>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">All Faculty</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="calculated">Calculated</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="finalized">Finalized & Locked</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <TableSortSelect
                options={PAYROLL_SORT_OPTIONS}
                currentSortKey={payrollSortKey}
                currentDirection={payrollSortDirection}
                onSortChange={(key, dir) => {
                  const opt = PAYROLL_SORT_OPTIONS.find((o) => o.key === key)
                  setPayrollSort(key, dir, undefined, opt?.type || 'auto')
                }}
                onClear={clearPayrollSort}
                placeholder="Sort Payroll..."
              />
              <a
                href={teacherPayrollApi.exportReportUrl('monthly-register', { month: selectedMonth, year: selectedYear })}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                Export Excel
              </a>
              <button
                onClick={() => refetchMonthly()}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Monthly Payroll Grid Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoadingMonthly ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
                <span>Loading payroll calculations...</span>
              </div>
            ) : monthlyError ? (
              <div className="p-8 text-center bg-rose-50 border border-rose-200 text-rose-700 m-4 rounded-xl flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-rose-600" />
                <p className="font-semibold text-base">Error Loading Monthly Payroll Data</p>
                <p className="text-xs text-rose-600">{(monthlyError as any)?.response?.data?.detail || 'An unexpected error occurred while loading payroll records.'}</p>
                <button
                  onClick={() => refetchMonthly()}
                  className="mt-2 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
                >
                  Retry Load
                </button>
              </div>
            ) : sortedPayrolls.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-800 text-base">No Payroll Generated for {monthNames[selectedMonth - 1]} {selectedYear}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Faculty members are configured in the system, but monthly payroll calculations have not yet been generated for this period.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={() => setShowCalculateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-primary-800 shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Calculate Payroll Now
                  </button>
                  <button
                    onClick={() => setActiveTab('profiles')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200"
                  >
                    <UserCheck className="w-4 h-4" />
                    View Teacher Profiles & Rates ({teachers.length})
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <SortableHeader
                        columnKey="payroll_number"
                        label="Payroll #"
                        currentSortKey={payrollSortKey}
                        currentDirection={payrollSortDirection}
                        onSort={requestPayrollSort}
                      />
                      <SortableHeader
                        columnKey="teacher_name"
                        label="Teacher Name"
                        currentSortKey={payrollSortKey}
                        currentDirection={payrollSortDirection}
                        onSort={requestPayrollSort}
                      />
                      <th className="py-3 px-4">Method</th>
                      <SortableHeader
                        columnKey="total_teaching_hours"
                        label="Hours / Ltrs"
                        align="right"
                        currentSortKey={payrollSortKey}
                        currentDirection={payrollSortDirection}
                        onSort={requestPayrollSort}
                        sortType="number"
                      />
                      <SortableHeader
                        columnKey="base_earnings"
                        label="Base (₹)"
                        align="right"
                        currentSortKey={payrollSortKey}
                        currentDirection={payrollSortDirection}
                        onSort={requestPayrollSort}
                        sortType="number"
                      />
                      <th className="py-3 px-4 text-right">Incentives</th>
                      <th className="py-3 px-4 text-right">Deductions</th>
                      <SortableHeader
                        columnKey="net_payable"
                        label="Net Payable"
                        align="right"
                        currentSortKey={payrollSortKey}
                        currentDirection={payrollSortDirection}
                        onSort={requestPayrollSort}
                        sortType="number"
                      />
                      <SortableHeader
                        columnKey="paid_amount"
                        label="Paid"
                        align="right"
                        currentSortKey={payrollSortKey}
                        currentDirection={payrollSortDirection}
                        onSort={requestPayrollSort}
                        sortType="number"
                      />
                      <th className="py-3 px-4 text-right">Pending</th>
                      <SortableHeader
                        columnKey="status"
                        label="Status"
                        align="center"
                        currentSortKey={payrollSortKey}
                        currentDirection={payrollSortDirection}
                        onSort={requestPayrollSort}
                      />
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedPayrolls.map((p: any) => {
                      const isLocked = p.status === 'finalized' || p.status === 'paid'
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-primary-900">
                            {p.payroll_number}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900">{p.teacher_name}</span>
                            <span className="block text-xs text-slate-400">{p.teacher_email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                              {p.payment_method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-medium text-slate-900">{p.total_teaching_hours} hrs</span>
                            <span className="block text-xs text-slate-400">{p.total_completed_lectures} lect.</span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-800">
                            ₹{Number(p.base_earnings).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                            +₹{Number(p.approved_incentives + p.approved_additional_earnings).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-rose-600 font-medium">
                            -₹{Number(p.total_deductions + p.withholdings).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            ₹{Number(p.net_payable).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-700 font-medium">
                            ₹{Number(p.paid_amount).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-amber-600">
                            ₹{Number(p.pending_amount).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              p.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'finalized'
                                ? 'bg-primary-100 text-primary-800'
                                : p.status === 'approved'
                                ? 'bg-primary-100 text-primary-800'
                                : p.status === 'partially_paid'
                                ? 'bg-amber-100 text-amber-800'
                                : p.status === 'submitted'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {p.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View Details */}
                              <button
                                onClick={async () => {
                                  const res = await teacherPayrollApi.getPayrollDetails(p.id)
                                  setSelectedPayroll(res.data)
                                  setShowDetailsModal(true)
                                }}
                                className="p-1 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                title="View Itemized Breakdown"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Submit for Approval */}
                              {p.status === 'calculated' && (
                                <LockedIconButton
                                  isEditMode={isEditMode}
                                  onClick={() => submitMutation.mutate(p.id)}
                                  icon={ArrowUpRight}
                                  title="Submit for Approval"
                                  tone="primary"
                                />
                              )}

                              {/* Approve */}
                              {(p.status === 'submitted' || p.status === 'calculated') && (
                                <LockedIconButton
                                  isEditMode={isEditMode}
                                  onClick={() => approveMutation.mutate(p.id)}
                                  icon={CheckCircle2}
                                  title="Approve Payroll"
                                  tone="primary"
                                />
                              )}

                              {/* Finalize & Lock */}
                              {p.status === 'approved' && (
                                <LockedIconButton
                                  isEditMode={isEditMode}
                                  onClick={() => finalizeMutation.mutate(p.id)}
                                  icon={Lock}
                                  title="Finalize & Lock Payroll"
                                  tone="primary"
                                />
                              )}

                              {/* Adjust */}
                              {!isLocked && (
                                <LockedIconButton
                                  isEditMode={isEditMode}
                                  onClick={() => {
                                    setSelectedPayroll(p)
                                    setAdjIncentives(String(p.approved_incentives))
                                    setAdjAdditional(String(p.approved_additional_earnings))
                                    setAdjDeductions(String(p.total_deductions))
                                    setAdjWithholdings(String(p.withholdings))
                                    setAdjNotes(p.notes || '')
                                    setShowAdjustModal(true)
                                  }}
                                  icon={Edit3}
                                  title="Adjust Bonuses & Deductions"
                                  tone="warning"
                                />
                              )}

                              {/* Record Payment Voucher */}
                              {Number(p.pending_amount) > 0 && (p.status === 'approved' || p.status === 'finalized' || p.status === 'partially_paid') && (
                                <LockedIconButton
                                  isEditMode={isEditMode}
                                  onClick={() => {
                                    setSelectedPayroll(p)
                                    setPayAmount(String(p.pending_amount))
                                    setShowPaymentModal(true)
                                  }}
                                  icon={CreditCard}
                                  title="Record Payment Voucher"
                                  tone="success"
                                />
                              )}

                              {/* Print Statement */}
                              <button
                                onClick={async () => {
                                  const res = await teacherPayrollApi.getPayrollDetails(p.id)
                                  setSelectedPayroll(res.data)
                                  setShowPrintStatementModal(true)
                                }}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                                title="Print Payment Statement"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: TEACHING SESSION REGISTER                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* Action & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowLogSessionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Log Teaching Session
              </button>

              {selectedSessionIds.length > 0 && (
                <LockedButton
                  isEditMode={isEditMode}
                  onClick={() => bulkApproveMutation.mutate(selectedSessionIds)}
                  icon={CheckCircle2}
                  size="sm"
                  className={isEditMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}
                >
                  Approve Selected ({selectedSessionIds.length})
                </LockedButton>
              )}

              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">All Faculty</option>
                {teachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">All Approval Statuses</option>
                <option value="submitted">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchSessions()}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh Sessions"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sessions Register Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoadingSessions ? (
              <div className="p-8 text-center text-slate-500">Loading teaching sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No teaching sessions recorded matching criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedSessionIds.length === sessions.filter((s: any) => s.approval_status === 'submitted' && !s.is_locked).length && sessions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const pendingIds = sessions
                                .filter((s: any) => s.approval_status === 'submitted' && !s.is_locked)
                                .map((s: any) => s.id)
                              setSelectedSessionIds(pendingIds)
                            } else {
                              setSelectedSessionIds([])
                            }
                          }}
                        />
                      </th>
                      <th className="py-3 px-4">Session Code</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Teacher / Substitute</th>
                      <th className="py-3 px-4">Batch & Subject</th>
                      <th className="py-3 px-4">Time & Duration</th>
                      <th className="py-3 px-4 text-right">Applicable Rate</th>
                      <th className="py-3 px-4 text-right">Calculated Pay</th>
                      <th className="py-3 px-4 text-center">Approval</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.map((s: any) => {
                      const isSelected = selectedSessionIds.includes(s.id)
                      const isPending = s.approval_status === 'submitted'
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              disabled={s.approval_status !== 'submitted' || s.is_locked}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSessionIds([...selectedSessionIds, s.id])
                                } else {
                                  setSelectedSessionIds(selectedSessionIds.filter((id) => id !== s.id))
                                }
                              }}
                            />
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-primary-900">
                            {s.session_code}
                            {s.is_locked && (
                              <span className="block text-[10px] text-slate-400">Locked in Payroll</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{s.session_date}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900">{s.teacher_name}</span>
                            {s.substitute_teacher_id && (
                              <span className="block text-xs font-medium text-amber-600">
                                Sub: {s.substitute_name}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800">{s.batch_name}</span>
                            <span className="block text-xs text-slate-500">{s.subject_name}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                            <span>{s.actual_start_time || s.scheduled_start_time} - {s.actual_end_time || s.scheduled_end_time}</span>
                            <span className="block text-xs text-primary-600 font-medium">{s.calculated_duration_hours} hrs</span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-800 font-medium">
                            ₹{Number(s.applicable_rate).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            ₹{Number(s.calculated_amount).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              s.approval_status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.approval_status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {s.approval_status}
                            </span>
                            {s.rejection_reason && (
                              <span className="block text-[11px] text-rose-600 truncate max-w-[150px]" title={s.rejection_reason}>
                                {s.rejection_reason}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Quick Approve */}
                              {isPending && !s.is_locked && (
                                <LockedIconButton
                                  isEditMode={isEditMode}
                                  onClick={() => bulkApproveMutation.mutate([s.id])}
                                  icon={CheckCircle2}
                                  title="Approve Session"
                                  tone="success"
                                />
                              )}

                              {/* Reject with Reason */}
                              {isPending && !s.is_locked && (
                                <LockedIconButton
                                  isEditMode={isEditMode}
                                  onClick={() => {
                                    setSelectedSession(s)
                                    setShowRejectModal(true)
                                  }}
                                  icon={XCircle}
                                  title="Reject Session"
                                  tone="danger"
                                />
                              )}

                              {/* Assign Substitute */}
                              {!s.is_locked && (
                                <LockedIconButton
                                  isEditMode={isEditMode}
                                  onClick={() => {
                                    setSelectedSession(s)
                                    setShowSubstituteModal(true)
                                  }}
                                  icon={UserCheck}
                                  title="Assign Substitute Teacher"
                                  tone="primary"
                                />
                              )}

                              {/* Assign Homework for Session */}
                              <Link
                                to={`/homework/new?session_id=${s.id}&division_id=${s.division_id || s.batch_id || ''}&subject_id=${s.subject_id || ''}&topic=${encodeURIComponent(s.topic_covered || '')}&teacher_id=${s.teacher_user_id || ''}`}
                                className="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
                                title="Assign Homework for this Teaching Session"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                              </Link>
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: TEACHER PROFILES & RATES                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Teacher Payment Profiles & Rates</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">
                  {profiles.length} Faculty Members
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Authoritative hourly, per-lecture, monthly fixed, and course-contract rate profiles. Revisions are immutably audited.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search faculty name, designation..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>
              <button
                onClick={() => refetchProfiles()}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoadingProfiles ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
              <p className="font-semibold text-slate-700">Loading Faculty Profiles & Rates...</p>
            </div>
          ) : profilesError ? (
            <div className="p-8 text-center bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-rose-600" />
              <p className="font-semibold text-base">Failed to Load Teacher Profiles</p>
              <p className="text-xs text-rose-600">{(profilesError as any)?.response?.data?.detail || 'An unexpected error occurred.'}</p>
              <button
                onClick={() => refetchProfiles()}
                className="mt-2 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-800 text-base">No Teacher Profiles Found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No faculty member matches your search filter "${searchQuery}".`
                  : 'No active teaching faculty records found in the system roster.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  Clear Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProfiles.map((p: any) => (
              <div key={p.teacher_user_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{p.teacher_name}</h3>
                      <span className="text-xs text-slate-500">{p.designation} • {p.department}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 uppercase">
                      {p.payment_method.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Hourly Rate:</span>
                      <span className="font-bold text-slate-800">₹{p.hourly_rate} / hr</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Per-Lecture Rate:</span>
                      <span className="font-bold text-slate-800">₹{p.per_lecture_rate} / lect.</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Monthly Fixed:</span>
                      <span className="font-bold text-slate-800">₹{p.monthly_fixed_amount} / mo</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Contract Total:</span>
                      <span className="font-bold text-slate-800">₹{p.contract_total_amount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Frequency:</span>
                      <span className="font-medium text-slate-700 capitalize">{p.payment_frequency}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={async () => {
                      setSelectedProfileTeacher(p)
                      setNewPayMethod(p.payment_method)
                      const val = p.payment_method === 'hourly' ? p.hourly_rate : p.payment_method === 'per_lecture' ? p.per_lecture_rate : p.payment_method === 'monthly_fixed' ? p.monthly_fixed_amount : p.contract_total_amount
                      setNewRateValue(String(val))
                      setShowRateModal(true)
                    }}
                    className="flex-1 px-3 py-2 bg-blue-900 hover:bg-primary-800 text-white rounded-xl text-xs font-medium text-center transition-colors"
                  >
                    Revise Rate
                  </button>
                  <button
                    onClick={async () => {
                      const res = await teacherPayrollApi.getProfileDetails(p.teacher_user_id)
                      setSelectedProfileTeacher({ ...p, ...res.data })
                      setShowRateHistoryModal(true)
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                  >
                    Audit Trail
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: PAYMENT VOUCHERS & LEDGER                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Payment Vouchers & Accounting Ledger</h2>
              <p className="text-slate-500 text-xs">
                Direct integration with institute accounting: Debit (Teacher Remuneration) & Credit (Bank / Cash accounts).
              </p>
            </div>
            <button
              onClick={() => refetchVouchers()}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh Vouchers"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoadingVouchers ? (
              <div className="p-8 text-center text-slate-500">Loading payment vouchers...</div>
            ) : vouchers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No payment vouchers posted yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Voucher #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Teacher Name</th>
                      <th className="py-3 px-4">Payroll #</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4">Method & Reference</th>
                      <th className="py-3 px-4">Debit Account</th>
                      <th className="py-3 px-4">Credit Account</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vouchers.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-primary-900">
                          {v.voucher_number}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{v.payment_date}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{v.teacher_name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{v.payroll_number}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          ₹{Number(v.amount_paid).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800 capitalize">{v.payment_method.replace('_', ' ')}</span>
                          <span className="block text-xs text-slate-400">{v.transaction_reference || v.cheque_number || '-'}</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700">{v.debit_account}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700">{v.credit_account}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            v.status === 'posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedVoucherForPrint(v)
                              setShowPrintStatementModal(true)
                            }}
                            className="p-1 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="Print Voucher Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: REPORTS & COST ANALYTICS                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Selection Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-slate-700 uppercase">Select Report:</span>
              <select
                value={activeReport}
                onChange={(e) => setActiveReport(e.target.value)}
                className="text-sm font-semibold border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="monthly-register">1. Monthly Payment Register</option>
                <option value="teacher-history">2. Teacher-wise Payment History</option>
                <option value="teaching-hours">3. Teaching Hours Report</option>
                <option value="batch-cost">4. Batch-wise Teaching Cost</option>
                <option value="subject-cost">5. Subject-wise Teaching Cost</option>
                <option value="pending-payments">6. Pending Teacher Payments</option>
                <option value="voucher-register">7. Teacher Payment Voucher Register</option>
                <option value="adjustments">8. Payroll Adjustment & Bonus Report</option>
                <option value="approval-history">9. Session Approval History</option>
                <option value="monthly-summary">10. Monthly Teaching Cost Summary</option>
              </select>

              {/* Date Filters */}
              {(activeReport === 'teaching-hours' || activeReport === 'batch-cost' || activeReport === 'subject-cost' || activeReport === 'voucher-register' || activeReport === 'approval-history') && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={teacherPayrollApi.exportReportUrl(activeReport, {
                  month: selectedMonth,
                  year: selectedYear,
                  start_date: reportStartDate,
                  end_date: reportEndDate,
                  teacher_id: selectedTeacherId,
                })}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Excel (.xlsx)
              </a>
              <button
                onClick={() => refetchReport()}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh Report"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Report Data Display */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4">
            {isLoadingReport ? (
              <div className="p-8 text-center text-slate-500">Generating report data...</div>
            ) : reportData.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No records found for selected report criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      {Object.keys(reportData[0]).map((key) => (
                        <th key={key} className="py-2.5 px-4 capitalize">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        {Object.entries(row).map(([k, val]: any, i) => (
                          <td key={i} className={`py-2.5 px-4 ${typeof val === 'number' ? 'text-right font-medium' : ''}`}>
                            {typeof val === 'number' && (k.includes('amount') || k.includes('pay') || k.includes('cost') || k.includes('total') || k.includes('earnings') || k.includes('incentives') || k.includes('deductions'))
                              ? `₹${Number(val).toLocaleString()}`
                              : String(val ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: CALCULATE PAYROLL MODAL                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showCalculateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-400" />
                Calculate Monthly Payroll
              </h3>
              <button onClick={() => setShowCalculateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Period Month & Year</label>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="flex-1 text-sm border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-28 text-sm border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Teacher (or Bulk)</label>
                <select
                  value={logTeacherId}
                  onChange={(e) => setLogTeacherId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">Calculate ALL Teachers in Bulk</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-primary-50 border border-blue-200 p-3 rounded-xl text-xs text-primary-800 leading-relaxed">
                Anti-Double-Counting Rule: Only approved, unbilled teaching sessions within the calendar month will be aggregated into this calculation.
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCalculateModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={calculateMutation.isPending || bulkCalculateMutation.isPending}
                  onClick={() => {
                    if (logTeacherId) {
                      calculateMutation.mutate({
                        teacher_user_id: Number(logTeacherId),
                        month: selectedMonth,
                        year: selectedYear,
                      })
                    } else {
                      bulkCalculateMutation.mutate({
                        month: selectedMonth,
                        year: selectedYear,
                      })
                    }
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  {calculateMutation.isPending || bulkCalculateMutation.isPending ? 'Calculating...' : 'Run Calculation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: LOG TEACHING SESSION MODAL                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showLogSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                Log Teaching Session
              </h3>
              <button onClick={() => setShowLogSessionModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Teacher *</label>
                <select
                  value={logTeacherId}
                  onChange={(e) => setLogTeacherId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                  required
                >
                  <option value="">Select Faculty Member</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Batch / Division *</label>
                  <select
                    value={logDivisionId}
                    onChange={(e) => setLogDivisionId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                    required
                  >
                    <option value="">Select Batch</option>
                    {divisions.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Subject *</label>
                  <select
                    value={logSubjectId}
                    onChange={(e) => setLogSubjectId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    value={logStartTime}
                    onChange={(e) => setLogStartTime(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    value={logEndTime}
                    onChange={(e) => setLogEndTime(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Break Duration (Mins)</label>
                  <input
                    type="number"
                    value={logBreakMins}
                    onChange={(e) => setLogBreakMins(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Students Present</label>
                  <input
                    type="number"
                    value={logStudentsCount}
                    onChange={(e) => setLogStudentsCount(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Topic / Curriculum Delivered</label>
                <input
                  type="text"
                  value={logTopic}
                  onChange={(e) => setLogTopic(e.target.value)}
                  placeholder="e.g. Chapter 4: Chemical Bonding Theory"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogSessionModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!logTeacherId || !logDivisionId || !logSubjectId || logSessionMutation.isPending}
                  onClick={() => {
                    logSessionMutation.mutate({
                      teacher_user_id: Number(logTeacherId),
                      division_id: Number(logDivisionId),
                      subject_id: Number(logSubjectId),
                      session_date: logDate,
                      scheduled_start_time: logStartTime,
                      scheduled_end_time: logEndTime,
                      actual_start_time: logStartTime,
                      actual_end_time: logEndTime,
                      break_duration_minutes: Number(logBreakMins || 0),
                      topic_taught: logTopic,
                      students_present_count: logStudentsCount ? Number(logStudentsCount) : null,
                    })
                  }}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  {logSessionMutation.isPending ? 'Logging...' : 'Save & Submit Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: RECORD PAYMENT VOUCHER MODAL                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showPaymentModal && selectedPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Record Payment Voucher
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Teacher:</span>
                  <span className="font-bold text-slate-800">{selectedPayroll.teacher_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payroll #:</span>
                  <span className="font-mono text-primary-900 font-semibold">{selectedPayroll.payroll_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pending Balance:</span>
                  <span className="font-bold text-amber-600">₹{Number(selectedPayroll.pending_amount).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  max={selectedPayroll.pending_amount}
                  className="w-full text-base font-bold text-slate-900 border border-slate-300 rounded-lg p-2"
                  required
                />
                <span className="text-[11px] text-slate-500">Overpayment is blocked by the accounting core.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Method *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="upi">UPI / Online Gateway</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash in Hand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. UTR-982348"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 space-y-0.5">
                <p className="font-bold">Accounting Entry Verification:</p>
                <p>• Debit: Teacher Remuneration & Faculty Cost</p>
                <p>• Credit: {payMethod === 'cash' ? 'Cash Counter' : 'Main Operating Bank Account'}</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!payAmount || Number(payAmount) <= 0 || Number(payAmount) > Number(selectedPayroll.pending_amount) || recordVoucherMutation.isPending}
                  onClick={() => {
                    recordVoucherMutation.mutate({
                      payrollId: selectedPayroll.id,
                      data: {
                        amount_paid: Number(payAmount),
                        payment_method: payMethod,
                        transaction_reference: payRef,
                        bank_name: payBank,
                        notes: payNotes,
                      },
                    })
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  {recordVoucherMutation.isPending ? 'Recording...' : 'Disburse & Post Voucher'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: REVISE RATE MODAL                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showRateModal && selectedProfileTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" />
                Revise Compensation Rate
              </h3>
              <button onClick={() => setShowRateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-semibold text-slate-800">
                Teacher: {selectedProfileTeacher.teacher_name}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Method</label>
                <select
                  value={newPayMethod}
                  onChange={(e) => setNewPayMethod(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="hourly">Hourly Rate (₹ / hr)</option>
                  <option value="per_lecture">Per Lecture (₹ / session)</option>
                  <option value="monthly_fixed">Monthly Fixed (₹ / month)</option>
                  <option value="fixed_contract">Fixed Contract (₹ / term)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">New Rate Value (₹) *</label>
                <input
                  type="number"
                  value={newRateValue}
                  onChange={(e) => setNewRateValue(e.target.value)}
                  className="w-full text-base font-bold text-slate-900 border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Effective Date *</label>
                <input
                  type="date"
                  value={rateEffectiveFrom}
                  onChange={(e) => setRateEffectiveFrom(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Revision Reason *</label>
                <input
                  type="text"
                  value={rateRevisionReason}
                  onChange={(e) => setRateRevisionReason(e.target.value)}
                  placeholder="e.g. Annual academic appraisal increment"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newRateValue || !rateRevisionReason || updateProfileMutation.isPending}
                  onClick={() => {
                    const payload: any = {
                      payment_method: newPayMethod,
                      effective_from: rateEffectiveFrom,
                      reason: rateRevisionReason,
                    }
                    if (newPayMethod === 'hourly') payload.hourly_rate = Number(newRateValue)
                    if (newPayMethod === 'per_lecture') payload.per_lecture_rate = Number(newRateValue)
                    if (newPayMethod === 'monthly_fixed') payload.monthly_fixed_amount = Number(newRateValue)
                    if (newPayMethod === 'fixed_contract') payload.contract_total_amount = Number(newRateValue)

                    updateProfileMutation.mutate({
                      teacherUserId: selectedProfileTeacher.teacher_user_id,
                      data: payload,
                    })
                  }}
                  className="flex-1 py-2.5 bg-blue-900 hover:bg-primary-800 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  {updateProfileMutation.isPending ? 'Updating...' : 'Confirm Rate Revision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: RATE REVISION AUDIT TRAIL MODAL                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showRateHistoryModal && selectedProfileTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                Rate Revision Audit History — {selectedProfileTeacher.teacher_name}
              </h3>
              <button onClick={() => setShowRateHistoryModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {(!selectedProfileTeacher.rate_histories || selectedProfileTeacher.rate_histories.length === 0) ? (
                <p className="text-slate-500 text-sm text-center py-6">No historical rate revisions recorded.</p>
              ) : (
                <div className="space-y-3">
                  {selectedProfileTeacher.rate_histories.map((h: any) => (
                    <div key={h.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            ₹{h.old_rate} → ₹{h.new_rate}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary-100 text-primary-800 uppercase font-semibold">
                            {h.new_payment_method}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-medium">{h.reason}</p>
                        <span className="text-[11px] text-slate-400 block mt-1">
                          Effective: {h.effective_from} • Changed by: {h.changed_by || 'Admin'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{h.changed_at?.split('T')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 6: REJECT SESSION MODAL                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showRejectModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2 text-rose-400">
                <XCircle className="w-5 h-5" />
                Reject Teaching Session
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Session Code: <span className="font-mono font-bold text-slate-900">{selectedSession.session_code}</span>
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this session cannot be approved for compensation..."
                  rows={3}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectReason || rejectSessionMutation.isPending}
                  onClick={() => {
                    rejectSessionMutation.mutate({ id: selectedSession.id, reason: rejectReason })
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  {rejectSessionMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 7: ASSIGN SUBSTITUTE MODAL                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showSubstituteModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                Assign Substitute Faculty
              </h3>
              <button onClick={() => setShowSubstituteModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Substitute Teacher *</label>
                <select
                  value={substituteTeacherId}
                  onChange={(e) => setSubstituteTeacherId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                  required
                >
                  <option value="">Select Substitute</option>
                  {teachers
                    .filter((t: any) => t.id !== selectedSession.teacher_user_id)
                    .map((t: any) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={substituteReason}
                  onChange={(e) => setSubstituteReason(e.target.value)}
                  placeholder="e.g. Primary teacher on emergency medical leave"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubstituteModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!substituteTeacherId || assignSubstituteMutation.isPending}
                  onClick={() => {
                    assignSubstituteMutation.mutate({
                      id: selectedSession.id,
                      subId: Number(substituteTeacherId),
                      reason: substituteReason,
                    })
                  }}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  {assignSubstituteMutation.isPending ? 'Assigning...' : 'Assign Substitute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 8: ITEMIZED BREAKDOWN MODAL                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showDetailsModal && selectedPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{selectedPayroll.payroll.teacher_name} — Payroll Breakdown</h3>
                <span className="font-mono text-xs text-blue-300">{selectedPayroll.payroll.payroll_number}</span>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Included Verified Teaching Sessions ({selectedPayroll.sessions?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Session Code</th>
                      <th className="py-2.5 px-3">Batch & Subject</th>
                      <th className="py-2.5 px-3 text-right">Hours</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPayroll.sessions?.map((s: any) => (
                      <tr key={s.id}>
                        <td className="py-2 px-3">{s.date}</td>
                        <td className="py-2 px-3 font-mono text-primary-900">{s.session_code}</td>
                        <td className="py-2 px-3">{s.batch_name} • {s.subject_name}</td>
                        <td className="py-2 px-3 text-right">{s.hours}</td>
                        <td className="py-2 px-3 text-right">₹{s.rate}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">₹{s.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedPayroll.vouchers && selectedPayroll.vouchers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Payment Vouchers Disbursed ({selectedPayroll.vouchers.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedPayroll.vouchers.map((v: any) => (
                      <div key={v.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-bold text-primary-900">{v.voucher_number}</span>
                          <span className="text-slate-500 block">{v.payment_date} • {v.payment_method} ({v.reference})</span>
                        </div>
                        <span className="font-bold text-emerald-700 text-sm">₹{v.amount_paid.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 9: PRINT PAYMENT STATEMENT / VOUCHER RECEIPT                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showPrintStatementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print">
              <span className="text-sm font-semibold">Official Payment Document Print Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openPrint({
                      targetElementId: 'printable-payroll-doc',
                      documentType: selectedVoucherForPrint ? 'teacher_payment' : 'payroll_report',
                      documentTitle: `Teacher Payment Document - ${selectedPayroll?.payroll?.teacher_name || selectedVoucherForPrint?.teacher_name || 'Faculty'}`,
                      initialSettings: {
                        paperSize: selectedVoucherForPrint ? 'A5' : 'A4',
                        orientation: 'portrait',
                        confidentiality: 'Confidential Remuneration Record',
                        documentId: selectedPayroll ? selectedPayroll.payroll.payroll_number : (selectedVoucherForPrint?.voucher_number || 'VCH-001'),
                      },
                    })
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Now
                </button>
                <button onClick={() => setShowPrintStatementModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 space-y-6 overflow-y-auto bg-white text-slate-900" id="printable-payroll-doc">
              {/* Official Document Header with Decoupled Institute Branding */}
              <PrintDocumentHeader
                title={selectedVoucherForPrint ? 'Teacher Payment Voucher' : 'Faculty Remuneration Statement'}
                documentRef={selectedPayroll ? selectedPayroll.payroll.payroll_number : selectedVoucherForPrint?.voucher_number}
                documentDate={new Date().toLocaleDateString('en-IN')}
                compact={!!selectedVoucherForPrint}
              />

              {/* Recipient / Faculty Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block uppercase font-medium">Faculty Member</span>
                  <span className="font-bold text-sm text-slate-900">
                    {selectedPayroll ? selectedPayroll.payroll.teacher_name : selectedVoucherForPrint?.teacher_name}
                  </span>
                  <span className="text-slate-500 block mt-0.5">Faculty User ID: #{selectedPayroll ? selectedPayroll.payroll.teacher_user_id : selectedVoucherForPrint?.teacher_user_id}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block uppercase font-medium">Payment Method / Frequency</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {selectedPayroll ? selectedPayroll.payroll.payment_method.replace('_', ' ') : selectedVoucherForPrint?.payment_method}
                  </span>
                  <span className="text-slate-500 block mt-0.5">
                    Period: {selectedPayroll ? `${selectedPayroll.payroll.month}/${selectedPayroll.payroll.year}` : selectedVoucherForPrint?.payment_date}
                  </span>
                </div>
              </div>

              {/* Breakdown Figures */}
              {selectedPayroll && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">Base Earnings ({selectedPayroll.payroll.total_teaching_hours} teaching hrs / {selectedPayroll.payroll.total_completed_lectures} lectures)</span>
                    <span className="font-bold text-slate-900">₹{Number(selectedPayroll.payroll.base_earnings).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-emerald-700">Approved Incentives & Additional Pay</span>
                    <span className="font-bold text-emerald-700">+₹{Number(selectedPayroll.payroll.approved_incentives + selectedPayroll.payroll.approved_additional_earnings).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-rose-700">Deductions & Withholdings</span>
                    <span className="font-bold text-rose-700">-₹{Number(selectedPayroll.payroll.total_deductions + selectedPayroll.payroll.withholdings).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm border-b-2 border-slate-900 bg-slate-50 px-2 font-bold">
                    <span>Net Remuneration Payable</span>
                    <span className="text-primary-900">₹{Number(selectedPayroll.payroll.net_payable).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">Amount Paid / Disbursed</span>
                    <span className="font-bold text-emerald-700">₹{Number(selectedPayroll.payroll.paid_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-xs font-bold text-amber-700">
                    <span>Outstanding Balance</span>
                    <span>₹{Number(selectedPayroll.payroll.pending_amount).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Single Voucher Details if Vouchers Tab */}
              {selectedVoucherForPrint && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Amount Disbursed</span>
                    <span className="font-bold text-sm text-emerald-700">₹{Number(selectedVoucherForPrint.amount_paid).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Debit Classification</span>
                    <span className="font-medium text-slate-800">{selectedVoucherForPrint.debit_account}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Credit Classification</span>
                    <span className="font-medium text-slate-800">{selectedVoucherForPrint.credit_account}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Transaction Reference</span>
                    <span className="font-mono text-slate-800">{selectedVoucherForPrint.transaction_reference || '-'}</span>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-2 font-semibold">Faculty Signature</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2 font-semibold">Authorized Institute Signatory</div>
                </div>
              </div>

              {/* Canonical Two-Row Global Print Footer Standard */}
              <PrintFooter
                documentId={selectedPayroll ? selectedPayroll.payroll.payroll_number : (selectedVoucherForPrint?.voucher_number || 'VCH-001')}
                classification="Confidential Remuneration Record"
                className="mt-6"
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      <PrintModal />
      {/* MODAL 10: ADJUST PAYROLL MODAL                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showAdjustModal && selectedPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2 text-amber-400">
                <Edit3 className="w-5 h-5" />
                Adjust Payroll Bonuses & Deductions
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Teacher: <span className="font-bold text-slate-900">{selectedPayroll.teacher_name}</span> ({selectedPayroll.payroll_number})
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Incentives / Bonus (₹)</label>
                  <input
                    type="number"
                    value={adjIncentives}
                    onChange={(e) => setAdjIncentives(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Additional Pay (₹)</label>
                  <input
                    type="number"
                    value={adjAdditional}
                    onChange={(e) => setAdjAdditional(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Deductions (₹)</label>
                  <input
                    type="number"
                    value={adjDeductions}
                    onChange={(e) => setAdjDeductions(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">TDS / Withholding (₹)</label>
                  <input
                    type="number"
                    value={adjWithholdings}
                    onChange={(e) => setAdjWithholdings(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Adjustment Reason / Notes</label>
                <input
                  type="text"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="e.g. Diwali festive bonus + leave deduction"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={adjustMutation.isPending}
                  onClick={() => {
                    adjustMutation.mutate({
                      payrollId: selectedPayroll.id,
                      data: {
                        approved_incentives: Number(adjIncentives || 0),
                        approved_additional_earnings: Number(adjAdditional || 0),
                        total_deductions: Number(adjDeductions || 0),
                        withholdings: Number(adjWithholdings || 0),
                        notes: adjNotes,
                      },
                    })
                  }}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  {adjustMutation.isPending ? 'Saving...' : 'Apply Adjustments'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
