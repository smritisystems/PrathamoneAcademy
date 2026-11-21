/**
 * @file        BatchMonthlyFeeMatrix.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      src.components.fees
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-21
 * @updated     2026-11-21
 *
 * @description Source component for Batchmonthlyfeematrix in the src.components.fees module.
 */

// /**
//  * @file        BatchMonthlyFeeMatrix.tsx
//  * @project     PrathamOne EduOS Coaching Institute Management System
//  * @module      frontend.src.components.fees
//  *
//  * @author      Jawahar R. Mallah
//  * @organization Smritisys & AITDL Networks
//  * @client      Prashant Academy Coaching Institute
//  * @copyright   Copyright (c) 2026 PrathamOne EduOS
//  * @license     Proprietary
//  *
//  * @version     1.0.0
//  * @created     2026-11-21
//  * @updated     2026-11-21
//  *
//  * @description 2D Cross-Tabulation Batch Monthly Fee Collection Matrix (Executive Daybook Grid)
//  *              mirroring Google Sheets / Excel workflows with live ERP ledger sync, click-to-collect,
//  *              instant standard/batch tab switching, and one-click spreadsheet export.
//  */

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Users,
  CreditCard,
  Layers,
  ArrowUpRight,
  X,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { feesApi } from '../../api/endpoints'
import { BatchMonthlyMatrixResponse, BatchMatrixStudent } from '../../types'

interface BatchMonthlyFeeMatrixProps {
  academicYearId?: number
  onNavigateToCollection?: (studentId: number) => void
}

