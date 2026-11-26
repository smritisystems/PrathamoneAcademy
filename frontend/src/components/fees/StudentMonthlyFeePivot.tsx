/**
 * @file        StudentMonthlyFeePivot.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.fees
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.2.0
 * @created     2026-11-24
 * @updated     2026-11-26
 *
 * @description Production-grade Dynamic Student-wise Fee Collection Pivot with Print/Download Receipt Actions, Priority Remarks & Follow-up, Quick Receive Payment, Advanced Dependent Filters, 12-Month Matrix, and Transaction Popovers.
 */

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search, RotateCcw, Download, Eye, X, Filter,
  Users, CheckCircle2, AlertCircle, Calendar,
  CreditCard, School, Building2, Layers, Check,
  ArrowUpDown, ExternalLink, HelpCircle, Printer,
  Plus, Clock, ArrowUpRight, DollarSign, ArrowRight,
  MessageSquare, MessageCircle, Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import { feesApi, paymentsApi, communicationApi } from '../../api/endpoints'
import { extractApiErrorMessage } from '../../utils/errorTaxonomy'
import { formatINR } from '../../utils/formatters'
import { exportToExcel, downloadCsvRows, downloadBlob } from '../../utils/reportExport'
import { useTableSort } from '../../hooks/useTableSort'
import {
  useTableColumnFilters,
  buildSelectOptionsFromRows,
  type ColumnFilterDefinition,
} from '../../hooks/useTableColumnFilters'
import { SortableHeader } from '../common/SortableHeader'
import Modal from '../Modal'
import PaymentReceiptView from '../PaymentReceiptView'
import { InlineQuickFeeCollectionModal } from './InlineQuickFeeCollectionModal'
import type {
  StudentMonthlyPivotResponse,
  StudentMonthlyPivotRow,
  StudentPivotMonthCell,
  StudentPivotPaymentDetail
} from '../../types'

interface StudentMonthlyFeePivotProps {
  initialAcademicYearId?: number
  onNavigateToCollection?: (studentId: number) => void
}

