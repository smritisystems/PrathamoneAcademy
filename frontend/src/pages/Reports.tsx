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
 * @updated     2026-11-04
 *
 * @description Institute reports center offering Excel-like spreadsheet exploration, interactive filtering, sorting, and multi-format exports for fee collection, outstanding dues, and payment methods.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { InvoiceStatusBadge } from '../components/Badge'
import ExcelReportGrid, { ColumnConfig } from '../components/reports/ExcelReportGrid'

export default function Reports() {
  const { selectedAcademicYearId, selectedInstitutionId } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'collection' | 'outstanding' | 'summary'>('collection')

  // 1. Fee Collection Report
  const { data: collectionReport = [], isLoading: loadingCollection } = useQuery({
    queryKey: ['report-collection', selectedAcademicYearId, selectedInstitutionId],
    queryFn: async () => {
      const res = await reportsApi.feeCollection({
        academic_year_id: selectedAcademicYearId || undefined,
        institution_id: selectedInstitutionId || undefined,
      })
      return res.data
    },
    enabled: activeTab === 'collection',
  })

  // 2. Outstanding Dues Report
  const { data: outstandingReport = [], isLoading: loadingOutstanding } = useQuery({
    queryKey: ['report-outstanding', selectedAcademicYearId, selectedInstitutionId],
    queryFn: async () => {
      const res = await reportsApi.outstanding({
        academic_year_id: selectedAcademicYearId || undefined,
        institution_id: selectedInstitutionId || undefined,
      })
      return res.data
    },
    enabled: activeTab === 'outstanding',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial & Academic Reports</h1>
        <p className="text-sm text-gray-500">
          Spreadsheet-grade report grid with sticky headers, multi-column search, column filters, and Excel/CSV/JSON exports
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('collection')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'collection'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Fee Collection Report
          </button>
          <button
            onClick={() => setActiveTab('outstanding')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'outstanding'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Outstanding Dues Report
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Payment Methods Breakdown
          </button>
        </nav>
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
    </div>
  )
}
