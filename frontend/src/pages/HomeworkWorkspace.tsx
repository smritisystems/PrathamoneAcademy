/**
 * @file        HomeworkWorkspace.tsx
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
 * @created     2026-11-11
 * @updated     2026-11-13
 *
 * @description Flagship Homework & Assignment Management workspace featuring Overview, Unified Assignment Creation, Physical Checking Register, Digital Submissions, Templates, and Daily Reports.
 */

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import {
  FileCheck, Plus, Search, Calendar, Clock, BookOpen, Users,
  CheckCircle2, AlertCircle, Clock4, Filter, ChevronRight,
  Download, Printer, Share2, Eye, Edit3, Trash2, ArrowRight,
  FileText, Upload, Sparkles, AlertTriangle, CheckSquare,
  XCircle, UserCheck, ShieldAlert, RotateCcw, CalendarDays, Lock, ExternalLink,
  Inbox, BarChart3, Send, RefreshCw, MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  homeworkApi, standardsApi, divisionsApi, subjectsApi, usersApi,
  academicYearsApi, studentPortalApi, communicationApi
} from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton, DeleteConfirmationModal, ContextualHelpButton } from '../components/common'
import StatCard from '../components/StatCard'
import Modal from '../components/Modal'
import HomeworkCreateForm from '../components/homework/HomeworkCreateForm'
import HomeworkSubmissionsTab from '../components/homework/HomeworkSubmissionsTab'
import HomeworkTemplatesTab from '../components/homework/HomeworkTemplatesTab'
import HomeworkReportsAndSettingsTab from '../components/homework/HomeworkReportsAndSettingsTab'
import type {
  HomeworkAssignmentItem, CheckingRegisterStudent,
  TeacherHomeworkDashboard, DailyHomeworkRegisterReport, HomeworkSettingsConfig
} from '../types'

type HomeworkTab = 'overview' | 'create' | 'checking' | 'submissions' | 'templates' | 'reports'

