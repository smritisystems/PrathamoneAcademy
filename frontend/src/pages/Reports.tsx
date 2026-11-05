/**
 * @file        Reports.tsx
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
 * @description Institute reports center offering Excel-like spreadsheet exploration, interactive filtering, sorting, and multi-format exports for fee collection, outstanding dues, and payment methods.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { InvoiceStatusBadge } from '../components/Badge'
import ExcelReportGrid, { ColumnConfig } from '../components/reports/ExcelReportGrid'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts'

export default function Reports() {
  const { selectedAcademicYearId, selectedInstitutionId } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'collection' | 'outstanding' | 'summary' | 'withdrawals' | 'withdrawal-analytics'>('collection')
  const [reportStatusFilter, setReportStatusFilter] = useState<'default' | 'all' | 'active' | 'withdrawn' | 'completed' | 'graduated' | 'inactive'>('default')

  // 1. Fee Collection Report
  const { data: collectionReport = [], isLoading: loadingCollection } = useQuery({
    queryKey: ['report-collection', selectedAcademicYearId, selectedInstitutionId, reportStatusFilter],
    queryFn: async () => {
      const res = await reportsApi.feeCollection({
        academic_year_id: selectedAcademicYearId || undefined,
        institution_id: selectedInstitutionId || undefined,
        status: reportStatusFilter !== 'default' ? reportStatusFilter : undefined,
      })
      return res.data
    },
    enabled: activeTab === 'collection',
  })

  // 2. Outstanding Dues Report
  const { data: outstandingReport = [], isLoading: loadingOutstanding } = useQuery({
    queryKey: ['report-outstanding', selectedAcademicYearId, selectedInstitutionId, reportStatusFilter],
    queryFn: async () => {
      const res = await reportsApi.outstanding({
        academic_year_id: selectedAcademicYearId || undefined,
        institution_id: selectedInstitutionId || undefined,
        status: reportStatusFilter !== 'default' ? reportStatusFilter : undefined,
      })
      return res.data
    },
    enabled: activeTab === 'outstanding',
  })

  // 4. Student Withdrawals Report
  const { data: withdrawalsReport = [], isLoading: loadingWithdrawals } = useQuery({
    queryKey: ['report-withdrawals', selectedAcademicYearId, selectedInstitutionId],
    queryFn: async () => {
      const res = await reportsApi.withdrawals({
        academic_year_id: selectedAcademicYearId || undefined,
      })
      return res.data
    },
    enabled: activeTab === 'withdrawals',
  })

  // 5. Withdrawal Analytics
  const { data: analyticsData, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['report-withdrawal-analytics', selectedAcademicYearId],
    queryFn: async () => {
      const res = await reportsApi.withdrawalAnalytics({
        academic_year_id: selectedAcademicYearId || undefined,
      })
      return res.data
    },
    enabled: activeTab === 'withdrawal-analytics',
  })

  // 3. Payments Summary
  const { data: summaryReport, isLoading: loadingSummary } = useQuery({
    queryKey: ['report-summary', selectedAcademicYearId],
    queryFn: async () => {
      const res = await reportsApi.paymentsSummary({
        academic_year_id: selectedAcademicYearId || undefined,
      })
      return res.data
    },
    enabled: activeTab === 'summary',
  })

  // ── Column Definitions: Fee Collection ──
  const collectionColumns = useMemo<ColumnConfig<any>[]>(
    () => [
      {
        id: 'admission_number',
        header: 'Admission #',
        accessorKey: 'admission_number',
        type: 'text',
        width: 150,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-mono font-medium text-slate-800">{val}</span>,
      },
      {
        id: 'student_name',
        header: 'Student Name',
        accessorKey: 'student_name',
        type: 'text',
        width: 230,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-semibold text-slate-900">{val}</span>,
      },
      {
        id: 'total_fees',
        header: 'Total Fees (₹)',
        accessorFn: (row: any) => Number(row.total_fees || 0),
        type: 'currency',
        width: 160,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-semibold text-slate-900">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'paid',
        header: 'Paid (₹)',
        accessorFn: (row: any) => Number(row.paid || 0),
        type: 'currency',
        width: 160,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-bold text-emerald-600">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'outstanding',
        header: 'Outstanding (₹)',
        accessorFn: (row: any) => Number(row.outstanding || 0),
        type: 'currency',
        width: 160,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-extrabold text-red-600">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'collection_pct',
        header: 'Collection %',
        accessorFn: (row: any) => {
          const tot = Number(row.total_fees || 0)
          const pd = Number(row.paid || 0)
          return tot > 0 ? Math.round((pd / tot) * 100) : 0
        },
        type: 'number',
        width: 140,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (pct) => {
          const n = Number(pct || 0)
          const badgeClass =
            n === 100
              ? 'bg-emerald-100 text-emerald-800'
              : n >= 50
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-800'
          return (
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>
              {n}%
            </span>
          )
        },
      },
    ],
    []
  )

  const collectionSummaryCalculations = useMemo(
    () => ({
      admission_number: () => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Total Collection Summary
        </span>
      ),
      total_fees: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.total_fees || 0), 0)
        return <span className="font-extrabold text-slate-900">₹{sum.toLocaleString('en-IN')}</span>
      },
      paid: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.paid || 0), 0)
        return <span className="font-extrabold text-emerald-700">₹{sum.toLocaleString('en-IN')}</span>
      },
      outstanding: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.outstanding || 0), 0)
        return <span className="font-extrabold text-red-700">₹{sum.toLocaleString('en-IN')}</span>
      },
      collection_pct: (rows: any[]) => {
        const total = rows.reduce((acc, r) => acc + Number(r.total_fees || 0), 0)
        const paid = rows.reduce((acc, r) => acc + Number(r.paid || 0), 0)
        const pct = total > 0 ? Math.round((paid / total) * 100) : 0
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
            {pct}% Avg
          </span>
        )
      },
    }),
    []
  )

  // ── Column Definitions: Outstanding Dues ──
  const outstandingColumns = useMemo<ColumnConfig<any>[]>(
    () => [
      {
        id: 'invoice_number',
        header: 'Invoice #',
        accessorKey: 'invoice_number',
        type: 'text',
        width: 150,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-mono font-bold text-blue-600">{val}</span>,
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
        render: (val) => <span className="font-mono text-slate-600">{val}</span>,
      },
      {
        id: 'student_name',
        header: 'Student Name',
        accessorKey: 'student_name',
        type: 'text',
        width: 220,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-semibold text-slate-900">{val}</span>,
      },
      {
        id: 'net_amount',
        header: 'Net Bill (₹)',
        accessorFn: (row: any) => Number(row.net_amount || 0),
        type: 'currency',
        width: 150,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span>₹{Number(val || 0).toLocaleString('en-IN')}</span>,
      },
      {
        id: 'paid_amount',
        header: 'Paid (₹)',
        accessorFn: (row: any) => Number(row.paid_amount || 0),
        type: 'currency',
        width: 150,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="text-emerald-600 font-semibold">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'outstanding',
        header: 'Outstanding (₹)',
        accessorFn: (row: any) => Number(row.outstanding || 0),
        type: 'currency',
        width: 160,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-extrabold text-red-600">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'due_date',
        header: 'Due Date',
        accessorKey: 'due_date',
        type: 'date',
        width: 140,
        sortable: true,
        filterable: true,
        filterType: 'date',
        render: (val) => (
          <span className="text-slate-600 font-medium">
            {val ? new Date(val).toLocaleDateString('en-IN') : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        type: 'select',
        width: 130,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => <InvoiceStatusBadge status={val} />,
      },
    ],
    []
  )

  const outstandingSummaryCalculations = useMemo(
    () => ({
      invoice_number: () => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Total Overdue Dues
        </span>
      ),
      net_amount: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.net_amount || 0), 0)
        return <span className="font-extrabold text-slate-900">₹{sum.toLocaleString('en-IN')}</span>
      },
      paid_amount: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.paid_amount || 0), 0)
        return <span className="font-extrabold text-emerald-700">₹{sum.toLocaleString('en-IN')}</span>
      },
      outstanding: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.outstanding || 0), 0)
        return <span className="font-extrabold text-red-700">₹{sum.toLocaleString('en-IN')}</span>
      },
    }),
    []
  )

  // ── Flattened Payment Methods Breakdown Data ──
  const methodsData = useMemo(() => {
    if (!summaryReport || !summaryReport.by_method) return []
    return Object.entries(summaryReport.by_method).map(([methodKey, val]: [string, any]) => {
      const count = Number(val?.count || 0)
      const total = Number(val?.total || 0)
      const avg = count > 0 ? Math.round(total / count) : 0
      return {
        id: methodKey,
        method: methodKey.replace(/_/g, ' ').toUpperCase(),
        count,
        total,
        avg,
      }
    })
  }, [summaryReport])

  const methodsColumns = useMemo<ColumnConfig<any>[]>(
    () => [
      {
        id: 'method',
        header: 'Payment Method',
        accessorKey: 'method',
        type: 'select',
        width: 220,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => <span className="font-bold text-slate-800">{val}</span>,
      },
      {
        id: 'count',
        header: 'Transactions',
        accessorKey: 'count',
        type: 'number',
        width: 150,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-semibold text-slate-700">{val}</span>,
      },
      {
        id: 'total',
        header: 'Total Volume (₹)',
        accessorKey: 'total',
        type: 'currency',
        width: 180,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-bold text-blue-900">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'avg',
        header: 'Average Ticket (₹)',
        accessorKey: 'avg',
        type: 'currency',
        width: 180,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-semibold text-slate-600">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
    ],
    []
  )

  const methodsSummaryCalculations = useMemo(
    () => ({
      method: () => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Total Payment Gateway Inflow
        </span>
      ),
      count: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.count || 0), 0)
        return <span className="font-extrabold text-slate-900">{sum}</span>
      },
      total: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.total || 0), 0)
        return <span className="font-extrabold text-blue-900">₹{sum.toLocaleString('en-IN')}</span>
      },
      avg: (rows: any[]) => {
        const total = rows.reduce((acc, r) => acc + Number(r.total || 0), 0)
        const count = rows.reduce((acc, r) => acc + Number(r.count || 0), 0)
        const avg = count > 0 ? Math.round(total / count) : 0
        return <span className="font-extrabold text-slate-700">₹{avg.toLocaleString('en-IN')}</span>
      },
    }),
    []
  )

  // ── Column Definitions: Student Withdrawals ──
  const withdrawalsColumns = useMemo<ColumnConfig<any>[]>(
    () => [
      {
        id: 'admission_number',
        header: 'Admission #',
        accessorKey: 'admission_number',
        type: 'text',
        width: 140,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-mono font-medium text-slate-800">{val}</span>,
      },
      {
        id: 'student_name',
        header: 'Student Name',
        accessorKey: 'student_name',
        type: 'text',
        width: 200,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-semibold text-slate-900">{val}</span>,
      },
      {
        id: 'standard_name',
        header: 'Class / Standard',
        accessorKey: 'standard_name',
        type: 'select',
        width: 130,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => <span className="text-slate-700">{val}</span>,
      },
      {
        id: 'division_name',
        header: 'Batch',
        accessorKey: 'division_name',
        type: 'select',
        width: 120,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => <span className="text-slate-700">{val || '—'}</span>,
      },
      {
        id: 'exit_date',
        header: 'Exit Date',
        accessorKey: 'exit_date',
        type: 'date',
        width: 120,
        sortable: true,
        filterable: true,
        filterType: 'date',
        render: (val) => <span className="font-mono text-slate-700">{val || '—'}</span>,
      },
      {
        id: 'exit_reason',
        header: 'Withdrawal Reason',
        accessorKey: 'exit_reason',
        type: 'select',
        width: 190,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => <span className="text-slate-800">{val || '—'}</span>,
      },
      {
        id: 'paid_classification',
        header: 'Paid Classification',
        accessorKey: 'paid_classification',
        type: 'select',
        width: 150,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
              val === 'Paid'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {val === 'Paid' ? 'Paid Attrition' : 'Unpaid Attrition'}
          </span>
        ),
      },
      {
        id: 'installment_at_exit',
        header: 'Installment at Exit',
        accessorKey: 'installment_at_exit',
        type: 'select',
        width: 160,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => <span className="text-slate-600 font-medium">{val || '—'}</span>,
      },
      {
        id: 'gross_paid',
        header: 'Gross Paid (₹)',
        accessorFn: (row: any) => Number(row.gross_paid || 0),
        type: 'currency',
        width: 140,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-semibold text-emerald-700">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'refund_amount',
        header: 'Refund (₹)',
        accessorFn: (row: any) => Number(row.refund_amount || 0),
        type: 'currency',
        width: 130,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-semibold text-amber-700">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'net_retained',
        header: 'Net Retained (₹)',
        accessorFn: (row: any) => Number(row.net_retained || 0),
        type: 'currency',
        width: 150,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-bold text-blue-900">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'outstanding_at_exit',
        header: 'Outstanding at Exit (₹)',
        accessorFn: (row: any) => Number(row.outstanding_at_exit || 0),
        type: 'currency',
        width: 160,
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => (
          <span className="font-semibold text-red-600">
            ₹{Number(val || 0).toLocaleString('en-IN')}
          </span>
        ),
      },
    ],
    []
  )

  const withdrawalsSummaryCalculations = useMemo(
    () => ({
      admission_number: (rows: any[]) => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Total: {rows.length} Withdrawn
        </span>
      ),
      gross_paid: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.gross_paid || 0), 0)
        return <span className="font-extrabold text-emerald-800">₹{sum.toLocaleString('en-IN')}</span>
      },
      refund_amount: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.refund_amount || 0), 0)
        return <span className="font-extrabold text-amber-800">₹{sum.toLocaleString('en-IN')}</span>
      },
      net_retained: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.net_retained || 0), 0)
        return <span className="font-extrabold text-blue-900">₹{sum.toLocaleString('en-IN')}</span>
      },
      outstanding_at_exit: (rows: any[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.outstanding_at_exit || 0), 0)
        return <span className="font-extrabold text-red-700">₹{sum.toLocaleString('en-IN')}</span>
      },
    }),
    []
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial & Academic Reports</h1>
        <p className="text-sm text-gray-500">
          Spreadsheet-grade report grid with sticky headers, multi-column search, column filters, and Excel/CSV/JSON exports
        </p>
      </div>

      {/* Tabs & Status Scope Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200">
        <nav className="flex space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('collection')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'collection'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Fee Collection Report
          </button>
          <button
            onClick={() => setActiveTab('outstanding')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'outstanding'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Outstanding Dues Report
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Payment Methods Breakdown
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'withdrawals'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Student Withdrawals
          </button>
          <button
            onClick={() => setActiveTab('withdrawal-analytics')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'withdrawal-analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Withdrawal Analytics
          </button>
        </nav>

        {/* Status Scope Selector for Financial Reports */}
        {(activeTab === 'collection' || activeTab === 'outstanding') && (
          <div className="flex items-center gap-2 pb-2 sm:pb-0 text-xs self-end sm:self-auto">
            <label htmlFor="report-status-filter" className="text-gray-600 font-medium whitespace-nowrap">
              Student Scope:
            </label>
            <select
              id="report-status-filter"
              data-testid="report-status-filter"
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">Institute Default (All Statuses)</option>
              <option value="active">Active Students Only</option>
              <option value="all">Include All Statuses</option>
              <option value="withdrawn">Withdrawn Students</option>
              <option value="completed">Completed Students</option>
              <option value="graduated">Graduated Students</option>
              <option value="inactive">Inactive Students</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'collection' && (
        <ExcelReportGrid
          title="Student Fee Collection Audit"
          subtitle="Real-time collection rates, total fee obligations, and outstanding balances per student"
          columns={collectionColumns}
          data={collectionReport}
          loading={loadingCollection}
          exportFilename="prashant_academy_fee_collection_report"
          sheetName="Fee Collection"
          showSummaryRow={true}
          summaryCalculations={collectionSummaryCalculations}
          defaultSort={{ columnId: 'outstanding', direction: 'desc' }}
        />
      )}

      {activeTab === 'outstanding' && (
        <ExcelReportGrid
          title="Outstanding Dues Ledger"
          subtitle="Pending and overdue student fee invoices with due dates and payment statuses"
          columns={outstandingColumns}
          data={outstandingReport}
          loading={loadingOutstanding}
          exportFilename="prashant_academy_outstanding_dues_report"
          sheetName="Outstanding Dues"
          showSummaryRow={true}
          summaryCalculations={outstandingSummaryCalculations}
          defaultSort={{ columnId: 'outstanding', direction: 'desc' }}
          emptyMessage="🎉 All fees are fully paid! No outstanding invoices recorded."
        />
      )}

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <ExcelReportGrid
            title="Payment Methods & Gateway Volume"
            subtitle="Breakdown of fee collections across payment modes (UPI, Cash, Cheque, Bank Transfer)"
            columns={methodsColumns}
            data={methodsData}
            loading={loadingSummary}
            exportFilename="prashant_academy_payment_methods_report"
            sheetName="Payment Methods"
            showSummaryRow={true}
            summaryCalculations={methodsSummaryCalculations}
            defaultSort={{ columnId: 'total', direction: 'desc' }}
          />

          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Export & Reconciliation Guidelines</h2>
            <div className="text-sm text-gray-600 space-y-1.5">
              <p>• <strong>Excel (.xlsx):</strong> Preserves numeric data types for spreadsheet calculations (SUM, AVERAGE, VLOOKUP) and auto-fits column widths.</p>
              <p>• <strong>CSV (.csv):</strong> Includes UTF-8 BOM encoding for correct Indian Rupee (₹) symbol rendering in Microsoft Excel, with formula injection protection.</p>
              <p>• <strong>JSON (.json):</strong> Formatted structure for API integrations, external ERP systems, or automated auditing pipelines.</p>
              <p>• <strong>Scope:</strong> Choose between exporting all filtered rows matching your search/filters or only the current page view.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <ExcelReportGrid
          title="Student Withdrawal & Exit Ledger"
          subtitle="Detailed roster of withdrawn students with paid/unpaid status, gross collections, refunds, net retained amounts, and outstanding balances"
          columns={withdrawalsColumns}
          data={withdrawalsReport}
          loading={loadingWithdrawals}
          exportFilename="prathamone_student_withdrawals_report"
          sheetName="Student Withdrawals"
          showSummaryRow={true}
          summaryCalculations={withdrawalsSummaryCalculations}
          defaultSort={{ columnId: 'exit_date', direction: 'desc' }}
        />
      )}

      {activeTab === 'withdrawal-analytics' && (
        <div className="space-y-6">
          {loadingAnalytics || !analyticsData ? (
            <div className="card text-center py-16 text-gray-400">Loading withdrawal analytics...</div>
          ) : (
            <>
              {/* Executive KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Enrolled vs Active</p>
                  <p className="text-xl font-bold text-gray-800">
                    {analyticsData.summary.active_students} <span className="text-sm font-normal text-gray-500">/ {analyticsData.summary.total_enrolled}</span>
                  </p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    {analyticsData.summary.total_enrolled > 0
                      ? Math.round((analyticsData.summary.active_students / analyticsData.summary.total_enrolled) * 100)
                      : 0}% Retention
                  </p>
                </div>

                <div className="card p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Attrition Rate</p>
                  <p className="text-xl font-bold text-red-600">{analyticsData.summary.attrition_rate}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analyticsData.summary.withdrawn_students} Total Withdrawn
                  </p>
                </div>

                <div className="card p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Paid vs Unpaid Attrition</p>
                  <p className="text-xl font-bold text-slate-800">
                    <span className="text-emerald-700">{analyticsData.summary.paid_withdrawn_count}</span>
                    <span className="text-gray-400 text-sm font-normal"> Paid / </span>
                    <span className="text-amber-700">{analyticsData.summary.unpaid_withdrawn_count}</span>
                    <span className="text-gray-400 text-sm font-normal"> Unpaid</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analyticsData.summary.withdrawn_students > 0
                      ? Math.round((analyticsData.summary.paid_withdrawn_count / analyticsData.summary.withdrawn_students) * 100)
                      : 0}% Paid Prior to Exit
                  </p>
                </div>

                <div className="card p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Net Retained Collections</p>
                  <p className="text-xl font-bold text-blue-900">
                    ₹{analyticsData.summary.net_retained.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Gross: ₹{analyticsData.summary.gross_paid.toLocaleString('en-IN')} &bull; Refunds: ₹{analyticsData.summary.refund_amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Chart: Monthly Withdrawal Trend */}
              {analyticsData.trends_monthly.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">
                    Monthly Student Withdrawal & Net Retained Inflow Trends
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.trends_monthly} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month_label" />
                        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                        <YAxis yAxisId="right" orientation="right" stroke="#ef4444" />
                        <RechartsTooltip />
                        <Legend />
                        <Bar yAxisId="right" dataKey="count" name="Withdrawn Count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="left" dataKey="net_retained" name="Net Retained (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Section: Reason Breakdown & Class/Batch Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reason Breakdown */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800">Withdrawals by Primary Reason</h3>
                  <div className="space-y-3">
                    {analyticsData.by_reason.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-gray-800">{item.reason}</span>
                          <span className="text-gray-500">
                            {item.count} student(s) &bull; <strong className="text-slate-900">{item.percentage}%</strong> &bull; Retained: ₹{item.net_retained.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {analyticsData.by_reason.length === 0 && (
                      <p className="text-xs text-gray-400 py-4 text-center">No withdrawal reason data available.</p>
                    )}
                  </div>
                </div>

                {/* Class & Batch Attrition Table */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800">Class & Batch Attrition Rates</h3>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2">Standard</th>
                          <th className="p-2">Batch</th>
                          <th className="p-2 text-center">Enrolled</th>
                          <th className="p-2 text-center">Withdrawn</th>
                          <th className="p-2 text-center">Attrition</th>
                          <th className="p-2 text-right">Retained (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analyticsData.by_class_batch.map((cb, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-2 font-medium text-gray-800">{cb.standard_name}</td>
                            <td className="p-2 text-gray-600">{cb.division_name || '—'}</td>
                            <td className="p-2 text-center font-mono">{cb.total_enrolled}</td>
                            <td className="p-2 text-center font-mono text-red-600 font-bold">{cb.withdrawn_count}</td>
                            <td className="p-2 text-center font-mono">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                  cb.attrition_rate > 15
                                    ? 'bg-red-100 text-red-800'
                                    : cb.attrition_rate > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {cb.attrition_rate}%
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono font-semibold text-blue-900">
                              ₹{cb.net_retained.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                        {analyticsData.by_class_batch.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-gray-400">
                              No class attrition data.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section: Installment Attrition Table */}
              {analyticsData.by_installment.length > 0 && (
                <div className="card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-gray-800">Installment-wise Attrition Distribution</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {analyticsData.by_installment.map((inst, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">{inst.installment_at_exit}</p>
                        <p className="text-lg font-bold text-slate-800">{inst.count} Student(s)</p>
                        <p className="text-xs font-semibold text-blue-900 mt-1">
                          ₹{inst.net_retained.toLocaleString('en-IN')} Retained
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
