/**
 * @file        FlexibleStudentCharts.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.reports
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
 * @description Synchronized visual analytics charts for flexible student reporting: Board & Standard distribution, Batch attendance vs capacity, Financial realization vs dues, and Attendance compliance donuts.
 */

import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  CircleDollarSign,
  ChevronDown,
  BarChart3,
  Award,
} from 'lucide-react'

export interface FlexibleStudentChartsProps {
  data: any[]
}

const DONUT_COLORS = {
  good: '#10b981', // emerald-500
  average: '#f59e0b', // amber-500
  defaulter: '#f43f5e', // rose-500
}

export default function FlexibleStudentCharts({ data }: FlexibleStudentChartsProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // ─── 1. KPI Aggregations ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalStudents = data.length
    if (totalStudents === 0) {
      return { totalStudents: 0, avgAttendance: 0, totalDues: 0, defaultersCount: 0, avgExamScore: 0 }
    }

    let totalAtt = 0
    let studentsWithSessions = 0
    let totalDues = 0
    let defaulters = 0
    let totalExam = 0
    let examCount = 0

    data.forEach((r) => {
      totalDues += Number(r.balance_fees || 0)
      if (Number(r.total_sessions || 0) > 0) {
        totalAtt += Number(r.attendance_percentage || 0)
        studentsWithSessions += 1
        if (Number(r.attendance_percentage || 100) < 75) {
          defaulters += 1
        }
      }
      if (Number(r.exam_percentage || 0) > 0) {
        totalExam += Number(r.exam_percentage)
        examCount += 1
      }
    })

    return {
      totalStudents,
      avgAttendance: studentsWithSessions > 0 ? Math.round((totalAtt / studentsWithSessions) * 10) / 10 : 0,
      totalDues,
      defaultersCount: defaulters,
      avgExamScore: examCount > 0 ? Math.round((totalExam / examCount) * 10) / 10 : 0,
    }
  }, [data])

  // ─── 2. Chart 1: Board & Standard Distribution ────────────────────────────
  const boardDistributionData = useMemo(() => {
    const map: Record<string, number> = {}
    data.forEach((r) => {
      const board = r.board_name || 'Unassigned'
      map[board] = (map[board] || 0) + 1
    })
    return Object.entries(map).map(([name, count]) => ({
      name: name.length > 18 ? `${name.substring(0, 16)}…` : name,
      full_name: name,
      students: count,
    }))
  }, [data])

  // ─── 3. Chart 2: Batch Enrollment & Attendance % ──────────────────────────
  const batchAttendanceData = useMemo(() => {
    const map: Record<string, { count: number; totalAtt: number; sessionStudents: number }> = {}
    data.forEach((r) => {
      const batch = r.division_name || 'Unassigned'
      if (!map[batch]) map[batch] = { count: 0, totalAtt: 0, sessionStudents: 0 }
      map[batch].count += 1
      if (Number(r.total_sessions || 0) > 0) {
        map[batch].totalAtt += Number(r.attendance_percentage || 0)
        map[batch].sessionStudents += 1
      }
    })
    return Object.entries(map)
      .slice(0, 8)
      .map(([name, val]) => ({
        name: name.length > 14 ? `${name.substring(0, 12)}…` : name,
        full_name: name,
        enrolled: val.count,
        avgAttendance: val.sessionStudents > 0 ? Math.round((val.totalAtt / val.sessionStudents) * 10) / 10 : 0,
      }))
  }, [data])

  // ─── 4. Chart 3: Financial Health by Batch ─────────────────────────────────
  const batchFinancialData = useMemo(() => {
    const map: Record<string, { paid: number; balance: number }> = {}
    data.forEach((r) => {
      const batch = r.division_name || 'Unassigned'
      if (!map[batch]) map[batch] = { paid: 0, balance: 0 }
      map[batch].paid += Number(r.paid_fees || 0)
      map[batch].balance += Number(r.balance_fees || 0)
    })
    return Object.entries(map)
      .slice(0, 8)
      .map(([name, val]) => ({
        name: name.length > 14 ? `${name.substring(0, 12)}…` : name,
        full_name: name,
        paid: Math.round(val.paid),
        balance: Math.round(val.balance),
      }))
  }, [data])

  // ─── 5. Chart 4: Attendance Defaulter Compliance Donut ─────────────────────
  const attendanceComplianceData = useMemo(() => {
    let good = 0
    let avg = 0
    let risk = 0

    data.forEach((r) => {
      if (Number(r.total_sessions || 0) === 0) return
      const pct = Number(r.attendance_percentage || 0)
      if (pct >= 85) good += 1
      else if (pct >= 75) avg += 1
      else risk += 1
    })

    return [
      { name: 'Good (≥85%)', value: good, color: DONUT_COLORS.good },
      { name: 'Average (75-84%)', value: avg, color: DONUT_COLORS.average },
      { name: 'Defaulter (<75%)', value: risk, color: DONUT_COLORS.defaulter },
    ].filter((item) => item.value > 0)
  }, [data])

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs mb-4 overflow-hidden">
      {/* Header Bar with Toggle */}
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-100 text-primary-700 rounded-lg">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">Visual Insights & Analytical Charts</h3>
            <p className="text-[11px] text-slate-500">Live multi-dimensional telemetry reflecting active filters</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
        >
          <span>{isExpanded ? 'Collapse Charts' : 'Expand Charts'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 animate-in fade-in duration-200">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 p-3.5 rounded-xl border border-primary-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-primary-700 uppercase tracking-wider">Filtered Students</span>
                <Users className="w-4 h-4 text-primary-600" />
              </div>
              <div className="text-xl font-extrabold text-primary-950 font-mono">{kpis.totalStudents}</div>
              <span className="text-[10px] text-primary-700/80 font-medium">Active in view</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3.5 rounded-xl border border-emerald-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Avg Attendance</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-emerald-950 font-mono">{kpis.avgAttendance}%</div>
              <span className="text-[10px] text-emerald-700/80 font-medium">Cohort check-in rate</span>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 p-3.5 rounded-xl border border-rose-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Outstanding</span>
                <CircleDollarSign className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-extrabold text-rose-950 font-mono">
                ₹{kpis.totalDues.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-rose-700/80 font-medium">Uncollected balance</span>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-3.5 rounded-xl border border-amber-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Defaulters (&lt;75%)</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-extrabold text-amber-950 font-mono">{kpis.defaultersCount}</div>
              <span className="text-[10px] text-amber-700/80 font-medium">Critical intervention</span>
            </div>
          </div>

          {/* Charts Grid: 4 Dynamic Visuals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Board Distribution */}
            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800">Board-wise Student Distribution</h4>
                <span className="text-[10px] text-slate-500 font-medium">Total Count</span>
              </div>
              <div className="h-48 w-full">
                {boardDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={boardDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        formatter={(val: any) => [`${val} students`, 'Enrolled']}
                      />
                      <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No board data</div>
                )}
              </div>
            </div>

            {/* Chart 2: Batch Attendance vs Capacity */}
            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800">Batch-wise Strength vs Avg Attendance %</h4>
                <span className="text-[10px] text-slate-500 font-medium">Dual Metric</span>
              </div>
              <div className="h-48 w-full">
                {batchAttendanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={batchAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: '#10b981' }} unit="%" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar yAxisId="left" dataKey="enrolled" name="Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="avgAttendance" name="Attd %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No batch data</div>
                )}
              </div>
            </div>

            {/* Chart 3: Batch Financial Realization & Dues */}
            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800">Batch-wise Collections vs Outstanding Dues</h4>
                <span className="text-[10px] text-slate-500 font-medium">Financial Inflow</span>
              </div>
              <div className="h-48 w-full">
                {batchFinancialData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={batchFinancialData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="paid" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="balance" name="Outstanding" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No financial data</div>
                )}
              </div>
            </div>

            {/* Chart 4: Attendance Compliance Donut */}
            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800">Attendance Compliance Risk Segments</h4>
                <span className="text-[10px] text-slate-500 font-medium">Cohort Health</span>
              </div>
              <div className="h-48 w-full flex items-center justify-center">
                {attendanceComplianceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceComplianceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {attendanceComplianceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        formatter={(val: any, name: any) => [`${val} students (${Math.round((Number(val) / (kpis.totalStudents || 1)) * 100)}%)`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-slate-400">No attendance data</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
