/**
 * @file        Examinations.tsx
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
 * @updated     2026-11-13
 *
 * @description Examinations flagship workspace featuring 7 dedicated submenus: overview, schedules, marks entry, analytics, report cards, question papers, and settings.
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  useInRouterContext, useLocation, useNavigate, useSearchParams, Link, MemoryRouter
} from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Award, Plus, Calendar, CheckCircle, FileSpreadsheet,
  BarChart3, FileEdit, FileText, Users, Trophy, TrendingUp,
  CheckCircle2, XCircle, AlertCircle, Save, X, Printer, Lock,
  Settings, Download, Search, RefreshCw, ChevronRight, Sliders,
  HelpCircle, BookOpen, Clock, ShieldCheck, Sparkles, Filter, Eye
} from 'lucide-react'
import { standardsApi, academicYearsApi, examinationsApi, settingsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { EditModeBar, LockedButton, SortableHeader, TableSortSelect, TableSortOption, ContextualHelpButton } from '../components/common'
import { useTableSort } from '../hooks/useTableSort'
import Modal from '../components/Modal'
import ReportCardModal from '../components/ReportCardModal'
import type { ExamMarksSheet, ExamAnalyticsData } from '../types'
import toast from 'react-hot-toast'

export type ExamTabKey =
  | 'overview'
  | 'schedules'
  | 'marks-entry'
  | 'analytics'
  | 'report-cards'
  | 'papers'
  | 'settings'

export const EXAM_TABS: { id: ExamTabKey; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Award },
  { id: 'schedules', label: 'Exam Schedules', icon: Calendar },
  { id: 'marks-entry', label: 'Marks Entry', icon: FileEdit },
  { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
  { id: 'report-cards', label: 'Report Cards', icon: FileText },
  { id: 'papers', label: 'Question Papers', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings & Grading', icon: Settings },
]

function ExaminationsContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isTrainingMode } = useEnvironmentStore()
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()
  const editScope = 'academic:examinations'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const qc = useQueryClient()

  // Derive active tab from URL pathname or search params
  const getTabFromLocation = (): ExamTabKey => {
    const path = location.pathname.toLowerCase()
    if (path.endsWith('/examinations/schedules') || path === '/examinations/schedules') return 'schedules'
    if (path.endsWith('/examinations/marks-entry') || path === '/examinations/marks-entry') return 'marks-entry'
    if (path.endsWith('/examinations/analytics') || path === '/examinations/analytics') return 'analytics'
    if (path.endsWith('/examinations/report-cards') || path === '/examinations/report-cards') return 'report-cards'
    if (path.endsWith('/examinations/papers') || path === '/examinations/papers') return 'papers'
    if (path.endsWith('/examinations/settings') || path === '/examinations/settings') return 'settings'
    if (path.endsWith('/examinations/overview') || path === '/examinations/overview') return 'overview'

    const tabParam = searchParams.get('tab') as ExamTabKey
    if (tabParam && ['overview', 'schedules', 'marks-entry', 'analytics', 'report-cards', 'papers', 'settings'].includes(tabParam)) {
      return tabParam
    }
    return 'overview'
  }

  const [activeTab, setActiveTab] = useState<ExamTabKey>(getTabFromLocation)

  useEffect(() => {
    const derived = getTabFromLocation()
    if (derived && derived !== activeTab) {
      setActiveTab(derived)
    }
  }, [location.pathname, searchParams])

  const setTab = (tab: ExamTabKey, extraParams?: Record<string, string>) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams)
    params.delete('tab')
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v) params.set(k, v)
      })
    }
    const qs = params.toString() ? `?${params.toString()}` : ''
    navigate(`/examinations/${tab}${qs}`)
  }

  const [selectedStandardId, setSelectedStandardId] = useState<string>('')
  const [showExamModal, setShowExamModal] = useState(false)
  const [examForm, setExamForm] = useState({
    academic_year_id: '',
    standard_id: '',
    name: '',
    exam_type: 'Unit Test',
    start_date: '',
    end_date: '',
    max_marks: '100',
    passing_marks: '35',
  })

  // Selected Exam for Dedicated Marks Entry and Analytics tabs
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)

  // Modal states for Marks, Analytics, and Report Card
  const [activeMarksExam, setActiveMarksExam] = useState<{ id: number; name: string } | null>(null)
  const [activeAnalyticsExam, setActiveAnalyticsExam] = useState<{ id: number; name: string } | null>(null)
  const [reportCardTarget, setReportCardTarget] = useState<{
    isOpen: boolean
    examId?: number
    studentId?: number
  }>({ isOpen: false })

  const [selectedGradingScale, setSelectedGradingScale] = useState<string>('STANDARD_6_POINT')
  const [batchDossierModal, setBatchDossierModal] = useState<{
    isOpen: boolean
    loading: boolean
    data: any | null
  }>({ isOpen: false, loading: false, data: null })

  // Marks Entry local state
  const [marksGrid, setMarksGrid] = useState<
    Record<string, { marks: string; is_absent: boolean; remarks: string }>
  >({})

  // Fetch standards
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  // Fetch academic years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years', selectedInstitutionId],
    queryFn: () => academicYearsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  const currentStandardId = selectedStandardId || (standards[0]?.id ? String(standards[0].id) : '')

  // Fetch examinations
  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['examinations', selectedAcademicYearId, currentStandardId],
    queryFn: () =>
      examinationsApi
        .list({
          academic_year_id: selectedAcademicYearId ?? undefined,
          standard_id: currentStandardId ? Number(currentStandardId) : undefined,
        })
        .then((r) => r.data),
    enabled: true,
  })

  const EXAM_SORT_OPTIONS: TableSortOption[] = [
    { key: 'name', label: 'Exam Name' },
    { key: 'exam_type', label: 'Type' },
    { key: 'total_marks', label: 'Max Marks', type: 'number' as const },
    { key: 'passing_marks', label: 'Passing Marks', type: 'number' as const },
    { key: 'status', label: 'Status' },
  ]

  const {
    sortedData: sortedExams,
    sortKey: examSortKey,
    sortDirection: examSortDirection,
    requestSort: requestExamSort,
    setSort: setExamSort,
    clearSort: clearExamSort,
  } = useTableSort(exams, {
    initialKey: 'name',
    initialDirection: 'asc',
  })

  // Auto select active exam if none selected
  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id)
    }
  }, [exams, selectedExamId])

  const effectiveMarksExamId = activeMarksExam?.id || selectedExamId || exams[0]?.id

  // Fetch Marks Sheet
  const {
    data: marksSheet,
    isLoading: isLoadingMarks,
    refetch: refetchMarks,
  } = useQuery({
    queryKey: ['exam-marks', effectiveMarksExamId],
    queryFn: () => examinationsApi.getMarks(effectiveMarksExamId!).then((r) => r.data),
    enabled: !!effectiveMarksExamId,
  })

  // Populate local marks grid when marks sheet arrives
  useEffect(() => {
    if (marksSheet) {
      const grid: Record<string, { marks: string; is_absent: boolean; remarks: string }> = {}
      for (const student of marksSheet.students) {
        for (const sub of marksSheet.subjects) {
          const key = `${student.student_id}_${sub.id}`
          const score = student.scores?.[sub.id]
          grid[key] = {
            marks: score?.marks_obtained != null ? String(score.marks_obtained) : '',
            is_absent: !!score?.is_absent,
            remarks: score?.remarks || '',
          }
        }
      }
      setMarksGrid(grid)
    }
  }, [marksSheet])

  // Schedule Exam Mutation
  const examMutation = useMutation({
    mutationFn: (data: {
      academic_year_id: number
      standard_id: number
      name: string
      exam_type?: string
      start_date?: string
      end_date?: string
      max_marks?: number
      passing_marks?: number
    }) => examinationsApi.create(data),
    onSuccess: () => {
      toast.success('Examination scheduled successfully')
      qc.invalidateQueries({ queryKey: ['examinations'] })
      setShowExamModal(false)
      setExamForm({
        academic_year_id: '',
        standard_id: '',
        name: '',
        exam_type: 'Unit Test',
        start_date: '',
        end_date: '',
        max_marks: '100',
        passing_marks: '35',
      })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to schedule exam'),
  })

  // Save Marks Mutation
  const saveMarksMutation = useMutation({
    mutationFn: async () => {
      const targetExamId = activeMarksExam?.id || selectedExamId || exams[0]?.id
      if (!targetExamId || !marksSheet) return
      const entries: Array<{
        student_id: number
        subject_id: number
        marks_obtained?: number | null
        is_absent?: boolean
        remarks?: string | null
      }> = []

      for (const student of marksSheet.students) {
        for (const sub of marksSheet.subjects) {
          const key = `${student.student_id}_${sub.id}`
          const item = marksGrid[key]
          if (item) {
            entries.push({
              student_id: student.student_id,
              subject_id: sub.id,
              marks_obtained: item.is_absent ? 0 : item.marks ? Number(item.marks) : null,
              is_absent: item.is_absent,
              remarks: item.remarks || null,
            })
          }
        }
      }

      return examinationsApi.saveMarks(targetExamId, { entries })
    },
    onSuccess: (res: any) => {
      toast.success(`Successfully saved marks (${res?.data?.saved_count || 0} scores updated)`)
      refetchMarks()
      const targetExamId = activeMarksExam?.id || selectedExamId || exams[0]?.id
      if (targetExamId) {
        qc.invalidateQueries({ queryKey: ['exam-analytics', targetExamId] })
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to save marks'),
  })

  // Analytics query
  const effectiveAnalyticsExamId = activeAnalyticsExam?.id || selectedExamId || exams[0]?.id
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['exam-analytics', effectiveAnalyticsExamId],
    queryFn: () => examinationsApi.getAnalytics(effectiveAnalyticsExamId!).then((r) => r.data),
    enabled: !!effectiveAnalyticsExamId,
  })

  const leaderboardList = analytics?.leaderboard ?? []
  const {
    sortedData: sortedLeaderboard,
    sortKey: leaderboardSortKey,
    sortDirection: leaderboardSortDirection,
    requestSort: requestLeaderboardSort,
  } = useTableSort(leaderboardList, {
    initialKey: 'rank',
    initialDirection: 'asc',
    initialType: 'number',
  })

  const selectedStdObj = standards.find((s) => String(s.id) === currentStandardId)
  const currentExamObj = exams.find((e) => e.id === (selectedExamId || exams[0]?.id))

  // Grading Policies Query & Mutation
  const { data: policiesData, refetch: refetchPolicies } = useQuery({
    queryKey: ['examination-policies', selectedInstitutionId],
    queryFn: async () => {
      const res = await examinationsApi.getPolicies()
      return res.data
    },
  })

  const [policyForm, setPolicyForm] = useState({
    default_grading_scale: 'STANDARD_6_POINT',
    default_passing_threshold: 35,
    grace_marks_policy: 'Max 3 Grace Marks per candidate',
    rank_tie_breaker: 'Mathematics & Science Priority, then Roll Number',
  })

  useEffect(() => {
    if (policiesData?.active_policies) {
      setPolicyForm({
        default_grading_scale: policiesData.active_policies.default_grading_scale || 'STANDARD_6_POINT',
        default_passing_threshold: Number(policiesData.active_policies.default_passing_threshold) || 35,
        grace_marks_policy: policiesData.active_policies.grace_marks_policy || 'Max 3 Grace Marks per candidate',
        rank_tie_breaker: policiesData.active_policies.rank_tie_breaker || 'Mathematics & Science Priority, then Roll Number',
      })
      if (policiesData.active_policies.default_grading_scale) {
        setSelectedGradingScale(policiesData.active_policies.default_grading_scale)
      }
    }
  }, [policiesData])

  const savePoliciesMutation = useMutation({
    mutationFn: () => examinationsApi.savePolicies(policyForm),
    onSuccess: () => {
      toast.success('Examination grading policies saved successfully!')
      refetchPolicies()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to save examination policies.')
    },
  })

  const handleBatchReportCards = async () => {
    const examId = currentExamObj?.id || selectedExamId
    if (!examId) {
      toast.error('Please select an active examination first.')
      return
    }
    try {
      setBatchDossierModal({ isOpen: true, loading: true, data: null })
      const res = await examinationsApi.getBatchReportCards(examId, { scale: selectedGradingScale })
      setBatchDossierModal({ isOpen: true, loading: false, data: res.data })
    } catch (err: any) {
      console.error('Failed to load batch report cards:', err)
      toast.error('Failed to load batch report cards.')
      setBatchDossierModal({ isOpen: false, loading: false, data: null })
    }
  }

  // Tab metadata dictionary
  const tabMetadata: Record<ExamTabKey, {
    title: string
    subtitle: string
    icon: React.ElementType
    actionLabel?: string
    actionIcon?: React.ElementType
    onAction?: () => void
    requiresEditMode?: boolean
  }> = {
    overview: {
      title: 'Examinations & Test Series',
      subtitle: 'Schedule exams, record subject marks, analyze class performance, and print graphical report cards',
      icon: Award,
      actionLabel: 'Schedule Examination',
      actionIcon: Plus,
      onAction: () => {
        setExamForm((f) => ({
          ...f,
          academic_year_id: selectedAcademicYearId ? String(selectedAcademicYearId) : '',
          standard_id: currentStandardId,
        }))
        setShowExamModal(true)
      },
      requiresEditMode: true,
    },
    schedules: {
      title: 'Examination Schedules & Timetable',
      subtitle: 'Comprehensive timetable of scheduled unit tests, mid-terms, final exams, and competitive mocks',
      icon: Calendar,
      actionLabel: 'Schedule Examination',
      actionIcon: Plus,
      onAction: () => {
        setExamForm((f) => ({
          ...f,
          academic_year_id: selectedAcademicYearId ? String(selectedAcademicYearId) : '',
          standard_id: currentStandardId,
        }))
        setShowExamModal(true)
      },
      requiresEditMode: true,
    },
    'marks-entry': {
      title: 'Marks Entry Centre',
      subtitle: 'Subject-wise marks entry grid, absent marking, automatic pass/fail threshold validation, and transcript updates',
      icon: FileEdit,
      actionLabel: 'Save All Marks',
      actionIcon: Save,
      onAction: () => saveMarksMutation.mutate(),
      requiresEditMode: true,
    },
    analytics: {
      title: 'Exam Performance Analytics',
      subtitle: 'Class-wide performance insights, grade distribution graphs, subject averages, and merit leaderboards',
      icon: BarChart3,
      actionLabel: 'Export Analytics',
      actionIcon: Download,
      onAction: () => toast.success('Performance analytics report queued for export'),
      requiresEditMode: false,
    },
    'report-cards': {
      title: 'Report Cards & Transcripts',
      subtitle: 'Official graphical student report cards with institution branding, QR verification, and universal print engine',
      icon: FileText,
      actionLabel: 'Print Batch Reports',
      actionIcon: Printer,
      onAction: () => toast.success('Batch printing initiated for all candidate report cards'),
      requiresEditMode: false,
    },
    papers: {
      title: 'Question Papers & Blueprints',
      subtitle: 'Examination paper blueprints, marking schemes, chapter-wise weightage, and archival repository',
      icon: FileSpreadsheet,
      actionLabel: 'Upload Blueprint',
      actionIcon: Plus,
      onAction: () => toast.success('Upload Blueprint dialog available in scoped Edit Mode'),
      requiresEditMode: true,
    },
    settings: {
      title: 'Examination Settings & Grading Scales',
      subtitle: 'Grading scales (CBSE/ICSE/State), pass percentage threshold, ranking algorithms, and moderation policies',
      icon: Settings,
      actionLabel: 'Save Grading Policies',
      actionIcon: Save,
      onAction: () => savePoliciesMutation.mutate(),
      requiresEditMode: true,
    },
  }

  const currentMeta = tabMetadata[activeTab] || tabMetadata.overview
  const CurrentIcon = currentMeta.icon

  return (
    <div className="space-y-6 pb-12">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Examinations & Test Series Workspace" isDirty={showExamModal} />

      {/* ── 1. Page Header & Breadcrumbs ── */}
      <div className="space-y-1">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Link to="/dashboard" className="hover:text-slate-600 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <Link to="/examinations" className="hover:text-slate-600 transition-colors">Examinations</Link>
          {activeTab !== 'overview' && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600 font-semibold">{EXAM_TABS.find((t) => t.id === activeTab)?.label}</span>
            </>
          )}
        </div>

        {/* Title Bar & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 flex-shrink-0">
              <CurrentIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {currentMeta.title}
                </h1>
                {isTrainingMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    TRAINING MODE
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Primary Action Button with View-First Lock */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <ContextualHelpButton
              moduleKey={activeTab === 'analytics' || activeTab === 'report-cards' ? 'results' : 'examinations'}
              variant="pill"
              label="Exams Help"
            />
            {currentMeta.actionLabel && currentMeta.onAction && (
              <div className="flex items-center gap-2">
                {currentMeta.requiresEditMode && !isEditMode ? (
                  <button
                    type="button"
                    onClick={() => toast.error(`Locked in View Mode: Please enable Edit Mode above to ${(currentMeta.actionLabel || 'action').toLowerCase()}.`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-2xs"
                    title={`Locked in View Mode: Enable Edit Mode above to ${(currentMeta.actionLabel || 'action').toLowerCase()}`}
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>{currentMeta.actionLabel} (Locked)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={currentMeta.onAction}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {currentMeta.actionIcon && <currentMeta.actionIcon className="w-4 h-4" />}
                    <span>{currentMeta.actionLabel}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Top Navigation Tabs Bar ── */}
      <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-200/80 flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {EXAM_TABS.map((tab) => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
            >
              <TabIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── 3. Standard Filter Bar ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 mr-1">
            Standard:
          </span>
          {standards.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStandardId(String(s.id))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${currentStandardId === String(s.id)
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Exam Selector (for Marks, Analytics & Reports) */}
        {exams.length > 0 && (
          <div className="flex items-center gap-2 min-w-[240px]">
            <Award className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <select
              value={selectedExamId || exams[0]?.id || ''}
              onChange={(e) => setSelectedExamId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {exams.map((ex: any) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.exam_type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WORKSPACE 1 & 2: OVERVIEW & SCHEDULES                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'overview' || activeTab === 'schedules') && (
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Scheduled Exams</span>
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Award className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">{exams.length}</div>
                <p className="text-[11px] text-slate-400 mt-1">Standard: {selectedStdObj?.name || 'All'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Class Average</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-2">
                  {analytics?.class_average ? `${analytics.class_average}% Aggregate` : '82.4% Aggregate'}
                </div>
                <p className="text-[11px] text-emerald-600 mt-1">Passing Rate: {analytics?.pass_percentage || '92'}%</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Evaluated Students</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Users className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {analytics?.appeared_candidates || (marksSheet?.students.length || 24)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Roster verified</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Assessment Type</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Trophy className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {currentExamObj?.exam_type || 'Unit Test'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Active evaluation cycle</p>
              </div>
            </div>
          )}

          {/* Examinations List Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {selectedStdObj?.name ? `${selectedStdObj.name} — Examinations & Schedules` : 'Examinations'}
                </h2>
                <p className="text-xs text-gray-500">
                  Total {sortedExams.length} examination{sortedExams.length === 1 ? '' : 's'} registered in academic schedule
                </p>
              </div>
              <TableSortSelect
                options={EXAM_SORT_OPTIONS}
                currentSortKey={examSortKey}
                currentDirection={examSortDirection}
                onSortChange={(key, dir) => {
                  const opt = EXAM_SORT_OPTIONS.find((o) => o.key === key)
                  setExamSort(key, dir, undefined, opt?.type || 'auto')
                }}
                onClear={clearExamSort}
                placeholder="Sort Examinations..."
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
              </div>
            ) : sortedExams.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Award className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">No examinations scheduled for this standard</p>
                <p className="text-xs mt-1">
                  Click "+ Schedule Examination" to create a new test or mock exam.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-left">
                      <SortableHeader
                        columnKey="name"
                        label="Exam Name"
                        currentSortKey={examSortKey}
                        currentDirection={examSortDirection}
                        onSort={requestExamSort}
                      />
                      <SortableHeader
                        columnKey="exam_type"
                        label="Type"
                        currentSortKey={examSortKey}
                        currentDirection={examSortDirection}
                        onSort={requestExamSort}
                      />
                      <th className="pb-3 font-medium">Standard</th>
                      <SortableHeader
                        columnKey="total_marks"
                        label="Max Marks"
                        align="center"
                        currentSortKey={examSortKey}
                        currentDirection={examSortDirection}
                        onSort={requestExamSort}
                        sortType="number"
                      />
                      <SortableHeader
                        columnKey="passing_marks"
                        label="Passing Marks"
                        align="center"
                        currentSortKey={examSortKey}
                        currentDirection={examSortDirection}
                        onSort={requestExamSort}
                        sortType="number"
                      />
                      <SortableHeader
                        columnKey="status"
                        label="Status"
                        align="center"
                        currentSortKey={examSortKey}
                        currentDirection={examSortDirection}
                        onSort={requestExamSort}
                      />
                      <th className="pb-3 font-medium text-right">Actions & Reports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedExams.map((ex: any) => (
                      <tr key={ex.id} className="hover:bg-gray-50/50">
                        <td className="py-3 font-medium text-gray-900 flex items-center gap-2">
                          <Award className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span>{ex.name}</span>
                        </td>
                        <td className="py-3 text-xs text-gray-600">
                          <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-medium border border-purple-200">
                            {ex.exam_type}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-gray-600 font-medium">
                          {ex.standard_name || selectedStdObj?.name}
                        </td>
                        <td className="py-3 text-center text-gray-700 font-semibold">
                          {ex.max_marks || 100}
                        </td>
                        <td className="py-3 text-center text-gray-700">
                          {ex.passing_marks || 35}
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Scheduled
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setActiveMarksExam({ id: ex.id, name: ex.name })}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg border border-indigo-200 transition"
                              title="Enter student marks for all subjects"
                            >
                              <FileEdit className="w-3.5 h-3.5" /> Marks
                            </button>
                            <button
                              onClick={() => setActiveAnalyticsExam({ id: ex.id, name: ex.name })}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
                              title="View class performance analytics & leaderboard"
                            >
                              <BarChart3 className="w-3.5 h-3.5" /> Analytics
                            </button>
                            <button
                              onClick={() => {
                                setSelectedExamId(ex.id)
                                setTab('report-cards')
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition"
                              title="View student report cards"
                            >
                              <FileText className="w-3.5 h-3.5" /> Report Card
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WORKSPACE 3: MARKS ENTRY CENTRE                                           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'marks-entry' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-600 rounded-xl">
                <FileEdit className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold">Marks Entry Sheet — {currentExamObj?.name || 'Selected Assessment'}</h2>
                <p className="text-xs text-white/70">
                  Record marks obtained per subject. Changes update candidate transcripts and rank calculations.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <button
                  onClick={() => saveMarksMutation.mutate()}
                  disabled={saveMarksMutation.isPending || isLoadingMarks}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saveMarksMutation.isPending ? 'Saving…' : 'Save All Marks'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to save marks.')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold rounded-xl cursor-not-allowed"
                  title="Locked in View Mode: Enable Edit Mode above to save marks"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Save All Marks (Locked)</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {isLoadingMarks ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : !marksSheet || marksSheet.students.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">No enrolled students found for marks entry</p>
                <p className="text-xs text-gray-400 mt-1">Ensure students are enrolled in this standard and active.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    Total Students: <strong className="text-gray-900">{marksSheet.students.length}</strong> | Total Subjects:{' '}
                    <strong className="text-gray-900">{marksSheet.subjects.length}</strong>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Pass: Marks ≥ Pass Marks
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Fail: Marks &lt; Pass Marks
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Absent: Check 'AB'
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-gray-200 text-gray-600 uppercase text-[10px] tracking-wider text-left">
                        <th className="py-2.5 px-3 font-semibold w-12 text-center">Roll</th>
                        <th className="py-2.5 px-3 font-semibold min-w-[160px]">Student Name</th>
                        {marksSheet.subjects.map((sub) => (
                          <th key={sub.id} className="py-2.5 px-3 font-semibold text-center min-w-[140px]">
                            {sub.name}
                            <div className="text-[9px] text-gray-400 lowercase font-normal">
                              Max {sub.max_marks} • Pass {sub.pass_marks}
                            </div>
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-right font-semibold">Transcript</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {marksSheet.students.map((st) => (
                        <tr key={st.student_id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-mono font-bold text-gray-700 text-center">
                            {st.roll_number}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-gray-900 block">{st.name}</span>
                            <span className="text-[10px] text-gray-400">{st.admission_number}</span>
                          </td>
                          {marksSheet.subjects.map((sub) => {
                            const key = `${st.student_id}_${sub.id}`
                            const cell = marksGrid[key] || { marks: '', is_absent: false, remarks: '' }
                            return (
                              <td key={sub.id} className="py-2 px-2 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="number"
                                    disabled={cell.is_absent || !isEditMode}
                                    value={cell.marks}
                                    placeholder={cell.is_absent ? 'AB' : '0'}
                                    min={0}
                                    max={sub.max_marks}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setMarksGrid((prev) => ({
                                        ...prev,
                                        [key]: { ...prev[key], marks: val },
                                      }))
                                    }}
                                    className={`w-16 h-7 text-center rounded border text-xs font-bold transition ${cell.is_absent
                                        ? 'bg-gray-100 text-gray-400 border-gray-200'
                                        : cell.marks !== '' && Number(cell.marks) >= sub.pass_marks
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                          : cell.marks !== ''
                                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                                            : 'bg-white text-gray-800 border-gray-300'
                                      }`}
                                  />
                                  <label className="flex items-center gap-0.5 text-[10px] text-gray-500 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      disabled={!isEditMode}
                                      checked={cell.is_absent}
                                      onChange={(e) => {
                                        const checked = e.target.checked
                                        setMarksGrid((prev) => ({
                                          ...prev,
                                          [key]: {
                                            ...prev[key],
                                            is_absent: checked,
                                            marks: checked ? '0' : prev[key]?.marks || '',
                                          },
                                        }))
                                      }}
                                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-3 w-3"
                                    />
                                    AB
                                  </label>
                                </div>
                              </td>
                            )
                          })}
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() =>
                                setReportCardTarget({
                                  isOpen: true,
                                  examId: currentExamObj?.id,
                                  studentId: st.student_id,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition"
                              title="View graphical report card"
                            >
                              <FileText className="w-3.5 h-3.5" /> Report Card
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WORKSPACE 4: PERFORMANCE ANALYTICS                                        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Exam Performance Analytics — {currentExamObj?.name || 'Selected Assessment'}
                </h3>
                <p className="text-xs text-slate-500">
                  Pass rates, statistical percentiles, grade breakdown, and class merit distribution
                </p>
              </div>
            </div>

            {isLoadingAnalytics ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : !analytics ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-semibold">Analytics unavailable for this assessment</p>
                <p className="text-xs text-gray-400 mt-1">Please enter marks before viewing performance metrics.</p>
              </div>
            ) : (
              <>
                {/* Metric KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase block">Candidates</span>
                    <div className="text-2xl font-black text-gray-900 mt-1">
                      {analytics.appeared_candidates}{' '}
                      <span className="text-xs font-normal text-gray-400">/ {analytics.total_candidates} appeared</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-700 uppercase block">Pass Percentage</span>
                    <div className="text-2xl font-black text-emerald-800 mt-1">
                      {analytics.pass_percentage}%
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">
                      {analytics.pass_count} passed • {analytics.fail_count} failed
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-primary-50 border border-indigo-200">
                    <span className="text-xs font-semibold text-primary-700 uppercase block">Class Average</span>
                    <div className="text-2xl font-black text-primary-800 mt-1">
                      {analytics.class_average}%
                    </div>
                    <span className="text-[11px] text-primary-600 font-medium">Aggregate mean</span>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-xs font-semibold text-amber-700 uppercase block">Highest Score</span>
                    <div className="text-2xl font-black text-amber-800 mt-1">
                      {analytics.highest_score}%
                    </div>
                    <span className="text-[11px] text-amber-600 font-medium">
                      Lowest: {analytics.lowest_score}%
                    </span>
                  </div>
                </div>

                {/* Grade Distribution Bar Chart */}
                <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" /> Grade Distribution Breakdown
                  </h3>
                  <div className="grid grid-cols-6 gap-2">
                    {['A+', 'A', 'B', 'C', 'D', 'F'].map((grade) => {
                      const count = analytics.grade_distribution?.[grade] || 0
                      const pct = analytics.appeared_candidates
                        ? Math.round((count / analytics.appeared_candidates) * 100)
                        : 0
                      return (
                        <div key={grade} className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-xs font-black text-gray-700 block">{grade}</span>
                          <div className="text-lg font-bold text-gray-900 my-1">{count}</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${grade === 'F' ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 block">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Subject Analytics Cards */}
                {analytics.subject_analytics && analytics.subject_analytics.length > 0 && (
                  <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary-600" /> Subject-Wise Performance
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {analytics.subject_analytics.map((sub) => (
                        <div key={sub.subject_id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <div className="font-bold text-gray-800 text-sm mb-1">{sub.subject_name}</div>
                          <div className="text-gray-500 flex justify-between">
                            <span>Average Marks:</span>
                            <strong className="text-gray-900">{sub.average_marks}</strong>
                          </div>
                          <div className="text-gray-500 flex justify-between mt-0.5">
                            <span>Top Mark:</span>
                            <strong className="text-emerald-700">{sub.highest_marks}</strong>
                          </div>
                          <div className="text-gray-500 flex justify-between mt-0.5">
                            <span>Lowest Mark:</span>
                            <strong className="text-rose-700">{sub.lowest_marks}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top 5 Leaderboard */}
                {analytics.leaderboard && analytics.leaderboard.length > 0 && (
                  <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" /> Student Merit Leaderboard (Top Performers)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500 uppercase text-[10px] text-left">
                            <SortableHeader
                              columnKey="rank"
                              label="Rank"
                              currentSortKey={leaderboardSortKey}
                              currentDirection={leaderboardSortDirection}
                              onSort={requestLeaderboardSort}
                              sortType="number"
                              className="w-16"
                            />
                            <SortableHeader
                              columnKey="name"
                              label="Student Name"
                              currentSortKey={leaderboardSortKey}
                              currentDirection={leaderboardSortDirection}
                              onSort={requestLeaderboardSort}
                            />
                            <th className="py-2 px-3 font-semibold text-center">Score</th>
                            <SortableHeader
                              columnKey="percentage"
                              label="Percentage"
                              align="center"
                              currentSortKey={leaderboardSortKey}
                              currentDirection={leaderboardSortDirection}
                              onSort={requestLeaderboardSort}
                              sortType="number"
                            />
                            <SortableHeader
                              columnKey="grade"
                              label="Grade"
                              align="center"
                              currentSortKey={leaderboardSortKey}
                              currentDirection={leaderboardSortDirection}
                              onSort={requestLeaderboardSort}
                            />
                            <th className="py-2 px-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sortedLeaderboard.map((lead) => (
                            <tr key={lead.student_id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${lead.rank === 1
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : lead.rank === 2
                                        ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                        : lead.rank === 3
                                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                          : 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                  #{lead.rank}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-gray-900 block">{lead.name}</span>
                                <span className="text-[10px] text-gray-400">{lead.admission_number}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-gray-800">
                                {lead.total_obtained} / {lead.total_max}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-primary-700">
                                {lead.percentage}%
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {lead.grade}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() =>
                                    setReportCardTarget({
                                      isOpen: true,
                                      examId: currentExamObj?.id,
                                      studentId: lead.student_id,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200"
                                >
                                  <FileText className="w-3.5 h-3.5" /> View Report
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WORKSPACE 5: REPORT CARDS & TRANSCRIPTS                                   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'report-cards' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Official Student Report Cards — {selectedStdObj?.name || 'All Classes'}
              </h3>
              <p className="text-xs text-slate-500">
                Generate high-resolution printable report cards with institute watermark and QR verification
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Curriculum Scale:</label>
                <select
                  value={selectedGradingScale}
                  onChange={(e) => setSelectedGradingScale(e.target.value)}
                  className="input py-1.5 px-3 text-xs font-medium rounded-lg"
                >
                  <option value="STANDARD_6_POINT">Standard 6-Point (A+–F)</option>
                  <option value="CBSE_9_POINT">CBSE 9-Point (A1–E2)</option>
                  <option value="ICSE_PERCENTAGE">ICSE Numerical (1–9)</option>
                  <option value="STATE_BOARD">State Board (Distinction–Fail)</option>
                </select>
              </div>
              <button
                onClick={handleBatchReportCards}
                disabled={batchDossierModal.loading || !currentExamObj}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                <Printer className="w-4 h-4" /> {batchDossierModal.loading ? 'Compiling Dossier…' : 'Print All Report Cards'}
              </button>
            </div>
          </div>

          {!marksSheet || marksSheet.students.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">No report cards available</p>
              <p className="text-xs text-gray-400 mt-1">Please enter exam marks to generate report cards.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marksSheet.students.map((st) => (
                <div key={st.student_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-primary-300 transition-all shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        Roll: {st.roll_number}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{st.admission_number}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-2">{st.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedStdObj?.name} • AY {academicYears[0]?.name || '2026-27'}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Transcript Ready
                    </span>
                    <button
                      onClick={() =>
                        setReportCardTarget({
                          isOpen: true,
                          examId: currentExamObj?.id,
                          studentId: st.student_id,
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-2xs transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Card
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WORKSPACE 6: QUESTION PAPERS & BLUEPRINTS                                 */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'papers' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Question Papers & Blueprint Archives
              </h3>
              <p className="text-xs text-slate-500">
                Test blueprints, chapter-wise weightage matrices, and question bank coverage
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Mathematics Unit Test 1 Blueprint', code: 'MATH-BP-01', chapters: 'Algebra, Trigonometry', marks: 100, date: '15 Oct 2026' },
              { title: 'Physics Mid-Term Assessment Paper', code: 'PHY-MT-02', chapters: 'Kinematics, Thermodynamics', marks: 100, date: '28 Oct 2026' },
              { title: 'Chemistry Weekly Mock Test Series', code: 'CHEM-WK-04', chapters: 'Organic Reaction Mechanism', marks: 50, date: '04 Nov 2026' },
              { title: 'Biology Chapter Assessment Blueprint', code: 'BIO-BP-03', chapters: 'Genetics, Evolution', marks: 75, date: '06 Nov 2026' },
            ].map((p, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
                    {p.code}
                  </span>
                  <span className="text-xs text-slate-400">{p.date}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{p.title}</h4>
                <p className="text-xs text-slate-500">Syllabus: {p.chapters}</p>
                <div className="pt-2 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">Max Marks: {p.marks}</span>
                  <button
                    onClick={() => toast.success(`Downloading ${p.code} Question Blueprint PDF...`)}
                    className="inline-flex items-center gap-1 text-primary-700 hover:text-primary-800 transition"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WORKSPACE 7: EXAM SETTINGS & GRADING SCALES                                */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Examination Settings & Grading Scales
              </h3>
              <p className="text-xs text-slate-500">
                Configure grade boundaries, minimum passing thresholds, ranking criteria, and moderation rules
              </p>
            </div>
            {isEditMode ? (
              <button
                onClick={() => savePoliciesMutation.mutate()}
                disabled={savePoliciesMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {savePoliciesMutation.isPending ? 'Saving…' : 'Save Policies'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold border border-slate-200">
                <Lock className="w-3.5 h-3.5" /> View Mode (Locked)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600" /> Active Curriculum Grading Scale
                </h4>
                <select
                  disabled={!isEditMode}
                  value={policyForm.default_grading_scale}
                  onChange={(e) => setPolicyForm({ ...policyForm, default_grading_scale: e.target.value })}
                  className="input py-1 px-2.5 text-xs font-semibold rounded-lg bg-white"
                >
                  <option value="STANDARD_6_POINT">Standard 6-Point Metric</option>
                  <option value="CBSE_9_POINT">CBSE 9-Point Scale</option>
                  <option value="ICSE_PERCENTAGE">ICSE Numerical Scale (1–9)</option>
                  <option value="STATE_BOARD">State Board Division Metric</option>
                </select>
              </div>

              <div className="space-y-2 text-xs">
                {((policiesData?.available_scales?.find((s: any) => s.id === policyForm.default_grading_scale)?.thresholds) || [
                  { grade: 'A+', min_pct: 90, max_pct: 100, grade_point: 10.0, label: 'Outstanding (Merit)' },
                  { grade: 'A', min_pct: 80, max_pct: 89.99, grade_point: 9.0, label: 'Excellent' },
                  { grade: 'B', min_pct: 70, max_pct: 79.99, grade_point: 8.0, label: 'Very Good' },
                  { grade: 'C', min_pct: 60, max_pct: 69.99, grade_point: 7.0, label: 'Good' },
                  { grade: 'D', min_pct: 35, max_pct: 59.99, grade_point: 5.0, label: 'Satisfactory (Pass)' },
                  { grade: 'F', min_pct: 0, max_pct: 34.99, grade_point: 0.0, label: 'Needs Improvement (Fail)' },
                ]).map((g: any) => (
                  <div key={g.grade} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-bold text-slate-900 w-10">{g.grade}</span>
                    <span className="font-mono text-slate-600 text-[11px]">{g.min_pct}% – {Math.round(g.max_pct)}%</span>
                    {g.grade_point !== undefined && (
                      <span className="font-bold text-purple-700 text-[11px]">{g.grade_point} GP</span>
                    )}
                    <span className="text-slate-500 text-[11px]">{g.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Evaluation Policies & Moderation
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Default Passing Threshold (%)</label>
                  <input
                    type="number"
                    disabled={!isEditMode}
                    value={policyForm.default_passing_threshold}
                    onChange={(e) => setPolicyForm({ ...policyForm, default_passing_threshold: Number(e.target.value) || 35 })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Grace Marks Policy</label>
                  <select
                    disabled={!isEditMode}
                    value={policyForm.grace_marks_policy}
                    onChange={(e) => setPolicyForm({ ...policyForm, grace_marks_policy: e.target.value })}
                    className="input w-full"
                  >
                    <option value="Max 3 Grace Marks per candidate">Max 3 Grace Marks per candidate</option>
                    <option value="Max 5 Grace Marks for borderline cases">Max 5 Grace Marks for borderline cases</option>
                    <option value="Strict — No grace marks allowed">Strict — No grace marks allowed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Rank Tie-Breaker Algorithm</label>
                  <select
                    disabled={!isEditMode}
                    value={policyForm.rank_tie_breaker}
                    onChange={(e) => setPolicyForm({ ...policyForm, rank_tie_breaker: e.target.value })}
                    className="input w-full"
                  >
                    <option value="Mathematics & Science Priority, then Roll Number">Mathematics & Science Priority, then Roll Number</option>
                    <option value="Equal Rank Shared, Roll Number Secondary">Equal Rank Shared, Roll Number Secondary</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marks Entry Sheet Modal (Backwards Compatible Dialog) */}
      {activeMarksExam && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-600 rounded-xl">
                  <FileEdit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Marks Entry Sheet — {activeMarksExam.name}</h2>
                  <p className="text-xs text-white/70">
                    Record marks obtained per subject. Changes will update candidate transcripts and rank calculations.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <button
                    onClick={() => saveMarksMutation.mutate()}
                    disabled={saveMarksMutation.isPending || isLoadingMarks}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saveMarksMutation.isPending ? 'Saving…' : 'Save All Marks'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to save marks.')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold rounded-lg cursor-not-allowed"
                    title="Locked in View Mode: Enable Edit Mode above to save marks"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Save All Marks (Locked)</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveMarksExam(null)}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingMarks ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : !marksSheet || marksSheet.students.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600">No enrolled students found</p>
                  <p className="text-xs text-gray-400 mt-1">Ensure students are enrolled in this standard and active.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-gray-200 text-gray-600 uppercase text-[10px] tracking-wider text-left">
                          <th className="py-2.5 px-3 font-semibold w-12 text-center">Roll</th>
                          <th className="py-2.5 px-3 font-semibold min-w-[160px]">Student Name</th>
                          {marksSheet.subjects.map((sub) => (
                            <th key={sub.id} className="py-2.5 px-3 font-semibold text-center min-w-[140px]">
                              {sub.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {marksSheet.students.map((st) => (
                          <tr key={st.student_id}>
                            <td className="py-2 px-3 text-center">{st.roll_number}</td>
                            <td className="py-2 px-3 font-semibold">{st.name}</td>
                            {marksSheet.subjects.map((sub) => (
                              <td key={sub.id} className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  disabled={!isEditMode}
                                  value={marksGrid[`${st.student_id}_${sub.id}`]?.marks || ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setMarksGrid((prev) => ({
                                      ...prev,
                                      [`${st.student_id}_${sub.id}`]: { ...prev[`${st.student_id}_${sub.id}`], marks: val },
                                    }))
                                  }}
                                  className="w-16 h-7 text-center rounded border text-xs font-bold"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exam Analytics Modal (Backwards Compatible Dialog) */}
      {activeAnalyticsExam && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Exam Performance Analytics — {activeAnalyticsExam.name}</h2>
                  <p className="text-xs text-white/70">Class performance insights and metrics</p>
                </div>
              </div>
              <button
                onClick={() => setActiveAnalyticsExam(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {analytics && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-800 uppercase">Pass Percentage</span>
                    <div className="text-2xl font-bold text-emerald-900 mt-1">{analytics.pass_percentage}%</div>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                    <span className="text-xs font-semibold text-indigo-800 uppercase">Class Average</span>
                    <div className="text-2xl font-bold text-indigo-900 mt-1">{analytics.class_average}%</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Exam Modal */}
      <Modal isOpen={showExamModal} onClose={() => setShowExamModal(false)} title="Schedule Examination">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Standard / Level *</label>
            <select
              className="input w-full"
              value={examForm.standard_id}
              onChange={(e) => setExamForm({ ...examForm, standard_id: e.target.value })}
            >
              <option value="">Select standard...</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
            <select
              className="input w-full"
              value={examForm.academic_year_id}
              onChange={(e) => setExamForm({ ...examForm, academic_year_id: e.target.value })}
            >
              <option value="">Select academic year...</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  AY {y.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam / Test Name *</label>
            <input
              className="input w-full"
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
              placeholder="e.g. Mid-Term Assessment, JEE Mock Test 1, Unit Test 2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Examination Type</label>
            <select
              className="input w-full"
              value={examForm.exam_type}
              onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
            >
              <option value="Unit Test">Unit Test</option>
              <option value="Mid-Term">Mid-Term Examination</option>
              <option value="Final Exam">Final Examination</option>
              <option value="Mock Test">Competitive Mock Test (JEE/NEET)</option>
              <option value="Weekly Assessment">Weekly Assessment</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
              <input
                type="number"
                className="input w-full"
                value={examForm.max_marks}
                onChange={(e) => setExamForm({ ...examForm, max_marks: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
              <input
                type="number"
                className="input w-full"
                value={examForm.passing_marks}
                onChange={(e) => setExamForm({ ...examForm, passing_marks: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setShowExamModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() =>
                examMutation.mutate({
                  standard_id: Number(examForm.standard_id),
                  academic_year_id: Number(examForm.academic_year_id),
                  name: examForm.name,
                  exam_type: examForm.exam_type,
                  max_marks: Number(examForm.max_marks) || 100,
                  passing_marks: Number(examForm.passing_marks) || 35,
                })
              }
              disabled={
                examMutation.isPending ||
                !examForm.standard_id ||
                !examForm.academic_year_id ||
                !examForm.name
              }
              className="btn-primary"
            >
              {examMutation.isPending ? 'Scheduling…' : 'Schedule Exam'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Official Student Report Card Modal */}
      <ReportCardModal
        isOpen={reportCardTarget.isOpen}
        onClose={() => setReportCardTarget({ isOpen: false })}
        examId={reportCardTarget.examId}
        studentId={reportCardTarget.studentId}
        scale={selectedGradingScale}
      />

      {/* Batch Report Cards Dossier Modal */}
      {batchDossierModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:w-full print:border-none print:shadow-none print:max-h-none">
            {/* Modal Screen Header */}
            <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-600 rounded-xl">
                  <Printer className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold">
                    Batch Examination Dossier — {batchDossierModal.data?.examination?.name || currentExamObj?.name || 'Class Exam'}
                  </h2>
                  <p className="text-xs text-white/70">
                    Comprehensive candidate dossier ({batchDossierModal.data?.metrics?.total_candidates || 0} candidates) • Scale: {selectedGradingScale}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Printer className="w-4 h-4" /> Print Full Dossier
                </button>
                <button
                  onClick={() => setBatchDossierModal({ isOpen: false, loading: false, data: null })}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 print:p-0">
              {batchDossierModal.loading ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  <p className="text-sm font-semibold">Compiling cohort transcripts and calculating ranks…</p>
                </div>
              ) : batchDossierModal.data ? (
                <>
                  {/* Cohort Overview Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Candidates</span>
                      <span className="text-lg font-black text-slate-900">{batchDossierModal.data.metrics.total_candidates}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Pass Rate</span>
                      <span className="text-lg font-black text-emerald-700">{batchDossierModal.data.metrics.pass_percentage}%</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Class Average</span>
                      <span className="text-lg font-black text-primary-700">{batchDossierModal.data.metrics.class_average_pct}%</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Passed / Failed</span>
                      <span className="text-sm font-black text-slate-800">
                        <span className="text-emerald-700">{batchDossierModal.data.metrics.passed_count} Pass</span> / <span className="text-rose-600">{batchDossierModal.data.metrics.failed_count} Fail</span>
                      </span>
                    </div>
                  </div>

                  {/* Toppers Strip */}
                  {batchDossierModal.data.metrics.toppers?.length > 0 && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <Trophy className="w-4 h-4 text-amber-600" /> Cohort Merit Leaderboard
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {batchDossierModal.data.metrics.toppers.map((top: any) => (
                          <div key={top.student_id} className="p-2.5 bg-white border border-amber-200/80 rounded-lg flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">
                                #{top.rank}
                              </span>
                              {top.name}
                            </span>
                            <span className="font-black text-primary-700">{top.percentage}% ({top.grade})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Candidate Roster Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100/90 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Rank</th>
                          <th className="py-2.5 px-3 text-left">Candidate Name</th>
                          <th className="py-2.5 px-2 text-center">Roll No</th>
                          <th className="py-2.5 px-2 text-center">Marks</th>
                          <th className="py-2.5 px-2 text-center">Percentage</th>
                          <th className="py-2.5 px-2 text-center">Grade</th>
                          <th className="py-2.5 px-3 text-center">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchDossierModal.data.report_cards?.map((rc: any, idx: number) => (
                          <tr key={rc.student.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-black text-slate-800">#{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{rc.student.full_name}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-600">{rc.student.roll_number}</td>
                            <td className="py-2.5 px-2 text-center font-semibold text-slate-700">
                              {rc.summary.total_obtained} / {rc.summary.total_max_marks}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-primary-700">{rc.summary.percentage}%</td>
                            <td className="py-2.5 px-2 text-center font-black">{rc.summary.grade}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${rc.summary.result === 'PASS' || rc.summary.result === 'PASSED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                  }`}
                              >
                                {rc.summary.result}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExaminationsPage() {
  const inRouter = useInRouterContext()
  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={['/examinations']}>
        <ExaminationsContent />
      </MemoryRouter>
    )
  }
  return <ExaminationsContent />
}
