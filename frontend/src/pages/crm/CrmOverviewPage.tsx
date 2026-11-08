/**
 * @file        CrmOverviewPage.tsx
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
 * @description Dedicated CRM Overview workspace featuring top KPI metrics, live enquiry funnel, overdue follow-up queues, source distribution, and counsellor leaderboard.
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users, UserPlus, Phone, Mail, MessageSquare, Calendar, Clock,
  AlertTriangle, CheckCircle2, XCircle, Target, ChevronRight, Filter,
  Search, Plus, ExternalLink, ArrowRight, RotateCcw, Lock, Flame,
  Zap, Snowflake, Check, Eye, Trash2, Edit, GraduationCap, Building2,
  BookOpen, Layers, MoreVertical, Send, RefreshCw, BarChart2,
  ArrowUpRight, PhoneCall, ShieldAlert, FileText, CheckSquare, X,
  Share2, Megaphone, Trophy, TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi, standardsApi, boardsApi, usersApi, academicYearsApi } from '../../api/endpoints'
import type { LeadItem, LeadDossierResponse, Standard, Board, User, AcademicYear } from '../../types'
import { useAuthStore, hasPermission } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'
import CrmHeader from './CrmHeader'
import { NewLeadModal, FollowUpModal, DemoClassModal, ConvertToAdmissionModal, getStageBadge, getPriorityBadge } from './CrmModals'
import LeadDossierDrawer from './LeadDossierDrawer'

export default function CrmOverviewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false)
  const [activeModalLead, setActiveModalLead] = useState<LeadDossierResponse | null>(null)
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)

  // 1. CRM Metrics Summary
  const { data: metrics, isLoading: isMetricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['crm', 'metrics'],
    queryFn: async () => (await leadsApi.getMetrics()).data,
    staleTime: 30000,
  })

  // 2. Recent Leads
  const { data: recentLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['crm', 'recent-leads'],
    queryFn: async () => (await leadsApi.getLeads({ limit: 8, page: 1 })).data,
    staleTime: 30000,
  })

  // 3. Overdue Follow-ups Queue
  const { data: overdueQueue, refetch: refetchOverdue } = useQuery({
    queryKey: ['crm', 'overdue-queue'],
    queryFn: async () => (await leadsApi.getFollowUps({ status: 'overdue', limit: 5 })).data,
    staleTime: 30000,
  })

  // Lookups
  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: async () => (await standardsApi.list()).data,
  })
  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => (await boardsApi.list()).data,
  })
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => (await academicYearsApi.list()).data,
  })
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await usersApi.list({ limit: 100 })).data,
  })
  const counsellors: User[] = (usersData?.items || usersData || []) as User[]

  const handleRefreshAll = () => {
    refetchMetrics()
    refetchLeads()
    refetchOverdue()
    queryClient.invalidateQueries({ queryKey: ['crm'] })
    toast.success('CRM Overview refreshed with latest records.')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── CRM HEADER WITH SUBMENU TABS ─────────────────────────────────── */}
      <CrmHeader
        title="CRM Overview & Executive Dashboard"
        subtitle="Canonical real-time admissions pipeline, enquiry conversion velocity, counsellor activity, and urgent follow-ups."
        activeTab="overview"
        onNewEnquiryClick={() => setIsNewLeadModalOpen(true)}
        onRefresh={handleRefreshAll}
      />

      {/* ─── 7 REAL-TIME KPI SUMMARY METRIC CARDS ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-primary-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics?.total_leads ?? 0}</div>
          <span className="text-[10px] text-slate-400 font-semibold">{metrics?.total_leads_trend || 'All-time enquiries'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">New Enquiries</span>
            <UserPlus className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{metrics?.new_enquiries ?? 0}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Uncontacted prospects</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Calls</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics?.follow_ups_today ?? 0}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Scheduled today</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{metrics?.overdue_follow_ups ?? 0}</div>
          <span className="text-[10px] text-rose-500 font-bold">Action required</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Converted</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-600">{metrics?.converted ?? 0}</div>
          <span className="text-[10px] text-teal-600 font-bold">Enrolled students</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lost / Junk</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-500">{metrics?.lost_leads ?? 0}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Closed enquiries</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Conv. Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics?.conversion_rate ?? 0}%</div>
          <span className="text-[10px] text-emerald-600 font-bold">{metrics?.conversion_rate_trend || 'Net conversion'}</span>
        </div>
      </div>

      {/* ─── ROW 2: OVERDUE ALERTS & STAGE PIPELINE FUNNEL ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 5/12: Urgent Overdue Follow-up Queue */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-black text-slate-900">Urgent Overdue Follow-ups</h3>
            </div>
            <Link
              to="/leads/follow-ups?status=overdue"
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {overdueQueue?.items?.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedLeadId(item.lead_id)}
                className="p-3 bg-rose-50/50 hover:bg-rose-50 border border-rose-200/70 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{item.lead_name}</span>
                    <span className="font-mono text-[10px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded">
                      {item.lead_number}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.remarks || 'Follow-up pending'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`tel:${item.lead_phone}`}
                    className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100"
                    title="Call prospect"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`https://wa.me/${item.lead_phone?.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
            {!overdueQueue?.items?.length && (
              <div className="py-8 text-center text-slate-400 text-xs font-medium">
                No overdue calls! All prospect follow-ups are up to date.
              </div>
            )}
          </div>
        </div>

        {/* Right 7/12: Pipeline Stage Distribution Funnel */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-black text-slate-900">Admissions Pipeline Funnel</h3>
            </div>
            <Link
              to="/leads/pipeline"
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span>Open Kanban Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { key: 'new_enquiry', label: 'New Enquiry', color: 'bg-primary-500' },
              { key: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
              { key: 'counselling_demo', label: 'Counselling & Demo', color: 'bg-purple-500' },
              { key: 'interested', label: 'Interested / Trial', color: 'bg-emerald-500' },
              { key: 'admission_pending', label: 'Admission Pending', color: 'bg-orange-500' },
              { key: 'converted', label: 'Converted to Admission', color: 'bg-teal-500' },
            ].map((stage) => {
              const count = metrics?.pipeline_counts?.[stage.key] ?? 0
              const total = metrics?.total_leads || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={stage.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{stage.label}</span>
                    <span className="font-mono text-slate-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${stage.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── ROW 3: RECENT ENQUIRIES REGISTER & DOSSIER DOCKED PANEL ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7/12: Recent Prospect Enquiries */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-black text-slate-900">Recent Prospect Enquiries</h3>
            </div>
            <Link
              to="/leads/all"
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span>View Full Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="pb-2">Lead #</th>
                  <th className="pb-2">Prospect</th>
                  <th className="pb-2">Class</th>
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Stage</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads?.items?.map((item: LeadItem) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedLeadId(item.id)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      selectedLeadId === item.id ? 'bg-primary-50/60' : ''
                    }`}
                  >
                    <td className="py-2.5 font-mono font-bold text-slate-900">{item.lead_number}</td>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-800">{item.full_name}</div>
                      <div className="text-[11px] text-slate-400">{item.phone}</div>
                    </td>
                    <td className="py-2.5 text-slate-600">{item.class_display || 'N/A'}</td>
                    <td className="py-2.5 text-slate-600">{item.source}</td>
                    <td className="py-2.5">{getStageBadge(item.stage)}</td>
                    <td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedLeadId(item.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        Dossier →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5/12: Lead Dossier Inspector Drawer */}
        <div className="lg:col-span-5">
          <LeadDossierDrawer
            leadId={selectedLeadId}
            onClose={() => setSelectedLeadId(null)}
            onScheduleFollowUp={(ld) => {
              setActiveModalLead(ld)
              setIsFollowUpModalOpen(true)
            }}
            onScheduleDemo={(ld) => {
              setActiveModalLead(ld)
              setIsDemoModalOpen(true)
            }}
            onConvertToAdmission={(ld) => {
              setActiveModalLead(ld)
              setIsConvertModalOpen(true)
            }}
            standards={standards}
            academicYears={academicYears}
            isDocked={true}
          />
        </div>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        standards={standards}
        boards={boards}
        academicYears={academicYears}
        counsellors={counsellors}
        onSuccess={() => {
          setIsNewLeadModalOpen(false)
          handleRefreshAll()
        }}
      />

      {activeModalLead && (
        <>
          <FollowUpModal
            isOpen={isFollowUpModalOpen}
            onClose={() => setIsFollowUpModalOpen(false)}
            lead={activeModalLead}
            onSuccess={() => {
              setIsFollowUpModalOpen(false)
              handleRefreshAll()
            }}
          />
          <DemoClassModal
            isOpen={isDemoModalOpen}
            onClose={() => setIsDemoModalOpen(false)}
            lead={activeModalLead}
            standards={standards}
            onSuccess={() => {
              setIsDemoModalOpen(false)
              handleRefreshAll()
            }}
          />
          <ConvertToAdmissionModal
            isOpen={isConvertModalOpen}
            onClose={() => setIsConvertModalOpen(false)}
            lead={activeModalLead}
            standards={standards}
            academicYears={academicYears}
            onSuccess={(res) => {
              setIsConvertModalOpen(false)
              handleRefreshAll()
              navigate(`/students/${res.student_id}`)
            }}
          />
        </>
      )}
    </div>
  )
}
