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
 * @updated     2026-11-04
 *
 * @description Main executive dashboard displaying institute KPIs, admissions trend, upcoming batches, and fee status.
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, TrendingUp, AlertCircle, DollarSign, ArrowRight,
  Calendar, BookOpen, Layers,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import StatCard from '../components/StatCard'
import CascadingFilters, { FilterState } from '../components/CascadingFilters'
import { dashboardApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
}

export default function DashboardPage() {
  const {
    selectedAcademicYearId,
    selectedInstitutionId,
  } = useAuthStore()

  // Unified Cascading Filters state
  const [filters, setFilters] = useState<FilterState>({
    academicYearId: selectedAcademicYearId || null,
    boardId: null,
    standardId: null,
    divisionId: null,
  })

  // Sync year filter when global academic year changes
  useEffect(() => {
    if (selectedAcademicYearId && !filters.academicYearId) {
      setFilters((prev) => ({ ...prev, academicYearId: selectedAcademicYearId }))
    }
  }, [selectedAcademicYearId])

  // Fetch Dashboard live metrics
  const { data: stats, isLoading } = useQuery({
    queryKey: [
      'dashboard-stats',
      filters.academicYearId,
      selectedInstitutionId,
      filters.standardId,
      filters.divisionId,
    ],
    queryFn: () =>
      dashboardApi
        .getStats({
          academic_year_id: filters.academicYearId ?? undefined,
          institution_id: selectedInstitutionId ?? undefined,
          standard_id: filters.standardId ?? undefined,
          division_id: filters.divisionId ?? undefined,
        })
        .then((r) => r.data),
  })

  const collectionRate = stats?.collection_rate ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coaching Institute Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Real-time overview of Prashant Academy admissions, fee collections, and batches
          </p>
        </div>
      </div>

      {/* Unified Cascading Filter Bar */}
      <CascadingFilters
        filters={filters}
        onChange={(updated) => setFilters(updated)}
        title="Filter Dashboard Metrics"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.total_students ?? 0}
          icon={Users}
          color="blue"
          subtitle="Enrolled active students"
        />
        <StatCard
          title="Total Fees Invoiced"
          value={fmt(stats?.total_fees ?? 0)}
          icon={DollarSign}
          color="purple"
          subtitle="Net invoiced receivables"
        />
        <StatCard
          title="Collected Fees"
          value={fmt(stats?.total_collected ?? 0)}
          icon={TrendingUp}
          color="green"
          subtitle={`${collectionRate}% collection rate`}
        />
        <StatCard
          title="Outstanding Balance"
          value={fmt(stats?.total_outstanding ?? 0)}
          icon={AlertCircle}
          color="red"
          subtitle="Pending student dues"
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
                        {fmt(p.amount)}
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
    </div>
  )
}
