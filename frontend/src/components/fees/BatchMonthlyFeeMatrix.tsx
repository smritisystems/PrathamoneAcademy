/**
 * @file        BatchMonthlyFeeMatrix.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.src.components.fees
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-21
 * @updated     2026-11-24
 *
 * @description Enterprise Multi-Perspective Fee Collection Matrix: By Batch, By Month, By Standard/Grade, By Board, and Annual Year-wise with EnterpriseDataTable.
 */

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
  Calendar,
  ArrowUpDown,
  Filter,
  Receipt,
  PieChart,
  Building2,
  GraduationCap,
  School,
  BarChart3,
  History,
} from 'lucide-react'
import toast from 'react-hot-toast'
import writeXlsxFile, { type Row as ExcelRow } from 'write-excel-file/browser'
import { feesApi, academicYearsApi, boardsApi, standardsApi } from '../../api/endpoints'
import { downloadCsvRows, downloadBlob } from '../../utils/reportExport'
import {
  BatchMonthlyMatrixResponse,
  BatchMatrixStudent,
  MonthCollectionMatrixResponse,
  MonthStudentItem,
  FeeDimensionAnalyticsResponse,
  AnnualDimensionItem,
  BoardDimensionItem,
  StandardDimensionItem,
  DimensionStudentItem,
} from '../../types'
import { EnterpriseDataTable } from '../common/EnterpriseDataTable'
import type { DataTableColumn } from '../common/EnterpriseDataTable/types'
import { StudentMonthlyFeePivot } from './StudentMonthlyFeePivot'

interface BatchMonthlyFeeMatrixProps {
  academicYearId?: number
  onNavigateToCollection?: (studentId: number) => void
}

type PerspectiveMode = 'batch' | 'month' | 'standard' | 'board' | 'annual' | 'student-pivot'

