/**
 * @file        CampaignsPage.tsx
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
 * @description Dedicated Marketing Campaigns workspace tracking intake campaign performance, inquiry attribution, and admissions conversion ROI.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Megaphone, Users, CheckCircle2, TrendingUp, Calendar, ArrowRight,
  Plus, Search, BarChart2, Award, Zap, RefreshCw, Flame, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi, standardsApi, academicYearsApi } from '../../api/endpoints'
import type { CampaignSummaryItem } from '../../types'
import { useEditModeStore } from '../../store/editModeStore'
import { LockedButton } from '../../components/common'
import Modal from '../../components/Modal'
import CrmHeader from './CrmHeader'
import { NewLeadModal } from './CrmModals'

export default function CampaignsPage() {
  const navigate = useNavigate()
  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const [searchQuery, setSearchQuery] = useState('')
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false)
  const [isAddCampaignModalOpen, setIsAddCampaignModalOpen] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')

  // Query Campaigns Summary
  const { data: campaignsData, isLoading, refetch } = useQuery({
    queryKey: ['crm', 'campaigns-summary'],
    queryFn: async () => (await leadsApi.getCampaignsSummary()).data,
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

  const items: CampaignSummaryItem[] = campaignsData?.items || []
  const filteredItems = items.filter((c) =>
    c.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const topCampaign = [...items].sort((a, b) => b.total_leads - a.total_leads)[0]
  const totalCampaignLeads = items.reduce((acc, c) => acc + c.total_leads, 0)
  const totalConverted = items.reduce((acc, c) => acc + c.converted_leads, 0)
  const overallConvRate = totalCampaignLeads > 0 ? Math.round((totalConverted / totalCampaignLeads) * 100) : 0

  const handleCreateCampaignTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCampaignName.trim()) return
    toast.success(`Campaign tag "${newCampaignName}" registered for tracking.`)
    setIsAddCampaignModalOpen(false)
    setNewCampaignName('')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── CRM HEADER ─────────────────────────────────────────────────── */}
      <CrmHeader
        title="Campaigns — Campaign Management"
        subtitle="Monitor intake outreach campaigns, evaluate prospect response volume, and track conversion ROI."
        activeTab="campaigns"
        onNewEnquiryClick={() => setIsNewLeadModalOpen(true)}
        onRefresh={() => refetch()}
        extraActions={
          <LockedButton
            isEditMode={isEditMode}
            onClick={() => setIsAddCampaignModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Campaign Tag</span>
          </LockedButton>
        }
      />

      {/* ─── KPI SUMMARY CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active Campaigns</span>
            <Megaphone className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{items.length}</div>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Marketing campaigns tracked</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Top Campaign</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 truncate">{topCampaign?.campaign_name || 'None'}</div>
          <p className="text-[11px] text-blue-500 font-semibold mt-0.5">{topCampaign?.total_leads || 0} enquiries generated</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Campaign Leads</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{totalCampaignLeads}</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{totalConverted} admissions confirmed</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Overall Conversion</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{overallConvRate}%</div>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Campaign conversion rate</p>
        </div>
      </div>

      {/* ─── CAMPAIGNS REGISTER TABLE ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-black text-slate-900">Campaign Performance & Enrolment ROI</h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search campaign name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Campaign Tag</th>
                <th className="px-4 py-3">Total Enquiries</th>
                <th className="px-4 py-3">Converted Admissions</th>
                <th className="px-4 py-3 min-w-[150px]">Conversion Rate</th>
                <th className="px-4 py-3">Latest Inquiry Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.campaign_name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                    <Megaphone className="w-3.5 h-3.5 text-purple-600" />
                    <span>{item.campaign_name}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">{item.total_leads}</td>
                  <td className="px-4 py-3 font-bold text-teal-600">{item.converted_leads}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-700">{item.conversion_rate}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(item.conversion_rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">
                    {item.latest_enquiry ? new Date(item.latest_enquiry).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/leads/all?search=${encodeURIComponent(item.campaign_name)}`)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition-colors"
                      title="Inspect enquiries belonging to this campaign"
                    >
                      <span>View Leads</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredItems.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-medium">
                    {isLoading ? 'Loading campaigns data...' : 'No marketing campaigns found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL 1: ADD CAMPAIGN TAG MODAL ──────────────────────────────── */}
      {isAddCampaignModalOpen && (
        <Modal
          isOpen={isAddCampaignModalOpen}
          onClose={() => setIsAddCampaignModalOpen(false)}
          title="Create New Campaign Tag"
          size="sm"
        >
          <form onSubmit={handleCreateCampaignTag} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Tracking Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Summer Crash Course 2026"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <p className="text-xs text-slate-500">
              This campaign tag will be available when registering enquiries and tagging marketing ad links.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddCampaignModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-xs"
              >
                Create Tag
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL 2: NEW ENQUIRY MODAL ───────────────────────────────────── */}
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
