/**
 * @file        CrmReportsPage.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages.crm
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-08
 * @updated     2026-11-08
 *
 * @description Dedicated CRM Reports & Analytics Centre featuring monthly intake trajectory, lost reason Pareto analysis, counsellor performance matrix, and universal print export.
 */

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileSpreadsheet, BarChart2, TrendingUp, Users, AlertTriangle,
  Award, Download, Printer, RefreshCw, Layers, CheckCircle2,
  Calendar, ArrowRight, ShieldCheck, PieChart
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi } from '../../api/endpoints'
import type { CrmReportsAnalytics } from '../../types'
import { useUniversalPrint } from '../../components/printing'
import CrmHeader from './CrmHeader'

export default function CrmReportsPage() {
  const { openPrint, PrintModal } = useUniversalPrint()

  // Query CRM Reports Analytics
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['crm', 'reports-analytics'],
    queryFn: async () => (await leadsApi.getReportsAnalytics()).data,
    staleTime: 30000,
  })

  // Export CSV
  const handleExportCsv = () => {
    if (!analytics) return
    const headers = ['Category', 'Item', 'Metric 1', 'Metric 2', 'Metric 3']
    const rows: string[][] = []

    analytics.monthly_trajectories?.forEach((m) => {
      rows.push(['Monthly Trend', m.month, `New: ${m.new_leads}`, `Conversions: ${m.conversions}`, `Rate: ${m.conversion_rate}%`])
    })
    analytics.lost_reasons?.forEach((l) => {
      rows.push(['Lost Reasons Pareto', `"${l.reason}"`, `Count: ${l.count}`, `Pct: ${l.percentage}%`, `CumPct: ${l.cumulative_percentage}%`])
    })
    analytics.counsellors_matrix?.forEach((c) => {
      rows.push(['Counsellor Matrix', `"${c.name}"`, `Assigned: ${c.assigned_leads}`, `Calls: ${c.follow_ups_logged}`, `Rate: ${c.conversion_rate}%`])
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `CRM_Admissions_Analytics_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CRM Analytics Report exported to CSV.')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── CRM HEADER ─────────────────────────────────────────────────── */}
      <CrmHeader
        title="CRM Reports — Admissions Analytics Centre"
        subtitle="Comprehensive executive intelligence: 6-month enquiry trajectory, lost reason Pareto analysis, and counsellor efficiency rankings."
        activeTab="reports"
        onRefresh={() => refetch()}
        extraActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                openPrint({
                  targetElementId: 'crm-reports-printable-section',
                  documentType: 'general_document',
                  documentTitle: 'CRM Admissions Executive Analytics Report',
                  initialSettings: {
                    paperSize: 'A4',
                    orientation: 'landscape',
                    confidentiality: 'Confidential Management Analytics',
                    documentId: 'CRM-REP-2026',
                  },
                })
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              title="Print full analytics report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      <div id="crm-reports-printable-section" className="space-y-6">
        {/* ─── SECTION 1: 6-MONTH MONTHLY ENQUIRY & CONVERSION TRAJECTORY ─── */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-black text-slate-900">Monthly Prospect Enquiry vs Admission Trajectory</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Historical 6-Month Intake Trend</span>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Calendar Month</th>
                  <th className="px-4 py-3">New Inquiries</th>
                  <th className="px-4 py-3">Admissions Confirmed</th>
                  <th className="px-4 py-3 min-w-[160px]">Conversion Rate</th>
                  <th className="px-4 py-3 text-right">Trend Visual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics?.monthly_trajectories?.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{m.month}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{m.new_leads}</td>
                    <td className="px-4 py-3 font-bold text-teal-600">{m.conversions}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{m.conversion_rate}%</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-block w-28 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${Math.min(m.conversion_rate * 2, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── SECTION 2: COUNSELLOR CONVERSION MATRIX & LOST PARETO ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7/12: Counsellor Performance Matrix */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-black text-slate-900">Counsellor Activity & Efficiency Leaderboard</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Ranked by Admissions</span>
            </div>

            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Counsellor Name</th>
                    <th className="px-4 py-3">Leads Assigned</th>
                    <th className="px-4 py-3">Follow-ups Logged</th>
                    <th className="px-4 py-3">Conversions</th>
                    <th className="px-4 py-3 text-right">Efficiency %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics?.counsellors_matrix?.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                        <span>{c.name}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{c.assigned_leads}</td>
                      <td className="px-4 py-3 text-slate-600">{c.follow_ups_logged}</td>
                      <td className="px-4 py-3 font-bold text-teal-600">{c.conversions}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {c.conversion_rate}%
                      </td>
                    </tr>
                  ))}
                  {!analytics?.counsellors_matrix?.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                        No counsellor activity records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right 5/12: Lost Reasons Pareto Analysis */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-black text-slate-900">Lost Reasons Pareto Analysis</h3>
              </div>
              <span className="text-xs text-rose-600 font-bold">Root Cause Focus</span>
            </div>

            <div className="space-y-3">
              {analytics?.lost_reasons?.map((l) => (
                <div key={l.reason} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{l.reason}</span>
                    <span className="font-bold text-rose-600">{l.count} lost ({l.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(l.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    Cumulative Pareto: {l.cumulative_percentage}%
                  </div>
                </div>
              ))}
              {!analytics?.lost_reasons?.length && (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  No lost reasons recorded.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── SECTION 3: STAGE CONVERSION DROP-OFF FUNNEL ────────────────── */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-black text-slate-900">Pipeline Stage Volume & Drop-off Analysis</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Canonical Records</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {analytics?.stage_funnel?.map((st) => (
              <div key={st.stage} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  {st.label}
                </span>
                <div className="text-xl font-black text-slate-900">{st.count}</div>
                <span className="text-[10px] text-primary-600 font-semibold">Active Prospects</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <PrintModal />
    </div>
  )
}
