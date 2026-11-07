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
 * @updated     2026-11-07
 *
 * @description Enterprise Study Materials & Academic Programs management console with live database persistence.
 */

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, FileText, Download, Plus, Search, Filter, Trash2, Edit,
  Clock, CheckCircle, ExternalLink, FileQuestion, BookMarked, Layers,
  Sparkles, Check, AlertCircle, X, GraduationCap, ChevronRight, Hash
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { studyMaterialsApi, standardsApi, subjectsApi, divisionsApi } from '../api/endpoints'
import type { StudyMaterialItem, Standard, AcademicSubject as Subject, Division } from '../types'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton, LockedIconButton, DeleteConfirmationModal } from '../components/common'
import Modal from '../components/Modal'

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

export default function CoursesPage() {
  const queryClient = useQueryClient()
  const { selectedInstitutionId } = useAuthStore()
  const editScope = 'academic:study_materials'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<'materials' | 'programs'>('materials')

  // Search & Filters for Study Materials
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStandardId, setSelectedStandardId] = useState<number | undefined>(undefined)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined)
  const [selectedFileType, setSelectedFileType] = useState<string>('All')

  // Programs filter
  const [selectedProgramCat, setSelectedProgramCat] = useState<string>('all')

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterialItem | null>(null)
  const [materialToDelete, setMaterialToDelete] = useState<StudyMaterialItem | null>(null)

  // Form state
  const [formStandardId, setFormStandardId] = useState<number | ''>('')
  const [formSubjectId, setFormSubjectId] = useState<number | ''>('')
  const [formDivisionId, setFormDivisionId] = useState<number | ''>('')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFileType, setFormFileType] = useState('Notes')
  const [formFileUrl, setFormFileUrl] = useState('')
  const [formFileSizeKB, setFormFileSizeKB] = useState<number>(1500)

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

  // Filtered subjects based on selected standard in modal
  const filteredFormSubjects = useMemo(() => {
    if (!formStandardId) return subjects
    return subjects.filter((s: Subject) => s.standard_id === formStandardId)
  }, [subjects, formStandardId])

  // Filtered divisions based on selected standard in modal
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
      toast.error('Activate Edit Mode above to upload or manage study materials.')
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
      toast.error('Activate Edit Mode above to edit study materials.')
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
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Revision':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const filteredPrograms =
    selectedProgramCat === 'all'
      ? COACHING_PROGRAMS
      : COACHING_PROGRAMS.filter((c) => c.category === selectedProgramCat)

  return (
    <div className="space-y-6">
      {/* ─── Global View-First & Explicit Edit Mode Governance Bar ──────────── */}
      <EditModeBar scope={editScope} title="Study Materials & Academic Syllabi Catalog" />

      {/* ─── Workspace Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Study Materials & Academic Syllabi
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Comprehensive coaching notes, formula handbooks, question banks, and learning resources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <LockedButton
            isEditMode={isEditMode}
            onClick={handleOpenAdd}
            icon={Plus}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Upload Material
          </LockedButton>

          <Link
            to="/academic"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Academic Structure</span>
          </Link>
        </div>
      </div>

      {/* ─── 4 Top Metric KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Study Materials</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {statsData?.total_materials ?? materialsData?.total ?? 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookMarked className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Standards Covered</span>
            <span className="text-2xl font-black text-indigo-700 mt-1 block">
              {statsData?.standards_covered ?? 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Question Banks</span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {statsData?.question_banks ?? 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileQuestion className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Formula Sheets</span>
            <span className="text-2xl font-black text-purple-700 mt-1 block">
              {statsData?.formula_sheets ?? 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Hash className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs: Materials vs Programs ────────────────────────── */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'materials'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Study Materials Library ({materialsData?.total ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('programs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'programs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Coaching Programs & Curriculum Streams</span>
        </button>
      </div>

      {/* ─── TAB 1: STUDY MATERIALS LIBRARY (LIVE DATABASE) ────────────────── */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
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
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Standard Filter */}
              <select
                value={selectedStandardId ?? ''}
                onChange={(e) => setSelectedStandardId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-blue-500"
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
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub: Subject) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>

              {/* File Type Filter */}
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Types</option>
                <option value="Notes">Notes</option>
                <option value="Formula Sheet">Formula Sheet</option>
                <option value="Question Bank">Question Bank</option>
                <option value="Assignment">Assignment</option>
                <option value="Revision">Revision</option>
                <option value="Syllabus">Syllabus</option>
              </select>
            </div>
          </div>

          {/* Materials Grid */}
          {isMaterialsLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs font-medium">
              Loading study materials from database...
            </div>
          ) : materialsData?.items && materialsData.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materialsData.items.map((m: StudyMaterialItem) => (
                <div
                  key={m.id}
                  className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getFileTypeBadge(m.file_type)}`}>
                        {m.file_type}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatBytes(m.file_size_bytes)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1.5">
                      {m.title}
                    </h3>

                    {/* Description */}
                    {m.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {m.description}
                      </p>
                    )}

                    {/* Meta info tags */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-xs">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px]">
                        {m.standard_name}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded text-[11px]">
                        {m.subject_name}
                      </span>
                      {m.division_name && (
                        <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 font-semibold rounded text-[11px]">
                          Batch: {m.division_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <a
                      href={m.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download / View</span>
                    </a>

                    <div className="flex items-center gap-1">
                      <LockedIconButton
                        isEditMode={isEditMode}
                        onClick={() => handleOpenEdit(m)}
                        icon={Edit}
                        title="Edit Study Material"
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                      />

                      <LockedIconButton
                        isEditMode={isEditMode}
                        onClick={() => setMaterialToDelete(m)}
                        icon={Trash2}
                        title="Delete Study Material"
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-xl border border-slate-200/80 p-8 space-y-3">
              <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No study materials found matching filters</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload new chapter handbooks, question banks, or formula sheets using the Upload Material action above.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: COACHING PROGRAMS & CURRICULUM STREAMS ──────────────────── */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          {/* Programs Category Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-2">
            {['all', 'School Board', 'Competitive Exam', 'Foundation'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedProgramCat(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedProgramCat === cat
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat === 'all' ? 'All Coaching Programs' : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        c.category === 'Competitive Exam'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : c.category === 'School Board'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {c.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" /> {c.duration}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 mb-1">{c.name}</h2>
                  <p className="text-xs text-slate-600 mb-3">{c.target}</p>

                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Associated Standards
                      </p>
                      <p className="text-xs text-slate-800 font-medium">{c.standardsCovered}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Core Subjects
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.subjects.map((s) => (
                          <span
                            key={s}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Active Offering
                  </span>
                  <Link
                    to="/students/add"
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                  >
                    Enroll Student →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── ADD / EDIT STUDY MATERIAL MODAL ───────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMaterial ? 'Edit Study Material' : 'Upload New Study Material'}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Title / Resource Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Class X Mathematics - Complete Formula Booklet & Theorems"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Standard / Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={formStandardId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : ''
                  setFormStandardId(val)
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Subject <span className="text-rose-500">*</span>
              </label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Subject</option>
                {filteredFormSubjects.map((sub: Subject) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Material Type</label>
              <select
                value={formFileType}
                onChange={(e) => setFormFileType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="Notes">Notes</option>
                <option value="Formula Sheet">Formula Sheet</option>
                <option value="Question Bank">Question Bank</option>
                <option value="Assignment">Assignment</option>
                <option value="Revision">Revision</option>
                <option value="Syllabus">Syllabus</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Section (Optional)</label>
              <select
                value={formDivisionId}
                onChange={(e) => setFormDivisionId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Batches in Standard</option>
                {filteredFormDivisions.map((d: Division) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Document URL / Storage Path <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="/materials/sample_handbook.pdf"
                value={formFileUrl}
                onChange={(e) => setFormFileUrl(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">File Size (KB)</label>
              <input
                type="number"
                value={formFileSizeKB}
                onChange={(e) => setFormFileSizeKB(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description & Notes</label>
            <textarea
              rows={2}
              placeholder="Brief summary of concepts, chapters, or syllabus covered in this document..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-xs"
            >
              {saveMutation.isPending ? 'Saving...' : editingMaterial ? 'Save Changes' : 'Upload Resource'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      <DeleteConfirmationModal
        isOpen={!!materialToDelete}
        onClose={() => setMaterialToDelete(null)}
        scope={editScope}
        entityType="Study Material"
        entityName={materialToDelete?.title || 'Study Material'}
        onConfirm={() => {
          if (materialToDelete) {
            deleteMutation.mutate(materialToDelete.id)
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