export const BatchMonthlyFeeMatrix: React.FC<BatchMonthlyFeeMatrixProps> = ({
  academicYearId,
  onNavigateToCollection,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<number | undefined>(undefined)
  const [searchFilter, setSearchFilter] = useState('')
  const [hoveredCell, setHoveredCell] = useState<{ studentId: number; monthKey: string } | null>(null)
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<BatchMatrixStudent | null>(null)
  const [selectedMonthForModal, setSelectedMonthForModal] = useState<string | null>(null)

  // Fetch Matrix Data from canonical backend endpoint
  const { data, isLoading, isError, refetch } = useQuery<BatchMonthlyMatrixResponse>({
    queryKey: ['fees-batch-monthly-matrix', academicYearId, selectedBatchId],
    queryFn: async () => {
      const res = await feesApi.getBatchMonthlyMatrix({
        academic_year_id: academicYearId,
        division_id: selectedBatchId,
      })
      return res.data
    },
  })

  // Auto-synchronize selected batch if not explicitly chosen
  const activeBatchId = useMemo(() => {
    if (selectedBatchId !== undefined) return selectedBatchId
    return data?.active_batch?.id ?? undefined
  }, [selectedBatchId, data?.active_batch?.id])

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!data?.students) return []
    if (!searchFilter.trim()) return data.students
    const q = searchFilter.toLowerCase().trim()
    return data.students.filter(
      (s) =>
        s.short_name.toLowerCase().includes(q) ||
        s.full_name.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q)
    )
  }, [data?.students, searchFilter])

  // Export 2D Matrix to identical CSV / Excel spreadsheet format
  const handleExportSpreadsheet = () => {
    if (!data || !data.students.length) {
      toast.error('No matrix records available for export')
      return
    }

    const batchName = data.active_batch?.name || 'BATCH'
    const headers = [
      'Academic Month',
      ...data.students.map((s) => `${s.short_name} (${s.admission_number})`),
    ]

    // Row 2: Agreed Package Fee in Thousands (Matching Google Sheet Row 2)
    const packageRow = [
      'Agreed Package (₹k)',
      ...data.students.map((s) => `${s.package_fee_k} (₹${s.package_fee.toLocaleString('en-IN')})`),
    ]

    // Monthly Rows
    const monthRows = data.months.map((m) => {
      const row = [m.month_name]
      data.students.forEach((s) => {
        const cell = s.monthly_cells[m.key]
        if (cell && cell.has_payment) {
          row.push(`"${cell.date_text} | ${cell.amount_text}"`)
        } else {
          row.push(cell?.status === 'overdue' ? 'Pending' : '—')
        }
      })
      return row
    })

    // Footer Rows: Total Paid & Balance
    const totalPaidRow = [
      'Total Realized (₹)',
      ...data.students.map((s) => `₹${s.total_paid.toLocaleString('en-IN')}`),
    ]
    const balanceRow = [
      'Balance Due (₹)',
      ...data.students.map((s) => `₹${s.total_outstanding.toLocaleString('en-IN')}`),
    ]

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        packageRow.join(','),
        ...monthRows.map((r) => r.join(',')),
        totalPaidRow.join(','),
        balanceRow.join(','),
      ].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `FEE_REPORT_2026_${batchName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success(`Exported ${batchName} Fee Matrix spreadsheet successfully!`)
  }

  // Print single-page executive docket
  const handlePrintDocket = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP EXECUTIVE BANNER & BATCH TABS                                         */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-emerald-500/10 via-primary-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-600/10 text-emerald-700 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Batch Monthly Fee Collection Matrix
              </h2>
              <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-emerald-100/80 text-emerald-800 rounded-full border border-emerald-300/60">
                2D Daybook Grid
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md">
                AY 2026-27
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-3xl">
              Real-time cross-tabulation daybook tracking individual student package fees vs monthly realized receipts.
              Replaces offline Google Sheets with 100% automated ERP ledger reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            <button
              onClick={handleExportSpreadsheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
              title="Download CSV/Excel file formatted identically to Google Sheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Spreadsheet (.csv)
            </button>
            <button
              onClick={handlePrintDocket}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary-900 text-white hover:bg-primary-800 transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Matrix Docket
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* BATCH SELECTOR TABS (Matching Bottom Tabs of Google Sheet: ICSE X, CBSE X, etc) */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Standard Tabs:
            </span>
            {data?.available_batches?.map((b) => {
              const isSelected = (activeBatchId ?? data.active_batch?.id) === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBatchId(b.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
                  }`}
                >
                  <span>{b.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-white/80 text-slate-500'
                    }`}
                  >
                    {b.student_count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search student or admission no..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 2. BATCH RECONCILIATION KPI SUMMARY CARDS                                    */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Enrolled Students</span>
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {data.summary.total_students}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
              Active Cohort in <span className="font-semibold text-slate-600">{data.active_batch?.name}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Agreed Package</span>
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-rose-600 tracking-tight">
              ₹{data.summary.total_package_value.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
              Cumulative Student Commitments
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Realized Fees</span>
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600 tracking-tight">
              ₹{data.summary.total_collected.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {data.summary.recovery_rate}% Realization Rate
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pending Receivables</span>
              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <AlertCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600 tracking-tight">
              ₹{data.summary.total_outstanding.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
              Remaining Academic Year Dues
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 3. THE 2D EXCEL-STYLE BATCH MATRIX TABLE                                      */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3" />
            Loading 2D Batch Monthly Fee Matrix...
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-rose-500 text-xs">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500 opacity-80" />
            Failed to load fee matrix records. Please retry.
            <div className="mt-3">
              <button
                onClick={() => refetch()}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No students found in this batch matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs min-w-[900px]">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* TABLE HEADER ROW 1: STUDENT NAMES (COLUMNS B TO I)           */}
              {/* ───────────────────────────────────────────────────────────── */}
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  {/* Top-Left Corner Header */}
                  <th className="sticky left-0 z-20 bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 w-36 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center justify-between">
                      <span>{data?.active_batch?.name || 'Class / Batch'}</span>
                      <span className="text-[10px] text-amber-400 font-mono">12M</span>
                    </div>
                  </th>

                  {/* Student Columns */}
                  {filteredStudents.map((s) => (
                    <th
                      key={s.student_id}
                      className="px-3.5 py-3 text-center border-r border-slate-800 min-w-[130px] max-w-[160px]"
                    >
                      <div className="font-bold text-slate-100 text-[13px] tracking-tight truncate">
                        {s.short_name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {s.admission_number}
                      </div>
                    </th>
                  ))}
                </tr>

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TABLE HEADER ROW 2: AGREED PACKAGE FEE IN THOUSANDS (RED)      */}
                {/* (Matches Google Sheet Row 2: 95, 95, 50, 60, 95, 85, etc)     */}
                {/* ───────────────────────────────────────────────────────────── */}
                <tr className="bg-rose-50/70 border-b-2 border-rose-200">
                  <th className="sticky left-0 z-20 bg-rose-50/95 px-4 py-2 text-[11px] font-bold text-rose-900 uppercase tracking-wider border-r border-rose-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span>Agreed Package (₹k)</span>
                    </div>
                  </th>

                  {filteredStudents.map((s) => (
                    <th
                      key={`pkg-${s.student_id}`}
                      className="px-3 py-2 text-center border-r border-rose-200/80 bg-rose-50/50"
                      title={`Total Package: ₹${s.package_fee.toLocaleString('en-IN')}`}
                    >
                      <span className="text-base font-black text-rose-600 tracking-tight">
                        {s.package_fee_k}
                      </span>
                      <span className="text-[10px] font-bold text-rose-400 ml-0.5">k</span>
                      <div className="text-[9px] text-slate-500 font-medium">
                        ₹{s.package_fee.toLocaleString('en-IN')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TABLE BODY: 12 ACADEMIC MONTH ROWS                            */}
              {/* ───────────────────────────────────────────────────────────── */}
              <tbody className="divide-y divide-slate-100">
                {data?.months.map((m) => {
                  return (
                    <tr key={m.key} className="hover:bg-slate-50/50 transition-colors">
                      {/* Left Sticky Month Column */}
                      <td className="sticky left-0 z-10 bg-white hover:bg-slate-50/90 px-4 py-3 font-bold text-slate-800 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{m.month_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            {m.key}
                          </span>
                        </div>
                      </td>

                      {/* Month Cells for each Student */}
                      {filteredStudents.map((s) => {
                        const cell = s.monthly_cells[m.key]
                        const isHovered =
                          hoveredCell?.studentId === s.student_id && hoveredCell?.monthKey === m.key

                        if (cell && cell.has_payment) {
                          // 🟢 REALIZED / PAID CELL (Emerald Green with 2 lines: Date + Amount)
                          return (
                            <td
                              key={`${s.student_id}-${m.key}`}
                              onMouseEnter={() =>
                                setHoveredCell({ studentId: s.student_id, monthKey: m.key })
                              }
                              onMouseLeave={() => setHoveredCell(null)}
                              className="px-2 py-2 text-center border-r border-slate-100/90 relative group"
                            >
                              <div className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300/80 rounded-xl p-2 transition-all shadow-2xs cursor-pointer">
                                <div className="text-[11px] font-semibold text-emerald-900 leading-tight">
                                  {cell.date_text}
                                </div>
                                <div className="text-[13px] font-black text-emerald-950 mt-0.5 tracking-tight">
                                  {cell.amount_text}
                                </div>
                              </div>

                              {/* Hover Floating Card for Payment Details */}
                              {isHovered && cell.payments.length > 0 && (
                                <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 text-white rounded-xl p-3 shadow-xl text-left border border-slate-800 text-[11px] pointer-events-none">
                                  <div className="font-bold text-slate-100 flex items-center justify-between pb-1.5 border-b border-slate-800">
                                    <span>{s.short_name} • {m.month_name}</span>
                                    <span className="text-emerald-400 font-mono text-[10px]">VERIFIED</span>
                                  </div>
                                  <div className="space-y-1.5 mt-2">
                                    {cell.payments.map((p, idx) => (
                                      <div key={idx} className="flex flex-col text-[10px]">
                                        <div className="flex justify-between font-semibold text-emerald-300">
                                          <span>₹{p.amount.toLocaleString('en-IN')}</span>
                                          <span className="uppercase text-slate-400">{p.payment_method}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 font-mono text-[9px]">
                                          <span>{p.receipt_number}</span>
                                          <span>{p.payment_date}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          )
                        } else {
                          // ⚪ UNPAID / BLANK / OVERDUE CELL
                          const isOverdue = cell?.status === 'overdue'
                          return (
                            <td
                              key={`${s.student_id}-${m.key}`}
                              className="px-2 py-2 text-center border-r border-slate-100/90"
                            >
                              <div
                                onClick={() => {
                                  setSelectedStudentForModal(s)
                                  setSelectedMonthForModal(m.month_name)
                                }}
                                className={`rounded-xl p-2 transition-all cursor-pointer text-center group ${
                                  isOverdue
                                    ? 'bg-white hover:bg-rose-50/70 border border-dashed border-rose-200/80'
                                    : 'bg-slate-50/50 hover:bg-slate-100/70 border border-transparent'
                                }`}
                                title={isOverdue ? `Pending Installment for ${s.short_name}. Click to collect.` : 'Upcoming Month'}
                              >
                                <div className="text-[11px] font-medium text-slate-300 group-hover:text-slate-500">
                                  —
                                </div>
                                <div
                                  className={`text-[10px] font-bold mt-0.5 tracking-tight ${
                                    isOverdue
                                      ? 'text-rose-500/80 group-hover:text-rose-600'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {isOverdue ? 'Pending' : 'Scheduled'}
                                </div>
                              </div>
                            </td>
                          )
                        }
                      })}
                    </tr>
                  )
                })}
              </tbody>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TABLE FOOTER: TOTAL PAID & RECONCILIATION                     */}
              {/* (Matches Google Sheet Row 21: total paid)                      */}
              {/* ───────────────────────────────────────────────────────────── */}
              <tfoot>
                {/* Row 1: Total Realized */}
                <tr className="bg-emerald-50/80 border-t-2 border-emerald-300 font-bold">
                  <td className="sticky left-0 z-20 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-950 uppercase tracking-wider border-r border-emerald-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Total Realized (₹)
                  </td>
                  {filteredStudents.map((s) => (
                    <td
                      key={`tot-${s.student_id}`}
                      className="px-3 py-3 text-center border-r border-emerald-200/70"
                    >
                      <div className="text-sm font-black text-emerald-900 tracking-tight">
                        ₹{s.total_paid.toLocaleString('en-IN')}
                      </div>
                      <div className="w-full bg-emerald-200/80 h-1 rounded-full mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1 rounded-full transition-all"
                          style={{ width: `${Math.min(100, s.recovery_pct)}%` }}
                        />
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Row 2: Balance Due */}
                <tr className="bg-amber-50/60 border-t border-amber-200 font-bold">
                  <td className="sticky left-0 z-20 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-950 uppercase tracking-wider border-r border-amber-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Balance Due (₹)
                  </td>
                  {filteredStudents.map((s) => (
                    <td
                      key={`bal-${s.student_id}`}
                      className="px-3 py-2 text-center border-r border-amber-200/70 text-xs font-bold text-amber-800"
                    >
                      {s.total_outstanding > 0 ? (
                        <span>₹{s.total_outstanding.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 4. CLICK-TO-COLLECT INTERACTION MODAL                                        */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Fee Collection Quick Action
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudentForModal.full_name} • {selectedMonthForModal}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Agreed Package</div>
                  <div className="text-sm font-black text-rose-600 mt-0.5">
                    ₹{selectedStudentForModal.package_fee.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Balance Due</div>
                  <div className="text-sm font-black text-amber-600 mt-0.5">
                    ₹{selectedStudentForModal.total_outstanding.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-emerald-900 leading-relaxed">
                <span className="font-bold">Automated Daybook Sync:</span> Entering a payment through the
                Collection Desk automatically marks the corresponding month green in this matrix and issues a numbered GST receipt.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const sid = selectedStudentForModal.student_id
                  setSelectedStudentForModal(null)
                  if (onNavigateToCollection) {
                    onNavigateToCollection(sid)
                  } else {
                    window.location.href = `/fees/collection?student_id=${sid}`
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all"
              >
                Open Collection Terminal
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
