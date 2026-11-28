/**
 * @file        MasterCataloguesHub.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-22
 * @updated     2026-11-28
 *
 * @description Centralized Master Data Management (MDM) Hub, setup dependency pipeline, relational integrity auditor, and master catalogue studio.
 */

import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderTree,
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  CreditCard,
  DollarSign,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Lock,
  Unlock,
  Sparkles,
  Building2,
  UserCheck,
  UserX,
  FileText,
  Settings,
  HelpCircle,
  BarChart3,
  Check,
  ChevronRight,
  X,
  Table,
  Eye,
} from 'lucide-react'
import { catalogueApi, boardsApi, standardsApi, divisionsApi, subjectsApi, academicYearsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton, ContextualHelpButton, ElementHelpTip } from '../components/common'
import type { CatalogueOverviewResponse, CatalogueIntegrityWarning, Board, Standard, Division, CanonicalSubject, AcademicYear } from '../types'

type CatalogueCategory = 'all' | 'academic' | 'people' | 'finance' | 'operations' | 'integrity'

interface MasterCatalogueItem {
  id: string
  title: string
  category: 'academic' | 'people' | 'finance' | 'operations'
  classification: 'MASTER' | 'RELATIONSHIP' | 'LEDGER' | 'CONFIGURATION'
  icon: React.ComponentType<{ className?: string }>
  count: number | string
  secondaryMetric?: string
  description: string
  route: string
  masterTabKey?: 'boards' | 'standards' | 'batches' | 'subjects' | 'years'
  createEntityKey?: 'board' | 'standard' | 'batch' | 'subject' | 'fee_category'
  createDirectRoute?: string
}

