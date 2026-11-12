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
 * @updated     2026-11-12
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
  XCircle, UserCheck, ShieldAlert, RotateCcw, CalendarDays, Lock, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  homeworkApi, standardsApi, divisionsApi, subjectsApi, usersApi,
  academicYearsApi, studentPortalApi
} from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton, DeleteConfirmationModal, ContextualHelpButton } from '../components/common'
import StatCard from '../components/StatCard'
import Modal from '../components/Modal'
import type {
  HomeworkAssignmentItem, CheckingRegisterStudent,
  TeacherHomeworkDashboard, DailyHomeworkRegisterReport
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
    const path = location.pathname.toLowerCase()
    if (path.endsWith('/create')) return 'create'
    if (path.endsWith('/checking')) return 'checking'
    if (path.endsWith('/submissions')) return 'submissions'
    if (path.endsWith('/templates')) return 'templates'
    if (path.endsWith('/reports')) return 'reports'
    const paramTab = searchParams.get('tab') as HomeworkTab
    if (paramTab && ['overview', 'create', 'checking', 'submissions', 'templates', 'reports'].includes(paramTab)) {
      return paramTab
    }
    return 'overview'
  }

  const activeTab = getTabFromLocation()

  const setActiveTab = (tab: HomeworkTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    })
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

  // ── Fetch Teacher Dashboard KPIs ──
  const { data: teacherDashResp } = useQuery({
    queryKey: ['hw-teacher-dashboard', user?.id],
    queryFn: () => homeworkApi.getTeacherDashboard({ teacher_id: user?.role === 'teacher' ? user.id : undefined }).then((r) => r.data),
  })
  const dashboardStats: TeacherHomeworkDashboard = teacherDashResp || {
    total_assigned: 0,
    assigned_today: 0,
    active_assignments: 0,
    awaiting_check: 0,
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
    enabled: activeTab === 'overview' || activeTab === 'checking',
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

  // ── Create Assignment Form State (Phase 2 & Phase 5) ──
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formInstructions, setFormInstructions] = useState('')
  const [formStandardId, setFormStandardId] = useState(searchParams.get('standard_id') || selectedStandardId || '')
  const [formDivisionId, setFormDivisionId] = useState(searchParams.get('division_id') || selectedDivisionId || '')
  const [formSubjectId, setFormSubjectId] = useState(searchParams.get('subject_id') || selectedSubjectId || '')
  const [formTeacherId, setFormTeacherId] = useState(searchParams.get('teacher_id') || (user?.role === 'teacher' ? String(user.id) : ''))
  const [formTopic, setFormTopic] = useState(searchParams.get('topic') || '')
  const [formChapter, setFormChapter] = useState('')
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  })
  const [formDueTime, setFormDueTime] = useState('23:59')
  const [formMaxMarks, setFormMaxMarks] = useState<number | ''>(25)
  const [formDifficulty, setFormDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [formPriority, setFormPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [formSubmissionMethod, setFormSubmissionMethod] = useState<string>('physical_notebook')
  const [formRecipientType, setFormRecipientType] = useState<string>('batch')
  const [formIsTemplate, setFormIsTemplate] = useState<boolean>(false)
  const [formTeachingSessionId, setFormTeachingSessionId] = useState<string>(
    searchParams.get('teaching_session_id') || searchParams.get('session_id') || ''
  )

  // Create Assignment Mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) => homeworkApi.createAssignment(payload),
    onSuccess: (resp) => {
      toast.success(`Homework created successfully! Code: ${resp.data.assignment_code}`)
      queryClient.invalidateQueries({ queryKey: ['hw-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['hw-teacher-dashboard'] })
      setActiveTab('overview')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to create homework assignment.')
    },
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please activate Edit Mode in the top governance bar.')
      return
    }
    if (!formTitle.trim() || !formStandardId || !formSubjectId || !formDueDate) {
      toast.error('Please fill all mandatory fields (Title, Standard, Subject, Due Date).')
      return
    }

    createMutation.mutate({
      academic_year_id: selectedAcademicYearId || 1,
      standard_id: Number(formStandardId),
      division_id: formDivisionId ? Number(formDivisionId) : undefined,
      subject_id: Number(formSubjectId),
      teacher_user_id: formTeacherId ? Number(formTeacherId) : (user?.id || 1),
      teaching_session_id: formTeachingSessionId ? Number(formTeachingSessionId) : undefined,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      instructions: formInstructions.trim() || undefined,
      topic: formTopic.trim() || undefined,
      chapter: formChapter.trim() || undefined,
      due_date: formDueDate,
      due_time: formDueTime,
      max_marks: formMaxMarks !== '' ? Number(formMaxMarks) : undefined,
      difficulty_level: formDifficulty,
      priority: formPriority,
      submission_method: formSubmissionMethod,
      recipient_type: formRecipientType,
      status: 'published',
      is_template: formIsTemplate,
    })
  }

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

      {/* ── Top Stat Cards (Teacher Dashboard KPIs) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Assigned"
          value={dashboardStats.total_assigned}
          icon={BookOpen}
          color="primary"
          subtitle="All active batches"
        />
        <StatCard
          title="Assigned Today"
          value={dashboardStats.assigned_today}
          icon={CalendarDays}
          color="blue"
          subtitle="Recent dispatches"
        />
        <StatCard
          title="Active Homework"
          value={dashboardStats.active_assignments}
          icon={Clock4}
          color="green"
          subtitle="Open for completion"
        />
        <StatCard
          title="Awaiting Checking"
          value={dashboardStats.awaiting_check}
          icon={CheckSquare}
          color="orange"
          subtitle="Pending teacher review"
        />
        <StatCard
          title="Overdue Submissions"
          value={dashboardStats.overdue_count}
          icon={AlertTriangle}
          color="red"
          subtitle="Passed due deadline"
        />
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Homework Overview', icon: BookOpen },
          { id: 'create', label: 'Assign Homework', icon: Plus },
          { id: 'checking', label: 'Checking Register', icon: CheckSquare },
          { id: 'reports', label: 'Daily Register Report', icon: Printer },
        ].map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as HomeworkTab)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
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
                        <span className="px-2.5 py-1 text-xs font-mono font-bold bg-primary-50 text-primary-700 rounded-lg">
                          {hw.assignment_code}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                            hw.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
                    <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckingAssignmentId(hw.id)
                          setActiveTab('checking')
                        }}
                        className="flex-1 py-2 px-3 bg-white hover:bg-primary-50 hover:text-primary-600 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-primary-600" />
                        <span>Checking Register</span>
                      </button>

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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-4xl mx-auto">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary-600" />
              <span>Create Homework Assignment</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribute homework questions or problem sets to a batch, multiple batches, or selected students.
            </p>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-6">
            {/* Session integration notice */}
            {formTeachingSessionId && (
              <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl text-xs text-primary-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-600 shrink-0" />
                <span>
                  <strong>Prefilled from Teaching Session:</strong> This homework will retain a permanent reference to Teaching Session #{formTeachingSessionId}.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assignment Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Chapter 4: Quadratic Equations Problem Set 1"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Standard / Class <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={!isEditMode}
                  value={formStandardId}
                  onChange={(e) => {
                    setFormStandardId(e.target.value)
                    setFormDivisionId('')
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
                  required
                >
                  <option value="">Select Standard</option>
                  {standards.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Batch / Division
                </label>
                <select
                  disabled={!isEditMode}
                  value={formDivisionId}
                  onChange={(e) => setFormDivisionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
                >
                  <option value="">Select Batch (or standard-wide)</option>
                  {divisions.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={!isEditMode}
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Teacher
                </label>
                <select
                  disabled={!isEditMode}
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
                >
                  <option value="">Select Faculty</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chapter / Unit
                </label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={formChapter}
                  onChange={(e) => setFormChapter(e.target.value)}
                  placeholder="e.g. Chapter 4: Quadratic Equations"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Topic Covered
                </label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="e.g. Factoring and Quadratic Formula"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  disabled={!isEditMode}
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Due Time
                </label>
                <input
                  type="time"
                  disabled={!isEditMode}
                  value={formDueTime}
                  onChange={(e) => setFormDueTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Submission Method <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={!isEditMode}
                  value={formSubmissionMethod}
                  onChange={(e) => setFormSubmissionMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
                >
                  <option value="physical_notebook">Physical Notebook / In-Class Checking</option>
                  <option value="photo_upload">Photograph Upload (Student Portal)</option>
                  <option value="pdf_document">PDF / Document Upload</option>
                  <option value="online_text">Online Text Response</option>
                  <option value="in_class">In-Class Completion</option>
                  <option value="no_submission">No Submission Required (Reading / Revision)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Maximum Marks (Optional)
                </label>
                <input
                  type="number"
                  disabled={!isEditMode}
                  value={formMaxMarks}
                  onChange={(e) => setFormMaxMarks(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Instructions & Question References
              </label>
              <textarea
                rows={4}
                disabled={!isEditMode}
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                placeholder="Enter textbook page numbers, exercise problems, or specific instructions for completion..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="templateCheckbox"
                disabled={!isEditMode}
                checked={formIsTemplate}
                onChange={(e) => setFormIsTemplate(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="templateCheckbox" className="text-xs font-semibold text-slate-700">
                Save this homework as a reusable template for future batches
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              {isEditMode ? (
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{createMutation.isPending ? 'Publishing...' : 'Publish Homework'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error('Locked in View Mode: Enable Edit Mode in the top bar to publish.')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-bold text-xs cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  <span>Publish Homework (Locked)</span>
                </button>
              )}
            </div>
          </form>
        </div>
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
      {/* TAB 4: DAILY REGISTER REPORT (PHASE 9)                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Date:</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl font-medium"
              />

              <label className="text-xs font-bold text-slate-700 ml-2">Batch:</label>
              <select
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl font-medium bg-white"
              >
                <option value="">All Batches</option>
                {divisions.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Homework Register</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 print:border-none print:shadow-none">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs font-mono font-bold text-primary-600 uppercase">Daily Academic Operations Report</div>
              <h2 className="text-xl font-black text-slate-900">
                Daily Homework Register — {dailyReport.date}
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                Total Assignments Logged: <strong>{dailyReport.total_assignments}</strong>
              </div>
            </div>

            {dailyReport.items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No homework was issued on this date.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Standard / Batch</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Assignment Title</th>
                      <th className="py-2.5 px-3">Faculty</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-center">Total Students</th>
                      <th className="py-2.5 px-3 text-center">Done</th>
                      <th className="py-2.5 px-3 text-center">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyReport.items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-primary-700">{row.assignment_code}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.standard} — {row.batch}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-700">{row.subject}</td>
                        <td className="py-2.5 px-3">{row.title}</td>
                        <td className="py-2.5 px-3 text-slate-600">{row.teacher}</td>
                        <td className="py-2.5 px-3 font-mono">{row.due_date}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{row.total_students}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{row.completed}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-primary-600">{row.completion_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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