export const BatchMonthlyFeeMatrix: React.FC<BatchMonthlyFeeMatrixProps> = ({
  academicYearId: initialAcademicYearId,
  onNavigateToCollection,
}) => {
  // 6 Perspectives: 'batch' | 'month' | 'standard' | 'board' | 'annual' | 'student-pivot'
  const [viewPerspective, setViewPerspective] = useState<PerspectiveMode>('student-pivot')

  // Global Dimensional Filters
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | undefined>(initialAcademicYearId)
  const [selectedBoardId, setSelectedBoardId] = useState<number | 'all'>('all')
  const [selectedStandardId, setSelectedStandardId] = useState<number | 'all'>('all')
  const [selectedBatchId, setSelectedBatchId] = useState<number | 'all'>('all')

  // Annual View Sub-Dimension Pivot Mode ('board' | 'standard' | 'batch')
  const [annualPivotDimension, setAnnualPivotDimension] = useState<'board' | 'standard' | 'batch'>('board')

  // Batch Mode Specific States
  const [isTransposed, setIsTransposed] = useState(false)
  const [batchSearchFilter, setBatchSearchFilter] = useState('')
  const [hoveredCell, setHoveredCell] = useState<{ studentId: number; monthKey: string } | null>(null)
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<BatchMatrixStudent | null>(null)
  const [selectedMonthForModal, setSelectedMonthForModal] = useState<string | null>(null)

  // Month Mode Specific States
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('2026-08')

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. QUERY MASTER ACADEMIC COORDINATES (Years, Boards, Standards)
  // ─────────────────────────────────────────────────────────────────────────────
  const { data: academicYears } = useQuery({
    queryKey: ['academic-years-list'],
    queryFn: async () => (await academicYearsApi.list()).data,
  })

  const { data: boards } = useQuery({
    queryKey: ['boards-list'],
    queryFn: async () => (await boardsApi.list()).data,
  })

  const { data: standards } = useQuery({
    queryKey: ['standards-list', selectedBoardId],
    queryFn: async () => {
      const res = await standardsApi.list({
        board_id: selectedBoardId !== 'all' ? selectedBoardId : undefined,
      })
      return res.data
    },
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. QUERY FINANCIAL MATRIX DATA
  // ─────────────────────────────────────────────────────────────────────────────

  // A. Batch Matrix Query
  const {
    data: batchData,
    isLoading: isBatchLoading,
    isError: isBatchError,
    refetch: refetchBatch,
  } = useQuery<BatchMonthlyMatrixResponse>({
    queryKey: [
      'fees-batch-monthly-matrix',
      selectedAcademicYearId,
      selectedBatchId,
      selectedStandardId,
      selectedBoardId,
    ],
    queryFn: async () => {
      const res = await feesApi.getBatchMonthlyMatrix({
        academic_year_id: selectedAcademicYearId,
        division_id: selectedBatchId !== 'all' ? selectedBatchId : undefined,
        standard_id: selectedStandardId !== 'all' ? selectedStandardId : undefined,
        board_id: selectedBoardId !== 'all' ? selectedBoardId : undefined,
      })
      return res.data
    },
    enabled: viewPerspective === 'batch',
  })

  // B. Month Matrix Daybook Query
  const {
    data: monthData,
    isLoading: isMonthLoading,
    isError: isMonthError,
    refetch: refetchMonth,
  } = useQuery<MonthCollectionMatrixResponse>({
    queryKey: [
      'fees-month-collection-matrix',
      selectedAcademicYearId,
      selectedMonthKey,
      selectedBatchId,
      selectedStandardId,
      selectedBoardId,
    ],
    queryFn: async () => {
      const res = await feesApi.getMonthCollectionMatrix({
        academic_year_id: selectedAcademicYearId,
        month_key: selectedMonthKey,
        division_id: selectedBatchId !== 'all' ? selectedBatchId : undefined,
        standard_id: selectedStandardId !== 'all' ? selectedStandardId : undefined,
        board_id: selectedBoardId !== 'all' ? selectedBoardId : undefined,
      })
      return res.data
    },
    enabled: viewPerspective === 'month',
  })

  // C. Multi-Dimensional Analytics Query (Annual, Board, Standard)
  const {
    data: dimensionData,
    isLoading: isDimensionLoading,
    isError: isDimensionError,
    refetch: refetchDimensions,
  } = useQuery<FeeDimensionAnalyticsResponse>({
    queryKey: [
      'fees-dimension-analytics',
      selectedAcademicYearId,
      selectedBoardId,
      selectedStandardId,
      selectedBatchId,
    ],
    queryFn: async () => {
      const res = await feesApi.getDimensionAnalytics({
        academic_year_id: selectedAcademicYearId,
        board_id: selectedBoardId !== 'all' ? selectedBoardId : undefined,
        standard_id: selectedStandardId !== 'all' ? selectedStandardId : undefined,
        division_id: selectedBatchId !== 'all' ? selectedBatchId : undefined,
      })
      return res.data
    },
    enabled: viewPerspective === 'standard' || viewPerspective === 'board' || viewPerspective === 'annual',
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ENTERPRISE DATA TABLE COLUMN DEFINITIONS (Sorting & Filtering on every header)
  // ─────────────────────────────────────────────────────────────────────────────
  const studentRosterColumns = useMemo<DataTableColumn<any>[]>(
    () => [
      {
        id: 'admission_number',
        key: 'admission_number',
        header: 'Admission #',
        accessorKey: 'admission_number',
        sortable: true,
        filterable: true,
        filterType: 'text',
        width: '130px',
        cell: ({ row }) => (
          <span className="font-mono text-slate-600 font-bold text-xs tracking-tight">
            {row.admission_number}
          </span>
        ),
      },
      {
        id: 'student_name',
        key: 'student_name',
        header: 'Student Name',
        accessorKey: 'student_name',
        sortable: true,
        filterable: true,
        filterType: 'text',
        cell: ({ row }) => (
          <div className="font-bold text-slate-900 text-xs tracking-tight">
            {row.student_name}
          </div>
        ),
      },
      {
        id: 'batch_name',
        key: 'batch_name',
        header: 'Batch / Std',
        accessorFn: (row) => `${row.batch_name} ${row.standard_name}`,
        sortable: true,
        filterable: true,
        filterType: 'select',
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-slate-800 text-xs">{row.batch_name}</span>
            <span className="text-[10px] text-slate-400 block font-medium">
              {row.standard_name} {row.board_name ? `• ${row.board_name}` : ''}
            </span>
          </div>
        ),
      },
      {
        id: 'package_fee',
        key: 'package_fee',
        header: 'Agreed Pkg',
        accessorKey: 'package_fee',
        type: 'currency',
        sortable: true,
        filterable: true,
        filterType: 'number_range',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-mono font-medium text-slate-700 text-xs">
            ₹{Number(row.package_fee).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'month_due',
        key: 'month_due',
        header: 'Month Due',
        accessorKey: 'month_due',
        type: 'currency',
        sortable: true,
        filterable: true,
        filterType: 'number_range',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-slate-900 text-xs">
            ₹{Number(row.month_due).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'paid_amount',
        key: 'paid_amount',
        header: 'Paid Amount',
        accessorKey: 'paid_amount',
        type: 'currency',
        sortable: true,
        filterable: true,
        filterType: 'number_range',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-mono font-black text-emerald-700 text-xs">
            ₹{Number(row.paid_amount).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'balance_due',
        key: 'balance_due',
        header: 'Balance Due',
        accessorKey: 'balance_due',
        type: 'currency',
        sortable: true,
        filterable: true,
        filterType: 'number_range',
        align: 'right',
        cell: ({ row }) => (
          <span
            className={`font-mono font-black text-xs ${
              row.balance_due > 0 ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            ₹{Number(row.balance_due).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'payment_details',
        key: 'payment_details',
        header: 'Payment Details',
        accessorFn: (row) => row.receipt_number || row.payment_method || 'Unpaid',
        sortable: true,
        filterable: true,
        filterType: 'select',
        cell: ({ row }) =>
          row.receipt_number ? (
            <div className="text-[11px]">
              <span className="font-mono font-bold text-slate-700">{row.receipt_number}</span>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span>{row.payment_date}</span>
                <span>•</span>
                <span className="uppercase font-semibold text-emerald-600">{row.payment_method}</span>
              </div>
            </div>
          ) : (
            <span className="text-slate-300 text-[11px] font-medium">—</span>
          ),
      },
      {
        id: 'status',
        key: 'status',
        header: 'Status',
        accessorKey: 'status',
        type: 'badge',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { label: 'Paid', value: 'paid' },
          { label: 'Partial', value: 'partial' },
          { label: 'Overdue', value: 'overdue' },
          { label: 'Upcoming', value: 'upcoming' },
        ],
        align: 'center',
        cell: ({ row }) => (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              row.status === 'paid'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60'
                : row.status === 'partial'
                ? 'bg-amber-100 text-amber-800 border border-amber-300/60'
                : row.status === 'overdue'
                ? 'bg-rose-100 text-rose-800 border border-rose-300/60'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {row.status}
          </span>
        ),
      },
      {
        id: 'action',
        key: 'action',
        header: 'Action',
        sortable: false,
        filterable: false,
        align: 'center',
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (onNavigateToCollection) {
                onNavigateToCollection(row.student_id)
              } else {
                window.location.href = `/fees/collection?student_id=${row.student_id}`
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-all shadow-2xs"
          >
            <span>Collect</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        ),
      },
    ],
    [onNavigateToCollection]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. EXPORT HANDLERS (Excel .xlsx and CSV)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExport = async (format: 'xlsx' | 'csv') => {
    let rows: any[] = []
    let filename = `FEE_${viewPerspective.toUpperCase()}_REPORT_${new Date().toISOString().split('T')[0]}`

    if (viewPerspective === 'batch' && batchData) {
      filename = `FEE_BATCH_${batchData.active_batch?.name || 'ALL'}_${isTransposed ? 'TRANSPOSED_' : ''}`
      if (format === 'csv') {
        const headers = ['Academic Month', ...batchData.students.map((s) => `${s.short_name} (${s.admission_number})`)]
        const dataRows = batchData.months.map((m) => [
          m.month_name,
          ...batchData.students.map((s) => s.monthly_cells[m.key]?.amount_text || '—'),
        ])
        downloadCsvRows(`${filename}.csv`, [headers, ...dataRows])
        toast.success('Exported Batch Matrix CSV successfully!')
        return
      }
    } else if (viewPerspective === 'month' && monthData) {
      rows = monthData.students.map((st) => [
        st.admission_number,
        st.student_name,
        st.batch_name,
        st.standard_name,
        st.package_fee,
        st.month_due,
        st.paid_amount,
        st.balance_due,
        st.receipt_number || '—',
        st.status.toUpperCase(),
      ])
    } else if (dimensionData) {
      rows = dimensionData.students.map((st) => [
        st.admission_number,
        st.student_name,
        st.batch_name,
        st.standard_name,
        st.board_name,
        st.package_fee,
        st.paid_amount,
        st.balance_due,
        st.status.toUpperCase(),
      ])
    }

    if (format === 'csv') {
      const headers = ['Admission #', 'Student Name', 'Batch', 'Standard', 'Agreed Pkg', 'Due', 'Paid', 'Balance', 'Status']
      downloadCsvRows(`${filename}.csv`, [headers, ...rows])
      toast.success('Exported CSV successfully!')
    } else {
      toast.success('Exporting Microsoft Excel (.xlsx)...')
    }
  }

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP EXECUTIVE COMMAND BANNER & PERSPECTIVE SWITCHER                        */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-emerald-500/10 via-primary-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 bg-emerald-600/10 text-emerald-700 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {viewPerspective === 'batch'
                  ? 'Batch Monthly Fee Collection Matrix'
                  : viewPerspective === 'month'
                  ? 'Institute Monthly Fee Collection Daybook'
                  : viewPerspective === 'standard'
                  ? 'Standard & Grade-Wise Fee Realization Ledger'
                  : viewPerspective === 'board'
                  ? 'Educational Board-Wise Fee Realization Matrix'
                  : 'Annual & Multi-Year Fee Performance Matrix'}
              </h2>
              <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-emerald-100/80 text-emerald-800 rounded-full border border-emerald-300/60">
                {viewPerspective.toUpperCase()} DIMENSION
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md">
                AY 2026-27
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-3xl">
              Real-time multi-dimensional financial command center. Switch dynamically across Batch Cohorts,
              Monthly Daybooks, Standard/Grade levels, Educational Boards, and Multi-Year Annual trends.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            <button
              onClick={() => handleExport('xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300/80 hover:bg-emerald-100/80 transition-all shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export Excel (.xlsx)
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV (.csv)
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* 5-PERSPECTIVE SWITCHER TABS & UNIVERSAL CASCADING FILTERS                    */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        <div className="pt-4 space-y-3.5">
          {/* PERSPECTIVE SWITCHER PILL ROW */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              onClick={() => setViewPerspective('batch')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                viewPerspective === 'batch'
                  ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>By Batch (Cohort 12M)</span>
            </button>

            <button
              onClick={() => setViewPerspective('month')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                viewPerspective === 'month'
                  ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>By Month (Institute Daybook)</span>
            </button>

            <button
              onClick={() => setViewPerspective('standard')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                viewPerspective === 'standard'
                  ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              <School className="w-3.5 h-3.5 text-indigo-400" />
              <span>By Standard / Grade</span>
            </button>

            <button
              onClick={() => setViewPerspective('board')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                viewPerspective === 'board'
                  ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>By Board</span>
            </button>

            <button
              onClick={() => setViewPerspective('annual')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                viewPerspective === 'annual'
                  ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Annual Year-wise</span>
            </button>

            <button
              onClick={() => setViewPerspective('student-pivot')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                viewPerspective === 'student-pivot'
                  ? 'bg-slate-900 text-white shadow-xs border border-slate-900 ring-2 ring-emerald-500/20'
                  : 'bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 font-black'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              <span>Student Monthly Pivot</span>
            </button>

            {/* TRANSPOSE BUTTON (In Batch Mode) */}
            {viewPerspective === 'batch' && (
              <button
                onClick={() => setIsTransposed(!isTransposed)}
                className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs whitespace-nowrap ${
                  isTransposed
                    ? 'bg-amber-400 text-slate-950 border border-amber-500 font-black'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-700" />
                <span>{isTransposed ? 'Grid: Students on Rows' : 'Transpose Grid'}</span>
              </button>
            )}
          </div>

          {/* CASCADING FILTER RIBBON */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
            {/* Academic Year Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Year:</span>
              <select
                value={selectedAcademicYearId || ''}
                onChange={(e) =>
                  setSelectedAcademicYearId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="">All Academic Years</option>
                {academicYears?.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Board Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Board:</span>
              <select
                value={selectedBoardId}
                onChange={(e) =>
                  setSelectedBoardId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Boards</option>
                {boards?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Standard / Grade Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Grade:</span>
              <select
                value={selectedStandardId}
                onChange={(e) =>
                  setSelectedStandardId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Standards</option>
                {standards?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch / Division Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Batch:</span>
              <select
                value={selectedBatchId}
                onChange={(e) =>
                  setSelectedBatchId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Batches</option>
                {batchData?.available_batches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.student_count})
                  </option>
                ))}
              </select>
            </div>

            {(selectedBoardId !== 'all' || selectedStandardId !== 'all' || selectedBatchId !== 'all') && (
              <button
                onClick={() => {
                  setSelectedBoardId('all')
                  setSelectedStandardId('all')
                  setSelectedBatchId('all')
                }}
                className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* MONTH CAROUSEL (Active in Month View) */}
          {viewPerspective === 'month' && (
            <div className="pt-2 flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {monthData?.months?.map((m) => {
                const isSelected = selectedMonthKey === m.key
                return (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMonthKey(m.key)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-left transition-all border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-500/30'
                        : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold whitespace-nowrap">
                        {m.month_name.substring(0, 3)} {m.year}
                      </span>
                      {m.recovery_rate !== undefined && (
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                            isSelected
                              ? 'bg-emerald-400 text-slate-950'
                              : m.status_color === 'emerald'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.status_color === 'amber'
                              ? 'bg-amber-100 text-amber-800'
                              : m.status_color === 'rose'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {m.recovery_rate}%
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 2. PERSPECTIVE A: BY BATCH (Cohort 12M Matrix & Transposed View)              */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewPerspective === 'batch' && (
        <div className="space-y-6">
          {batchData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Enrolled Students</span>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {batchData.summary.total_students}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Active in <span className="font-semibold">{batchData.active_batch?.name}</span>
                </div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Agreed Package Value</span>
                <div className="mt-2 text-2xl font-black text-rose-600">
                  ₹{batchData.summary.total_package_value.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Cohort Commitments</div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Realized Collections</span>
                <div className="mt-2 text-2xl font-black text-emerald-600">
                  ₹{batchData.summary.total_collected.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
                  {batchData.summary.recovery_rate}% Realized
                </div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Pending Receivables</span>
                <div className="mt-2 text-2xl font-black text-amber-600">
                  ₹{batchData.summary.total_outstanding.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Academic Year Dues</div>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            {isBatchLoading ? (
              <div className="p-16 text-center text-slate-500 text-xs">Loading Batch Matrix...</div>
            ) : !isTransposed ? (
              /* STANDARD ORIENTATION (Months on Rows) */
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse text-left text-xs min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-900 text-white border-b border-slate-800">
                      <th className="sticky left-0 z-20 bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 w-36 border-r border-slate-800">
                        {batchData?.active_batch?.name || 'Class / Batch'}
                      </th>
                      {batchData?.students.map((s) => (
                        <th key={s.student_id} className="px-3.5 py-3 text-center border-r border-slate-800 min-w-[130px]">
                          <div className="font-bold text-slate-100 text-[13px]">{s.short_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{s.admission_number}</div>
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-rose-50/70 border-b-2 border-rose-200">
                      <th className="sticky left-0 z-20 bg-rose-50/95 px-4 py-2 text-[11px] font-bold text-rose-900 uppercase tracking-wider border-r border-rose-200">
                        Agreed Package (₹k)
                      </th>
                      {batchData?.students.map((s) => (
                        <th key={`pkg-${s.student_id}`} className="px-3 py-2 text-center border-r border-rose-200/80">
                          <span className="text-base font-black text-rose-600">{s.package_fee_k}k</span>
                          <div className="text-[9px] text-slate-500">₹{s.package_fee.toLocaleString('en-IN')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchData?.months.map((m) => (
                      <tr key={m.key} className="hover:bg-slate-50/50">
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                          {m.month_name}
                        </td>
                        {batchData?.students.map((s) => {
                          const cell = s.monthly_cells[m.key]
                          return (
                            <td key={`${s.student_id}-${m.key}`} className="px-2 py-2 text-center border-r border-slate-100">
                              {cell && cell.has_payment ? (
                                <div className="bg-emerald-50 border border-emerald-300/80 rounded-xl p-2">
                                  <div className="text-[11px] font-semibold text-emerald-900">{cell.date_text}</div>
                                  <div className="text-[13px] font-black text-emerald-950 mt-0.5">{cell.amount_text}</div>
                                </div>
                              ) : (
                                <div className="p-2 text-center text-slate-300 text-[11px]">
                                  {cell?.status === 'overdue' ? (
                                    <span className="text-rose-500 font-bold">Pending</span>
                                  ) : (
                                    '—'
                                  )}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/80 border-t-2 border-emerald-300 font-bold">
                      <td className="sticky left-0 z-20 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-950 uppercase border-r border-emerald-200">
                        Total Realized (₹)
                      </td>
                      {batchData?.students.map((s) => (
                        <td key={`tot-${s.student_id}`} className="px-3 py-3 text-center border-r border-emerald-200/70 font-black text-emerald-900">
                          ₹{s.total_paid.toLocaleString('en-IN')}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* TRANSPOSED ORIENTATION (Students on Rows) */
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse text-left text-xs min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-900 text-white border-b border-slate-800">
                      <th className="sticky left-0 z-20 bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 border-r border-slate-800">
                        Student Details
                      </th>
                      <th className="px-3 py-3 text-center border-r border-slate-800 text-rose-300 font-bold">Package (₹)</th>
                      {batchData?.months.map((m) => (
                        <th key={m.key} className="px-2.5 py-3 text-center border-r border-slate-800 text-[11px] font-bold text-slate-200">
                          {m.month_name.substring(0, 3)}
                        </th>
                      ))}
                      <th className="px-3.5 py-3 text-center border-r border-slate-800 text-emerald-300 font-bold">Realized (₹)</th>
                      <th className="px-3.5 py-3 text-center border-r border-slate-800 text-amber-300 font-bold">Pending (₹)</th>
                      <th className="px-3 py-3 text-center text-slate-300 font-bold">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchData?.students.map((s) => (
                      <tr key={s.student_id} className="hover:bg-slate-50/70">
                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-slate-200">
                          <div className="font-bold text-slate-900 text-xs">{s.full_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{s.admission_number}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-rose-600 bg-rose-50/30 border-r border-slate-100">
                          ₹{s.package_fee.toLocaleString('en-IN')}
                        </td>
                        {batchData?.months.map((m) => {
                          const cell = s.monthly_cells[m.key]
                          return (
                            <td key={m.key} className="px-1.5 py-1.5 text-center border-r border-slate-100">
                              {cell && cell.has_payment ? (
                                <span className="p-1 rounded-lg bg-emerald-100/70 text-emerald-900 font-black text-[11px] block">
                                  {cell.amount_text}
                                </span>
                              ) : (
                                <span className={`text-[10px] ${cell?.status === 'overdue' ? 'text-rose-500 font-bold' : 'text-slate-300'}`}>
                                  {cell?.status === 'overdue' ? 'Due' : '—'}
                                </span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2.5 text-center font-black text-emerald-700 bg-emerald-50/30 border-r border-slate-100">
                          ₹{s.total_paid.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-amber-700 bg-amber-50/20 border-r border-slate-100">
                          ₹{s.total_outstanding.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                          {s.recovery_pct}%
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

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 3. PERSPECTIVE B: BY MONTH (Institute Daybook & Enterprise DataTable Roster)  */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewPerspective === 'month' && (
        <div className="space-y-6">
          {monthData?.kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">{monthData.active_month.month_name} Target</span>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  ₹{monthData.kpis.month_target.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Expected Inflow</div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Realized Collections</span>
                <div className="mt-2 text-2xl font-black text-emerald-600">
                  ₹{monthData.kpis.month_collected.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
                  {monthData.kpis.realization_rate}% Realized
                </div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Pending Receivables</span>
                <div className="mt-2 text-2xl font-black text-rose-600">
                  ₹{monthData.kpis.month_pending.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-rose-500 font-medium">
                  {monthData.kpis.defaulters_count} Defaulters
                </div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Collection Modes</span>
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-mono">
                    UPI: ₹{Math.round(monthData.kpis.mode_split.upi / 1000)}k
                  </span>
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
                    Cash: ₹{Math.round(monthData.kpis.mode_split.cash / 1000)}k
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Bank: ₹{Math.round(monthData.kpis.mode_split.bank / 1000)}k
                </div>
              </div>
            </div>
          )}

          {/* Canonical EnterpriseDataTable for Month Student Roster */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4">
            <div className="pb-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Receipt className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Student Collection Roster • {monthData?.active_month?.month_name}
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {monthData?.students?.length || 0} Students Tracked
              </span>
            </div>

            <div className="mt-3">
              <EnterpriseDataTable
                data={monthData?.students || []}
                columns={studentRosterColumns}
                isLoading={isMonthLoading}
                tableId="month-collection-roster"
                searchPlaceholder="Search student name, admission #, receipt..."
                pageSize={25}
              />
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 4. PERSPECTIVE C: BY STANDARD / GRADE                                         */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewPerspective === 'standard' && (
        <div className="space-y-6">
          {dimensionData?.kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Standards Tracked</span>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {dimensionData.standard_breakdown.length}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Grade Levels Active</div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Agreed Package Target</span>
                <div className="mt-2 text-2xl font-black text-rose-600">
                  ₹{dimensionData.kpis.total_target.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Cumulative Target</div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Realized Collections</span>
                <div className="mt-2 text-2xl font-black text-emerald-600">
                  ₹{dimensionData.kpis.total_collected.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
                  {dimensionData.kpis.realization_rate}% Grade Realization
                </div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Pending Receivables</span>
                <div className="mt-2 text-2xl font-black text-amber-600">
                  ₹{dimensionData.kpis.total_pending.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {dimensionData.kpis.total_defaulters} Defaulters
                </div>
              </div>
            </div>
          )}

          {/* Standard Performance Cross-Tabulation Grid */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <School className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Standard & Grade Realization Breakdown</h3>
              </div>
              <span className="text-xs text-slate-400">
                {dimensionData?.standard_breakdown?.length || 0} Standards Active
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold">
                    <th className="px-4 py-2.5">Standard / Grade</th>
                    <th className="px-3 py-2.5">Board</th>
                    <th className="px-3 py-2.5 text-center">Batches</th>
                    <th className="px-3 py-2.5 text-center">Enrolled</th>
                    <th className="px-3 py-2.5 text-right">Target (₹)</th>
                    <th className="px-3 py-2.5 text-right text-emerald-700">Realized (₹)</th>
                    <th className="px-3 py-2.5 text-right text-rose-600">Pending (₹)</th>
                    <th className="px-4 py-2.5 text-center min-w-[130px]">Recovery %</th>
                    <th className="px-3 py-2.5 text-center">Defaulters</th>
                    <th className="px-3 py-2.5 text-center">Drilldown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dimensionData?.standard_breakdown.map((s) => (
                    <tr key={s.standard_id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{s.standard_name}</td>
                      <td className="px-3 py-2.5 text-slate-600">{s.board_name}</td>
                      <td className="px-3 py-2.5 text-center font-mono">{s.batches_count}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold">{s.enrolled_students}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium">₹{s.target_amount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">₹{s.collected_amount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">₹{s.pending_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, s.recovery_rate)}%` }} />
                          </div>
                          <span className="text-[11px] font-mono font-bold">{s.recovery_rate}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {s.defaulters_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            {s.defaulters_count}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => setSelectedStandardId(s.standard_id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                        >
                          Filter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Roster for this Grade */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4">
            <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100">
              Students Roster • Standard Dimension View
            </h3>
            <div className="mt-3">
              <EnterpriseDataTable
                data={dimensionData?.students || []}
                columns={studentRosterColumns}
                isLoading={isDimensionLoading}
                tableId="standard-dimension-roster"
                searchPlaceholder="Search student name, standard, admission #..."
                pageSize={25}
              />
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 5. PERSPECTIVE D: BY BOARD                                                    */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewPerspective === 'board' && (
        <div className="space-y-6">
          {dimensionData?.kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Boards Active</span>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {dimensionData.board_breakdown.length}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Curricula Enrolled</div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Agreed Package Target</span>
                <div className="mt-2 text-2xl font-black text-rose-600">
                  ₹{dimensionData.kpis.total_target.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Total Board Obligations</div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Realized Collections</span>
                <div className="mt-2 text-2xl font-black text-emerald-600">
                  ₹{dimensionData.kpis.total_collected.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
                  {dimensionData.kpis.realization_rate}% Board Realization
                </div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Pending Receivables</span>
                <div className="mt-2 text-2xl font-black text-amber-600">
                  ₹{dimensionData.kpis.total_pending.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {dimensionData.kpis.total_defaulters} Defaulters
                </div>
              </div>
            </div>
          )}

          {/* Board Performance Cross-Tabulation Grid */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Educational Board Realization Breakdown</h3>
              </div>
              <span className="text-xs text-slate-400">
                {dimensionData?.board_breakdown?.length || 0} Educational Boards
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold">
                    <th className="px-4 py-2.5">Board Name</th>
                    <th className="px-3 py-2.5 text-center">Standards</th>
                    <th className="px-3 py-2.5 text-center">Batches</th>
                    <th className="px-3 py-2.5 text-center">Enrolled</th>
                    <th className="px-3 py-2.5 text-right">Target (₹)</th>
                    <th className="px-3 py-2.5 text-right text-emerald-700">Realized (₹)</th>
                    <th className="px-3 py-2.5 text-right text-rose-600">Pending (₹)</th>
                    <th className="px-4 py-2.5 text-center min-w-[130px]">Recovery %</th>
                    <th className="px-3 py-2.5 text-center">Defaulters</th>
                    <th className="px-3 py-2.5 text-center">Drilldown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dimensionData?.board_breakdown.map((b) => (
                    <tr key={b.board_id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{b.board_name}</td>
                      <td className="px-3 py-2.5 text-center font-mono">{b.standards_count}</td>
                      <td className="px-3 py-2.5 text-center font-mono">{b.batches_count}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold">{b.enrolled_students}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium">₹{b.target_amount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">₹{b.collected_amount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">₹{b.pending_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, b.recovery_rate)}%` }} />
                          </div>
                          <span className="text-[11px] font-mono font-bold">{b.recovery_rate}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {b.defaulters_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            {b.defaulters_count}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => setSelectedBoardId(b.board_id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                        >
                          Filter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Roster for this Board */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4">
            <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100">
              Students Roster • Board Dimension View
            </h3>
            <div className="mt-3">
              <EnterpriseDataTable
                data={dimensionData?.students || []}
                columns={studentRosterColumns}
                isLoading={isDimensionLoading}
                tableId="board-dimension-roster"
                searchPlaceholder="Search student name, board, admission #..."
                pageSize={25}
              />
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 6. PERSPECTIVE E: ANNUAL & MULTI-YEAR PERFORMANCE                            */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewPerspective === 'annual' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <History className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Annual & Multi-Year Performance Comparison</h3>
              </div>
              <span className="text-xs text-slate-400">
                {dimensionData?.annual_breakdown?.length || 0} Academic Years Available
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-left text-xs min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold">
                    <th className="px-5 py-3 min-w-[140px] whitespace-nowrap text-left">Academic Year</th>
                    <th className="px-3 py-3 text-center min-w-[95px]">Status</th>
                    <th className="px-3 py-3 text-center min-w-[110px]">Enrolled Students</th>
                    <th className="px-3 py-3 text-right min-w-[120px]">Annual Target (₹)</th>
                    <th className="px-3 py-3 text-right min-w-[125px] text-emerald-700">Realized Collections (₹)</th>
                    <th className="px-3 py-3 text-right min-w-[120px] text-rose-600">Pending Balance (₹)</th>
                    <th className="px-4 py-3 text-center min-w-[130px]">Recovery Rate %</th>
                    <th className="px-3 py-3 text-center min-w-[85px]">Defaulters</th>
                    <th className="px-3 py-3 text-center min-w-[85px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dimensionData?.annual_breakdown.map((ay) => (
                    <tr key={ay.academic_year_id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-bold text-slate-900 min-w-[140px] whitespace-nowrap">
                        {ay.academic_year_name}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ay.is_current ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ay.is_current ? 'Current AY' : 'Historical'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-bold">{ay.enrolled_students}</td>
                      <td className="px-3 py-3 text-right font-mono font-medium">₹{ay.target_amount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">₹{ay.collected_amount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-rose-600">₹{ay.pending_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, ay.recovery_rate)}%` }} />
                          </div>
                          <span className="text-[11px] font-mono font-bold">{ay.recovery_rate}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-rose-600">
                        {ay.defaulters_count}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => setSelectedAcademicYearId(ay.academic_year_id)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            selectedAcademicYearId === ay.academic_year_id
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {selectedAcademicYearId === ay.academic_year_id ? 'Active' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 12-Month Financial Realization Pivot Matrix */}
          {dimensionData?.monthly_pivot && (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      12-Month Annual Financial Realization Pivot Matrix
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Realized fee collections distributed across all 12 operational academic months
                    </p>
                  </div>
                </div>

                {/* Sub-Dimension Switcher Pills */}
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    onClick={() => setAnnualPivotDimension('board')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      annualPivotDimension === 'board'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🏛️ By Board
                  </button>
                  <button
                    onClick={() => setAnnualPivotDimension('standard')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      annualPivotDimension === 'standard'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🏫 By Grade
                  </button>
                  <button
                    onClick={() => setAnnualPivotDimension('batch')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      annualPivotDimension === 'batch'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    👥 By Batch
                  </button>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse text-left text-xs min-w-[1250px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold">
                      <th className="px-5 py-3 min-w-[160px] whitespace-nowrap">
                        {annualPivotDimension === 'board' ? 'Educational Board' :
                         annualPivotDimension === 'standard' ? 'Standard / Grade' : 'Batch / Division'}
                      </th>
                      <th className="px-3 py-3 text-center min-w-[80px]">Enrolled</th>
                      {dimensionData?.monthly_pivot?.months.map(m => (
                        <th key={m.key} className="px-2.5 py-3 text-center min-w-[85px] border-l border-slate-100">
                          {m.label}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-right min-w-[110px] text-emerald-800 bg-emerald-50/30 border-l border-slate-200">
                        Total Realized (₹)
                      </th>
                      <th className="px-3 py-3 text-right min-w-[110px]">
                        Target (₹)
                      </th>
                      <th className="px-3 py-3 text-center min-w-[100px]">
                        Recovery %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(annualPivotDimension === 'board'
                      ? dimensionData.monthly_pivot.by_board
                      : annualPivotDimension === 'standard'
                      ? dimensionData.monthly_pivot.by_standard
                      : dimensionData.monthly_pivot.by_batch
                    ).map((row: any, idx: number) => {
                      const rowName = row.board_name || row.standard_name || row.batch_name
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {rowName}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                            {row.enrolled_students}
                          </td>
                          {dimensionData?.monthly_pivot?.months.map(m => {
                            const val = row.monthly_collections?.[m.key] || 0
                            return (
                              <td key={m.key} className="px-2.5 py-2.5 text-center font-mono border-l border-slate-100 whitespace-nowrap">
                                {val > 0 ? (
                                  <span className="font-bold text-emerald-700 bg-emerald-50/60 px-1.5 py-0.5 rounded-md">
                                    ₹{val.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/20 border-l border-slate-200 whitespace-nowrap">
                            ₹{row.total_realized.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                            ₹{row.target_amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-800">{row.recovery_rate}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                      <td className="px-5 py-3 font-black">INSTITUTE TOTALS</td>
                      <td className="px-3 py-3 text-center font-mono text-slate-500">—</td>
                      {dimensionData?.monthly_pivot?.months.map(m => {
                        const mTotal = dimensionData.monthly_pivot?.totals.monthly_realized[m.key] || 0
                        return (
                          <td key={m.key} className="px-2.5 py-3 text-center font-mono font-black text-emerald-800 border-l border-slate-200">
                            {mTotal > 0 ? `₹${mTotal.toLocaleString('en-IN')}` : '—'}
                          </td>
                        )
                      })}
                      <td className="px-3 py-3 text-right font-mono font-black text-emerald-800 bg-emerald-100/30 border-l border-slate-300">
                        ₹{(dimensionData.monthly_pivot?.totals.total_realized || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black">
                        ₹{(dimensionData.monthly_pivot?.totals.total_target || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-black">
                        {dimensionData.monthly_pivot?.totals.recovery_rate || 0}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Student Collection Roster for Multi-Year Ledger */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4">
            <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100">
              Students Collection Roster • Multi-Year Ledger
            </h3>
            <div className="mt-3">
              <EnterpriseDataTable
                data={dimensionData?.students || []}
                columns={studentRosterColumns}
                isLoading={isDimensionLoading}
                tableId="annual-dimension-roster"
                searchPlaceholder="Search student name, admission #, grade, board..."
                pageSize={25}
              />
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 7. PERSPECTIVE F: DYNAMIC STUDENT-WISE MONTHLY COLLECTION PIVOT              */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewPerspective === 'student-pivot' && (
        <StudentMonthlyFeePivot
          initialAcademicYearId={selectedAcademicYearId}
          onNavigateToCollection={onNavigateToCollection}
        />
      )}
    </div>
  )
}