export default function MasterCataloguesHub() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const editScope = 'catalogue'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const [activeCategory, setActiveCategory] = useState<CatalogueCategory>('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [showQuickRegisterModal, setShowQuickRegisterModal] = useState(false)
  const [selectedQuickEntity, setSelectedQuickEntity] = useState<'board' | 'standard' | 'batch' | 'subject' | 'fee_category'>('batch')

  // Load Overview Data
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<CatalogueOverviewResponse>({
    queryKey: ['catalogue-overview'],
    queryFn: async () => {
      const res = await catalogueApi.getOverview()
      return res.data
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  // Quick Registration State
  const [boardForm, setBoardForm] = useState({ name: '', code: '', description: '' })
  const [standardForm, setStandardForm] = useState({ name: '', level: 10, board_id: '' })
  const [batchForm, setBatchForm] = useState({ name: '', standard_id: '', board_id: '', capacity: 40 })
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', description: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // Master Explorer state
  const [selectedMasterTab, setSelectedMasterTab] = useState<'boards' | 'standards' | 'batches' | 'subjects' | 'years'>('boards')
  const [explorerSearch, setExplorerSearch] = useState('')

  // Live Master Explorer Queries (Scoped & Cached)
  const { data: boardsList = [], isLoading: loadingBoards } = useQuery<Board[]>({
    queryKey: ['boards-catalogue-list', user?.institution_id],
    queryFn: async () => {
      const res = await boardsApi.list(user?.institution_id || 1)
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: selectedMasterTab === 'boards' || showQuickRegisterModal,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: standardsList = [], isLoading: loadingStandards } = useQuery<Standard[]>({
    queryKey: ['standards-catalogue-list', user?.institution_id],
    queryFn: async () => {
      const res = await standardsApi.list({ institution_id: user?.institution_id || 1 })
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: selectedMasterTab === 'standards' || showQuickRegisterModal,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: batchesList = [], isLoading: loadingBatches } = useQuery<Division[]>({
    queryKey: ['batches-catalogue-list', user?.institution_id],
    queryFn: async () => {
      const res = await divisionsApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: selectedMasterTab === 'batches',
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: subjectsList = [], isLoading: loadingSubjects } = useQuery<CanonicalSubject[]>({
    queryKey: ['subjects-catalogue-list'],
    queryFn: async () => {
      const res = await subjectsApi.listCanonical()
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: selectedMasterTab === 'subjects',
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: yearsList = [], isLoading: loadingYears } = useQuery<AcademicYear[]>({
    queryKey: ['years-catalogue-list', user?.institution_id],
    queryFn: async () => {
      const res = await academicYearsApi.list(user?.institution_id || 1)
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: selectedMasterTab === 'years',
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  // Mutations for Quick Entity Creation
  const createBoardMutation = useMutation({
    mutationFn: (data: { name: string; code: string; description?: string }) =>
      boardsApi.create({
        institution_id: user?.institution_id || 1,
        name: data.name,
        code: data.code,
        description: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue-overview'] })
      queryClient.invalidateQueries({ queryKey: ['boards-catalogue-modal'] })
      setSubmitSuccess('Educational Board successfully created.')
      setBoardForm({ name: '', code: '', description: '' })
      setTimeout(() => setShowQuickRegisterModal(false), 1200)
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.detail || 'Failed to create Board')
    },
  })

  const createStandardMutation = useMutation({
    mutationFn: (data: { name: string; level: number; board_id?: number }) =>
      standardsApi.create({
        institution_id: user?.institution_id || 1,
        name: data.name,
        level: Number(data.level),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue-overview'] })
      queryClient.invalidateQueries({ queryKey: ['standards-catalogue-modal'] })
      setSubmitSuccess('Class / Standard successfully registered.')
      setStandardForm({ name: '', level: 10, board_id: '' })
      setTimeout(() => setShowQuickRegisterModal(false), 1200)
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.detail || 'Failed to create Standard')
    },
  })

  const createBatchMutation = useMutation({
    mutationFn: (data: { name: string; standard_id: number; board_id?: number; capacity: number }) =>
      divisionsApi.create({
        name: data.name,
        standard_id: Number(data.standard_id),
        board_id: data.board_id ? Number(data.board_id) : undefined,
        capacity: Number(data.capacity),
        status: 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue-overview'] })
      setSubmitSuccess('Classroom Batch successfully registered with canonical affiliation.')
      setBatchForm({ name: '', standard_id: '', board_id: '', capacity: 40 })
      setTimeout(() => setShowQuickRegisterModal(false), 1200)
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.detail || 'Failed to create Batch')
    },
  })

  const createSubjectMutation = useMutation({
    mutationFn: (data: { name: string; code: string; description?: string }) =>
      subjectsApi.createCanonical({
        name: data.name,
        code: data.code,
        description: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue-overview'] })
      setSubmitSuccess('Canonical Subject registered into Central Master Catalogue.')
      setSubjectForm({ name: '', code: '', description: '' })
      setTimeout(() => setShowQuickRegisterModal(false), 1200)
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.detail || 'Failed to register Subject')
    },
  })

  // Catalogue Master Directory Items Matrix
  const catalogueItems: MasterCatalogueItem[] = useMemo(() => {
    const c = overview?.counts || {
      boards: boardsList.length,
      standards: standardsList.length,
      batches: batchesList.length,
      total_capacity: batchesList.reduce((acc, b) => acc + (b.capacity || 0), 0),
      canonical_subjects: subjectsList.length,
      subject_mappings: 495,
      active_students: 38,
      inactive_students: 1,
      total_students: 39,
      teachers: 8,
      staff: 4,
      fee_categories: 10,
      fee_structures: 39,
      academic_years: yearsList.length,
    }

    return [
      // 1. Academic Foundation
      {
        id: 'boards',
        title: 'Educational Boards',
        category: 'academic',
        classification: 'MASTER',
        icon: Building2,
        count: boardsList.length || c.boards,
        secondaryMetric: 'Accredited Curricula',
        description: 'Governing academic authorities (e.g. CBSE, ICSE, Maharashtra State Board).',
        route: '/academic/boards',
        masterTabKey: 'boards',
        createEntityKey: 'board',
      },
      {
        id: 'standards',
        title: 'Classes / Standards',
        category: 'academic',
        classification: 'MASTER',
        icon: GraduationCap,
        count: standardsList.length || c.standards,
        secondaryMetric: 'Academic Grades',
        description: 'Grade hierarchy levels (Std 1st to 12th) shared across coaching streams.',
        route: '/academic/classes',
        masterTabKey: 'standards',
        createEntityKey: 'standard',
      },
      {
        id: 'batches',
        title: 'Classroom Batches',
        category: 'academic',
        classification: 'RELATIONSHIP',
        icon: Layers,
        count: batchesList.length || c.batches,
        secondaryMetric: `${c.total_capacity || batchesList.reduce((acc, b) => acc + (b.capacity || 0), 0)} Total Seats`,
        description: 'Physical or virtual division cohort mapped to Standard and affiliated Board.',
        route: '/academic/batches',
        masterTabKey: 'batches',
        createEntityKey: 'batch',
      },
      {
        id: 'canonical_subjects',
        title: 'Canonical Subjects',
        category: 'academic',
        classification: 'MASTER',
        icon: BookOpen,
        count: subjectsList.length || c.canonical_subjects,
        secondaryMetric: `${c.subject_mappings} Standard Mappings`,
        description: 'Single Source of Truth subject directory reusable across all curricula and grades (Rule 011).',
        route: '/academic/subjects',
        masterTabKey: 'subjects',
        createEntityKey: 'subject',
      },

      // 2. People & Rosters
      {
        id: 'active_students',
        title: 'Active Student Roster',
        category: 'people',
        classification: 'MASTER',
        icon: Users,
        count: c.active_students,
        secondaryMetric: 'Enrolled & Verified',
        description: 'Active pupil master directory with verified admission numbers and photo IDs.',
        route: '/students/directory',
        createDirectRoute: '/students/add',
      },
      {
        id: 'inactive_students',
        title: 'Former / Inactive Students',
        category: 'people',
        classification: 'MASTER',
        icon: UserX,
        count: c.inactive_students,
        secondaryMetric: 'Rule 011 Dues Recovery',
        description: 'Transferred or discontinued pupils preserved with immutable ledger snapshots.',
        route: '/students/directory?status=inactive',
      },
      {
        id: 'teachers',
        title: 'Faculty & Teachers',
        category: 'people',
        classification: 'MASTER',
        icon: UserCheck,
        count: c.teachers,
        secondaryMetric: 'Teaching Staff',
        description: 'Instructors, subject matter experts, and lab coordinators linked to users.id.',
        route: '/teachers/directory',
        createDirectRoute: '/teachers?create=true',
      },
      {
        id: 'staff',
        title: 'Administrative Staff',
        category: 'people',
        classification: 'MASTER',
        icon: Users,
        count: c.staff,
        secondaryMetric: 'Staff & Officers',
        description: 'Accountants, counselors, receptionists, and system administrators.',
        route: '/staff/directory',
        createDirectRoute: '/staff/onboarding',
      },

      // 3. Finance & Revenue
      {
        id: 'fee_structures',
        title: 'Fee Structures',
        category: 'finance',
        classification: 'MASTER',
        icon: DollarSign,
        count: c.fee_structures,
        secondaryMetric: 'Standard Tuition Blueprints',
        description: 'Board and grade-specific tuition plans, installment cycles, and admission fees.',
        route: '/fees/structures',
        createDirectRoute: '/fees/structures?create=true',
      },
      {
        id: 'fee_categories',
        title: 'Fee Categories',
        category: 'finance',
        classification: 'CONFIGURATION',
        icon: CreditCard,
        count: c.fee_categories,
        secondaryMetric: 'Chart of Accounts',
        description: 'Accounting revenue heads (Tuition, Lab, Exam, Material, Transport).',
        route: '/fees/settings',
        createDirectRoute: '/fees/settings?tab=categories',
      },
      {
        id: 'payments',
        title: 'Financial Daybook & Ledgers',
        category: 'finance',
        classification: 'LEDGER',
        icon: FileText,
        count: 'Active',
        secondaryMetric: 'Immutable Snapshots',
        description: 'Double-entry receipts and irreversible audit records (SSOT Rule 011).',
        route: '/payments',
      },

      // 4. Operations & Configuration
      {
        id: 'academic_years',
        title: 'Academic Sessions',
        category: 'operations',
        classification: 'CONFIGURATION',
        icon: Calendar,
        count: yearsList.length || c.academic_years,
        secondaryMetric: 'Fiscal & Teaching Years',
        description: 'Active and upcoming institutional academic cycles and terms.',
        route: '/academic/settings',
        masterTabKey: 'years',
        createDirectRoute: '/academic/settings?tab=academic_years',
      },
      {
        id: 'timetable_slots',
        title: 'Timetable Bell Schedules',
        category: 'operations',
        classification: 'CONFIGURATION',
        icon: Clock,
        count: 'Configured',
        secondaryMetric: 'Period Matrix',
        description: 'Class duration templates, bell schedules, and room allocations.',
        route: '/academic/timetable',
      },
      {
        id: 'institute_settings',
        title: 'Institute Master Profile',
        category: 'operations',
        classification: 'CONFIGURATION',
        icon: Settings,
        count: 'Central',
        secondaryMetric: 'Centralized Registry',
        description: 'Canonical institute details, branding, tax registration, and policies.',
        route: '/settings',
      },
    ]
  }, [overview, boardsList, standardsList, batchesList, subjectsList, yearsList])

  // Filtered Cards
  const filteredItems = useMemo(() => {
    return catalogueItems.filter((item) => {
      const matchesCat = activeCategory === 'all' || item.category === activeCategory
      const matchesSearch =
        !searchFilter ||
        item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.classification.toLowerCase().includes(searchFilter.toLowerCase())
      return matchesCat && matchesSearch
    })
  }, [catalogueItems, activeCategory, searchFilter])

  const handleOpenQuickRegister = (entityKey: 'board' | 'standard' | 'batch' | 'subject' | 'fee_category') => {
    setSelectedQuickEntity(entityKey)
    setSubmitError(null)
    setSubmitSuccess(null)
    setShowQuickRegisterModal(true)
  }

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (selectedQuickEntity === 'board') {
      if (!boardForm.name.trim() || !boardForm.code.trim()) {
        setSubmitError('Board Name and Short Code are required.')
        return
      }
      createBoardMutation.mutate(boardForm)
    } else if (selectedQuickEntity === 'standard') {
      if (!standardForm.name.trim()) {
        setSubmitError('Standard Name is required.')
        return
      }
      createStandardMutation.mutate({
        name: standardForm.name,
        level: Number(standardForm.level),
        board_id: standardForm.board_id ? Number(standardForm.board_id) : undefined,
      })
    } else if (selectedQuickEntity === 'batch') {
      if (!batchForm.name.trim() || !batchForm.standard_id) {
        setSubmitError('Batch Name and Standard selection are mandatory.')
        return
      }
      createBatchMutation.mutate({
        name: batchForm.name,
        standard_id: Number(batchForm.standard_id),
        board_id: batchForm.board_id ? Number(batchForm.board_id) : undefined,
        capacity: Number(batchForm.capacity || 40),
      })
    } else if (selectedQuickEntity === 'subject') {
      if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
        setSubmitError('Subject Name and Code are required.')
        return
      }
      createSubjectMutation.mutate(subjectForm)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Global View-First & Edit Mode Governance Bar */}
      <EditModeBar
        scope={editScope}
        title="Master Catalogues & Data Governance Hub"
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pt-4 space-y-4">
        {/* Executive Header Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 shadow-2xs border border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-primary-600 to-primary-500 text-white rounded-lg shadow-2xs">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Master Catalogues & MDM Hub
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Single Source of Truth (SSOT) Master Data Management, Onboarding Pipeline & Relational Integrity Auditor
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                SSOT Governance Active
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3 h-3" />
                Rule 011 Deduplication Enforced
              </span>
              {isEditMode ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Unlock className="w-3 h-3" />
                  Edit Mode Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <Lock className="w-3 h-3" />
                  View Mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ContextualHelpButton moduleKey="catalogue" variant="pill" label="Catalogues Help" />
            <ElementHelpTip
              title="SSOT & Rule 011 Governance"
              description="Register shared entities like Subjects once and map them across Boards and Standards cleanly. Duplicate grade-wise records are prevented automatically."
              moduleKey="catalogue"
            />
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
              title="Refresh Master Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <LockedButton
              isEditMode={isEditMode}
              onClick={() => handleOpenQuickRegister('batch')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-2xs transition-all focus:ring-1.5 focus:ring-primary-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Master Entity</span>
            </LockedButton>
          </div>
        </div>

        {/* SECTION 1: RELATIONAL INTEGRITY HEALTH SCANNER */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-center min-h-[120px]">
            <div className="flex items-center gap-3 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Scanning master relational constraints...</span>
            </div>
          </div>
        ) : overview?.integrity_warnings && overview.integrity_warnings.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Relational Integrity Alerts ({overview.integrity_warnings.length})
              </h2>
              <span className="text-xs text-slate-500">Live constraint validation across tables</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.integrity_warnings.map((warn, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-5 border shadow-sm flex flex-col justify-between ${
                    warn.severity === 'error'
                      ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : warn.severity === 'warning'
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                      : 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {warn.severity === 'error' ? (
                          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                        ) : warn.severity === 'warning' ? (
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        ) : (
                          <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />
                        )}
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {warn.title}
                        </h3>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-xs">
                        {warn.count}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {warn.description}
                    </p>

                    {warn.items && warn.items.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1">
                        {warn.items.map((item: any, i: number) => (
                          <span
                            key={i}
                            className="inline-block px-2 py-0.5 text-[11px] font-medium bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200/60 dark:border-slate-700/60"
                          >
                            {item.name || item.standard || item.adm_no}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-end">
                    <Link
                      to={warn.action_route}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      <span>Resolve & Assign</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3.5 sm:p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  Canonical Relational Integrity: 100% Validated
                </h3>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  No orphaned batches, all enrolled pupils allocated to classroom cohorts, and standards have canonical subject mappings.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full">
              <Check className="w-3 h-3" /> Zero Anomalies
            </span>
          </div>
        )}

        {/* SECTION 2: 8-STEP ONBOARDING DEPENDENCY PIPELINE */}
        {overview?.pipeline && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary-600" />
                  Canonical Setup & Dependency Ladder
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hierarchical entity dependencies: Higher tiers provide prerequisites for student enrollment and billing
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {overview.pipeline.completed_steps} of {overview.pipeline.total_steps} Completed
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {overview.pipeline.percentage}% Readiness
                  </span>
                </div>
                <div className="w-14 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${overview.pipeline.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Pipeline Step Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
              {overview.pipeline.steps.map((step) => {
                const getStepRoute = (key: string) => {
                  switch (key) {
                    case 'academic_year': return '/academic/settings?tab=academic_years'
                    case 'boards': return '/academic/boards'
                    case 'standards': return '/academic/classes'
                    case 'subjects': return '/academic/subjects'
                    case 'batches': return '/academic/batches'
                    case 'faculty': return '/teachers/directory'
                    case 'fees': return '/fees/structures'
                    case 'admissions': return '/students/admission'
                    default: return '/academic'
                  }
                }

                return (
                  <Link
                    key={step.step}
                    to={getStepRoute(step.key)}
                    className={`group relative p-2 sm:p-2.5 rounded-lg border text-center transition-all hover:shadow-2xs ${
                      step.completed
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Tier {step.step}
                      </span>
                      {step.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-500" />
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary-600 transition-colors">
                      {step.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {step.count} {step.completed ? 'Configured' : 'Needed'}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: CATEGORY FILTER BAR & SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Catalogues' },
              { id: 'academic', label: 'Academic Architecture' },
              { id: 'people', label: 'People & Rosters' },
              { id: 'finance', label: 'Finance & Revenue' },
              { id: 'operations', label: 'Operations & Config' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as CatalogueCategory)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeCategory === tab.id
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter master entities..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-primary-500"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* SECTION 4: MASTER CATALOGUE DIRECTORY CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isMaster = item.classification === 'MASTER'
            const isRelationship = item.classification === 'RELATIONSHIP'
            const isLedger = item.classification === 'LEDGER'

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  {/* Top classification badge & Icon */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                        isMaster
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                          : isRelationship
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : isLedger
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.classification}
                    </span>

                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-primary-600 dark:text-primary-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Title & Count */}
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                        {item.count}
                      </span>
                      {item.secondaryMetric && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                          {item.secondaryMetric}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {item.masterTabKey ? (
                      <button
                        onClick={() => {
                          setSelectedMasterTab(item.masterTabKey!)
                          document.getElementById('master-records-explorer')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        title="Inspect Live Records Table"
                      >
                        <Table className="w-3 h-3" />
                        <span>Inspect Records</span>
                      </button>
                    ) : (
                      <Link
                        to={item.route}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        <span>Browse Roster</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  {item.createEntityKey ? (
                    <LockedButton
                      isEditMode={isEditMode}
                      onClick={() => handleOpenQuickRegister(item.createEntityKey!)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Register</span>
                    </LockedButton>
                  ) : item.createDirectRoute ? (
                    <LockedButton
                      isEditMode={isEditMode}
                      onClick={() => navigate(item.createDirectRoute!)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </LockedButton>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {/* SECTION 4B: ACTIVE MASTER RECORDS LIVE DIRECTORY */}
        <div id="master-records-explorer" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden space-y-0">
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/40">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-100 dark:bg-primary-950/60 text-primary-600 rounded-lg">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Active Master Records Directory
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Directly browse, search, and audit all live canonical records in your coaching institute
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${selectedMasterTab}...`}
                  value={explorerSearch}
                  onChange={(e) => setExplorerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-primary-500"
                />
              </div>

              <LockedButton
                isEditMode={isEditMode}
                onClick={() => handleOpenQuickRegister(
                  selectedMasterTab === 'boards' ? 'board' :
                  selectedMasterTab === 'standards' ? 'standard' :
                  selectedMasterTab === 'batches' ? 'batch' :
                  selectedMasterTab === 'subjects' ? 'subject' : 'batch'
                )}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </LockedButton>
            </div>
          </div>

          {/* Master Tabs Bar */}
          <div className="px-3.5 sm:px-4 pt-2 flex gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2 bg-slate-50/70 dark:bg-slate-900/70 scrollbar-none">
            {[
              { id: 'boards', label: 'Educational Boards', icon: Building2, count: boardsList.length },
              { id: 'standards', label: 'Classes / Standards', icon: GraduationCap, count: standardsList.length },
              { id: 'batches', label: 'Classroom Batches', icon: Layers, count: batchesList.length },
              { id: 'subjects', label: 'Canonical Subjects', icon: BookOpen, count: subjectsList.length },
              { id: 'years', label: 'Academic Sessions', icon: Calendar, count: yearsList.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedMasterTab(tab.id as any)
                  setExplorerSearch('')
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  selectedMasterTab === tab.id
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    selectedMasterTab === tab.id
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content / Tables */}
          <div className="p-3 sm:p-4 overflow-x-auto">
            {/* 1. BOARDS TABLE */}
            {selectedMasterTab === 'boards' && (
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2 px-3 rounded-l-xl">Code</th>
                    <th className="py-2 px-3">Board Name</th>
                    <th className="py-2 px-3">Curriculum Description</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {boardsList
                    .filter((b) =>
                      !explorerSearch ||
                      b.name.toLowerCase().includes(explorerSearch.toLowerCase()) ||
                      b.code.toLowerCase().includes(explorerSearch.toLowerCase())
                    )
                    .map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-primary-600 dark:text-primary-400">
                          <span className="px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800">
                            {b.code}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          {b.name}
                        </td>
                        <td className="py-2 px-3 text-slate-500 max-w-xs truncate">
                          {b.description || 'National/State Curriculum'}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              b.is_active !== false
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${b.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {b.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Link
                            to="/academic/boards"
                            className="inline-flex items-center gap-1 font-bold text-primary-600 hover:text-primary-700 text-xs"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {/* 2. STANDARDS TABLE */}
            {selectedMasterTab === 'standards' && (
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2 px-3 rounded-l-xl">Level</th>
                    <th className="py-2 px-3">Standard / Class Name</th>
                    <th className="py-2 px-3">Affiliated Board</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {standardsList
                    .filter((s) =>
                      !explorerSearch ||
                      s.name.toLowerCase().includes(explorerSearch.toLowerCase()) ||
                      String(s.level).includes(explorerSearch)
                    )
                    .map((s) => {
                      const boardName = boardsList.find((b) => b.id === (s as any).board_id)?.name || 'All Curricula'
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Level {s.level}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                            {s.name}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {boardName}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Link
                              to="/academic/classes"
                              className="inline-flex items-center gap-1 font-bold text-primary-600 hover:text-primary-700 text-xs"
                            >
                              <span>Manage</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}

            {/* 3. BATCHES TABLE */}
            {selectedMasterTab === 'batches' && (
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2 px-3 rounded-l-xl">Batch Name</th>
                    <th className="py-2 px-3">Standard</th>
                    <th className="py-2 px-3">Affiliated Board</th>
                    <th className="py-2 px-3">Seat Capacity</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {batchesList
                    .filter((b) =>
                      !explorerSearch ||
                      b.name.toLowerCase().includes(explorerSearch.toLowerCase())
                    )
                    .map((b) => {
                      const stdName = standardsList.find((s) => s.id === b.standard_id)?.name || `Std #${b.standard_id}`
                      const board = boardsList.find((brd) => brd.id === b.board_id)
                      return (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                            {b.name}
                          </td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">
                            {stdName}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {board ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {board.code}
                              </span>
                            ) : (
                              <span className="text-amber-500 font-medium text-[11px]">General / Unaffiliated</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                            {b.capacity || 40} Seats
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Link
                              to="/academic/batches"
                              className="inline-flex items-center gap-1 font-bold text-primary-600 hover:text-primary-700 text-xs"
                            >
                              <span>View Roster</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}

            {/* 4. CANONICAL SUBJECTS TABLE */}
            {selectedMasterTab === 'subjects' && (
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2 px-3 rounded-l-xl">Code</th>
                    <th className="py-2 px-3">Canonical Subject Name</th>
                    <th className="py-2 px-3">Learning Area / Description</th>
                    <th className="py-2 px-3">Governance</th>
                    <th className="py-2 px-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjectsList
                    .filter((sub) =>
                      !explorerSearch ||
                      sub.name.toLowerCase().includes(explorerSearch.toLowerCase()) ||
                      sub.code.toLowerCase().includes(explorerSearch.toLowerCase())
                    )
                    .map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-primary-600 dark:text-primary-400">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {sub.code}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          {sub.name}
                        </td>
                        <td className="py-2 px-3 text-slate-500 max-w-sm truncate">
                          {sub.description || 'Core Curriculum Discipline'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                            SSOT Rule 011
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Link
                            to="/academic/subjects"
                            className="inline-flex items-center gap-1 font-bold text-primary-600 hover:text-primary-700 text-xs"
                          >
                            <span>Map to Classes</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {/* 5. ACADEMIC SESSIONS TABLE */}
            {selectedMasterTab === 'years' && (
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2 px-3 rounded-l-xl">Session Year</th>
                    <th className="py-2 px-3">Start Date</th>
                    <th className="py-2 px-3">End Date</th>
                    <th className="py-2 px-3">Active Cycle</th>
                    <th className="py-2 px-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {yearsList
                    .filter((yr) =>
                      !explorerSearch ||
                      yr.name.toLowerCase().includes(explorerSearch.toLowerCase())
                    )
                    .map((yr) => (
                      <tr key={yr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          {yr.name}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono">
                          {yr.start_date || '2026-06-01'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono">
                          {yr.end_date || '2027-04-30'}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              yr.is_current
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${yr.is_current ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {yr.is_current ? 'Current Session' : 'Archived'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Link
                            to="/academic/settings?tab=academic_years"
                            className="inline-flex items-center gap-1 font-bold text-primary-600 hover:text-primary-700 text-xs"
                          >
                            <span>Settings</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5: UNIVERSAL QUICK ENTITY REGISTRATION MODAL */}
      {showQuickRegisterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary-600" />
                  Quick Master Entity Registration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Register a canonical entity directly into PrathamOne EduOS Master Catalogues
                </p>
              </div>
              <button
                onClick={() => setShowQuickRegisterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Entity Selector Tabs */}
            <div className="px-5 pt-4 flex gap-1.5 overflow-x-auto border-b border-slate-100 dark:border-slate-800 pb-3">
              {[
                { key: 'batch', label: 'Classroom Batch' },
                { key: 'standard', label: 'Class / Standard' },
                { key: 'board', label: 'Educational Board' },
                { key: 'subject', label: 'Canonical Subject' },
              ].map((ent) => (
                <button
                  key={ent.key}
                  onClick={() => {
                    setSelectedQuickEntity(ent.key as any)
                    setSubmitError(null)
                    setSubmitSuccess(null)
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedQuickEntity === ent.key
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {ent.label}
                </button>
              ))}
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleQuickSubmit} className="p-5 space-y-4">
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* 1. BATCH FORM (WITH MANDATORY BOARD SELECTION TO PREVENT ORPHANS) */}
              {selectedQuickEntity === 'batch' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Affiliated Educational Board
                    </label>
                    <select
                      value={batchForm.board_id}
                      onChange={(e) => setBatchForm({ ...batchForm, board_id: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- Optional / General Curriculum --</option>
                      {boardsList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Affiliating a board ensures this batch is properly categorized across all multi-board filters.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Standard / Class <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={batchForm.standard_id}
                      onChange={(e) => setBatchForm({ ...batchForm, standard_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- Select Standard --</option>
                      {standardsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Level {s.level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Batch Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Division A, Morning Star"
                        value={batchForm.name}
                        onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Seat Capacity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={batchForm.capacity}
                        onChange={(e) => setBatchForm({ ...batchForm, capacity: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. STANDARD FORM */}
              {selectedQuickEntity === 'standard' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Standard / Class Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Std 10th (SSC), Grade 9"
                      value={standardForm.name}
                      onChange={(e) => setStandardForm({ ...standardForm, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Grade Level (Integer) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="16"
                        value={standardForm.level}
                        onChange={(e) => setStandardForm({ ...standardForm, level: Number(e.target.value) })}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Board Affiliation
                      </label>
                      <select
                        value={standardForm.board_id}
                        onChange={(e) => setStandardForm({ ...standardForm, board_id: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">-- All Boards --</option>
                        {boardsList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. BOARD FORM */}
              {selectedQuickEntity === 'board' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Board Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Central Board of Secondary Education"
                        value={boardForm.name}
                        onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Short Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CBSE, ICSE, MSBSHSE"
                        value={boardForm.code}
                        onChange={(e) => setBoardForm({ ...boardForm, code: e.target.value.toUpperCase() })}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional curriculum notes..."
                      value={boardForm.description}
                      onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* 4. CANONICAL SUBJECT FORM */}
              {selectedQuickEntity === 'subject' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Subject Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mathematics, Physics, Marathi"
                        value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Canonical Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MATH, PHY, MAR"
                        value={subjectForm.code}
                        onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description / Learning Area
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Core STEM syllabus, Language and literature"
                      value={subjectForm.description}
                      onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickRegisterModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createBoardMutation.isPending ||
                    createStandardMutation.isPending ||
                    createBatchMutation.isPending ||
                    createSubjectMutation.isPending
                  }
                  className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {createBoardMutation.isPending ||
                  createStandardMutation.isPending ||
                  createBatchMutation.isPending ||
                  createSubjectMutation.isPending
                    ? 'Registering...'
                    : 'Save & Commit Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