export const StudentMonthlyFeePivot: React.FC<StudentMonthlyFeePivotProps> = ({
  initialAcademicYearId,
  onNavigateToCollection,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ─── Filter States ───────────────────────────────────────────────────────────
  const [academicYearId, setAcademicYearId] = useState<number | undefined>(initialAcademicYearId)
  const [boardId, setBoardId] = useState<string>('all')
  const [standardId, setStandardId] = useState<string>('all')
  const [divisionId, setDivisionId] = useState<string>('all')
  const [paymentStatus, setPaymentStatus] = useState<string>('all')
  const [studentStatus, setStudentStatus] = useState<string>('all')
  const [paymentMethod, setPaymentMethod] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // ─── Drilldown Modal State ──────────────────────────────────────────────────
  const [drilldownData, setDrilldownData] = useState<{
    studentName: string
    admissionNumber: string
    monthName: string
    totalAmount: number
    payments: StudentPivotPaymentDetail[]
  } | null>(null)

  // ─── Official Receipt Modal State ───────────────────────────────────────────
  const [activeReceiptNumber, setActiveReceiptNumber] = useState<string | null>(null)

  // Query detailed receipt for activeReceiptNumber
  const { data: detailedReceipt, isLoading: loadingDetailedReceipt } = useQuery({
    queryKey: ['pivot-detailed-receipt', activeReceiptNumber],
    queryFn: () => (activeReceiptNumber ? paymentsApi.getReceipt(activeReceiptNumber).then((r) => r.data) : null),
    enabled: !!activeReceiptNumber,
  })

  // ─── Quick Receive Payment Modal State ───────────────────────────────────────
  const [quickCollectData, setQuickCollectData] = useState<{
    student: StudentMonthlyPivotRow
    monthKey: string
    monthName: string
    year: number
  } | null>(null)

  // ─── Remark & Priority Modal State ──────────────────────────────────────────
  const [remarkModalData, setRemarkModalData] = useState<{ student: StudentMonthlyPivotRow } | null>(null)
  const [remarkText, setRemarkText] = useState<string>('')
  const [remarkPriority, setRemarkPriority] = useState<string>('normal')
  const [remarkFollowUpStatus, setRemarkFollowUpStatus] = useState<string>('follow_up_required')

  // ─── Query Backend Endpoint ─────────────────────────────────────────────────
  const queryParams = useMemo(() => ({
    academic_year_id: academicYearId,
    board_id: boardId === 'all' ? undefined : boardId,
    standard_id: standardId === 'all' ? undefined : standardId,
    division_id: divisionId === 'all' ? undefined : divisionId,
    payment_status: paymentStatus === 'all' ? undefined : paymentStatus,
    student_status: studentStatus === 'all' ? undefined : studentStatus,
    payment_method: paymentMethod === 'all' ? undefined : paymentMethod,
    search: searchQuery.trim() || undefined,
  }), [academicYearId, boardId, standardId, divisionId, paymentStatus, studentStatus, paymentMethod, searchQuery])

  const { data, isLoading, isError, error, refetch } = useQuery<StudentMonthlyPivotResponse>({
    queryKey: ['student-monthly-pivot', queryParams],
    queryFn: async () => {
      const res = await feesApi.getStudentMonthlyPivot(queryParams)
      return res.data
    },
    retry: (failureCount, err: any) => {
      const status = err?.response?.status
      if (status === 423 || status === 401 || status === 403) return false
      return failureCount < 1
    },
    staleTime: 30_000,
  })

  // ─── Save Remark & Priority Mutation ────────────────────────────────────────
  const saveRemarkMutation = useMutation({
    mutationFn: (payload: {
      student_id: number
      invoice_id?: number
      academic_year_id?: number
      remark: string
      priority: string
      follow_up_status: string
    }) => feesApi.saveStudentCollectionRemark(payload),
    onSuccess: () => {
      toast.success('Collection remark & priority updated!')
      setRemarkModalData(null)
      refetch()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to save collection remark')
    },
  })

  // ─── Dependent Filter Options ───────────────────────────────────────────────
  const filterOptions = data?.filter_options

  // Standards filtered by selected board
  const availableStandards = useMemo(() => {
    if (!filterOptions?.standards) return []
    if (boardId === 'all') return filterOptions.standards
    // When board is selected, find standards associated with that board via divisions
    const boardDivisions = filterOptions.divisions?.filter(d => String(d.board_id) === boardId) || []
    const stdIds = new Set(boardDivisions.map(d => d.standard_id))
    return filterOptions.standards.filter(s => stdIds.has(s.id))
  }, [filterOptions, boardId])

  // Divisions filtered by selected standard & board
  const availableDivisions = useMemo(() => {
    if (!filterOptions?.divisions) return []
    let divs = filterOptions.divisions
    if (boardId !== 'all') {
      divs = divs.filter(d => String(d.board_id) === boardId)
    }
    if (standardId !== 'all') {
      divs = divs.filter(d => String(d.standard_id) === standardId)
    }
    return divs
  }, [filterOptions, boardId, standardId])

  // ─── Column-Header Filters & Sorting (SSOT) ──────────────────────────────────
  const rawStudents = data?.students ?? []
  const monthsList = data?.months ?? []

  const pivotFilterDefinitions = useMemo<Record<string, ColumnFilterDefinition<StudentMonthlyPivotRow>>>(() => {
    const defs: Record<string, ColumnFilterDefinition<StudentMonthlyPivotRow>> = {
      student_name: { type: 'text', accessor: (s) => s.student_name },
      priority: { type: 'select', accessor: (s) => (s.priority || 'normal').toLowerCase() },
      admission_number: { type: 'text', accessor: (s) => s.admission_number },
      board_name: { type: 'select', accessor: (s) => s.board_name || '—' },
      standard_name: { type: 'select', accessor: (s) => s.standard_name || '—' },
      batch_name: { type: 'select', accessor: (s) => s.batch_name || '—' },
      package_fee: { type: 'number_range', accessor: (s) => s.package_fee },
      total_collected: { type: 'number_range', accessor: (s) => s.total_collected },
      balance: { type: 'number_range', accessor: (s) => s.balance },
      collection_rate: { type: 'number_range', accessor: (s) => s.collection_rate },
      status: { type: 'select', accessor: (s) => s.status },
    }
    for (const m of monthsList) {
      defs[`month_${m.key}`] = {
        type: 'number_range',
        accessor: (s) => s.months[m.key]?.amount || 0,
      }
    }
    return defs
  }, [monthsList])

  const {
    filteredData: headerFilteredStudents,
    columnFilters: pivotColumnFilters,
    setColumnFilter: setPivotColumnFilter,
    clearAllFilters: clearAllPivotColumnFilters,
    activeFilterCount: activePivotColumnFilterCount,
  } = useTableColumnFilters(rawStudents, pivotFilterDefinitions)

  const {
    sortedData: sortedFilteredStudents,
    sortKey: pivotSortKey,
    sortDirection: pivotSortDirection,
    requestSort: requestPivotSort,
    clearSort: clearPivotSort,
  } = useTableSort(headerFilteredStudents)

  const headerFilterOptions = useMemo(() => {
    const priorityCounts = new Map<string, number>()
    for (const s of rawStudents) {
      const p = (s.priority || 'normal').toLowerCase()
      priorityCounts.set(p, (priorityCounts.get(p) || 0) + 1)
    }
    const priorityOrder = ['urgent', 'high', 'normal']
    const priorityLabels: Record<string, string> = {
      urgent: 'Urgent',
      high: 'High',
      normal: 'Normal',
    }
    return {
      priority: priorityOrder
        .filter((p) => (priorityCounts.get(p) || 0) > 0 || p === 'urgent' || p === 'high' || p === 'normal')
        .map((p) => ({
          value: p,
          label: priorityLabels[p] || p.toUpperCase(),
          count: priorityCounts.get(p) || 0,
        })),
      board: buildSelectOptionsFromRows(rawStudents, (s) => s.board_name || '—'),
      grade: buildSelectOptionsFromRows(rawStudents, (s) => s.standard_name || '—'),
      batch: buildSelectOptionsFromRows(rawStudents, (s) => s.batch_name || '—'),
      status: [
        { value: 'paid', label: 'PAID', count: rawStudents.filter((s) => s.status === 'paid').length },
        { value: 'partial', label: 'PARTIAL', count: rawStudents.filter((s) => s.status === 'partial').length },
        { value: 'overdue', label: 'OVERDUE', count: rawStudents.filter((s) => s.status === 'overdue').length },
        { value: 'upcoming', label: 'UPCOMING', count: rawStudents.filter((s) => s.status === 'upcoming').length },
      ],
    }
  }, [rawStudents])

  const computedSummary = useMemo(() => {
    if (!data?.summary) return null
    if (activePivotColumnFilterCount === 0) return data.summary

    let totalAgreed = 0
    let totalCollected = 0
    let totalBalance = 0
    let defaultersCount = 0

    for (const st of sortedFilteredStudents) {
      totalAgreed += Number(st.package_fee || 0)
      totalCollected += Number(st.total_collected || 0)
      totalBalance += Number(st.balance || 0)
      if (st.status === 'overdue') defaultersCount += 1
    }
    const pct = totalAgreed > 0 ? Math.round((totalCollected / totalAgreed) * 1000) / 10 : 0
    return {
      total_students: sortedFilteredStudents.length,
      total_agreed_package: totalAgreed,
      total_collected: totalCollected,
      total_balance: totalBalance,
      collection_percentage: pct,
      defaulters_count: defaultersCount,
    }
  }, [data?.summary, activePivotColumnFilterCount, sortedFilteredStudents])

  const computedMonthlyTotals = useMemo(() => {
    if (!data?.monthly_totals) return {} as Record<string, number>
    if (activePivotColumnFilterCount === 0) return data.monthly_totals

    const totals: Record<string, number> = {}
    for (const m of monthsList) {
      let sum = 0
      for (const st of sortedFilteredStudents) {
        sum += Number(st.months[m.key]?.amount || 0)
      }
      totals[m.key] = sum
    }
    return totals
  }, [data?.monthly_totals, activePivotColumnFilterCount, monthsList, sortedFilteredStudents])

  // Reset Filters Handler
  const handleResetFilters = () => {
    setBoardId('all')
    setStandardId('all')
    setDivisionId('all')
    setPaymentStatus('all')
    setStudentStatus('all')
    setPaymentMethod('all')
    setSearchQuery('')
    clearAllPivotColumnFilters()
    clearPivotSort()
  }

  const isFiltered = boardId !== 'all' || standardId !== 'all' || divisionId !== 'all' ||
    paymentStatus !== 'all' || studentStatus !== 'all' || paymentMethod !== 'all' ||
    !!searchQuery.trim() || activePivotColumnFilterCount > 0 || Boolean(pivotSortKey)

  // ─── Receipt PDF Download Handler ──────────────────────────────────────────
  const handleDownloadReceiptPdf = async (receiptNumber: string) => {
    const toastId = `receipt-pdf-${receiptNumber}`
    try {
      toast.loading(`Generating official PDF for #${receiptNumber}...`, { id: toastId })
      const res = await paymentsApi.downloadReceiptPdf(receiptNumber)
      downloadBlob(res.data, `${receiptNumber}.pdf`)
      toast.success(`Receipt #${receiptNumber} downloaded successfully!`, { id: toastId })
    } catch (err: any) {
      toast.error(`Failed to download PDF for receipt #${receiptNumber}`, { id: toastId })
    }
  }

  // ─── Quick Receive Payment Handlers ─────────────────────────────────────────
  const handleReceivePayment = (
    student: StudentMonthlyPivotRow,
    monthKey: string,
    monthName: string,
    year: number
  ) => {
    setQuickCollectData({ student, monthKey, monthName, year })
  }

  const handleProceedToCollection = (studentId: number, openInNewTab: boolean = false) => {
    const targetName = quickCollectData?.student.student_name || 'Student'
    setQuickCollectData(null)

    if (openInNewTab) {
      window.open(`/fees/collect/${studentId}`, '_blank')
      return
    }

    if (onNavigateToCollection) {
      toast.success(`Opening Collection Desk for ${targetName}...`)
      onNavigateToCollection(studentId)
    } else {
      navigate(`/fees/collect/${studentId}`)
    }
  }

  const handleQuickPaymentCommitted = async () => {
    await refetch()
    queryClient.invalidateQueries({ queryKey: ['student-monthly-pivot'] })
    queryClient.invalidateQueries({ queryKey: ['fees-batch-monthly-matrix'] })
    queryClient.invalidateQueries({ queryKey: ['fees-month-collection-matrix'] })
    queryClient.invalidateQueries({ queryKey: ['fees-dimension-analytics'] })
    queryClient.invalidateQueries({ queryKey: ['fees-overview'] })
    queryClient.invalidateQueries({ queryKey: ['fee-register'] })
    queryClient.invalidateQueries({ queryKey: ['payments-list'] })
    queryClient.invalidateQueries({ queryKey: ['receipts-list'] })
  }

  // ─── Remark Modal Open Helper ───────────────────────────────────────────────
  const handleOpenRemarkModal = (student: StudentMonthlyPivotRow) => {
    setRemarkModalData({ student })
    setRemarkText(student.remark || '')
    setRemarkPriority(student.priority || 'normal')
    setRemarkFollowUpStatus(student.follow_up_status || 'follow_up_required')
  }

  // ─── WhatsApp & SMS Fee Reminder Handlers ───────────────────────────────────
  const handleSendWhatsAppReminder = (student: StudentMonthlyPivotRow) => {
    const rawPhone = student.phone || ''
    const cleanPhone = rawPhone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error(`No valid phone number recorded for ${student.student_name}`)
      return
    }
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    const message = `Dear Parent / Student,
This is a gentle fee reminder from Prashant Academy for *${student.student_name}* (Adm No: *${student.admission_number}*).

📋 Course: ${student.board_name} - ${student.standard_name} (${student.batch_name})
💰 Agreed Package: ₹${student.package_fee.toLocaleString('en-IN')}
✅ Realized Collection: ₹${student.total_collected.toLocaleString('en-IN')}
⚠️ Outstanding Balance: ₹${student.balance.toLocaleString('en-IN')}

Kindly arrange payment at your earliest convenience to maintain continuous academic access.
For online fee payment coordinates or receipt assistance, please contact our administrative desk.
Thank you,
Prashant Academy Coaching Institute`

    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success(`WhatsApp reminder initiated for ${student.student_name}`)
  }

  const handleDispatchSmsReminder = async (student: StudentMonthlyPivotRow) => {
    const rawPhone = student.phone || ''
    const cleanPhone = rawPhone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error(`No valid phone number recorded for ${student.student_name}`)
      return
    }
    const toastId = `sms-reminder-${student.student_id}`
    try {
      toast.loading(`Dispatching SMS reminder to ${student.phone}...`, { id: toastId })
      const message = `Fee Reminder from Prashant Academy: Dear Parent, balance due for ${student.student_name} (Adm: ${student.admission_number}) is Rs. ${student.balance.toLocaleString('en-IN')}. Please settle dues promptly.`
      await communicationApi.sendMessage({
        channel: 'sms',
        message,
        recipients: [
          {
            recipient_type: 'student',
            recipient_id: student.student_id,
            name: student.student_name,
            destination: cleanPhone,
          },
        ],
      })
      toast.success(`SMS reminder dispatched to ${student.student_name} (${student.phone})`, { id: toastId })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to dispatch SMS reminder`, { id: toastId })
    }
  }

  // ─── Export Functions ───────────────────────────────────────────────────────
  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (!data || !sortedFilteredStudents.length) return

    const exportSummary = computedSummary || data.summary
    const exportMonthlyTotals = computedMonthlyTotals || data.monthly_totals
    const filename = `student_monthly_fee_pivot_${new Date().toISOString().slice(0, 10)}`

    if (format === 'csv') {
      const headers = [
        'Admission #',
        'Student Name',
        'Board',
        'Grade',
        'Batch',
        'Agreed Package (₹)',
        ...data.months.map(m => `${m.short_name} ${m.year}`),
        'Total Realized (₹)',
        'Balance Due (₹)',
        'Recovery Rate %',
        'Status',
        'Priority',
        'Remarks',
      ]

      const rows: (string | number)[][] = sortedFilteredStudents.map(st => [
        st.admission_number,
        st.student_name,
        st.board_name,
        st.standard_name,
        st.batch_name,
        st.package_fee,
        ...data.months.map(m => st.months[m.key]?.amount || 0),
        st.total_collected,
        st.balance,
        st.collection_rate,
        st.status.toUpperCase(),
        st.priority ? st.priority.toUpperCase() : 'NORMAL',
        st.remark || '',
      ])

      // Append total summary row
      rows.push([
        'TOTALS',
        `${sortedFilteredStudents.length} Students`,
        '',
        '',
        '',
        exportSummary.total_agreed_package,
        ...data.months.map(m => exportMonthlyTotals[m.key] || 0),
        exportSummary.total_collected,
        exportSummary.total_balance,
        exportSummary.collection_percentage,
        `${exportSummary.defaulters_count} Defaulters`,
        '',
        '',
      ])

      downloadCsvRows(filename, [headers, ...rows])
      return
    }

    // Excel export (.xlsx)
    const columns = [
      { id: 'admission_number', header: 'Admission #' },
      { id: 'student_name', header: 'Student Name' },
      { id: 'board_name', header: 'Board' },
      { id: 'standard_name', header: 'Grade' },
      { id: 'batch_name', header: 'Batch' },
      { id: 'package_fee', header: 'Agreed Package (₹)', type: 'currency' as const },
      ...data.months.map(m => ({
        id: `month_${m.key}`,
        header: `${m.short_name} ${m.year}`,
        accessorFn: (row: StudentMonthlyPivotRow) => row.months[m.key]?.amount || 0,
        type: 'currency' as const,
      })),
      { id: 'total_collected', header: 'Total Realized (₹)', type: 'currency' as const },
      { id: 'balance', header: 'Balance Due (₹)', type: 'currency' as const },
      { id: 'collection_rate', header: 'Recovery Rate %', type: 'percentage' as const },
      { id: 'status', header: 'Status' },
      { id: 'priority', header: 'Priority' },
      { id: 'remark', header: 'Remarks' },
    ]

    await exportToExcel({
      filename,
      title: 'PrathamOne EduOS — Student-wise Monthly Fee Collection Pivot',
      sheetName: 'Student Monthly Pivot',
      columns,
      data: sortedFilteredStudents,
      calculationNotes: [
        `Academic Year: ${filterOptions?.academic_years?.find(ay => ay.id === academicYearId)?.name || 'All'}`,
        `Generated: ${new Date().toLocaleString('en-IN')}`,
        `Total Realized Collections: ₹${exportSummary.total_collected.toLocaleString('en-IN')}`,
        `Total Pending Receivables: ₹${exportSummary.total_balance.toLocaleString('en-IN')}`,
      ],
    })
  }

  // Active student in current drilldown modal (if any)
  const currentDrilldownStudent = useMemo(() => {
    if (!drilldownData || !data?.students) return null
    return data.students.find(s => s.admission_number === drilldownData.admissionNumber) || null
  }, [drilldownData, data?.students])

  return (
    <div className="space-y-4">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 1. WORKSPACE HEADER & FILTER CONTROLS                                      */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                Student-wise Monthly Fee Collection Pivot
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60 uppercase tracking-wider">
                  Live Ledger
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Real-time 12-month student collection matrix with receipt print, PDF download, priority remarks, and quick collection actions
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/70 transition-all cursor-pointer"
                title="Reset all filters to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}

            <button
              onClick={() => handleExport('xlsx')}
              disabled={isLoading || !data?.students?.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => handleExport('csv')}
              disabled={isLoading || !data?.students?.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* CASCADING FILTER TOOLBAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* 1. Academic Year */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Academic Year</label>
            <select
              value={academicYearId || ''}
              onChange={(e) => setAcademicYearId(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden cursor-pointer"
            >
              {filterOptions?.academic_years?.map(ay => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Educational Board */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Board</label>
            <select
              value={boardId}
              onChange={(e) => {
                setBoardId(e.target.value)
                setStandardId('all')
                setDivisionId('all')
              }}
              className="bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Boards</option>
              {filterOptions?.boards?.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Standard / Grade */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Grade / Standard</label>
            <select
              value={standardId}
              onChange={(e) => {
                setStandardId(e.target.value)
                setDivisionId('all')
              }}
              className="bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Standards</option>
              {availableStandards.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Batch / Division */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Batch / Division</label>
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Batches</option>
              {availableDivisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* 5. Payment Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="overdue">Overdue Defaulters</option>
              <option value="upcoming">Upcoming / No Dues</option>
            </select>
          </div>

          {/* 6. Payment Method */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Mode</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI / QR</option>
              <option value="BANK_TRANSFER">Bank / NEFT</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          {/* 7. Live Student Search */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search Student</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Name, Adm #, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-8 pr-2.5 py-1.5 font-medium text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 2. SUMMARY METRICS RIBBON                                                  */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {computedSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Students Filtered</span>
            <div className="mt-1 text-xl font-black text-slate-900 font-mono">
              {computedSummary.total_students}
            </div>
            <div className="text-[10px] text-slate-400">Active in view</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Agreed Package</span>
            <div className="mt-1 text-xl font-black text-slate-900 font-mono">
              ₹{computedSummary.total_agreed_package.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400">Institutional Target</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Collected</span>
            <div className="mt-1 text-xl font-black text-emerald-600 font-mono">
              ₹{computedSummary.total_collected.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">Realized to Date</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Pending Balance</span>
            <div className="mt-1 text-xl font-black text-rose-600 font-mono">
              ₹{computedSummary.total_balance.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400">Outstanding Receivables</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Realization Rate</span>
            <div className="mt-1 text-xl font-black text-slate-900 font-mono">
              {computedSummary.collection_percentage}%
            </div>
            <div className="mt-1 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, computedSummary.collection_percentage)}%` }}
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Overdue Defaulters</span>
            <div className="mt-1 text-xl font-black text-amber-600 font-mono">
              {computedSummary.defaulters_count}
            </div>
            <div className="text-[10px] text-slate-400">Accounts requiring follow-up</div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 3. DYNAMIC STUDENT-WISE 12-MONTH PIVOT TABLE                               */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {!isLoading && !isError && rawStudents.length > 0 && (activePivotColumnFilterCount > 0 || pivotSortKey) && (
          <div className="px-4 py-2 bg-emerald-50/60 border-b border-emerald-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                Showing <span className="font-mono font-bold">{sortedFilteredStudents.length}</span> of{' '}
                <span className="font-mono font-bold">{rawStudents.length}</span> students
                {activePivotColumnFilterCount > 0 && ` • ${activePivotColumnFilterCount} header filter(s) active`}
                {pivotSortKey && ` • Sorted by ${pivotSortKey} (${pivotSortDirection?.toUpperCase()})`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {pivotSortKey && (
                <button
                  type="button"
                  onClick={clearPivotSort}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-[11px] cursor-pointer"
                >
                  Clear Sort
                </button>
              )}
              {activePivotColumnFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllPivotColumnFilters}
                  className="px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-[11px] cursor-pointer"
                >
                  Clear Header Filters
                </button>
              )}
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-emerald-600" />
            <p className="text-xs font-bold text-slate-600">Calculating Student Collection Matrix & 12-Month Pivot...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-600 space-y-2" role="alert">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="font-bold text-sm">Failed to load student collection pivot</p>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              {extractApiErrorMessage(error, 'Unable to load the student monthly pivot right now.')}
            </p>
            {(error as any)?.response?.status !== 423 && (
              <button
                onClick={() => refetch()}
                className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        ) : !data?.students || data.students.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="p-3 bg-slate-100 text-slate-500 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Enrolled Students Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No students match the selected Board, Grade, Batch, or search criteria.
            </p>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs min-w-[1450px]">
              <thead>
                <tr className="bg-slate-50/95 border-b border-slate-200/90 text-slate-600 font-semibold sticky top-0 z-20">
                  {/* Sticky Columns */}
                  <SortableHeader
                    columnKey="student_name"
                    label="Student Name & Priority"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="string"
                    filterType="text"
                    filterValue={pivotColumnFilters.student_name}
                    onFilterChange={setPivotColumnFilter}
                    filterPlaceholder="Search student name..."
                    secondaryFacetLabel="Priority"
                    secondaryFacetOptions={headerFilterOptions.priority}
                    secondaryFacetValue={pivotColumnFilters.priority || []}
                    onSecondaryFacetChange={(vals) => setPivotColumnFilter('priority', vals)}
                    compact
                    className="px-4 sticky left-0 z-30 bg-slate-50 min-w-[185px] shadow-xs"
                  />
                  <SortableHeader
                    columnKey="admission_number"
                    label="Admission #"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="string"
                    filterType="text"
                    filterValue={pivotColumnFilters.admission_number}
                    onFilterChange={setPivotColumnFilter}
                    filterPlaceholder="Search admission #..."
                    compact
                    className="px-3 sticky left-[185px] z-30 bg-slate-50 min-w-[125px] shadow-xs"
                  />
                  {/* Academic Coordinates */}
                  <SortableHeader
                    columnKey="board_name"
                    label="Board"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="string"
                    filterType="select"
                    filterValue={pivotColumnFilters.board_name}
                    onFilterChange={setPivotColumnFilter}
                    filterOptions={headerFilterOptions.board}
                    compact
                    className="px-3 min-w-[90px]"
                  />
                  <SortableHeader
                    columnKey="standard_name"
                    label="Grade"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="string"
                    filterType="select"
                    filterValue={pivotColumnFilters.standard_name}
                    onFilterChange={setPivotColumnFilter}
                    filterOptions={headerFilterOptions.grade}
                    compact
                    className="px-3 min-w-[95px]"
                  />
                  <SortableHeader
                    columnKey="batch_name"
                    label="Batch"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="string"
                    filterType="select"
                    filterValue={pivotColumnFilters.batch_name}
                    onFilterChange={setPivotColumnFilter}
                    filterOptions={headerFilterOptions.batch}
                    compact
                    className="px-3 min-w-[100px]"
                  />
                  <SortableHeader
                    columnKey="package_fee"
                    label="Agreed Pkg (₹)"
                    align="right"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="number"
                    filterType="number_range"
                    filterValue={pivotColumnFilters.package_fee}
                    onFilterChange={setPivotColumnFilter}
                    compact
                    className="px-3 min-w-[115px]"
                  />

                  {/* 12 Academic Months Columns */}
                  {data.months.map(m => (
                    <SortableHeader
                      key={m.key}
                      columnKey={`month_${m.key}`}
                      label={`${m.short_name} ${m.year}`}
                      align="center"
                      currentSortKey={pivotSortKey}
                      currentDirection={pivotSortDirection}
                      onSort={requestPivotSort}
                      accessor={(st: StudentMonthlyPivotRow) => st.months[m.key]?.amount || 0}
                      sortType="number"
                      filterType="number_range"
                      filterValue={pivotColumnFilters[`month_${m.key}`]}
                      onFilterChange={setPivotColumnFilter}
                      compact
                      className="px-2.5 min-w-[96px] border-l border-slate-100"
                    >
                      <div className="leading-tight">
                        <div className="font-bold text-slate-800">{m.short_name}</div>
                        <div className="text-[9px] text-slate-400 font-normal">{m.year}</div>
                      </div>
                    </SortableHeader>
                  ))}

                  {/* Summary Columns */}
                  <SortableHeader
                    columnKey="total_collected"
                    label="Total Realized (₹)"
                    align="right"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="number"
                    filterType="number_range"
                    filterValue={pivotColumnFilters.total_collected}
                    onFilterChange={setPivotColumnFilter}
                    compact
                    className="px-3 min-w-[125px] border-l border-slate-200/80 text-emerald-800 bg-emerald-50/30"
                  />
                  <SortableHeader
                    columnKey="balance"
                    label="Balance (₹)"
                    align="right"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="number"
                    filterType="number_range"
                    filterValue={pivotColumnFilters.balance}
                    onFilterChange={setPivotColumnFilter}
                    compact
                    className="px-3 min-w-[115px] text-rose-700 bg-rose-50/30"
                  />
                  <SortableHeader
                    columnKey="collection_rate"
                    label="Recovery %"
                    align="center"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="number"
                    filterType="number_range"
                    filterValue={pivotColumnFilters.collection_rate}
                    onFilterChange={setPivotColumnFilter}
                    compact
                    className="px-3 min-w-[115px]"
                  />
                  <SortableHeader
                    columnKey="status"
                    label="Status"
                    align="center"
                    currentSortKey={pivotSortKey}
                    currentDirection={pivotSortDirection}
                    onSort={requestPivotSort}
                    sortType="string"
                    filterType="select"
                    filterValue={pivotColumnFilters.status}
                    onFilterChange={setPivotColumnFilter}
                    filterOptions={headerFilterOptions.status}
                    compact
                    className="px-3 min-w-[95px]"
                  />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {sortedFilteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10 + data.months.length} className="px-6 py-10 text-center">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700">No students match the active header filters.</p>
                        <button
                          type="button"
                          onClick={clearAllPivotColumnFilters}
                          className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Clear Header Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : sortedFilteredStudents.map((st) => (
                  <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Sticky Student Name with Priority Badges */}
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 sticky left-0 z-10 bg-white hover:bg-slate-50 shadow-xs whitespace-nowrap group/name">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            st.status === 'paid' ? 'bg-emerald-500' :
                            st.status === 'partial' ? 'bg-amber-500' :
                            st.status === 'overdue' ? 'bg-rose-500' : 'bg-slate-300'
                          }`} />
                          <span className="truncate max-w-[115px] font-semibold text-slate-900">{st.student_name}</span>
                        </div>

                        {/* Priority / Remark Badge or Quick Action */}
                        <div className="flex items-center gap-1 shrink-0">
                          {st.priority === 'urgent' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRemarkModal(st)}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs hover:bg-rose-200 transition-all cursor-pointer"
                              title={`Priority: URGENT • ${st.remark || 'Click to view/edit'}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                              <span>URGENT</span>
                            </button>
                          ) : st.priority === 'high' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRemarkModal(st)}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs hover:bg-amber-200 transition-all cursor-pointer"
                              title={`Priority: HIGH • ${st.remark || 'Click to view/edit'}`}
                            >
                              <span>HIGH</span>
                            </button>
                          ) : st.remark ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRemarkModal(st)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer"
                              title={`Remark: ${st.remark}`}
                            >
                              <MessageSquare className="w-2.5 h-2.5 text-blue-500" />
                              <span>Note</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenRemarkModal(st)}
                              className="opacity-0 group-hover/name:opacity-100 p-0.5 text-slate-400 hover:text-emerald-700 rounded transition-all cursor-pointer"
                              title="Add collection remark / priority follow-up"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                          )}
                          {/* Quick WhatsApp Reminder when balance > 0 */}
                          {st.balance > 0 && st.phone && st.phone !== '—' && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppReminder(st)}
                              className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title={`Send instant WhatsApp fee reminder to ${st.student_name} (${st.phone})`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Sticky Admission # */}
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 sticky left-[185px] z-10 bg-white hover:bg-slate-50 shadow-xs whitespace-nowrap">
                      {st.admission_number}
                    </td>

                    {/* Coordinates */}
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{st.board_name}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{st.standard_name}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">{st.batch_name}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      ₹{st.package_fee.toLocaleString('en-IN')}
                    </td>

                    {/* 12 Monthly Cells */}
                    {data.months.map(m => {
                      const cell = st.months[m.key]
                      const hasPayments = cell && cell.amount > 0
                      const isPending = cell && cell.is_pending

                      return (
                        <td
                          key={m.key}
                          className="px-2 py-2 text-center border-l border-slate-100 whitespace-nowrap"
                        >
                          {hasPayments ? (
                            <button
                              onClick={() => setDrilldownData({
                                studentName: st.student_name,
                                admissionNumber: st.admission_number,
                                monthName: `${m.name} ${m.year}`,
                                totalAmount: cell.amount,
                                payments: cell.payments,
                              })}
                              className="w-full inline-flex flex-col items-center justify-center px-1.5 py-1 rounded-lg bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/60 transition-all cursor-pointer group shadow-2xs"
                              title={`Click to view ${cell.payments_count} transaction(s), print receipt, or download PDF`}
                            >
                              <span className="font-mono font-bold text-emerald-800 text-[11px]">
                                ₹{cell.amount.toLocaleString('en-IN')}
                              </span>
                              {cell.payments_count > 1 && (
                                <span className="text-[9px] font-bold text-emerald-600">
                                  {cell.payments_count} txns
                                </span>
                              )}
                            </button>
                          ) : isPending ? (
                            <button
                              onClick={() => handleReceivePayment(st, m.key, m.name, m.year)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-[10px] font-bold transition-all cursor-pointer group shadow-2xs"
                              title={`Click to receive payment for ${st.student_name} (${m.name} ${m.year})`}
                            >
                              <Clock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Pending</span>
                              <ArrowUpRight className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                            </button>
                          ) : (
                            <div className="group relative flex items-center justify-center min-h-[26px]">
                              <span className="text-slate-300 font-mono group-hover:hidden select-none">—</span>
                              <button
                                onClick={() => handleReceivePayment(st, m.key, m.name, m.year)}
                                className="hidden group-hover:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                                title={`Receive payment for ${st.student_name} (${m.name} ${m.year})`}
                              >
                                <Plus className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Collect</span>
                              </button>
                            </div>
                          )}
                        </td>
                      )
                    })}

                    {/* Trailing Summaries */}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 border-l border-slate-200/80 bg-emerald-50/10 whitespace-nowrap">
                      ₹{st.total_collected.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600 bg-rose-50/10 whitespace-nowrap">
                      ₹{st.balance.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, st.collection_rate)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-700">
                          {st.collection_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        st.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                        st.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                        st.status === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {st.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* STICKY TOTAL FOOTER ROW                                       */}
              {/* ───────────────────────────────────────────────────────────── */}
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-20">
                  <td className="px-4 py-3 sticky left-0 z-30 bg-slate-100 shadow-xs font-black">
                    INSTITUTE TOTALS
                  </td>
                  <td className="px-3 py-3 sticky left-[185px] z-30 bg-slate-100 shadow-xs font-mono text-slate-500">
                    {sortedFilteredStudents.length} Students
                  </td>
                  <td className="px-3 py-3 text-slate-500">—</td>
                  <td className="px-3 py-3 text-slate-500">—</td>
                  <td className="px-3 py-3 text-slate-500">—</td>
                  <td className="px-3 py-3 text-right font-mono font-black">
                    ₹{(computedSummary?.total_agreed_package ?? data.summary.total_agreed_package).toLocaleString('en-IN')}
                  </td>

                  {/* Monthly Column Sums */}
                  {data.months.map(m => {
                    const colTotal = computedMonthlyTotals[m.key] ?? 0
                    return (
                      <td key={m.key} className="px-2 py-3 text-center border-l border-slate-200 font-mono text-[11px] font-black text-emerald-800">
                        {colTotal > 0 ? `₹${colTotal.toLocaleString('en-IN')}` : '—'}
                      </td>
                    )
                  })}

                  {/* Total Collections & Balance */}
                  <td className="px-3 py-3 text-right font-mono font-black text-emerald-800 border-l border-slate-300 bg-emerald-100/30">
                    ₹{(computedSummary?.total_collected ?? data.summary.total_collected).toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-rose-700 bg-rose-100/30">
                    ₹{(computedSummary?.total_balance ?? data.summary.total_balance).toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-black text-slate-900">
                    {computedSummary?.collection_percentage ?? data.summary.collection_percentage}%
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-bold text-slate-500">
                    {computedSummary?.defaulters_count ?? data.summary.defaulters_count} Defaulters
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 4. TRANSACTION DRILLDOWN MODAL / POPOVER WITH PRINT & DOWNLOAD            */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {drilldownData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Monthly Payment Details</h3>
                  <p className="text-[11px] text-slate-500">
                    {drilldownData.monthName} • {drilldownData.studentName} ({drilldownData.admissionNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrilldownData(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Total Month Collection</span>
                  <div className="text-xl font-black text-emerald-700 font-mono">
                    ₹{drilldownData.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Primary Quick Action Buttons */}
                <div className="flex items-center gap-2">
                  {currentDrilldownStudent && currentDrilldownStudent.balance > 0 && currentDrilldownStudent.phone && currentDrilldownStudent.phone !== '—' && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReminder(currentDrilldownStudent)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs transition-all cursor-pointer"
                      title={`Send WhatsApp fee reminder (Balance: ₹${currentDrilldownStudent.balance.toLocaleString('en-IN')})`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Reminder</span>
                    </button>
                  )}
                  {drilldownData.payments.length === 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveReceiptNumber(drilldownData.payments[0].receipt_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-slate-800 border border-slate-300 shadow-2xs transition-all cursor-pointer"
                        title="View & Print Official A5 Receipt Voucher"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>Print Receipt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadReceiptPdf(drilldownData.payments[0].receipt_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                        title="Download Receipt PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        drilldownData.payments.forEach(p => handleDownloadReceiptPdf(p.receipt_number))
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                      title="Download PDF for all transactions"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download All PDFs ({drilldownData.payments.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Account Remark & Follow-up Priority Banner */}
              {currentDrilldownStudent && (
                <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold text-slate-800">Collection Remark & Priority:</span>
                      {currentDrilldownStudent.priority === 'urgent' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          🔥 URGENT
                        </span>
                      ) : currentDrilldownStudent.priority === 'high' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          ⚠️ HIGH
                        </span>
                      ) : currentDrilldownStudent.priority ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                          {currentDrilldownStudent.priority}
                        </span>
                      ) : null}

                      {currentDrilldownStudent.follow_up_status && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                          {currentDrilldownStudent.follow_up_status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRemarkModal(currentDrilldownStudent)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
                    >
                      {currentDrilldownStudent.remark ? 'Edit Remark' : '+ Add Remark'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80 font-medium">
                    {currentDrilldownStudent.remark || 'No specific collection remarks recorded for this student.'}
                  </p>
                </div>
              )}

              {/* Individual Transactions Table with Print & Download Action Buttons */}
              <div className="overflow-hidden border border-slate-200/80 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Receipt #</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2 text-right">Amount (₹)</th>
                      <th className="px-3 py-2 text-center">Receipt Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldownData.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">
                          {p.receipt_number}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{p.payment_date}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveReceiptNumber(p.receipt_number)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
                              title="View & Print Official Receipt Voucher"
                            >
                              <Printer className="w-3 h-3 text-slate-600" />
                              <span>Print</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadReceiptPdf(p.receipt_number)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
                              title="Download PDF Receipt"
                            >
                              <Download className="w-3 h-3 text-emerald-600" />
                              <span>PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDrilldownData(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 5. INLINE QUICK FEE COLLECTION & RECEIPT MODAL                            */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {quickCollectData && (
        <InlineQuickFeeCollectionModal
          isOpen={!!quickCollectData}
          onClose={() => setQuickCollectData(null)}
          student={quickCollectData.student}
          monthKey={quickCollectData.monthKey}
          monthName={quickCollectData.monthName}
          year={quickCollectData.year}
          academicYearId={academicYearId}
          academicYears={filterOptions?.academic_years}
          fallbackPaymentMethods={filterOptions?.payment_methods}
          onPaymentCommitted={handleQuickPaymentCommitted}
          onOpenCollectionDesk={(studentId) => handleProceedToCollection(studentId, false)}
          onOpenCollectionTerminal={(studentId) => handleProceedToCollection(studentId, true)}
        />
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 6. OFFICIAL FEE RECEIPT MODAL                                             */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeReceiptNumber && (
        <Modal
          isOpen={!!activeReceiptNumber}
          onClose={() => setActiveReceiptNumber(null)}
          title={`Official Fee Receipt #${activeReceiptNumber}`}
          size="xl"
        >
          {loadingDetailedReceipt ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2" />
              Loading official receipt voucher...
            </div>
          ) : detailedReceipt ? (
            <PaymentReceiptView
              receipt={detailedReceipt}
              showPrintActions={true}
              showReprintButton={true}
              onReceiptUpdated={(updated) => {
                queryClient.setQueryData(['pivot-detailed-receipt', activeReceiptNumber], updated)
              }}
              onClose={() => setActiveReceiptNumber(null)}
            />
          ) : (
            <div className="p-6 text-center text-rose-500 text-xs">
              Failed to load official receipt details.
            </div>
          )}
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 7. COLLECTION REMARK & PRIORITY MODAL                                     */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {remarkModalData && (
        <Modal
          isOpen={!!remarkModalData}
          onClose={() => setRemarkModalData(null)}
          title={`Collection Remark & Priority • ${remarkModalData.student.student_name}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900">{remarkModalData.student.student_name}</span>
                <span className="text-slate-500 font-mono ml-2">({remarkModalData.student.admission_number})</span>
              </div>
              <span className="text-slate-600 font-mono">
                Balance Due: <strong className="text-rose-600">₹{remarkModalData.student.balance.toLocaleString('en-IN')}</strong>
              </span>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Follow-up Priority</label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'urgent', label: '🔥 Urgent', activeBg: 'bg-rose-600 text-white border-rose-600' },
                  { id: 'high', label: '⚠️ High', activeBg: 'bg-amber-600 text-white border-amber-600' },
                  { id: 'normal', label: '🔵 Normal', activeBg: 'bg-blue-600 text-white border-blue-600' },
                  { id: 'low', label: '⚪ Low', activeBg: 'bg-slate-700 text-white border-slate-700' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setRemarkPriority(p.id)}
                    className={`py-2 px-2 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      remarkPriority === p.id
                        ? p.activeBg
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Follow-up Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Follow-up Status</label>
              <select
                value={remarkFollowUpStatus}
                onChange={(e) => setRemarkFollowUpStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden cursor-pointer"
              >
                <option value="follow_up_required">Follow-up Required (Pending contact)</option>
                <option value="promise_to_pay">Promise to Pay (Parent committed to a date)</option>
                <option value="under_review">Under Review (Concession / Verification requested)</option>
                <option value="disputed">Disputed / Query (Fee discrepancy raised)</option>
                <option value="cleared">Cleared / Resolved (Dues settled)</option>
              </select>
            </div>

            {/* Remark Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Remark / Discussion Notes</label>
              <textarea
                rows={3}
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="Enter parent discussion details, committed payment date, cheque clearance note, or follow-up instructions..."
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl p-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden placeholder:text-slate-400"
              />
            </div>

            {/* Instant WhatsApp & SMS Fee Reminder Dispatch */}
            {remarkModalData.student.balance > 0 && (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/90 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Instant Fee Reminder Dispatch</span>
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    📱 {remarkModalData.student.phone || 'No phone'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Send automated payment reminder with outstanding balance (₹{remarkModalData.student.balance.toLocaleString('en-IN')}) directly to the parent.
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppReminder(remarkModalData.student)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                    title="Open in WhatsApp Web / App"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDispatchSmsReminder(remarkModalData.student)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
                    title="Dispatch official SMS"
                  >
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dispatch SMS</span>
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRemarkModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveRemarkMutation.isPending || !remarkText.trim()}
                onClick={() => {
                  saveRemarkMutation.mutate({
                    student_id: remarkModalData.student.student_id,
                    invoice_id: remarkModalData.student.invoice_id,
                    academic_year_id: academicYearId,
                    remark: remarkText.trim(),
                    priority: remarkPriority,
                    follow_up_status: remarkFollowUpStatus,
                  })
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {saveRemarkMutation.isPending ? 'Saving...' : 'Save Remark & Priority'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