export default function HomeworkWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, selectedInstitutionId, selectedAcademicYearId } = useAuthStore()

  // ── Global View-First & Scoped Edit Mode Governance ──
  const editScope = 'homework:workspace'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  // Determine active tab from URL path or query params
  const getTabFromLocation = (): HomeworkTab => {
    const paramTab = searchParams.get('tab') as HomeworkTab
    if (paramTab && ['overview', 'create', 'checking', 'submissions', 'templates', 'reports'].includes(paramTab)) {
      return paramTab
    }
    const path = location.pathname.toLowerCase()
    if (path.endsWith('/create') || path.endsWith('/new')) return 'create'
    if (path.endsWith('/checking')) return 'checking'
    if (path.endsWith('/submissions')) return 'submissions'
    if (path.endsWith('/templates')) return 'templates'
    if (path.endsWith('/reports')) return 'reports'
    return 'overview'
  }

  const activeTab = getTabFromLocation()

  const setActiveTab = (tab: HomeworkTab) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('tab')
    const queryStr = nextParams.toString()
    navigate(`/homework/${tab}${queryStr ? `?${queryStr}` : ''}`)
  }

  // ── Filter State ──
  const [selectedStandardId, setSelectedStandardId] = useState<string>('')
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(searchParams.get('division_id') || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(searchParams.get('subject_id') || '')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // ── Checking Register State ──
  const [checkingAssignmentId, setCheckingAssignmentId] = useState<number | null>(
    searchParams.get('assignment_id') ? Number(searchParams.get('assignment_id')) : null
  )
  const [checkingSearch, setCheckingSearch] = useState<string>('')
  const [checkingReviewFilter, setCheckingReviewFilter] = useState<string>('all')
  const [localCheckingState, setLocalCheckingState] = useState<Record<number, {
    review_status: string
    marks_obtained: string
    teacher_remarks: string
  }>>({})

  // ── Resubmit / Extend Modal State ──
  const [actionModal, setActionModal] = useState<{
    type: 'resubmit' | 'extend' | 'exempt' | null
    record: CheckingRegisterStudent | null
    textValue: string
    dateValue: string
  }>({ type: null, record: null, textValue: '', dateValue: '' })

  // ── Delete Confirmation State ──
  const [deleteTarget, setDeleteTarget] = useState<HomeworkAssignmentItem | null>(null)

  // ── Fetch Master Metadata ──
  const { data: standardsResp } = useQuery({
    queryKey: ['hw-standards'],
    queryFn: () => standardsApi.list({ institution_id: selectedInstitutionId || 1 }),
  })
  const standards = standardsResp?.data || []

  const { data: divisionsResp } = useQuery({
    queryKey: ['hw-divisions', selectedStandardId],
    queryFn: () => divisionsApi.list({ standard_id: selectedStandardId ? Number(selectedStandardId) : undefined }),
  })
  const divisions = divisionsResp?.data || []

  const { data: subjectsResp } = useQuery({
    queryKey: ['hw-subjects'],
    queryFn: () => subjectsApi.list({}),
  })
  const subjects = subjectsResp?.data || []

  const { data: teachersResp } = useQuery({
    queryKey: ['hw-teachers'],
    queryFn: () => usersApi.list({ role: 'teacher', limit: 100 }),
  })
  const teachers = teachersResp?.data?.items || []

  // ── Fetch Homework Module Settings ──
  const { data: hwSettingsResp } = useQuery({
    queryKey: ['hw-settings', selectedInstitutionId],
    queryFn: () =>
      typeof homeworkApi.getSettings === 'function'
        ? homeworkApi.getSettings({ institution_id: selectedInstitutionId || 1 }).then((r) => r.data)
        : Promise.resolve(undefined),
  })
  const hwSettings: HomeworkSettingsConfig | undefined = hwSettingsResp

  // ── Fetch Teacher Dashboard KPIs ──
  const { data: teacherDashResp } = useQuery({
    queryKey: ['hw-teacher-dashboard', user?.id],
    queryFn: () => homeworkApi.getTeacherDashboard({ teacher_id: user?.role === 'teacher' ? user.id : undefined }).then((r) => r.data),
  })
  const dashboardStats: Partial<TeacherHomeworkDashboard> & {
    total_assigned: number
    assigned_today: number
    active_assignments: number
    awaiting_check: number
    overdue_count: number
  } = teacherDashResp || {
    total_assigned: 0,
    total_assignments: 0,
    assigned_today: 0,
    active_assignments: 0,
    awaiting_check: 0,
    pending_submissions: 0,
    submitted_assignments: 0,
    late_submissions: 0,
    pending_evaluations: 0,
    completed_evaluations: 0,
    overdue_count: 0,
  }

  // ── Fetch Assignments List ──
  const { data: assignmentsResp, isLoading: isAssignmentsLoading } = useQuery({
    queryKey: [
      'hw-assignments', selectedStandardId, selectedDivisionId,
      selectedSubjectId, selectedStatusFilter, searchQuery, activeTab
    ],
    queryFn: () =>
      homeworkApi.listAssignments({
        standard_id: selectedStandardId ? Number(selectedStandardId) : undefined,
        division_id: selectedDivisionId ? Number(selectedDivisionId) : undefined,
        subject_id: selectedSubjectId ? Number(selectedSubjectId) : undefined,
        status: selectedStatusFilter !== 'all' ? selectedStatusFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 50,
      }).then((r) => r.data),
    enabled: ['overview', 'checking', 'submissions', 'reports'].includes(activeTab),
  })
  const assignments: HomeworkAssignmentItem[] = assignmentsResp?.items || []

  // If entering checking tab without an assignment_id, default to first available
  useEffect(() => {
    if (activeTab === 'checking' && !checkingAssignmentId && assignments.length > 0) {
      setCheckingAssignmentId(assignments[0].id)
    }
  }, [activeTab, assignments, checkingAssignmentId])

  // ── Fetch Checking Register Students ──
  const { data: checkingRegisterResp, isLoading: isCheckingLoading, refetch: refetchRegister } = useQuery({
    queryKey: ['hw-checking-register', checkingAssignmentId, checkingSearch, checkingReviewFilter],
    queryFn: () =>
      homeworkApi.getCheckingRegister(checkingAssignmentId!, {
        search: checkingSearch.trim() || undefined,
        review_status: checkingReviewFilter !== 'all' ? checkingReviewFilter : undefined,
      }).then((r) => r.data),
    enabled: activeTab === 'checking' && checkingAssignmentId !== null,
  })
  const checkingStudents: CheckingRegisterStudent[] = checkingRegisterResp?.students || []

  // Sync local checking inputs when students change
  useEffect(() => {
    if (checkingStudents.length > 0) {
      const stateMap: Record<number, any> = {}
      for (const s of checkingStudents) {
        stateMap[s.record_id] = {
          review_status: s.review_status,
          marks_obtained: s.marks_obtained !== null && s.marks_obtained !== undefined ? String(s.marks_obtained) : '',
          teacher_remarks: s.teacher_remarks || '',
        }
      }
      setLocalCheckingState(stateMap)
    }
  }, [checkingStudents])

  // ── Active Selected Assignment Details ──
  const selectedAssignment = useMemo(() => {
    if (!checkingAssignmentId) return null
    return assignments.find((a) => a.id === checkingAssignmentId) || null
  }, [assignments, checkingAssignmentId])

  // ── Checking Mutation ──
  const submitCheckMutation = useMutation({
    mutationFn: (items: any[]) => homeworkApi.checkRegister(checkingAssignmentId!, { items }),
    onSuccess: (resp) => {
      toast.success(`Successfully saved checking register for ${resp.data.updated_count} students!`)
      queryClient.invalidateQueries({ queryKey: ['hw-checking-register'] })
      queryClient.invalidateQueries({ queryKey: ['hw-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['hw-teacher-dashboard'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to submit checking register.')
    },
  })

  // ── Delete Mutation ──
  const deleteMutation = useMutation({
    mutationFn: (id: number) => homeworkApi.deleteAssignment(id),
    onSuccess: () => {
      toast.success('Assignment archived successfully.')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['hw-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['hw-teacher-dashboard'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete assignment.')
    },
  })

  // ── Prefill & Template State ──
  const [templateInitialValues, setTemplateInitialValues] = useState<any>(() => ({
    standard_id: searchParams.get('standard_id') || selectedStandardId || '',
    division_id: searchParams.get('division_id') || selectedDivisionId || '',
    subject_id: searchParams.get('subject_id') || selectedSubjectId || '',
    teacher_id: searchParams.get('teacher_id') || (user?.role === 'teacher' ? String(user.id) : ''),
    topic: searchParams.get('topic') || '',
    assignment_type: searchParams.get('type') || 'homework',
    teaching_session_id: searchParams.get('teaching_session_id') || searchParams.get('session_id') || '',
  }))

  // Create Assignment Mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) => homeworkApi.createAssignment(payload),
    onSuccess: (resp) => {
      toast.success(
        resp.data.status === 'draft'
          ? `Draft saved! Code: ${resp.data.assignment_code}`
          : `Assignment published to ${resp.data.original_recipient_count} student(s)! Code: ${resp.data.assignment_code}`
      )
      queryClient.invalidateQueries({ queryKey: ['hw-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['hw-teacher-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['hw-templates'] })
      setActiveTab('overview')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to create homework assignment.')
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: number) => homeworkApi.publishAssignment(id),
    onSuccess: (resp) => {
      toast.success(`Assignment published to ${resp.data.original_recipient_count} student(s)!`)
      queryClient.invalidateQueries({ queryKey: ['hw-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['hw-teacher-dashboard'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Publish failed.'),
  })

  const broadcastMutation = useMutation({
    mutationFn: (id: number) => communicationApi.dispatchHomeworkNotification(id, { channel: 'WHATSAPP' }),
    onSuccess: (resp) => {
      toast.success(resp.data?.message || 'Homework broadcast dispatched!')
      queryClient.invalidateQueries({ queryKey: ['communication-triggers'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Broadcast failed.'),
  })

  const closeMutation = useMutation({
    mutationFn: (id: number) => homeworkApi.closeAssignment(id),
    onSuccess: () => {
      toast.success('Assignment closed for new submissions.')
      queryClient.invalidateQueries({ queryKey: ['hw-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['hw-teacher-dashboard'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to close assignment.'),
  })

  const reopenMutation = useMutation({
    mutationFn: (id: number) => homeworkApi.reopenAssignment(id),
    onSuccess: () => {
      toast.success('Assignment reopened and students notified.')
      queryClient.invalidateQueries({ queryKey: ['hw-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['hw-teacher-dashboard'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to reopen assignment.'),
  })

  const syncLateJoinersMutation = useMutation({
    mutationFn: (id: number) => homeworkApi.syncLateJoiners(id),
    onSuccess: (resp) => {
      toast.success(
        resp.data.added_count > 0
          ? `Added ${resp.data.added_count} newly joined student(s) (Snapshot preserved at ${resp.data.original_recipient_count}).`
          : 'All eligible batch students are already assigned.'
      )
      queryClient.invalidateQueries({ queryKey: ['hw-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['hw-checking-register'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to sync late joiners.'),
  })

  // Handle Bulk Status Set in Checking Register
  const handleBulkSetStatus = (targetStatus: string) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Activate Edit Mode to modify checking records.')
      return
    }
    setLocalCheckingState((prev) => {
      const next = { ...prev }
      for (const s of checkingStudents) {
        if (targetStatus === 'done_remaining') {
          if (next[s.record_id]?.review_status === 'pending') {
            next[s.record_id] = { ...next[s.record_id], review_status: 'done' }
          }
        } else {
          next[s.record_id] = { ...next[s.record_id], review_status: targetStatus }
        }
      }
      return next
    })
    toast.success(`Applied bulk status '${targetStatus}' across rows. Remember to click 'Save & Submit Checking'.`)
  }

  // Handle Save Checking
  const handleSaveChecking = () => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Activate Edit Mode to submit.')
      return
    }
    const items = checkingStudents.map((s) => {
      const state = localCheckingState[s.record_id] || {}
      return {
        record_id: s.record_id,
        student_id: s.student_id,
        review_status: state.review_status || s.review_status,
        marks_obtained: state.marks_obtained !== '' && !isNaN(Number(state.marks_obtained)) ? Number(state.marks_obtained) : null,
        teacher_remarks: state.teacher_remarks || null,
      }
    })
    submitCheckMutation.mutate(items)
  }

  // ── Daily Register Report Query (Phase 9) ──
  const [reportDate, setReportDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const { data: reportResp } = useQuery({
    queryKey: ['hw-daily-report', reportDate, selectedDivisionId],
    queryFn: () =>
      homeworkApi.getDailyRegisterReport({
        target_date: reportDate,
        division_id: selectedDivisionId ? Number(selectedDivisionId) : undefined,
      }).then((r) => r.data),
    enabled: activeTab === 'reports',
  })
  const dailyReport: DailyHomeworkRegisterReport = reportResp || { date: reportDate, total_assignments: 0, items: [] }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Global View-First Edit Mode Governance Bar (Rule 010) ── */}
      <EditModeBar
        scope={editScope}
        title="Homework & Assignment Governance"
      />

      {/* ── Workspace Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">
            <FileCheck className="w-4 h-4" />
            <span>Academic Management & Student Workload</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Homework & Assignment Studio
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            One assignment, multiple recipients, independently tracked student checking records and progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ContextualHelpButton moduleKey="homework" variant="pill" label="Homework Help" />
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'create') setActiveTab('overview')
              else setActiveTab('create')
            }}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-xs transition-all"
          >
            {activeTab === 'create' ? (
              <>
                <BookOpen className="w-4 h-4" />
                <span>View Homework List</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Assign New Homework</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Top Stat Cards (7 Phase 10 Teacher Dashboard KPIs) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard
          title="Total Assigned"
          value={dashboardStats.total_assignments ?? dashboardStats.total_assigned}
          icon={BookOpen}
          color="primary"
          subtitle="All assignments"
        />
        <StatCard
          title="Active Homework"
          value={dashboardStats.active_assignments}
          icon={Clock4}
          color="green"
          subtitle="Currently published"
        />
        <StatCard
          title="Pending Submissions"
          value={dashboardStats.pending_submissions ?? 0}
          icon={Inbox}
          color="blue"
          subtitle="Awaiting student work"
        />
        <StatCard
          title="Submitted"
          value={dashboardStats.submitted_assignments ?? 0}
          icon={FileText}
          color="primary"
          subtitle="Turned in by students"
        />
        <StatCard
          title="Late Submissions"
          value={dashboardStats.late_submissions ?? dashboardStats.overdue_count}
          icon={AlertTriangle}
          color="red"
          subtitle="Submitted after due"
        />
        <StatCard
          title="Pending Evaluations"
          value={dashboardStats.pending_evaluations ?? dashboardStats.awaiting_check}
          icon={CheckSquare}
          color="orange"
          subtitle="Awaiting grading"
        />
        <StatCard
          title="Evaluated"
          value={dashboardStats.completed_evaluations ?? 0}
          icon={CheckCircle2}
          color="green"
          subtitle="Completed evaluations"
        />
      </div>

      {/* ── Tab Navigation (6 Workspaces matching Sidebar routes) ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Homework Overview', icon: BookOpen },
          { id: 'create', label: 'Assign Homework', icon: Plus },
          { id: 'checking', label: 'Checking Register', icon: CheckSquare },
          { id: 'submissions', label: 'Digital Submissions', icon: Inbox },
          { id: 'templates', label: 'Templates Library', icon: Sparkles },
          { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
        ].map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as HomeworkTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.id === 'checking' && dashboardStats.awaiting_check > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-black bg-amber-500 text-white rounded-full">
                  {dashboardStats.awaiting_check}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: OVERVIEW & LIST                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by topic, chapter, title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <select
                value={selectedStandardId}
                onChange={(e) => {
                  setSelectedStandardId(e.target.value)
                  setSelectedDivisionId('')
                }}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
              >
                <option value="">All Standards</option>
                {standards.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
              >
                <option value="">All Batches</option>
                {divisions.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>

          {/* Assignments Grid */}
          {isAssignmentsLoading ? (
            <div className="py-16 text-center text-slate-400 font-medium">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Homework Assignments Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No assignments match the selected filters. Click "Assign New Homework" to distribute homework to your batches.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {assignments.map((hw) => {
                const s = hw.summary
                const isOverdue = new Date(hw.due_date) < new Date()
                return (
                  <div
                    key={hw.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-primary-50 text-primary-700 rounded-lg">
                            {hw.assignment_code}
                          </span>
                          {hw.assignment_type && (
                            <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-md capitalize">
                              {hw.assignment_type.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                            hw.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : hw.status === 'draft'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {hw.status.toUpperCase()}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 text-base line-clamp-1">{hw.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {hw.topic ? `Topic: ${hw.topic}` : hw.chapter || 'General Practice'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold bg-slate-100 px-2 py-0.5 rounded-md">{hw.standard_name}</span>
                        <span className="font-semibold bg-slate-100 px-2 py-0.5 rounded-md">{hw.division_name}</span>
                        <span className="font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md">{hw.subject_name}</span>
                        {hw.estimated_duration_minutes && (
                          <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                            ~{hw.estimated_duration_minutes} mins
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-500">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Due Date:
                          </span>
                          <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                            {hw.due_date} {hw.due_time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Submission:</span>
                          <span className="font-medium text-slate-700 capitalize">
                            {hw.submission_method.replace('_', ' ')}
                          </span>
                        </div>
                        {typeof hw.original_recipient_count === 'number' && hw.original_recipient_count > 0 && (
                          <div className="flex items-center justify-between">
                            <span>Published Snapshot:</span>
                            <span className="font-mono font-semibold text-slate-700">
                              {hw.original_recipient_count} student(s)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="pt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-slate-700">Completion</span>
                          <span className="font-bold text-primary-600">{s.completion_percentage}% ({s.completed_count}/{s.total_recipients})</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${s.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="bg-slate-50 p-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckingAssignmentId(hw.id)
                          setActiveTab('checking')
                        }}
                        className="flex-1 min-w-[120px] py-2 px-2.5 bg-white hover:bg-primary-50 hover:text-primary-600 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-primary-600" />
                        <span>Checking</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCheckingAssignmentId(hw.id)
                          setActiveTab('submissions')
                        }}
                        className="py-2 px-2.5 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                        title="Review digital submissions & evaluate"
                      >
                        Evaluate
                      </button>

                      {hw.status === 'draft' && (
                        <button
                          type="button"
                          disabled={!isEditMode || publishMutation.isPending}
                          onClick={() => publishMutation.mutate(hw.id)}
                          className="py-2 px-2.5 bg-primary-600 text-white hover:bg-primary-700 rounded-xl text-xs font-bold disabled:opacity-40"
                          title="Publish draft to students"
                        >
                          Publish
                        </button>
                      )}

                      {hw.status === 'published' && hw.recipient_type === 'batch' && (
                        <button
                          type="button"
                          disabled={!isEditMode || syncLateJoinersMutation.isPending}
                          onClick={() => syncLateJoinersMutation.mutate(hw.id)}
                          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
                          title="Sync new batch joiners"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {hw.status === 'published' && (
                        <button
                          type="button"
                          disabled={!isEditMode || broadcastMutation.isPending}
                          onClick={() => broadcastMutation.mutate(hw.id)}
                          className="py-2 px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                          title={!isEditMode ? 'Locked in View Mode: Enable Edit Mode to broadcast' : 'Broadcast Homework alert via WhatsApp'}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                      )}

                      {hw.status === 'published' && (
                        <button
                          type="button"
                          disabled={!isEditMode || closeMutation.isPending}
                          onClick={() => closeMutation.mutate(hw.id)}
                          className="py-2 px-2 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 rounded-xl text-xs font-semibold text-slate-600 disabled:opacity-40"
                          title="Close assignment"
                        >
                          Close
                        </button>
                      )}

                      {hw.status === 'closed' && (
                        <button
                          type="button"
                          disabled={!isEditMode || reopenMutation.isPending}
                          onClick={() => reopenMutation.mutate(hw.id)}
                          className="py-2 px-2 bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-xs font-semibold text-slate-600 disabled:opacity-40"
                          title="Reopen assignment"
                        >
                          Reopen
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => setDeleteTarget(hw)}
                        className={`p-2 rounded-xl border border-slate-200 text-slate-400 transition-colors ${
                          isEditMode ? 'hover:bg-red-50 hover:text-red-600 cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                        title={isEditMode ? 'Delete assignment' : 'Locked in View Mode'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ASSIGN NEW HOMEWORK (CREATION FORM)                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'create' && (
        <HomeworkCreateForm
          isEditMode={isEditMode}
          academicYearId={selectedAcademicYearId || 1}
          currentUserId={user?.id || 1}
          currentUserRole={user?.role}
          standards={standards}
          divisions={divisions}
          subjects={subjects}
          teachers={teachers}
          settings={hwSettings}
          initialValues={templateInitialValues}
          isSubmitting={createMutation.isPending}
          onSubmitAssignment={(payload) => createMutation.mutate(payload)}
          onCancel={() => setActiveTab('overview')}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: PHYSICAL CHECKING REGISTER (PHASE 3)                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'checking' && (
        <div className="space-y-6">
          {/* Assignment Selector & Quick Summary Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-bold text-slate-700 mb-1">Active Assignment to Check</label>
                <select
                  value={checkingAssignmentId || ''}
                  onChange={(e) => setCheckingAssignmentId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold bg-white"
                >
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.assignment_code}] {a.title} ({a.division_name}) — Due {a.due_date}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAssignment && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
                    Standard: <strong>{selectedAssignment.standard_name}</strong>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
                    Batch: <strong>{selectedAssignment.division_name}</strong>
                  </div>
                  <div className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-xl text-xs font-semibold">
                    Subject: <strong>{selectedAssignment.subject_name}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Action Controls */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions:</span>
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => handleBulkSetStatus('done_remaining')}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                >
                  Mark Remaining as Done
                </button>
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => handleBulkSetStatus('done')}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Mark All Done
                </button>
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => handleBulkSetStatus('incomplete')}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
                >
                  Mark All Incomplete
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <button
                    type="button"
                    disabled={submitCheckMutation.isPending}
                    onClick={handleSaveChecking}
                    className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitCheckMutation.isPending ? 'Saving Register...' : 'Save & Submit Checking'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.error('Locked in View Mode: Activate Edit Mode in the top bar to save checking.')}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Save Checking (Locked)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Student Checking Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter student or roll no..."
                  value={checkingSearch}
                  onChange={(e) => setCheckingSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Total Enrolled in Register: <strong>{checkingStudents.length}</strong>
              </div>
            </div>

            {isCheckingLoading ? (
              <div className="py-12 text-center text-slate-400">Loading checking register...</div>
            ) : checkingStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No students enrolled in this batch or matching your search filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Roll</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Status Flag</th>
                      <th className="py-3 px-4">Checking Actions</th>
                      <th className="py-3 px-4">Marks</th>
                      <th className="py-3 px-4">Teacher Remarks</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {checkingStudents.map((st) => {
                      const state = localCheckingState[st.record_id] || {
                        review_status: st.review_status,
                        marks_obtained: '',
                        teacher_remarks: '',
                      }
                      return (
                        <tr key={st.record_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {st.roll_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{st.student_name}</div>
                            <div className="text-2xs text-slate-400">{st.admission_number}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 text-2xs font-bold rounded-md uppercase ${
                                state.review_status === 'done'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : state.review_status === 'incomplete'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : state.review_status === 'not_done'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : state.review_status === 'excused'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {state.review_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {[
                                { key: 'done', label: 'Done', color: 'emerald' },
                                { key: 'incomplete', label: 'Incomplete', color: 'amber' },
                                { key: 'not_done', label: 'Not Done', color: 'red' },
                                { key: 'absent_not_checked', label: 'Absent', color: 'slate' },
                                { key: 'excused', label: 'Excused', color: 'purple' },
                              ].map((btn) => (
                                <button
                                  key={btn.key}
                                  type="button"
                                  disabled={!isEditMode}
                                  onClick={() => {
                                    setLocalCheckingState((prev) => ({
                                      ...prev,
                                      [st.record_id]: { ...prev[st.record_id], review_status: btn.key },
                                    }))
                                  }}
                                  className={`px-2 py-1 text-2xs font-bold rounded-lg transition-all ${
                                    state.review_status === btn.key
                                      ? btn.color === 'emerald'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : btn.color === 'amber'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : btn.color === 'red'
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : btn.color === 'purple'
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'bg-slate-700 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              disabled={!isEditMode}
                              placeholder="Marks"
                              value={state.marks_obtained}
                              onChange={(e) => {
                                const val = e.target.value
                                setLocalCheckingState((prev) => ({
                                  ...prev,
                                  [st.record_id]: { ...prev[st.record_id], marks_obtained: val },
                                }))
                              }}
                              className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg font-mono text-center"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              disabled={!isEditMode}
                              placeholder="Feedback / remarks..."
                              value={state.teacher_remarks}
                              onChange={(e) => {
                                const val = e.target.value
                                setLocalCheckingState((prev) => ({
                                  ...prev,
                                  [st.record_id]: { ...prev[st.record_id], teacher_remarks: val },
                                }))
                              }}
                              className="w-48 px-2 py-1 text-xs border border-slate-200 rounded-lg"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                disabled={!isEditMode}
                                onClick={() =>
                                  setActionModal({
                                    type: 'resubmit',
                                    record: st,
                                    textValue: 'Please complete the missing problems and resubmit.',
                                    dateValue: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                                  })
                                }
                                className="px-2 py-1 text-2xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md transition-colors"
                              >
                                Resubmit
                              </button>
                              <button
                                type="button"
                                disabled={!isEditMode}
                                onClick={() =>
                                  setActionModal({
                                    type: 'extend',
                                    record: st,
                                    textValue: 'Medical leave requested',
                                    dateValue: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
                                  })
                                }
                                className="px-2 py-1 text-2xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                              >
                                Extend
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: DIGITAL SUBMISSIONS REVIEW & EVALUATION                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'submissions' && (
        <HomeworkSubmissionsTab
          isEditMode={isEditMode}
          assignments={assignments}
          selectedAssignmentId={checkingAssignmentId}
          onSelectAssignmentId={(id) => setCheckingAssignmentId(id)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: REUSABLE TEMPLATES LIBRARY                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <HomeworkTemplatesTab
          onUseTemplate={(tpl) => {
            setTemplateInitialValues({
              title: tpl.title || '',
              description: tpl.description || '',
              instructions: tpl.instructions || '',
              standard_id: tpl.standard_id ? String(tpl.standard_id) : '',
              subject_id: tpl.subject_id ? String(tpl.subject_id) : '',
              topic: tpl.topic || '',
              chapter: tpl.chapter || '',
              assignment_type: tpl.assignment_type || 'homework',
              submission_method: tpl.submission_method || 'physical_notebook',
              max_marks: tpl.max_marks ?? 25,
            })
            setActiveTab('create')
            toast.success('Loaded template into Create Assignment form.')
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 6: REPORTS, ANALYTICS, NOTIFICATIONS & SETTINGS                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <HomeworkReportsAndSettingsTab
          isEditMode={isEditMode}
          isAdminRole={['superadmin', 'sysadmin', 'super_admin', 'admin', 'principal'].includes(
            (user?.role || '').toLowerCase()
          )}
          assignments={assignments}
          divisions={divisions}
          reportDate={reportDate}
          onReportDateChange={setReportDate}
          selectedDivisionId={selectedDivisionId}
          onSelectedDivisionIdChange={setSelectedDivisionId}
          dailyReport={dailyReport}
          settings={hwSettings}
        />
      )}

      {/* ── Action Modal (Resubmit / Extend / Exempt) ── */}
      {actionModal.type && actionModal.record && (
        <Modal
          isOpen={true}
          onClose={() => setActionModal({ type: null, record: null, textValue: '', dateValue: '' })}
          title={
            actionModal.type === 'resubmit'
              ? `Request Resubmission — ${actionModal.record.student_name}`
              : actionModal.type === 'extend'
              ? `Extend Due Date — ${actionModal.record.student_name}`
              : `Exempt Student — ${actionModal.record.student_name}`
          }
        >
          <div className="space-y-4 p-2 text-xs">
            {actionModal.type === 'resubmit' && (
              <>
                <p className="text-slate-600">
                  Provide revision instructions for <strong>{actionModal.record.student_name}</strong>. Their submission history will be preserved.
                </p>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teacher Feedback / Required Changes</label>
                  <textarea
                    rows={3}
                    value={actionModal.textValue}
                    onChange={(e) => setActionModal((p) => ({ ...p, textValue: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Extended Deadline</label>
                  <input
                    type="date"
                    value={actionModal.dateValue}
                    onChange={(e) => setActionModal((p) => ({ ...p, dateValue: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </>
            )}

            {actionModal.type === 'extend' && (
              <>
                <p className="text-slate-600">
                  Set a new individual due date for <strong>{actionModal.record.student_name}</strong>.
                </p>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Due Date</label>
                  <input
                    type="date"
                    value={actionModal.dateValue}
                    onChange={(e) => setActionModal((p) => ({ ...p, dateValue: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reason for Extension</label>
                  <input
                    type="text"
                    value={actionModal.textValue}
                    onChange={(e) => setActionModal((p) => ({ ...p, textValue: e.target.value }))}
                    placeholder="e.g. Medical leave, sick leave"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModal({ type: null, record: null, textValue: '', dateValue: '' })}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (actionModal.type === 'resubmit') {
                    await homeworkApi.requestResubmission(actionModal.record!.record_id, {
                      remarks: actionModal.textValue,
                      extended_due_date: actionModal.dateValue || undefined,
                    })
                    toast.success('Resubmission requested successfully.')
                  } else if (actionModal.type === 'extend') {
                    await homeworkApi.extendDueDate(actionModal.record!.record_id, {
                      new_due_date: actionModal.dateValue,
                      reason: actionModal.textValue,
                    })
                    toast.success('Due date extended.')
                  }
                  setActionModal({ type: null, record: null, textValue: '', dateValue: '' })
                  refetchRegister()
                }}
                className="btn-primary px-4 py-2 text-xs font-bold rounded-xl"
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <DeleteConfirmationModal
          isOpen={true}
          scope={editScope}
          entityType="Homework Assignment"
          entityName={`${deleteTarget.assignment_code} — ${deleteTarget.title}`}
          entityId={deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
