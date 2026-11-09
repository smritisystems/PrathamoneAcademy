/**
 * @file        Courses.tsx
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
 * @updated     2026-11-10
 *
 * @description Enterprise Study Materials & Digital Content management hub comprising 8 dedicated workspaces, live database persistence, and Rule 010 View-First governance.
 */

import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useLocation, useInRouterContext, MemoryRouter } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, FileText, Download, Plus, Search, Filter, Trash2, Edit,
  Clock, CheckCircle, ExternalLink, FileQuestion, BookMarked, Layers,
  Sparkles, Check, AlertCircle, X, GraduationCap, ChevronRight, Hash,
  Library, UploadCloud, Video, Settings, Save, Lock, LockOpen, Eye,
  Printer, CheckCircle2, Shield, AlertTriangle, PlayCircle, FolderOpen
} from 'lucide-react'
import toast from 'react-hot-toast'

import { studyMaterialsApi, standardsApi, subjectsApi, divisionsApi } from '../api/endpoints'
import type { StudyMaterialItem, Standard, AcademicSubject as Subject, Division } from '../types'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { EditModeBar, LockedButton, LockedIconButton, DeleteConfirmationModal, SortableHeader, TableSortSelect, TableSortOption } from '../components/common'
import { useTableSort } from '../hooks/useTableSort'
import Modal from '../components/Modal'

export type CoursesTab =
  | 'overview'
  | 'repository'
  | 'upload'
  | 'notes'
  | 'question-banks'
  | 'video-lectures'
  | 'syllabi'
  | 'settings'

interface TabInfo {
  id: CoursesTab
  label: string
  route: string
  icon: React.ComponentType<{ className?: string }>
}

const COURSES_TABS: TabInfo[] = [
  { id: 'overview', label: 'Overview', route: '/courses/overview', icon: BookOpen },
  { id: 'repository', label: 'Master Library', route: '/courses/repository', icon: Library },
  { id: 'upload', label: 'Upload Content', route: '/courses/upload', icon: UploadCloud },
  { id: 'notes', label: 'Chapter Notes', route: '/courses/notes', icon: FileText },
  { id: 'question-banks', label: 'Question Banks', route: '/courses/question-banks', icon: FileQuestion },
  { id: 'video-lectures', label: 'Video Lectures', route: '/courses/video-lectures', icon: Video },
  { id: 'syllabi', label: 'Curriculum Syllabi', route: '/courses/syllabi', icon: Sparkles },
  { id: 'settings', label: 'Storage Policies', route: '/courses/settings', icon: Settings },
]

interface ProgramItem {
  id: string
  name: string
  category: 'School Board' | 'Competitive Exam' | 'Foundation'
  target: string
  duration: string
  subjects: string[]
  standardsCovered: string
}

const COACHING_PROGRAMS: ProgramItem[] = [
  {
    id: 'cbse-11-12',
    name: 'CBSE Senior Secondary (Class 11 & 12)',
    category: 'School Board',
    target: 'CBSE Board Exams + Entrance Foundations',
    duration: '2 Years',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    standardsCovered: 'Standard 11, Standard 12',
  },
  {
    id: 'state-11-12',
    name: 'Maharashtra State Board HSC (11th & 12th)',
    category: 'School Board',
    target: 'State Board Exams + MHT-CET',
    duration: '2 Years',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    standardsCovered: 'Standard 11, Standard 12',
  },
  {
    id: 'jee-main-adv',
    name: 'IIT-JEE Target (Main & Advanced)',
    category: 'Competitive Exam',
    target: 'IITs, NITs, IIITs Engineering Entrance',
    duration: '2 Years Intensive',
    subjects: ['Advanced Physics', 'Physical & Organic Chemistry', 'Higher Mathematics'],
    standardsCovered: 'Standard 11 & 12 Coaching',
  },
  {
    id: 'neet-ug',
    name: 'NEET-UG Medical Entrance Intensive',
    category: 'Competitive Exam',
    target: 'AIIMS, Govt Medical Colleges Entrance',
    duration: '2 Years Intensive',
    subjects: ['Botany', 'Zoology', 'Physics', 'Chemistry'],
    standardsCovered: 'Standard 11 & 12 Coaching',
  },
  {
    id: 'secondary-8-10',
    name: 'Secondary Board Excellence (Class 8–10)',
    category: 'School Board',
    target: 'CBSE / ICSE / SSC 10th Board Exams',
    duration: '1 Year per Standard',
    subjects: ['Mathematics', 'Science', 'English', 'Social Science'],
    standardsCovered: 'Standard 8, 9, 10',
  },
  {
    id: 'olympiad-foundation',
    name: 'Junior Science & Math Olympiad Foundation',
    category: 'Foundation',
    target: 'NTSE, Homi Bhabha, Mathematics Olympiad',
    duration: '1 Year Program',
    subjects: ['Logical Reasoning', 'Advanced Math', 'Experimental Science'],
    standardsCovered: 'Standard 6 to 9',
  },
]

function CoursesContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { selectedInstitutionId } = useAuthStore()
  const isTrainingMode = useEnvironmentStore((s) => s.isTrainingMode)

  const editScope = 'academic:study_materials'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  // Synchronize Tab with Route
  const getTabFromPath = (path: string): CoursesTab => {
    if (path.includes('/courses/repository')) return 'repository'
    if (path.includes('/courses/upload')) return 'upload'
    if (path.includes('/courses/notes')) return 'notes'
    if (path.includes('/courses/question-banks')) return 'question-banks'
    if (path.includes('/courses/video-lectures')) return 'video-lectures'
    if (path.includes('/courses/syllabi')) return 'syllabi'
    if (path.includes('/courses/settings')) return 'settings'
    return 'overview'
  }

  const [activeTab, setActiveTab] = useState<CoursesTab>(() => getTabFromPath(location.pathname))

  useEffect(() => {
    const tabFromPath = getTabFromPath(location.pathname)
    if (tabFromPath !== activeTab) {
      setActiveTab(tabFromPath)
    }
  }, [location.pathname])

  const handleTabChange = (tabId: CoursesTab, targetRoute: string) => {
    setActiveTab(tabId)
    navigate(targetRoute)
  }

  // Search & Filters for Repository & Workspaces
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStandardId, setSelectedStandardId] = useState<number | undefined>(undefined)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined)
  const [selectedFileType, setSelectedFileType] = useState<string>('All')
  const [selectedProgramCat, setSelectedProgramCat] = useState<string>('all')

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterialItem | null>(null)
  const [materialToDelete, setMaterialToDelete] = useState<StudyMaterialItem | null>(null)
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterialItem | null>(null)

  // Upload Form state
  const [formStandardId, setFormStandardId] = useState<number | ''>('')
  const [formSubjectId, setFormSubjectId] = useState<number | ''>('')
  const [formDivisionId, setFormDivisionId] = useState<number | ''>('')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFileType, setFormFileType] = useState('Notes')
  const [formFileUrl, setFormFileUrl] = useState('')
  const [formFileSizeKB, setFormFileSizeKB] = useState<number>(1850)

  // Settings State
  const [maxUploadSizeMB, setMaxUploadSizeMB] = useState<number>(50)
  const [allowOfflineDownload, setAllowOfflineDownload] = useState<boolean>(true)
  const [enableWatermarking, setEnableWatermarking] = useState<boolean>(true)
  const [storageProvider, setStorageProvider] = useState<string>('gcs')

  // ─── Data Queries ───────────────────────────────────────────────────────────

  // 1. Study Materials Stats
  const { data: statsData } = useQuery({
    queryKey: ['study-materials', 'stats', selectedInstitutionId],
    queryFn: async () => (await studyMaterialsApi.getStats()).data,
    staleTime: 30000,
  })

  // 2. Study Materials List
  const { data: materialsData, isLoading: isMaterialsLoading } = useQuery({
    queryKey: [
      'study-materials',
      'list',
      selectedInstitutionId,
      selectedStandardId,
      selectedSubjectId,
      selectedFileType,
      searchQuery,
    ],
    queryFn: async () => {
      const res = await studyMaterialsApi.list({
        standard_id: selectedStandardId,
        subject_id: selectedSubjectId,
        file_type: selectedFileType !== 'All' ? selectedFileType : undefined,
        search: searchQuery.trim() || undefined,
        limit: 100,
      })
      return res.data
    },
    staleTime: 15000,
  })

  const MATERIAL_SORT_OPTIONS: TableSortOption[] = [
    { key: 'title', label: 'Material Title' },
    { key: 'standard_name', label: 'Class / Standard' },
    { key: 'subject_name', label: 'Subject' },
    { key: 'file_type', label: 'Resource Type' },
    { key: 'file_size', label: 'File Size', type: 'number' as const },
    { key: 'created_at', label: 'Published Date', type: 'date' as const, defaultDirection: 'desc' as const },
  ]

  const materialsList = materialsData?.items ?? []
  const {
    sortedData: sortedMaterials,
    sortKey: materialSortKey,
    sortDirection: materialSortDirection,
    requestSort: requestMaterialSort,
    setSort: setMaterialSort,
    clearSort: clearMaterialSort,
  } = useTableSort(materialsList, {
    initialKey: 'created_at',
    initialDirection: 'desc',
    initialType: 'date',
  })

  // 3. Standards, Subjects, Divisions
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: async () => (await standardsApi.list(selectedInstitutionId ?? undefined)).data,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', selectedInstitutionId],
    queryFn: async () => (await subjectsApi.list()).data,
  })

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', selectedInstitutionId],
    queryFn: async () => (await divisionsApi.list(selectedInstitutionId ?? undefined)).data,
  })

  const filteredFormSubjects = useMemo(() => {
    if (!formStandardId) return subjects
    return subjects.filter((s: Subject) => s.standard_id === formStandardId)
  }, [subjects, formStandardId])

  const filteredFormDivisions = useMemo(() => {
    if (!formStandardId) return divisions
    return divisions.filter((d: Division) => d.standard_id === formStandardId)
  }, [divisions, formStandardId])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formStandardId || !formSubjectId || !formTitle.trim()) {
        throw new Error('Please fill all required fields: Standard, Subject, and Title.')
      }
      const payload = {
        standard_id: Number(formStandardId),
        subject_id: Number(formSubjectId),
        division_id: formDivisionId ? Number(formDivisionId) : null,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        file_type: formFileType,
        file_url: formFileUrl.trim() || `/materials/${formTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        file_size_bytes: Number(formFileSizeKB) * 1024,
      }

      if (editingMaterial) {
        return (await studyMaterialsApi.update(editingMaterial.id, payload)).data
      } else {
        return (await studyMaterialsApi.create(payload)).data
      }
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Study material saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['study-materials'] })
      handleCloseModal()
      if (activeTab === 'upload') {
        navigate('/courses/repository')
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || 'Failed to save study material')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await studyMaterialsApi.delete(id)).data,
    onSuccess: (data) => {
      toast.success(data.message || 'Study material deleted successfully.')
      queryClient.invalidateQueries({ queryKey: ['study-materials'] })
      setMaterialToDelete(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete study material')
    },
  })

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenAdd = () => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Enable Edit Mode above to upload or manage study materials.')
      return
    }
    setEditingMaterial(null)
    setFormStandardId(standards[0]?.id || '')
    setFormSubjectId(subjects[0]?.id || '')
    setFormDivisionId('')
    setFormTitle('')
    setFormDescription('')
    setFormFileType('Notes')
    setFormFileUrl('')
    setFormFileSizeKB(1850)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (material: StudyMaterialItem) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Enable Edit Mode above to edit study materials.')
      return
    }
    setEditingMaterial(material)
    setFormStandardId(material.standard_id || '')
    setFormSubjectId(material.subject_id || '')
    setFormDivisionId(material.division_id || '')
    setFormTitle(material.title)
    setFormDescription(material.description || '')
    setFormFileType(material.file_type || 'Notes')
    setFormFileUrl(material.file_url)
    setFormFileSizeKB(Math.round(material.file_size_bytes / 1024) || 1500)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingMaterial(null)
  }

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileTypeBadge = (type: string) => {
    switch (type) {
      case 'Formula Sheet':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Question Bank':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Assignment':
        return 'bg-primary-50 text-primary-700 border-blue-200'
      case 'Revision':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Video Lecture':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      case 'Syllabus':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  // Filtered materials by type for specialized views
  const notesMaterials = useMemo(
    () => materialsData?.items?.filter((m) => m.file_type === 'Notes' || m.file_type === 'Revision') ?? [],
    [materialsData?.items]
  )

  const questionBankMaterials = useMemo(
    () => materialsData?.items?.filter((m) => m.file_type === 'Question Bank' || m.file_type === 'Assignment') ?? [],
    [materialsData?.items]
  )

  const filteredPrograms = useMemo(
    () =>
      selectedProgramCat === 'all'
        ? COACHING_PROGRAMS
        : COACHING_PROGRAMS.filter((c) => c.category === selectedProgramCat),
    [selectedProgramCat]
  )

  // Metadata for workspaces
  const tabMetadata: Record<
    CoursesTab,
    {
      title: string
      subtitle: string
      primaryActionLabel?: string
      primaryActionIcon?: React.ComponentType<{ className?: string }>
      primaryActionTarget?: string
      requiresEditMode?: boolean
    }
  > = {
    overview: {
      title: 'Study Materials & Digital Content Overview',
      subtitle: 'Comprehensive coaching notes, question banks, formula books, video links, and academic streams.',
      primaryActionLabel: 'Upload Content',
      primaryActionIcon: UploadCloud,
      primaryActionTarget: '/courses/upload',
      requiresEditMode: true,
    },
    repository: {
      title: 'Master Content Library & Subject Explorer',
      subtitle: 'Searchable repository across all standards, subjects, and academic divisions with direct preview and downloads.',
      primaryActionLabel: 'Upload Content',
      primaryActionIcon: UploadCloud,
      primaryActionTarget: '/courses/upload',
      requiresEditMode: true,
    },
    upload: {
      title: 'Digital Content Upload & File Registration',
      subtitle: 'Upload and publish syllabus handouts, practice problem sheets, formula books, and video references.',
      primaryActionLabel: 'Submit Content Upload',
      primaryActionIcon: CheckCircle2,
      requiresEditMode: true,
    },
    notes: {
      title: 'Chapter Notes, Theory Handouts & Study Guides',
      subtitle: 'Standard-wise comprehensive theory booklets, classroom handouts, and concise revision notes.',
      primaryActionLabel: 'Upload New Notes',
      primaryActionIcon: UploadCloud,
      primaryActionTarget: '/courses/upload',
      requiresEditMode: true,
    },
    'question-banks': {
      title: 'Question Banks, DPPs & Model Test Papers',
      subtitle: 'Daily Practice Problems (DPP), previous years questions (PYQ), and exam readiness practice packs.',
      primaryActionLabel: 'Upload Question Bank',
      primaryActionIcon: UploadCloud,
      primaryActionTarget: '/courses/upload',
      requiresEditMode: true,
    },
    'video-lectures': {
      title: 'Recorded Lectures & Video Stream Centre',
      subtitle: 'Faculty recorded classroom sessions, video walkthroughs, and animated topic explanations.',
      primaryActionLabel: 'Register Video Lecture',
      primaryActionIcon: Video,
      primaryActionTarget: '/courses/upload',
      requiresEditMode: true,
    },
    syllabi: {
      title: 'Curriculum Syllabi & Academic Streams',
      subtitle: 'Structured multi-year coaching tracks covering CBSE, State Boards, IIT-JEE, and NEET-UG curriculums.',
      primaryActionLabel: 'Add Curriculum Stream',
      primaryActionIcon: Sparkles,
      requiresEditMode: true,
    },
    settings: {
      title: 'Storage Policies, File Formats & Quotas',
      subtitle: 'Institute cloud storage configuration, download restrictions, watermarking, and max file limits.',
      primaryActionLabel: 'Save Storage Policies',
      primaryActionIcon: Save,
      requiresEditMode: true,
    },
  }

  const currentTabInfo = tabMetadata[activeTab]

  return (
    <div className="space-y-6">
      {/* ─── Training Mode Notice ───────────────────────────────────────────── */}
      {isTrainingMode && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-semibold shadow-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider mr-2 text-amber-800">Training Mode Active:</span>
            <span>All uploads and study materials are isolated to the training environment. Production digital content is protected.</span>
          </div>
        </div>
      )}

      {/* ─── Global View-First & Scoped Edit Mode Governance Bar ──────────── */}
      <EditModeBar scope={editScope} title="Study Materials & Digital Content Catalog" />

      {/* ─── Workspace Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-indigo-100 flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {currentTabInfo.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {currentTabInfo.primaryActionLabel && (
            <>
              {currentTabInfo.requiresEditMode && !isEditMode ? (
                <button
                  type="button"
                  onClick={() => toast.error('Locked in View Mode: Enable Edit Mode above to perform this action.')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed transition-colors"
                  title="Locked in View Mode: Enable Edit Mode above to perform this action"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentTabInfo.primaryActionLabel}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (currentTabInfo.primaryActionTarget) {
                      navigate(currentTabInfo.primaryActionTarget)
                    } else if (activeTab === 'upload') {
                      saveMutation.mutate()
                    } else if (activeTab === 'settings') {
                      toast.success('Storage policies saved successfully.')
                    } else {
                      handleOpenAdd()
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-all active:scale-95"
                >
                  {currentTabInfo.primaryActionIcon && (
                    <currentTabInfo.primaryActionIcon className="w-3.5 h-3.5" />
                  )}
                  <span>{currentTabInfo.primaryActionLabel}</span>
                </button>
              )}
            </>
          )}

          <Link
            to="/academic"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Academic Structure</span>
          </Link>
        </div>
      </div>

      {/* ─── 8 Dedicated Submenu Workspace Navigation Tabs ─────────────────── */}
      <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar gap-1">
        {COURSES_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id, tab.route)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
              {tab.id === 'repository' && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-semibold">
                  {materialsData?.total ?? 0}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW & DASHBOARD ────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* 6 Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Total Materials</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {statsData?.total_materials ?? materialsData?.total ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Active files</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Standards</span>
              <span className="text-2xl font-black text-primary-700 mt-1 block">
                {statsData?.standards_covered ?? standards.length ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Classes covered</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Subjects</span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">
                {statsData?.subjects_covered ?? subjects.length ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Academic subjects</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Question Banks</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">
                {statsData?.question_banks ?? questionBankMaterials.length}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">DPPs & Test papers</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Formula Handbooks</span>
              <span className="text-2xl font-black text-purple-700 mt-1 block">
                {statsData?.formula_sheets ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Cheat sheets</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Academic Streams</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {COACHING_PROGRAMS.length}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Structured courses</span>
            </div>
          </div>

          {/* Quick Access Workspace Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              onClick={() => handleTabChange('repository', '/courses/repository')}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-primary-400 shadow-2xs transition-all cursor-pointer group hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Library className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Master Library</h3>
                  <p className="text-[11px] text-slate-500">Filter, browse & search content</p>
                </div>
              </div>
            </div>

            <div
              onClick={() => handleTabChange('upload', '/courses/upload')}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-primary-400 shadow-2xs transition-all cursor-pointer group hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Upload Content</h3>
                  <p className="text-[11px] text-slate-500">Register new files & notes</p>
                </div>
              </div>
            </div>

            <div
              onClick={() => handleTabChange('question-banks', '/courses/question-banks')}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-primary-400 shadow-2xs transition-all cursor-pointer group hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <FileQuestion className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Question Banks</h3>
                  <p className="text-[11px] text-slate-500">DPPs & exam test papers</p>
                </div>
              </div>
            </div>

            <div
              onClick={() => handleTabChange('settings', '/courses/settings')}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-primary-400 shadow-2xs transition-all cursor-pointer group hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Storage Policies</h3>
                  <p className="text-[11px] text-slate-500">Limits, formats & rules</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Uploads Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recently Published Study Materials</h3>
                <p className="text-xs text-slate-500 mt-0.5">Live database entries available to enrolled students</p>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('repository', '/courses/repository')}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <span>View Full Library</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Title & Topic</th>
                    <th className="py-3 px-4">Standard & Subject</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Published</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isMaterialsLoading && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Loading study materials library…
                      </td>
                    </tr>
                  )}
                  {!isMaterialsLoading && (!materialsData?.items || materialsData.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No study materials found in database.
                      </td>
                    </tr>
                  )}
                  {materialsData?.items?.slice(0, 5).map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          <span>{mat.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{mat.standard_name}</span>
                        <span className="text-slate-400 mx-1">•</span>
                        <span className="text-slate-600">{mat.subject_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getFileTypeBadge(
                            mat.file_type
                          )}`}
                        >
                          {mat.file_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatBytes(mat.file_size_bytes)}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(mat.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewMaterial(mat)}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition"
                            title="Preview Content"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={mat.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                            title="Open Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: MASTER REPOSITORY ───────────────────────────────────────── */}
      {activeTab === 'repository' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search materials by title or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Standard Filter */}
              <select
                value={selectedStandardId ?? ''}
                onChange={(e) => setSelectedStandardId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Standards</option>
                {standards.map((s: Standard) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Subject Filter */}
              <select
                value={selectedSubjectId ?? ''}
                onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Subjects</option>
                {subjects.map((s: Subject) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* File Type Filter */}
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                <option value="All">All Resource Types</option>
                <option value="Notes">Chapter Notes</option>
                <option value="Question Bank">Question Bank / DPP</option>
                <option value="Formula Sheet">Formula Sheet</option>
                <option value="Assignment">Assignment</option>
                <option value="Revision">Revision Pack</option>
                <option value="Video Lecture">Video Lecture</option>
                <option value="Syllabus">Curriculum Syllabus</option>
              </select>

              {/* Sort Selection Control */}
              <TableSortSelect
                options={MATERIAL_SORT_OPTIONS}
                currentSortKey={materialSortKey}
                currentDirection={materialSortDirection}
                onSortChange={(key, dir) => {
                  const opt = MATERIAL_SORT_OPTIONS.find((o) => o.key === key)
                  setMaterialSort(key, dir, undefined, opt?.type || 'auto')
                }}
                onClear={clearMaterialSort}
                placeholder="Sort Materials..."
              />
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <SortableHeader
                      columnKey="title"
                      label="Title & Topic"
                      currentSortKey={materialSortKey}
                      currentDirection={materialSortDirection}
                      onSort={requestMaterialSort}
                    />
                    <SortableHeader
                      columnKey="standard_name"
                      label="Class & Division"
                      currentSortKey={materialSortKey}
                      currentDirection={materialSortDirection}
                      onSort={requestMaterialSort}
                    />
                    <SortableHeader
                      columnKey="subject_name"
                      label="Subject"
                      currentSortKey={materialSortKey}
                      currentDirection={materialSortDirection}
                      onSort={requestMaterialSort}
                    />
                    <SortableHeader
                      columnKey="file_type"
                      label="Resource Type"
                      currentSortKey={materialSortKey}
                      currentDirection={materialSortDirection}
                      onSort={requestMaterialSort}
                    />
                    <SortableHeader
                      columnKey="file_size"
                      label="File Size"
                      currentSortKey={materialSortKey}
                      currentDirection={materialSortDirection}
                      onSort={requestMaterialSort}
                      sortType="number"
                    />
                    <SortableHeader
                      columnKey="created_at"
                      label="Published Date"
                      currentSortKey={materialSortKey}
                      currentDirection={materialSortDirection}
                      onSort={requestMaterialSort}
                      sortType="date"
                    />
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isMaterialsLoading && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading study materials library…
                      </td>
                    </tr>
                  )}
                  {!isMaterialsLoading && (!sortedMaterials || sortedMaterials.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No materials found matching criteria.
                      </td>
                    </tr>
                  )}
                  {sortedMaterials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          <span>{mat.title}</span>
                        </div>
                        {mat.description && (
                          <p className="text-[11px] font-normal text-slate-500 mt-0.5 truncate max-w-xs">
                            {mat.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{mat.standard_name}</span>
                        {mat.division_name && (
                          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            Div {mat.division_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{mat.subject_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getFileTypeBadge(
                            mat.file_type
                          )}`}
                        >
                          {mat.file_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatBytes(mat.file_size_bytes)}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(mat.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewMaterial(mat)}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition"
                            title="Preview Content"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={mat.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                            title="Open Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <LockedIconButton
                            isEditMode={isEditMode}
                            onClick={() => handleOpenEdit(mat)}
                            icon={Edit}
                            title="Edit Material"
                            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          />

                          <LockedIconButton
                            isEditMode={isEditMode}
                            onClick={() => setMaterialToDelete(mat)}
                            icon={Trash2}
                            title="Delete Material"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: UPLOAD CONTENT & FILE REGISTRATION ───────────────────────── */}
      {activeTab === 'upload' && (
        <div className="card p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6 max-w-4xl mx-auto animate-fade-in">
          {!isEditMode && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>View Mode Active: Enable Edit Mode above to submit new study material uploads.</span>
            </div>
          )}

          <form
            id="course-upload-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!isEditMode) {
                toast.error('Locked in View Mode: Enable Edit Mode to upload.')
                return
              }
              saveMutation.mutate()
            }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                1. Academic Mapping Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Standard / Class *</label>
                  <select
                    disabled={!isEditMode}
                    value={formStandardId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : ''
                      setFormStandardId(val)
                      setFormSubjectId('')
                      setFormDivisionId('')
                    }}
                    className="input text-xs"
                    required
                  >
                    <option value="">Select Standard</option>
                    {standards.map((s: Standard) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                  <select
                    disabled={!isEditMode || !formStandardId}
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value ? Number(e.target.value) : '')}
                    className="input text-xs"
                    required
                  >
                    <option value="">Select Subject</option>
                    {filteredFormSubjects.map((s: Subject) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Division (Optional)</label>
                  <select
                    disabled={!isEditMode || !formStandardId}
                    value={formDivisionId}
                    onChange={(e) => setFormDivisionId(e.target.value ? Number(e.target.value) : '')}
                    className="input text-xs"
                  >
                    <option value="">All Divisions</option>
                    {filteredFormDivisions.map((d: Division) => (
                      <option key={d.id} value={d.id}>
                        Division {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                2. Resource Content & File Metadata
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Title *</label>
                    <input
                      type="text"
                      disabled={!isEditMode}
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="input text-xs"
                      placeholder="e.g. Thermodynamics & Heat Transfer Complete Handout"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Type *</label>
                    <select
                      disabled={!isEditMode}
                      value={formFileType}
                      onChange={(e) => setFormFileType(e.target.value)}
                      className="input text-xs"
                    >
                      <option value="Notes">Chapter Notes & Handouts</option>
                      <option value="Question Bank">Question Bank / DPP</option>
                      <option value="Formula Sheet">Formula Handbook / Cheat Sheet</option>
                      <option value="Assignment">Graded Assignment</option>
                      <option value="Revision">Revision Pack / Summary</option>
                      <option value="Video Lecture">Video Lecture Reference</option>
                      <option value="Syllabus">Curriculum Syllabus Document</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Resource URL / File Path</label>
                    <input
                      type="text"
                      disabled={!isEditMode}
                      value={formFileUrl}
                      onChange={(e) => setFormFileUrl(e.target.value)}
                      className="input text-xs font-mono"
                      placeholder="e.g. /materials/physics_ch3_handout.pdf or https://drive.google.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">File Size (KB)</label>
                    <input
                      type="number"
                      disabled={!isEditMode}
                      value={formFileSizeKB}
                      onChange={(e) => setFormFileSizeKB(Number(e.target.value))}
                      className="input text-xs font-mono"
                      min={10}
                      max={102400}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Key Topics Covered</label>
                  <textarea
                    disabled={!isEditMode}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="input text-xs h-24"
                    placeholder="Enter summary, topics covered, target exam relevance, and homework problem set references..."
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/courses/repository')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              {isEditMode ? (
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saveMutation.isPending ? 'Publishing Content...' : 'Publish Study Material'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to submit.')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Publish Material (Locked)</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB 4: CHAPTER NOTES & HANDOUTS ─────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Chapter Handouts & Theoretical Reference Guides</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Filtered library of {notesMaterials.length} theory booklets and revision guides
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange('upload', '/courses/upload')}
              className="btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Notes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notesMaterials.length === 0 ? (
              <div className="col-span-full bg-white p-10 rounded-xl border border-slate-200 text-center text-slate-400">
                No chapter notes currently found in the library.
              </div>
            ) : (
              notesMaterials.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      {item.standard_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{formatBytes(item.file_size_bytes)}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] font-semibold text-primary-600 mt-0.5">{item.subject_name}</p>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewMaterial(item)}
                        className="p-1 rounded text-primary-600 hover:bg-primary-50"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-slate-600 hover:bg-slate-100"
                        title="Download / Open"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: QUESTION BANKS & DPPS ────────────────────────────────────── */}
      {activeTab === 'question-banks' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Daily Practice Problems (DPP) & Question Banks</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeted problem sheets, previous year solutions, and mock test papers
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange('upload', '/courses/upload')}
              className="btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Question Bank</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questionBankMaterials.length === 0 ? (
              <div className="col-span-full bg-white p-10 rounded-xl border border-slate-200 text-center text-slate-400">
                No question banks or DPP sheets currently registered.
              </div>
            ) : (
              questionBankMaterials.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                      {item.file_type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{formatBytes(item.file_size_bytes)}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] font-semibold text-primary-600 mt-0.5">
                      {item.standard_name} • {item.subject_name}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">Target: JEE / NEET / Boards</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewMaterial(item)}
                        className="p-1 rounded text-primary-600 hover:bg-primary-50"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-slate-600 hover:bg-slate-100"
                        title="Download / Open"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 6: VIDEO LECTURES & DIGITAL STREAM ──────────────────────────── */}
      {activeTab === 'video-lectures' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Recorded Video Lectures & Stream References</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Classroom recordings, animated visual demonstrations, and video solutions
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange('upload', '/courses/upload')}
              className="btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Register Video Link</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: 'vid-1',
                title: 'Rotational Dynamics & Moment of Inertia Masterclass',
                subject: 'Physics',
                standard: 'Standard 12',
                duration: '1h 45m',
                faculty: 'Prof. R. Deshmukh',
                url: 'https://youtube.com',
              },
              {
                id: 'vid-2',
                title: 'Chemical Equilibrium & Le Chatelier Principle',
                subject: 'Chemistry',
                standard: 'Standard 11',
                duration: '1h 20m',
                faculty: 'Dr. Anita Joshi',
                url: 'https://youtube.com',
              },
              {
                id: 'vid-3',
                title: 'Calculus: Integration by Parts & Partial Fractions',
                subject: 'Mathematics',
                standard: 'Standard 12',
                duration: '2h 10m',
                faculty: 'Prof. V. Sharma',
                url: 'https://youtube.com',
              },
              {
                id: 'vid-4',
                title: 'Human Reproduction & Embryonic Development',
                subject: 'Biology',
                standard: 'Standard 12',
                duration: '1h 15m',
                faculty: 'Dr. Sneha Patil',
                url: 'https://youtube.com',
              },
            ].map((vid) => (
              <div key={vid.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="h-32 bg-slate-900 relative flex items-center justify-center text-white">
                  <PlayCircle className="w-12 h-12 text-white/80 hover:text-white transition cursor-pointer" />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono font-bold">
                    {vid.duration}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-primary-600">{vid.subject}</span>
                    <span className="text-slate-400">{vid.standard}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{vid.title}</h4>
                  <p className="text-[11px] text-slate-500">Instructor: {vid.faculty}</p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <a
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <span>Stream Lecture</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 7: CURRICULUM SYLLABI & ACADEMIC STREAMS ────────────────────── */}
      {activeTab === 'syllabi' && (
        <div className="space-y-4 animate-fade-in">
          {/* Category Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Institute Academic Curriculum Streams</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured 1-year and 2-year competitive and board examination tracks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Category:</span>
              <select
                value={selectedProgramCat}
                onChange={(e) => setSelectedProgramCat(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                <option value="School Board">School Board Tracks</option>
                <option value="Competitive Exam">Competitive Entrance (JEE / NEET)</option>
                <option value="Foundation">Olympiad & Foundation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((prog) => (
              <div
                key={prog.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        prog.category === 'Competitive Exam'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : prog.category === 'Foundation'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {prog.category}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{prog.duration}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">{prog.name}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">{prog.target}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                      Subjects Covered
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {prog.subjects.map((sub, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-700 text-xs rounded-md font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{prog.standardsCovered}</span>
                  <button
                    type="button"
                    onClick={() => handleTabChange('repository', '/courses/repository')}
                    className="font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <span>View Notes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 8: STORAGE POLICIES & QUOTAS ────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="card p-6 bg-white border border-slate-200 rounded-2xl shadow-xs max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
              Digital Content & Storage Policies
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Single File Upload Size (MB)
                </label>
                <input
                  type="number"
                  disabled={!isEditMode}
                  value={maxUploadSizeMB}
                  onChange={(e) => setMaxUploadSizeMB(Number(e.target.value))}
                  className="input text-xs w-48 font-mono"
                  min={5}
                  max={250}
                />
                <p className="text-[11px] text-slate-500 mt-1">Recommended limit for PDF and media uploads: 50 MB</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cloud Storage Provider</label>
                <select
                  disabled={!isEditMode}
                  value={storageProvider}
                  onChange={(e) => setStorageProvider(e.target.value)}
                  className="input text-xs w-64"
                >
                  <option value="gcs">Google Cloud Storage (GCS)</option>
                  <option value="s3">Amazon S3 / MinIO</option>
                  <option value="local">Local Institute Server Storage</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isEditMode}
                    checked={enableWatermarking}
                    onChange={(e) => setEnableWatermarking(e.target.checked)}
                    className="checkbox"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Dynamic Student Watermarking</p>
                    <p className="text-[11px] text-slate-500">
                      Stamp student enrollment number and phone number onto downloaded PDFs to prevent unauthorized piracy.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isEditMode}
                    checked={allowOfflineDownload}
                    onChange={(e) => setAllowOfflineDownload(e.target.checked)}
                    className="checkbox"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Allow Offline Document Downloads</p>
                    <p className="text-[11px] text-slate-500">
                      Enable enrolled students to download PDF booklets for offline viewing on mobile devices.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-200">
            {isEditMode ? (
              <button
                type="button"
                onClick={() => toast.success('Storage and content policies saved successfully.')}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Storage Policies</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to save settings.')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Save Storage Policies (Locked)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── SHARED MODALS ───────────────────────────────────────────────────── */}

      {/* Add / Edit Material Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingMaterial ? 'Edit Study Material' : 'Upload Study Material'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Standard / Class *</label>
                <select
                  value={formStandardId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : ''
                    setFormStandardId(val)
                    setFormSubjectId('')
                    setFormDivisionId('')
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Standard</option>
                  {standards.map((s: Standard) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                <select
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value ? Number(e.target.value) : '')}
                  disabled={!formStandardId}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <option value="">Select Subject</option>
                  {filteredFormSubjects.map((s: Subject) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Division (Optional)</label>
              <select
                value={formDivisionId}
                onChange={(e) => setFormDivisionId(e.target.value ? Number(e.target.value) : '')}
                disabled={!formStandardId}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option value="">All Divisions</option>
                {filteredFormDivisions.map((d: Division) => (
                  <option key={d.id} value={d.id}>
                    Division {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                placeholder="e.g. Chapter 4 - Chemical Kinetics Handout"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Type</label>
                <select
                  value={formFileType}
                  onChange={(e) => setFormFileType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Notes">Chapter Notes</option>
                  <option value="Question Bank">Question Bank / DPP</option>
                  <option value="Formula Sheet">Formula Sheet</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Revision">Revision Pack</option>
                  <option value="Video Lecture">Video Lecture</option>
                  <option value="Syllabus">Curriculum Syllabus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">File Size (KB)</label>
                <input
                  type="number"
                  value={formFileSizeKB}
                  onChange={(e) => setFormFileSizeKB(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-primary-500 font-mono"
                  min={1}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">File / Resource URL</label>
              <input
                type="text"
                placeholder="e.g. /materials/chem_ch4.pdf or cloud link"
                value={formFileUrl}
                onChange={(e) => setFormFileUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-primary-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
              <textarea
                placeholder="Brief summary of topics covered in this material..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-primary-500 h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="px-4 py-2 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-xs transition"
              >
                {saveMutation.isPending ? 'Saving...' : editingMaterial ? 'Save Changes' : 'Upload Material'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {materialToDelete && (
        <DeleteConfirmationModal
          isOpen={!!materialToDelete}
          onClose={() => setMaterialToDelete(null)}
          onConfirm={() => deleteMutation.mutate(materialToDelete.id)}
          scope={editScope}
          entityType="Study Material"
          entityName={materialToDelete.title}
          entityId={materialToDelete.id}
          isLoading={deleteMutation.isPending}
        />
      )}

      {/* Document Preview Modal */}
      {previewMaterial && (
        <Modal
          isOpen={!!previewMaterial}
          onClose={() => setPreviewMaterial(null)}
          title={`Preview: ${previewMaterial.title}`}
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">{previewMaterial.standard_name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getFileTypeBadge(previewMaterial.file_type)}`}>
                  {previewMaterial.file_type}
                </span>
              </div>
              <p className="text-xs text-primary-700 font-semibold">{previewMaterial.subject_name}</p>
              {previewMaterial.description && (
                <p className="text-xs text-slate-600 mt-1">{previewMaterial.description}</p>
              )}
              <div className="pt-2 text-[11px] text-slate-500 flex justify-between">
                <span>Size: {formatBytes(previewMaterial.file_size_bytes)}</span>
                <span>Published: {new Date(previewMaterial.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close Preview
              </button>
              <a
                href={previewMaterial.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Open / Download File</span>
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function CoursesPage() {
  const inRouter = useInRouterContext()
  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={['/courses']}>
        <CoursesContent />
      </MemoryRouter>
    )
  }
  return <CoursesContent />
}
