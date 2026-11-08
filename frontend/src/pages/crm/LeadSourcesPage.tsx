/**
 * @file        LeadSourcesPage.tsx
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
 * @description Dedicated Lead Sources & Marketing Acquisition Channels workspace analyzing channel volumes, conversion efficiencies, and ROI metrics.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Share2, Users, CheckCircle2, XCircle, TrendingUp, ArrowRight,
  ExternalLink, BarChart2, Award, Zap, Flame, RefreshCw, Plus, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi, standardsApi, academicYearsApi } from '../../api/endpoints'
import type { LeadSourceSummaryItem } from '../../types'
import CrmHeader from './CrmHeader'
import { NewLeadModal } from './CrmModals'

export default function LeadSourcesPage() {
  const navigate = useNavigate()
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false)

  // Query Sources Summary
  const { data: sourcesData, isLoading, refetch } = useQuery({
    queryKey: ['crm', 'sources-summary'],
    queryFn: async () => (await leadsApi.getSourcesSummary()).data,
    staleTime: 30000,
  })

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: async () => (await standardsApi.list()).data,
  })
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => (await academicYearsApi.list()).data,
  })

  const totalLeads = sourcesData?.total_leads || 0
  const items: LeadSourceSummaryItem[] = sourcesData?.items || []

  // Top source by volume
  const topVolumeSource = items[0]?.source || 'None'
  // Highest conversion rate source
  const topConversionSource = [...items].sort((a, b) => b.conversion_rate - a.conversion_rate)[0]

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── CRM HEADER ─────────────────────────────────────────────────── */}
      <CrmHeader
        title="Lead Sources — Acquisition Channel Management"
        subtitle="Analyze incoming inquiry volumes, conversion efficiencies, and lost rate per marketing channel."
        activeTab="sources"
        onNewEnquiryClick={() => setIsNewLeadModalOpen(true)}
        onRefresh={() => refetch()}
      />

      {/* ─── KPI SUMMARY CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active Channels</span>
            <Share2 className="w-4 h-4 text-primary-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{items.length}</div>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Tracked marketing channels</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Top Volume Channel</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 truncate">{topVolumeSource}</div>
          <p className="text-[11px] text-blue-500 font-semibold mt-0.5">Highest prospect generation</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Best Conversion</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 truncate">
            {topConversionSource?.source || 'N/A'} ({topConversionSource?.conversion_rate || 0}%)
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Highest conversion efficiency</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Enquiries</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">{totalLeads}</div>
          <p className="text-[11px] text-purple-600 font-semibold mt-0.5">All tracked channels</p>
        </div>
      </div>

      {/* ─── CHANNELS PERFORMANCE TABLE & VISUALIZATION ──────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-black text-slate-900">Channel Efficiency & Conversion Breakdown</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Sorted by Total Leads Generated</span>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Acquisition Channel</th>
                <th className="px-4 py-3">Total Leads</th>
                <th className="px-4 py-3">Admissions Converted</th>
                <th className="px-4 py-3">Lost / Junk</th>
                <th className="px-4 py-3">Active Pipeline</th>
                <th className="px-4 py-3 min-w-[140px]">Conversion Rate</th>
                <th className="px-4 py-3">Share of Admissions</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.source} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-600" />
                    <span>{item.source}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">{item.total_leads}</td>
                  <td className="px-4 py-3 font-bold text-teal-600">{item.converted_leads}</td>
                  <td className="px-4 py-3 text-slate-500">{item.lost_leads}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{item.active_leads}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-700">{item.conversion_rate}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(item.conversion_rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{item.share_percentage}%</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/leads/all?source=${encodeURIComponent(item.source)}`)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-[11px] font-bold transition-colors"
                      title="Inspect enquiries from this channel"
                    >
                      <span>Inspect Leads</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                    {isLoading ? 'Aggregating lead sources data...' : 'No lead source channels recorded.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        standards={standards}
        academicYears={academicYears}
        onSuccess={() => {
          setIsNewLeadModalOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
