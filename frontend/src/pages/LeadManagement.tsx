/**
 * @file        LeadManagement.tsx
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
 * @created     2026-11-07
 * @updated     2026-11-08
 *
 * @description Complete Lead Management & CRM workspace featuring KPI metrics, Kanban pipeline,
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, UserPlus, Phone, Mail, MessageSquare, Calendar, Clock,
  AlertTriangle, CheckCircle2, XCircle, Target, ChevronRight, Filter,
  Search, Plus, ExternalLink, ArrowRight, RotateCcw, Lock, Flame,
  Zap, Snowflake, Check, Eye, Trash2, Edit, GraduationCap, Building2,
  BookOpen, Layers, MoreVertical, Send, RefreshCw, BarChart2,
  ArrowUpRight, PhoneCall, ShieldAlert, FileText, CheckSquare, X
} from 'lucide-react'
import toast from 'react-hot-toast'

import { leadsApi, standardsApi, boardsApi, usersApi, academicYearsApi } from '../api/endpoints'
import type {
  LeadItem, LeadDossierResponse, LeadMetricsSummary,
  LeadKanbanResponse, Standard, Board, User, AcademicYear
} from '../types'
import { useAuthStore, hasPermission } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton, LockedIconButton, DeleteConfirmationModal } from '../components/common'
import Modal from '../components/Modal'
import { Printer } from 'lucide-react'
import { PrintFooter, useUniversalPrint } from '../components/printing'

export default function LeadManagement() {
  const { openPrint, PrintModal } = useUniversalPrint()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // RBAC Permission Gates: CRM is strictly decoupled from student admission authorization
  const canReadLeads = hasPermission(user, 'leads:read') || hasPermission(user, 'leads:manage_pipeline')
  const canCreateLeads = hasPermission(user, 'leads:create')
  const canUpdateLeads = hasPermission(user, 'leads:update')
  const canDeleteLeads = hasPermission(user, 'leads:delete')
  const canConvertAdmission =
    hasPermission(user, 'students:admission') ||
    hasPermission(user, 'admissions:create') ||
    hasPermission(user, 'students:manage')

  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const [searchParams, setSearchParams] = useSearchParams()
  const initialView = searchParams.get('view') as 'pipeline' | 'list' | 'followups' | 'calendar' | 'analytics' | null
  // View Mode: pipeline (Kanban), list, followups, calendar, analytics
  const [viewMode, setViewMode] = useState<'pipeline' | 'list' | 'followups' | 'calendar' | 'analytics'>(
    initialView && ['pipeline', 'list', 'followups', 'calendar', 'analytics'].includes(initialView) ? initialView : 'pipeline'
  )

  useEffect(() => {
    const v = searchParams.get('view')
    if (v && ['pipeline', 'list', 'followups', 'calendar', 'analytics'].includes(v)) {
      setViewMode(v as any)
    }
  }, [searchParams])
  const [tableFilter, setTableFilter] = useState<'recent' | 'my' | 'overdue' | 'converted' | 'lost'>('recent')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState('All Sources')
  const [selectedCounsellorId, setSelectedCounsellorId] = useState<number | undefined>(undefined)

  // Selected Lead for Dossier
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [dossierTab, setDossierTab] = useState<'overview' | 'followups' | 'communication' | 'documents' | 'demo'>('overview')

  // Modals
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false)
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<LeadItem | null>(null)

  // ─── Data Queries ─────────────────────────────────────────────────────────

  // 1. CRM Metrics
  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ['crm', 'metrics'],
    queryFn: async () => {
      const res = await leadsApi.getMetrics()
      return res.data
    },
    staleTime: 30000,
  })

  // 2. Kanban Pipeline
  const { data: kanbanData, isLoading: isKanbanLoading, refetch: refetchKanban } = useQuery({
    queryKey: ['crm', 'kanban', selectedSource, selectedCounsellorId],
    queryFn: async () => {
      const res = await leadsApi.getKanban({
        source: selectedSource !== 'All Sources' ? selectedSource : undefined,
        assigned_to_id: selectedCounsellorId,
      })
      return res.data
    },
    staleTime: 15000,
  })

  // 3. Leads Table
  const { data: leadsListData, isLoading: isTableLoading, refetch: refetchTable } = useQuery({
    queryKey: ['crm', 'list', tableFilter, searchQuery, selectedSource, selectedCounsellorId],
    queryFn: async () => {
      let fFilter: string | undefined = undefined
      let stageFilter: string | undefined = undefined
      if (tableFilter === 'my') fFilter = 'my_leads'
      else if (tableFilter === 'overdue') fFilter = 'overdue'
      else if (tableFilter === 'converted') stageFilter = 'converted'
      else if (tableFilter === 'lost') stageFilter = 'lost'

      const res = await leadsApi.getLeads({
        search: searchQuery || undefined,
        source: selectedSource !== 'All Sources' ? selectedSource : undefined,
        assigned_to_id: selectedCounsellorId,
        follow_up_filter: fFilter,
        stage: stageFilter,
        limit: 50,
      })
      return res.data
    },
    staleTime: 15000,
  })

  // 4. Standards, Boards, Counsellors, Academic Years
  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: async () => (await standardsApi.list()).data,
  })
  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => (await boardsApi.list()).data,
  })
  const { data: counsellors = [] } = useQuery({
    queryKey: ['counsellors'],
    queryFn: async () => {
      const res = await usersApi.list()
      return res.data.items || []
    },
  })
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => (await academicYearsApi.list()).data,
  })

  // 5. Selected Lead Dossier
  const activeLeadId = selectedLeadId || leadsListData?.items?.[0]?.id || null
  const { data: leadDossier, refetch: refetchDossier } = useQuery({
    queryKey: ['crm', 'dossier', activeLeadId],
    queryFn: async () => {
      if (!activeLeadId) return null
      const res = await leadsApi.getLeadDossier(activeLeadId)
      return res.data
    },
    enabled: Boolean(activeLeadId),
    staleTime: 10000,
  })

  // Auto-select first lead if none selected
  useEffect(() => {
    if (!selectedLeadId) {
      if (leadsListData?.items?.length) {
        setSelectedLeadId(leadsListData.items[0].id)
      } else if (kanbanData?.columns) {
        for (const stage of ['new_enquiry', 'contacted', 'counselling_demo', 'interested', 'admission_pending', 'converted']) {
          const lead = kanbanData.columns[stage]?.items?.[0]
          if (lead) {
            setSelectedLeadId(lead.id)
            break
          }
        }
      }
    }
  }, [leadsListData, kanbanData, selectedLeadId])

  // ─── Mutations ────────────────────────────────────────────────────────────

  // Stage change mutation (Kanban drag-and-drop or select)
  const stageMutation = useMutation({
    mutationFn: async ({ id, stage, lost_reason }: { id: number; stage: string; lost_reason?: string }) => {
      return (await leadsApi.updateStage(id, { stage, lost_reason })).data
    },
    onSuccess: () => {
      toast.success('Lead stage updated successfully')
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update stage')
    },
  })

  // Delete / archive mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await leadsApi.deleteLead(id)).data
    },
    onSuccess: () => {
      toast.success('Lead archived successfully')
      setLeadToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to archive lead')
    },
  })

  // ─── Stage Styling Helper ─────────────────────────────────────────────────

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'new_enquiry':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">New</span>
      case 'contacted':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Contacted</span>
      case 'counselling_demo':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Counselling / Demo</span>
      case 'interested':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Interested</span>
      case 'admission_pending':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">Admission Pending</span>
      case 'converted':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">Admitted</span>
      case 'lost':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Lost</span>
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">{stage}</span>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'hot':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-500 fill-rose-500" /> Hot Lead
          </span>
        )
      case 'warm':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Warm
          </span>
        )
      case 'cold':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-600 border border-sky-200">
            <Snowflake className="w-3 h-3 text-sky-400" /> Cold
          </span>
        )
      default:
        return null
    }
  }

  // ─── RBAC Access Gate: Unauthorized User Check ────────────────────────────
  if (user && !canReadLeads) {
    return (
      <div className="min-h-[60vh] bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            You do not have permission to access the Lead Management & CRM module. Please contact your system administrator.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* ─── RULE 010 VIEW-FIRST GOVERNANCE BAR ───────────────────────────── */}
      <EditModeBar
        scope={editScope}
        title="Lead Management & CRM"
        requiredPermission="leads:update,leads:create"
      />

      {/* ─── WORKSPACE HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Lead Management & CRM
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Manage enquiries, follow-ups, counselling and convert leads to admissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <LockedButton
            isEditMode={isEditMode}
            onClick={() => setIsNewLeadModalOpen(true)}
            icon={Plus}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            New Lead
          </LockedButton>

          <button
            onClick={() => {
              setViewMode('followups')
              setTableFilter('overdue')
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Follow-ups ({metricsData?.overdue_follow_ups ?? 0})</span>
          </button>

          <button
            onClick={() => navigate('/reports?module=11_REPORTS_EXPORTS')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* ─── 7 TOP METRIC KPI CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* 1. Total Leads */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Leads</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metricsData?.total_leads ?? 0}</span>
            {metricsData?.total_leads_trend && (
              <span className="text-[11px] font-bold text-emerald-600">{metricsData.total_leads_trend}</span>
            )}
          </div>
        </div>

        {/* 2. New Enquiries */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">New Enquiries</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-cyan-700">{metricsData?.new_enquiries ?? 0}</span>
          </div>
        </div>

        {/* 3. Follow-ups Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Follow-ups Today</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{metricsData?.follow_ups_today ?? 0}</span>
          </div>
        </div>

        {/* 4. Overdue Follow-ups */}
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-2xs bg-rose-50/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Overdue Follow-ups</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-600">{metricsData?.overdue_follow_ups ?? 0}</span>
          </div>
        </div>

        {/* 5. Converted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Converted</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{metricsData?.converted ?? 0}</span>
            <span className="text-[11px] font-semibold text-slate-400">
              {metricsData?.conversion_rate ? `${metricsData.conversion_rate}%` : '0%'}
            </span>
          </div>
        </div>

        {/* 6. Lost Leads */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lost Leads</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-600">{metricsData?.lost_leads ?? 0}</span>
          </div>
        </div>

        {/* 7. Conversion Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Conversion Rate</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{metricsData?.conversion_rate ?? 0}%</span>
            {metricsData?.conversion_rate_trend && (
              <span className="text-[11px] font-bold text-emerald-600">{metricsData.conversion_rate_trend}</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── VIEW SELECTOR & FILTER CONTROLS ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'pipeline'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pipeline (Kanban)</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lead List</span>
          </button>

          <button
            onClick={() => setViewMode('followups')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'followups'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Follow-ups</span>
          </button>

          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'analytics'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Counsellor Dropdown */}
          <select
            value={selectedCounsellorId ?? ''}
            onChange={(e) => setSelectedCounsellorId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Counsellors</option>
            {counsellors.map((c: User) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          {/* Source Dropdown */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="All Sources">All Sources</option>
            <option value="Website">Website</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Referral">Referral</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Phone Enquiry">Phone Enquiry</option>
            <option value="Social Media">Social Media</option>
            <option value="Newspaper Ad">Newspaper Ad</option>
            <option value="Campaign">Campaign</option>
          </select>

          {/* View Toggle Icon Buttons */}
          <div className="flex items-center gap-1 border border-slate-200 p-0.5 rounded-lg bg-slate-50">
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              title="Kanban Pipeline View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'pipeline' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── KANBAN PIPELINE BOARD (FULL-WIDTH 6-COLUMN GRID) ─────────────── */}
      {viewMode === 'pipeline' && (
        <div className="overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 min-w-[1100px]">
            {['new_enquiry', 'contacted', 'counselling_demo', 'interested', 'admission_pending', 'converted'].map(
                (stageKey) => {
                  const col = kanbanData?.columns?.[stageKey] || {
                    key: stageKey,
                    title: stageKey.replace('_', ' ').toUpperCase(),
                    count: 0,
                    items: [],
                  }

                  const stageHeaderColor = {
                    new_enquiry: 'bg-blue-50 text-blue-700 border-blue-200',
                    contacted: 'bg-amber-50 text-amber-700 border-amber-200',
                    counselling_demo: 'bg-purple-50 text-purple-700 border-purple-200',
                    interested: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    admission_pending: 'bg-orange-50 text-orange-700 border-orange-200',
                    converted: 'bg-teal-50 text-teal-700 border-teal-200',
                  }[stageKey] || 'bg-slate-50 text-slate-700 border-slate-200'

                  return (
                    <div
                      key={stageKey}
                      className="w-full bg-slate-100/60 p-3 rounded-2xl border border-slate-200/80 flex flex-col min-h-[360px] max-h-[500px]"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/70">
                        <span className="text-xs font-bold text-slate-800 tracking-tight">
                          {col.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${stageHeaderColor}`}
                        >
                          {col.count}
                        </span>
                      </div>

                      {/* Cards List */}
                      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                        {col.items.map((leadItem: LeadItem) => {
                          const isSelected = selectedLeadId === leadItem.id

                          return (
                            <div
                              key={leadItem.id}
                              onClick={() => setSelectedLeadId(leadItem.id)}
                              className={`p-3 rounded-xl bg-white border cursor-pointer transition-all shadow-2xs hover:shadow-sm ${
                                isSelected
                                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                                  : 'border-slate-200/80 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {leadItem.first_name?.[0] || 'L'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">
                                    {leadItem.first_name} {leadItem.last_name}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {leadItem.class_display || 'Class N/A'}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{leadItem.phone}</span>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                                {getStageBadge(leadItem.stage)}
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {leadItem.next_follow_up_at ? 'Follow-up' : 'Enquiry'}
                                </span>
                              </div>
                            </div>
                          )
                        })}

                        {col.items.length === 0 && (
                          <div className="py-8 text-center text-xs text-slate-400 font-medium">
                            No leads in this stage
                          </div>
                        )}
                      </div>

                      {/* Add Lead to Stage Button */}
                      <div className="pt-2.5 mt-2 border-t border-slate-200/60">
                        <button
                          onClick={() => {
                            if (!isEditMode) {
                              toast.error('Activate Edit Mode above to add leads.')
                              return
                            }
                            setIsNewLeadModalOpen(true)
                          }}
                          className="w-full py-1.5 text-center text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-white rounded-lg transition-colors border border-dashed border-slate-300 hover:border-blue-300"
                        >
                          + Add Lead
                        </button>
                      </div>
                    </div>
                  )
                }
              )}
          </div>
        </div>
      )}

      {/* ─── LOWER SECTION: FILTERED LEADS TABLE + LEAD DOSSIER PANEL ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8/12: Filtered Leads Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Table Filter Tabs */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['recent', 'my', 'overdue', 'converted', 'lost'] as const).map((tabKey) => {
              const labels = {
                recent: 'Recent Leads',
                my: 'My Follow-ups',
                overdue: `Overdue (${metricsData?.overdue_follow_ups ?? 0})`,
                converted: 'Converted',
                lost: 'Lost',
              }

              return (
                <button
                  key={tabKey}
                  onClick={() => setTableFilter(tabKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tableFilter === tabKey
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {labels[tabKey]}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => {
              setViewMode('list')
              setTableFilter('recent')
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <span>View All Leads</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Select all leads"
                  />
                </th>
                <th className="px-4 py-3">Lead ID</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Interested Course</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Counsellor</th>
                <th className="px-4 py-3">Next Follow-up</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leadsListData?.items?.map((item: LeadItem) => {
                const isSelected = selectedLeadId === item.id

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedLeadId(item.id)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="w-10 px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select lead ${item.lead_number}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.lead_number}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div>{item.full_name}</div>
                      <span className="text-[11px] text-slate-400 font-normal">{item.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.class_display || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{item.interested_course || 'Foundation'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.source}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{item.assigned_to_name || 'Unassigned'}</td>
                    <td className="px-4 py-3">
                      {item.next_follow_up_at ? (
                        <span className="text-slate-800 font-semibold">
                          {new Date(item.next_follow_up_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStageBadge(item.stage)}</td>
                    <td className="px-4 py-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${item.phone}`}
                        className="p-1 text-slate-400 hover:text-blue-600 inline-block rounded"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/${item.phone?.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-emerald-600 inline-block rounded"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                      <LockedIconButton
                        isEditMode={isEditMode}
                        onClick={() => {
                          setSelectedLeadId(item.id)
                          setIsFollowUpModalOpen(true)
                        }}
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        tooltip="Schedule Follow-up"
                        className="p-1 text-slate-400 hover:text-amber-600 rounded"
                      />
                      <LockedIconButton
                        isEditMode={isEditMode}
                        onClick={() => setLeadToDelete(item)}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        tooltip="Archive Lead"
                        tone="danger"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      />
                    </td>
                  </tr>
                )
              })}

              {!leadsListData?.items?.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 font-medium">
                    No leads found matching current filter criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        {/* Right 4/12: Lead Dossier Side-Panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          {leadDossier ? (
              <>
                {/* Dossier Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">Lead Dossier</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        openPrint({
                          targetElementId: 'lead-dossier-printable',
                          documentType: 'employee_dossier',
                          documentTitle: `Lead Dossier - ${leadDossier?.first_name || ''} ${leadDossier?.last_name || ''}`,
                          initialSettings: {
                            paperSize: 'A4',
                            orientation: 'portrait',
                            confidentiality: 'Confidential CRM Dossier',
                            documentId: leadDossier?.lead_number || 'LD-001',
                          },
                        })
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-50 transition-colors"
                      title="Print Lead Dossier"
                    >
                      <Printer className="w-3 h-3 text-slate-500" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={() => {
                        toast('Full Dossier Profile view docked inline.')
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <span>Open Full Profile</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Printable Lead Dossier Wrapper */}
                <div id="lead-dossier-printable" className="space-y-4">
                {/* Lead Identity Hero */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 text-lg font-black flex items-center justify-center shrink-0">
                    {leadDossier.first_name?.[0] || 'L'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-black text-slate-900 truncate">
                        {leadDossier.first_name} {leadDossier.last_name}
                      </h2>
                      {getPriorityBadge(leadDossier.priority)}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {leadDossier.class_display} • {leadDossier.interested_course || 'Foundation'}
                    </p>
                  </div>
                </div>

                {/* Contact Quick Strip */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>{leadDossier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${leadDossier.phone?.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      title="WhatsApp Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                    {leadDossier.email && (
                      <a
                        href={`mailto:${leadDossier.email}`}
                        className="p-1 text-slate-500 hover:bg-slate-200/60 rounded"
                        title={leadDossier.email}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Dossier Tabs */}
                <div className="flex border-b border-slate-100">
                  {([
                    { id: 'overview', label: 'Overview' },
                    { id: 'followups', label: 'Follow-ups' },
                    { id: 'communication', label: 'Communication' },
                    { id: 'documents', label: 'Documents' },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDossierTab(tab.id)}
                      className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all ${
                        dossierTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab: Overview */}
                {dossierTab === 'overview' && (
                  <div className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Lead ID</span>
                        <p className="font-bold text-slate-900">{leadDossier.lead_number}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Enquiry Date</span>
                        <p className="font-medium text-slate-800">{leadDossier.enquiry_date || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Lead Source</span>
                        <p className="font-medium text-slate-800">{leadDossier.source}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Assigned To</span>
                        <p className="font-medium text-slate-800">{leadDossier.assigned_to_name || 'Unassigned'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Lead Stage</span>
                        <div className="mt-0.5">{getStageBadge(leadDossier.stage)}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">School</span>
                        <p className="font-medium text-slate-800 truncate">{leadDossier.school_name || 'N/A'}</p>
                      </div>
                    </div>

                    {leadDossier.guardian_name && (
                      <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Guardian Details</span>
                        <p className="font-bold text-slate-800">
                          {leadDossier.guardian_name} ({leadDossier.guardian_relation || 'Parent'})
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Phone: {leadDossier.guardian_phone || leadDossier.phone}
                        </p>
                      </div>
                    )}

                    {leadDossier.notes && (
                      <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Notes & Feedback</span>
                        <p className="text-slate-700 text-xs mt-1 leading-relaxed">{leadDossier.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Follow-ups */}
                {dossierTab === 'followups' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {leadDossier.follow_ups?.map((fu) => (
                      <div key={fu.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 capitalize flex items-center gap-1.5">
                            <PhoneCall className="w-3 h-3 text-blue-600" />
                            {fu.follow_up_type} • {fu.outcome}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {fu.created_at ? new Date(fu.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{fu.remarks}</p>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          By: {fu.performed_by_name}
                        </span>
                      </div>
                    ))}
                    {!leadDossier.follow_ups?.length && (
                      <p className="text-xs text-slate-400 text-center py-4">No follow-ups recorded yet</p>
                    )}
                  </div>
                )}

                {/* Tab: Communication History */}
                {dossierTab === 'communication' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {leadDossier.communication_history?.map((comm) => (
                      <div key={comm.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{comm.channel}</span>
                          <span className="text-[10px] text-slate-400">
                            {comm.sent_at ? new Date(comm.sent_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] line-clamp-2">{comm.content}</p>
                      </div>
                    ))}
                    {!leadDossier.communication_history?.length && (
                      <p className="text-xs text-slate-400 text-center py-4">No communication history</p>
                    )}
                  </div>
                )}

                                {/* Tab: Documents */}
                {dossierTab === 'documents' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-bold text-slate-800">Enquiry Form</p>
                          <span className="text-[10px] text-slate-400">PDF • Generated on registration</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toast('Enquiry registration form downloaded')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        View
                      </button>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="font-bold text-slate-800">Previous Marksheet</p>
                          <span className="text-[10px] text-slate-400">Uploaded by counsellor</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Verified
                      </span>
                    </div>
                  </div>
                )}

                {/* Tab: Demo Classes */}
                {dossierTab === 'demo' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {leadDossier.demo_classes?.map((dm) => (
                      <div key={dm.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{dm.subject_name || 'Demo Class'}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              dm.status === 'attended'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {dm.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px]">Teacher: {dm.teacher_name}</p>
                        <p className="text-slate-400 text-[10px]">
                          Scheduled: {dm.scheduled_at ? new Date(dm.scheduled_at).toLocaleString() : ''}
                        </p>
                      </div>
                    ))}
                    {!leadDossier.demo_classes?.length && (
                      <p className="text-xs text-slate-400 text-center py-4">No demo classes scheduled</p>
                    )}
                  </div>
                )}

                {/* Next Follow-up Card */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-amber-700 font-bold uppercase block">Next Follow-up</span>
                      <span className="font-bold text-slate-900">
                        {leadDossier.next_follow_up_at
                          ? new Date(leadDossier.next_follow_up_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Not Scheduled'}
                      </span>
                    </div>
                  </div>
                  <LockedButton
                    isEditMode={isEditMode}
                    onClick={() => setIsFollowUpModalOpen(true)}
                    className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-white border border-amber-300 rounded-lg shadow-2xs hover:bg-amber-50"
                  >
                    Reschedule
                  </LockedButton>
                </div>

                {/* Canonical Two-Row Global Print Footer Standard */}
                <PrintFooter
                  documentId={leadDossier.lead_number || 'LD-001'}
                  classification="Confidential CRM Dossier"
                  className="mt-4"
                />
              </div>

              {/* Quick Actions Grid */}
              <div className="space-y-2 pt-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Quick Actions</span>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setIsFollowUpModalOpen(true)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-center text-slate-700 flex flex-col items-center gap-1 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-blue-600" />
                      <span className="text-[10px] font-bold">Call</span>
                    </button>

                    <a
                      href={`https://wa.me/${leadDossier.phone?.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-center text-slate-700 flex flex-col items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] font-bold">WhatsApp</span>
                    </a>

                    <a
                      href={`mailto:${leadDossier.email || ''}`}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-center text-slate-700 flex flex-col items-center gap-1 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-purple-600" />
                      <span className="text-[10px] font-bold">Email</span>
                    </a>

                    <button
                      onClick={() => setIsDemoModalOpen(true)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-center text-slate-700 flex flex-col items-center gap-1 transition-colors"
                    >
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span className="text-[10px] font-bold">Schedule</span>
                    </button>
                  </div>
                </div>

                {/* ─── CONVERT TO ADMISSION BUTTON ─────────────────────────── */}
                <div className="pt-2">
                  {leadDossier.stage === 'converted' ? (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-1">
                      <span className="text-xs font-bold text-teal-800 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        Converted to Student Admission
                      </span>
                      {leadDossier.converted_student_id && (
                        <Link
                          to={`/students/${leadDossier.converted_student_id}`}
                          className="text-xs text-blue-600 font-semibold underline hover:text-blue-700 inline-block"
                        >
                          View Student Profile →
                        </Link>
                      )}
                    </div>
                  ) : canConvertAdmission ? (
                    <LockedButton
                      isEditMode={isEditMode}
                      onClick={() => setIsConvertModalOpen(true)}
                      icon={GraduationCap}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      Convert to Admission
                    </LockedButton>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Admission conversion requires separate Student Admission authorization."
                        className="w-full py-2.5 bg-slate-100 border border-slate-300/80 text-slate-400 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-not-allowed select-none"
                      >
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Convert to Admission (Locked)</span>
                      </button>
                      <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2 text-left">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-800 leading-snug">
                          Admission conversion requires separate Student Admission authorization. You can continue managing this lead in CRM.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs font-medium">
                Select a lead to inspect dossier
              </div>
            )}
        </div>
      </div>

      {/* ─── MODAL 1: NEW ENQUIRY / LEAD REGISTRATION ─────────────────────── */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        standards={standards}
        boards={boards}
        academicYears={academicYears}
        counsellors={counsellors}
        onSuccess={() => {
          setIsNewLeadModalOpen(false)
          queryClient.invalidateQueries({ queryKey: ['crm'] })
        }}
      />

      {/* ─── MODAL 2: FOLLOW-UP LOGGING & SCHEDULING ──────────────────────── */}
      {leadDossier && (
        <FollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          lead={leadDossier}
          onSuccess={() => {
            setIsFollowUpModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['crm'] })
          }}
        />
      )}

      {/* ─── MODAL 3: SCHEDULE DEMO CLASS ─────────────────────────────────── */}
      {leadDossier && (
        <DemoClassModal
          isOpen={isDemoModalOpen}
          onClose={() => setIsDemoModalOpen(false)}
          lead={leadDossier}
          standards={standards}
          onSuccess={() => {
            setIsDemoModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['crm'] })
          }}
        />
      )}

      {/* ─── MODAL 4: CONVERT LEAD TO ADMISSION ───────────────────────────── */}
      {leadDossier && (
        <ConvertToAdmissionModal
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          lead={leadDossier}
          standards={standards}
          academicYears={academicYears}
          canConvertAdmission={canConvertAdmission}
          onSuccess={(res) => {
            setIsConvertModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['crm'] })
            navigate(`/students/${res.student_id}`)
          }}
        />
      )}

      {/* ─── MODAL 5: DELETE / ARCHIVE CONFIRMATION MODAL ─────────────────── */}
      {leadToDelete && (
        <DeleteConfirmationModal
          isOpen={Boolean(leadToDelete)}
          onClose={() => setLeadToDelete(null)}
          scope={editScope}
          entityType="Lead / Enquiry"
          entityName={`${leadToDelete.lead_number} — ${leadToDelete.full_name}`}
          entityId={leadToDelete.id}
          onConfirm={() => deleteMutation.mutate(leadToDelete.id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}


// ─── SUB-MODAL 1: NEW LEAD MODAL ──────────────────────────────────────────────

function NewLeadModal({
  isOpen,
  onClose,
  standards,
  boards,
  academicYears,
  counsellors,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  standards: Standard[]
  boards: Board[]
  academicYears: AcademicYear[]
  counsellors: User[]
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'male',
    phone: '',
    email: '',
    school_name: '',
    standard_id: standards[0]?.id || 1,
    board_id: boards[0]?.id || 1,
    academic_year_id: academicYears[0]?.id || 1,
    interested_course: 'JEE Foundation',
    guardian_name: '',
    guardian_relation: 'Parent',
    guardian_phone: '',
    source: 'Website',
    priority: 'hot',
    stage: 'new_enquiry',
    assigned_to_id: counsellors[0]?.id || 1,
    notes: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.first_name || !formData.phone) {
      toast.error('Student first name and phone number are required.')
      return
    }

    try {
      setIsSubmitting(true)
      await leadsApi.createLead(formData)
      toast.success('New lead registered successfully!')
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Lead / Enquiry">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              placeholder="e.g. Aarav"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              placeholder="e.g. Sharma"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              placeholder="e.g. +91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              placeholder="aarav@gmail.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Class</label>
            <select
              value={formData.standard_id}
              onChange={(e) => setFormData({ ...formData, standard_id: Number(e.target.value) })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  Std. {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Board</label>
            <select
              value={formData.board_id}
              onChange={(e) => setFormData({ ...formData, board_id: Number(e.target.value) })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Interested Course</label>
            <input
              type="text"
              value={formData.interested_course}
              onChange={(e) => setFormData({ ...formData, interested_course: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              placeholder="e.g. JEE Foundation"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Source</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              <option value="Website">Website</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Referral">Referral</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Phone Enquiry">Phone Enquiry</option>
              <option value="Social Media">Social Media</option>
              <option value="Newspaper Ad">Newspaper Ad</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              <option value="hot">🔥 Hot Lead</option>
              <option value="warm">⚡ Warm</option>
              <option value="cold">❄️ Cold</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Counsellor</label>
            <select
              value={formData.assigned_to_id}
              onChange={(e) => setFormData({ ...formData, assigned_to_id: Number(e.target.value) })}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t pt-3">
          <h4 className="text-xs font-bold text-slate-800 mb-2">Parent / Guardian Details</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Guardian Name</label>
              <input
                type="text"
                value={formData.guardian_name}
                onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                placeholder="Parent full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Guardian Phone</label>
              <input
                type="text"
                value={formData.guardian_phone}
                onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                placeholder="Parent phone"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Enquiry Notes</label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            placeholder="Special requirements, batch timings, discount requests..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-xs"
          >
            {isSubmitting ? 'Registering...' : 'Register Lead'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


// ─── SUB-MODAL 2: FOLLOW-UP MODAL ────────────────────────────────────────────

function FollowUpModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  lead: LeadDossierResponse
  onSuccess: () => void
}) {
  const [followUpType, setFollowUpType] = useState('call')
  const [outcome, setOutcome] = useState('interested')
  const [remarks, setRemarks] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('11:00')
  const [updateStage, setUpdateStage] = useState(lead.stage)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!remarks) {
      toast.error('Follow-up remarks are required.')
      return
    }

    let nextFollowUpIso = null
    if (nextDate) {
      nextFollowUpIso = new Date(`${nextDate}T${nextTime || '11:00'}:00`).toISOString()
    }

    try {
      setIsSubmitting(true)
      await leadsApi.addFollowUp(lead.id, {
        follow_up_type: followUpType,
        outcome,
        remarks,
        next_follow_up_at: nextFollowUpIso,
        update_lead_stage: updateStage !== lead.stage ? updateStage : undefined,
      })
      toast.success('Follow-up interaction recorded!')
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to log follow-up')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log Follow-up — ${lead.lead_number} (${lead.full_name})`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Interaction Type</label>
            <select
              value={followUpType}
              onChange={(e) => setFollowUpType(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              <option value="call">Phone Call</option>
              <option value="whatsapp">WhatsApp Message</option>
              <option value="email">Email</option>
              <option value="meeting">In-Person Meeting</option>
              <option value="visit">Campus Visit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Call Outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              <option value="interested">Interested in Admission</option>
              <option value="call_back">Call Back Requested</option>
              <option value="not_reachable">Ringing / Not Reachable</option>
              <option value="visit_scheduled">Scheduled Campus Visit</option>
              <option value="admission_confirmed">Admission Confirmed</option>
              <option value="lost">Lost / Joined Competitor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Discussion Remarks <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            placeholder="Key discussion points, parent feedback, objections, fee negotiation..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Next Follow-up Date</label>
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Next Follow-up Time</label>
            <input
              type="time"
              value={nextTime}
              onChange={(e) => setNextTime(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Update Lead Pipeline Stage</label>
          <select
            value={updateStage}
            onChange={(e) => setUpdateStage(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
          >
            <option value="new_enquiry">New Enquiry</option>
            <option value="contacted">Contacted</option>
            <option value="counselling_demo">Counselling / Demo</option>
            <option value="interested">Interested</option>
            <option value="admission_pending">Admission Pending</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-xs"
          >
            {isSubmitting ? 'Saving...' : 'Save Follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


// ─── SUB-MODAL 3: SCHEDULE DEMO CLASS ────────────────────────────────────────

function DemoClassModal({
  isOpen,
  onClose,
  lead,
  standards,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  lead: LeadDossierResponse
  standards: Standard[]
  onSuccess: () => void
}) {
  const [demoDate, setDemoDate] = useState('')
  const [demoTime, setDemoTime] = useState('16:00')
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!demoDate) {
      toast.error('Demo date is required.')
      return
    }

    const scheduledIso = new Date(`${demoDate}T${demoTime || '16:00'}:00`).toISOString()

    try {
      setIsSubmitting(true)
      await leadsApi.scheduleDemo(lead.id, {
        standard_id: lead.standard_id || standards[0]?.id || 1,
        scheduled_at: scheduledIso,
        feedback,
      })
      toast.success('Demo class scheduled successfully!')
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to schedule demo class')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Schedule Demo Class — ${lead.full_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          Per Coaching Directive PDR-007, up to 3 complimentary demo lectures are permitted per prospect.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Demo Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={demoDate}
              onChange={(e) => setDemoDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Demo Time</label>
            <input
              type="time"
              value={demoTime}
              onChange={(e) => setDemoTime(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Special Instructions / Subject</label>
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            placeholder="e.g. Physics Mechanics Demo with Prof. Ramesh"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 shadow-xs"
          >
            {isSubmitting ? 'Scheduling...' : 'Confirm Demo Slot'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


// ─── SUB-MODAL 4: CONVERT TO ADMISSION ───────────────────────────────────────

function ConvertToAdmissionModal({
  isOpen,
  onClose,
  lead,
  standards,
  academicYears,
  onSuccess,
  canConvertAdmission = true,
}: {
  isOpen: boolean
  onClose: () => void
  lead: LeadDossierResponse
  standards: Standard[]
  academicYears: AcademicYear[]
  onSuccess: (res: any) => void
  canConvertAdmission?: boolean
}) {
  const [selectedExistingId, setSelectedExistingId] = useState<number | null>(null)
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0])
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [standardId, setStandardId] = useState<number>(lead.standard_id || standards[0]?.id || 1)
  const [academicYearId, setAcademicYearId] = useState<number>(lead.academic_year_id || academicYears[0]?.id || 1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const duplicates = lead.potential_duplicate_students || []

  const handleConvert = async () => {
    if (!canConvertAdmission) {
      toast.error('Admission conversion requires separate Student Admission authorization. You can continue managing this lead in CRM.')
      return
    }
    try {
      setIsSubmitting(true)
      const res = await leadsApi.convertToAdmission(lead.id, {
        existing_student_id: selectedExistingId || undefined,
        confirm_duplicate: selectedExistingId ? false : true,
        first_name: lead.first_name,
        last_name: lead.last_name,
        date_of_birth: lead.date_of_birth || '2010-01-01',
        gender: lead.gender || 'male',
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        admission_date: admissionDate,
        admission_number: admissionNumber || undefined,
        academic_year_id: academicYearId,
        standard_id: standardId,
        guardian_name: lead.guardian_name,
        guardian_phone: lead.guardian_phone || lead.phone,
        guardian_relation: lead.guardian_relation || 'Parent',
        remarks: `Converted from Lead ${lead.lead_number}`,
      })
      toast.success(res.data.message)
      onSuccess(res.data)
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail?.message || err?.response?.data?.detail || 'Failed to convert lead to admission'
      toast.error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert Prospect to Formal Student Admission">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {/* Banner */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl flex items-start gap-3">
          <GraduationCap className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-indigo-900 block">Seamless Lead-to-Admission Transition</span>
            <span className="text-slate-600">
              Converts <strong>{lead.full_name}</strong> into the canonical student roster. A sequential admission number
              will be auto-generated and parent guardian records linked.
            </span>
          </div>
        </div>

        {/* Duplicate Warning */}
        {duplicates.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Matching Student Records Detected</span>
            </div>
            <p className="text-[11px] text-amber-800">
              The phone number <strong>{lead.phone}</strong> matches existing students in the system. Select one to re-enroll
              or create a fresh student.
            </p>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 p-1.5 bg-white rounded-lg border border-slate-200">
                <input
                  type="radio"
                  name="dup_choice"
                  checked={selectedExistingId === null}
                  onChange={() => setSelectedExistingId(null)}
                />
                <span>Create New Student Profile (Auto-generate new Admission No.)</span>
              </label>

              {duplicates.map((dup) => (
                <label
                  key={dup.id}
                  className="flex items-center gap-2 text-xs text-slate-800 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="dup_choice"
                    checked={selectedExistingId === dup.id}
                    onChange={() => setSelectedExistingId(dup.id)}
                  />
                  <span>
                    Link to Existing: <strong>{dup.name}</strong> ({dup.admission_number})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Conversion Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Academic Year</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Standard / Class</label>
            <select
              value={standardId}
              onChange={(e) => setStandardId(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  Std. {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Admission Date</label>
            <input
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Admission Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              placeholder="Leave blank for PA-2026-XXXXXX"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={isSubmitting}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            <span>{isSubmitting ? 'Converting...' : 'Confirm Admission'}</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
