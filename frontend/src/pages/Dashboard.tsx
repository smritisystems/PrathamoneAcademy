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
 * @updated     2026-11-07
 *
 * @description Main executive dashboard displaying institute KPIs, admissions trend, upcoming batches, fee status, and optional CodeX obfuscation presentation.
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, TrendingUp, AlertCircle, DollarSign, ArrowRight,
  Calendar, BookOpen, Layers,
  SlidersHorizontal, Lock, KeyRound, Unlock
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import StatCard from '../components/StatCard'
import CascadingFilters, { FilterState } from '../components/CascadingFilters'
import { dashboardApi, codexApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useBranding } from '../config/branding'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { encodeCodexNumber } from '../utils/codexFormatter'
import QuickDecoderModal from '../components/codex/QuickDecoderModal'

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

  // Student Status Filter Override ('default' follows institute settings)
  const [statusFilter, setStatusFilter] = useState<'default' | 'active' | 'all' | 'withdrawn' | 'completed' | 'graduated' | 'inactive'>('default')

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
  const { data: stats, isLoading } = useQuery({
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
          status: statusFilter !== 'default' ? statusFilter : undefined,
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

  // CodeX representation calculations (prefer backend-provided authoritative bijective codes)
  const isCodexActive = Boolean((stats as any)?._codex?.is_enabled ?? codexStatus?.is_enabled)
  const codexMode = (stats as any)?._codex?.visibility_mode || codexStatus?.visibility_mode || 'actual_only'

  const rawFees = stats?.total_fees
  const codeFees = (stats as any)?.total_fees_coded || (isCodexActive && rawFees != null ? encodeCodexNumber(rawFees) : undefined)

  const rawCollected = stats?.total_collected
  const codeCollected = (stats as any)?.total_collected_coded || (isCodexActive && rawCollected != null ? encodeCodexNumber(rawCollected) : undefined)

  const rawOutstanding = stats?.total_outstanding
  const codeOutstanding = (stats as any)?.total_outstanding_coded || (isCodexActive && rawOutstanding != null ? encodeCodexNumber(rawOutstanding) : undefined)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coaching Institute Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Real-time overview of {branding.academyName} admissions, fee collections, and batches
          </p>
        </div>

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
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Decoder</span>
            </button>
          </div>
        )}
      </div>

      {/* Unified Cascading Filter Bar with Status Override */}
      <div className="space-y-2">
        <CascadingFilters
          filters={filters}
          onChange={(updated) => setFilters(updated)}
          title="Filter Dashboard Metrics"
        />

        {/* Student Lifecycle & Status Filter Override */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-2xs text-xs">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Student Status Scope:</span>
            <span className="text-gray-500 font-normal">
              ({(stats as any)?.configured_visibility === 'include_all' ? 'Institute Default: All Statuses' : 'Institute Default: Active Only'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dashboard-status-filter" className="text-gray-600">
              Filter:
            </label>
            <select
              id="dashboard-status-filter"
              data-testid="dashboard-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">Institute Setting Default</option>
              <option value="active">Active Students Only</option>
              <option value="all">Include All Student Statuses</option>
              <option value="withdrawn">Withdrawn Students</option>
              <option value="completed">Completed Students</option>
              <option value="graduated">Graduated Students</option>
              <option value="inactive">Inactive Students</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.total_students ?? 0}
          icon={Users}
          color="blue"
          subtitle={
            (stats as any)?.status_filter === 'all'
              ? 'All student statuses'
              : (stats as any)?.status_filter && (stats as any)?.status_filter !== 'active'
              ? `${(stats as any).status_filter.charAt(0).toUpperCase() + (stats as any).status_filter.slice(1)} students`
              : 'Enrolled active students'
          }
        />
        <StatCard
          title="Total Fees Invoiced"
          value={
            isCodexActive && codexMode === 'coded_only' ? (
              <button
                type="button"
                onClick={() => setDecoderCode(codeFees || '')}
                className="font-mono text-xl font-bold tracking-widest text-violet-950 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
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
            isCodexActive && codexMode === 'coded_only'
              ? 'CodeX Obfuscated [Click to Decode]'
              : 'Net invoiced receivables'
          }
        />
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
          subtitle={
            isCodexActive && codexMode === 'coded_only'
              ? 'CodeX Obfuscated [Click to Decode]'
              : `${collectionRate}% collection rate`
          }
        />
        <StatCard
          title="Outstanding Balance"
          value={
            isCodexActive && codexMode === 'coded_only' ? (
              <button
                type="button"
                onClick={() => setDecoderCode(codeOutstanding || '')}
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
            isCodexActive && codexMode === 'coded_only'
              ? 'CodeX Obfuscated [Click to Decode]'
              : 'Pending student dues'
          }
        />
      </div>

      {/* Charts + Recent Payments */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Collection Trends Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Monthly Fee Collection Trends</h2>
              <p className="text-xs text-gray-500">Historical collections by month over time</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
              Live Trend
            </span>
          </div>

          {stats?.monthly_trends && stats.monthly_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthly_trends} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(val: number) => [fmt(val), 'Collected']}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Bar dataKey="collected" fill="#1d4ed8" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center text-gray-400">
              <Calendar className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm">No collection transactions recorded for this filter selection</p>
            </div>
          )}
        </div>

        {/* Recent Payments Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Recent Payment Transactions</h2>
              <p className="text-xs text-gray-500">Latest receipts and fee allocations</p>
            </div>
            <Link
              to="/payments"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {!stats?.recent_payments?.length ? (
              <p className="text-gray-400 text-sm text-center py-10">No recent payments recorded</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 text-left">
                    <th className="pb-2 font-medium">Receipt #</th>
                    <th className="pb-2 font-medium">Student</th>
                    <th className="pb-2 font-medium">Batch</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.recent_payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-mono text-primary-700 font-medium">
                        {p.receipt_number}
                      </td>
                      <td className="py-2.5">
                        <p className="font-medium text-gray-800">{p.student_name}</p>
                        <p className="text-[10px] text-gray-400">{p.admission_number}</p>
                      </td>
                      <td className="py-2.5 text-gray-600">
                        {p.batch}
                      </td>
                      <td className="py-2.5 capitalize text-gray-600">
                        {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-gray-900">
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
                      <td className="py-2.5 text-right text-gray-500">
                        {p.payment_date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/students/add" className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3.5">
            <Users className="w-4 h-4" />
            + Enroll Student
          </Link>
          <Link to="/fees" className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3.5">
            <DollarSign className="w-4 h-4" />
            Fee Management
          </Link>
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
          <Link to="/standards" className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3.5">
            <BookOpen className="w-4 h-4" />
            Standards & Levels
          </Link>
        </div>
      </div>

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
