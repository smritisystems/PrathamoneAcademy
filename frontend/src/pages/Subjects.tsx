/**
 * @file        Subjects.tsx
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
 * @description Academic Subject Management with Canonical Master Catalogue, Standard/Board Applicability Mappings, and Duplicate Prevention.
 */

import { useState, useId, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, BookOpen, Check, X, Lock, Layers,
  Link as LinkIcon, AlertTriangle, Search, Filter, ShieldAlert,
  ArrowRight, Edit2, Trash2, CheckCircle2, Bookmark
} from 'lucide-react'
import { standardsApi, boardsApi, subjectsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, DeleteConfirmationModal } from '../components/common'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import type { CanonicalSubject, SubjectMappingItem, SubjectDuplicateCheckResult } from '../types'

export default function SubjectsPage() {
  const { selectedInstitutionId } = useAuthStore()
  const qc = useQueryClient()
  const editScope = 'academic:subjects'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  // Active View Tab: 'canonical' (Master) vs 'mappings' (Curriculum applicability)
  const [activeView, setActiveView] = useState<'canonical' | 'mappings'>('canonical')

  // Search & Filters
  const [canonicalSearch, setCanonicalSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedStandardId, setSelectedStandardId] = useState<string>('ALL')
  const [selectedBoardId, setSelectedBoardId] = useState<string>('ALL')
  const [mappingSearch, setMappingSearch] = useState('')

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalMode, setModalMode] = useState<'map_existing' | 'create_canonical'>('map_existing')
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    targetType: 'canonical' | 'mapping'
    id: number | null
    name: string
  }>({ isOpen: false, targetType: 'canonical', id: null, name: '' })

  // Form states
  const [mapForm, setMapForm] = useState({
    canonical_subject_id: '',
    standard_id: '',
    board_id: '',
    curriculum_code: '',
    display_name: '',
    max_marks: '100',
    pass_marks: '35',
    is_optional: false,
    display_order: '1',
  })

  const [canonicalForm, setCanonicalForm] = useState({
    name: '',
    code: '',
    category: 'General',
    description: '',
    aliases: '',
    auto_map: false,
    standard_id: '',
    board_id: '',
  })

  // Duplicate check state for new canonical subject creation
  const [duplicateCheck, setDuplicateCheck] = useState<SubjectDuplicateCheckResult | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

  // Fetch standards
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  // Fetch boards
  const { data: boards = [] } = useQuery({
    queryKey: ['boards', selectedInstitutionId],
    queryFn: () => boardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  // Fetch canonical subjects
  const {
    data: canonicalSubjects = [],
    isLoading: isLoadingCanonical,
  } = useQuery({
    queryKey: ['canonicalSubjects', selectedCategory, canonicalSearch],
    queryFn: () =>
      subjectsApi
        .listCanonical({
          category: selectedCategory === 'ALL' ? undefined : selectedCategory,
          search: canonicalSearch.trim() || undefined,
        })
        .then((r) => r.data),
  })

  // Fetch subject mappings
  const {
    data: subjectMappings = [],
    isLoading: isLoadingMappings,
  } = useQuery({
    queryKey: ['subjectMappings', selectedStandardId, selectedBoardId, mappingSearch],
    queryFn: () =>
      subjectsApi
        .listMappings({
          standard_id: selectedStandardId === 'ALL' ? undefined : Number(selectedStandardId),
          board_id: selectedBoardId === 'ALL' ? undefined : Number(selectedBoardId),
          search: mappingSearch.trim() || undefined,
        })
        .then((r) => r.data),
  })

  // Live duplicate check on canonical subject name input
  useEffect(() => {
    if (!canonicalForm.name.trim() || modalMode !== 'create_canonical') {
      setDuplicateCheck(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true)
        const res = await subjectsApi.checkDuplicate(canonicalForm.name.trim())
        setDuplicateCheck(res.data)
      } catch (err) {
        // ignore live check error
      } finally {
        setIsCheckingDuplicate(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [canonicalForm.name, modalMode])

  // Create Mapping Mutation
  const createMappingMutation = useMutation({
    mutationFn: (data: {
      canonical_subject_id: number
      standard_id: number
      board_id?: number | null
      curriculum_code?: string
      display_name?: string
      max_marks?: number
      pass_marks?: number
      is_optional?: boolean
      display_order?: number
    }) => subjectsApi.createMapping(data),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Subject mapping created successfully')
      qc.invalidateQueries({ queryKey: ['subjectMappings'] })
      qc.invalidateQueries({ queryKey: ['canonicalSubjects'] })
      setShowAddModal(false)
      resetForms()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to create subject mapping'),
  })

  // Create Canonical Subject Mutation
  const createCanonicalMutation = useMutation({
    mutationFn: async (data: {
      name: string
      code: string
      category: string
      description?: string
      aliases?: string
      auto_map?: boolean
      standard_id?: string
      board_id?: string
    }) => {
      const canonRes = await subjectsApi.createCanonical({
        name: data.name,
        code: data.code,
        category: data.category,
        description: data.description,
        aliases: data.aliases,
      })

      if (data.auto_map && data.standard_id) {
        await subjectsApi.createMapping({
          canonical_subject_id: canonRes.data.id,
          standard_id: Number(data.standard_id),
          board_id: data.board_id ? Number(data.board_id) : undefined,
          curriculum_code: data.code,
          display_name: data.name,
        })
      }
      return canonRes.data
    },
    onSuccess: (data) => {
      toast.success(`Canonical subject '${data.name}' registered successfully`)
      qc.invalidateQueries({ queryKey: ['canonicalSubjects'] })
      qc.invalidateQueries({ queryKey: ['subjectMappings'] })
      setShowAddModal(false)
      resetForms()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to register canonical subject'),
  })

  // Delete/Deactivate Mutations
  const deleteCanonicalMutation = useMutation({
    mutationFn: (id: number) => subjectsApi.deleteCanonical(id),
    onSuccess: () => {
      toast.success('Canonical subject deactivated successfully')
      qc.invalidateQueries({ queryKey: ['canonicalSubjects'] })
      qc.invalidateQueries({ queryKey: ['subjectMappings'] })
      setDeleteModalState({ isOpen: false, targetType: 'canonical', id: null, name: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to deactivate canonical subject'),
  })

  const deleteMappingMutation = useMutation({
    mutationFn: (id: number) => subjectsApi.deleteMapping(id),
    onSuccess: () => {
      toast.success('Subject mapping removed successfully')
      qc.invalidateQueries({ queryKey: ['subjectMappings'] })
      qc.invalidateQueries({ queryKey: ['canonicalSubjects'] })
      setDeleteModalState({ isOpen: false, targetType: 'mapping', id: null, name: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to remove subject mapping'),
  })

  const resetForms = () => {
    setMapForm({
      canonical_subject_id: '',
      standard_id: '',
      board_id: '',
      curriculum_code: '',
      display_name: '',
      max_marks: '100',
      pass_marks: '35',
      is_optional: false,
      display_order: '1',
    })
    setCanonicalForm({
      name: '',
      code: '',
      category: 'General',
      description: '',
      aliases: '',
      auto_map: false,
      standard_id: '',
      board_id: '',
    })
    setDuplicateCheck(null)
  }

  // Pre-fill mapping modal from canonical subject row
  const openMappingForCanonical = (cs: CanonicalSubject) => {
    setModalMode('map_existing')
    setMapForm((prev) => ({
      ...prev,
      canonical_subject_id: String(cs.id),
      display_name: cs.name,
      curriculum_code: `${cs.code}-STD`,
    }))
    setShowAddModal(true)
  }

  // Categories list
  const availableCategories = ['ALL', 'Mathematics', 'Science', 'Languages', 'Social Sciences', 'Commerce', 'Computer Science', 'General']

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Academic Subjects Master" isDirty={showAddModal} />

      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Academic Subjects</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              SSOT Governed
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Canonical Subject Master Catalogue and Standard & Board Applicability Mappings
          </p>
        </div>

        {/* Action Button */}
        {isEditMode ? (
          <button
            onClick={() => {
              resetForms()
              setModalMode('map_existing')
              setShowAddModal(true)
            }}
            className="btn-primary flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add / Map Subject
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              toast.error('Locked in View Mode: Please activate Edit Mode above to register or map subjects.')
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            title="Locked in View Mode: Enable Edit Mode above to modify subjects"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Add / Map Subject (Locked)</span>
          </button>
        )}
      </div>

      {/* Dual-View Switcher Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveView('canonical')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeView === 'canonical'
              ? 'border-primary-700 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Common Subject Master</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-mono">
            {canonicalSubjects.length}
          </span>
        </button>

        <button
          onClick={() => setActiveView('mappings')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeView === 'mappings'
              ? 'border-primary-700 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>Standard & Board Mappings</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-mono">
            {subjectMappings.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: COMMON SUBJECT MASTER */}
      {activeView === 'canonical' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search master subjects by name, code, or alias..."
                value={canonicalSearch}
                onChange={(e) => setCanonicalSearch(e.target.value)}
                className="input pl-9 w-full text-sm"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 mr-1">CATEGORY:</span>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Canonical Table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Canonical Subject Directory</h2>
                <p className="text-xs text-gray-500">
                  Authoritative permanent identities. Each academic discipline exists once regardless of class count.
                </p>
              </div>
              <span className="text-xs font-medium text-gray-500">
                Showing {canonicalSubjects.length} master subject{canonicalSubjects.length === 1 ? '' : 's'}
              </span>
            </div>

            {isLoadingCanonical ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
              </div>
            ) : canonicalSubjects.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-base font-medium text-gray-700">No canonical subjects found</p>
                <p className="text-xs text-gray-500 mt-1">
                  Click "+ Add / Map Subject" to register a new master subject identity.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 text-left text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Master Code</th>
                      <th className="py-3 px-4 font-semibold">Subject Identity</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold">Standards Linked</th>
                      <th className="py-3 px-4 font-semibold">Boards Linked</th>
                      <th className="py-3 px-4 font-semibold text-center">Total Mappings</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {canonicalSubjects.map((cs) => (
                      <tr key={cs.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary-800">
                          <span className="bg-primary-50 px-2 py-1 rounded border border-primary-100">
                            {cs.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary-600 flex-shrink-0" />
                            <span>{cs.name}</span>
                          </div>
                          {cs.aliases && (
                            <p className="text-xs text-gray-400 mt-0.5 pl-6">
                              Aliases: {cs.aliases}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {cs.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {cs.standards_summary && cs.standards_summary.length > 0 ? (
                              cs.standards_summary.map((std) => (
                                <span
                                  key={std}
                                  className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                                >
                                  {std}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">None mapped</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {cs.boards_summary && cs.boards_summary.length > 0 ? (
                              cs.boards_summary.map((b) => (
                                <span
                                  key={b}
                                  className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold"
                                >
                                  {b}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">Universal</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-gray-800 text-xs px-2.5 py-1 rounded-full bg-gray-100">
                            {cs.mappings_count ?? 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                              cs.is_active
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cs.is_active ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                            {cs.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditMode ? (
                              <>
                                <button
                                  onClick={() => openMappingForCanonical(cs)}
                                  className="px-2.5 py-1 rounded text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition-colors"
                                  title="Map to another standard or board"
                                >
                                  + Map Standard
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteModalState({
                                      isOpen: true,
                                      targetType: 'canonical',
                                      id: cs.id,
                                      name: `${cs.name} (${cs.code})`,
                                    })
                                  }
                                  className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Deactivate master subject"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 italic flex items-center gap-1">
                                <Lock className="w-3 h-3 text-slate-400" /> View only
                              </span>
                            )}
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

      {/* VIEW 2: STANDARD & BOARD MAPPINGS */}
      {activeView === 'mappings' && (
        <div className="space-y-4">
          {/* Standard & Board Filter Bars */}
          <div className="card p-4 space-y-3">
            {/* Standard Filter Pills */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                FILTER BY STANDARD / CLASS:
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedStandardId('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedStandardId === 'ALL'
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Standards
                </button>
                {standards.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStandardId(String(s.id))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedStandardId === String(s.id)
                        ? 'bg-primary-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Board Filter & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">BOARD:</span>
                <button
                  onClick={() => setSelectedBoardId('ALL')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    selectedBoardId === 'ALL'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Boards
                </button>
                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBoardId(String(b.id))}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      selectedBoardId === String(b.id)
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {b.code}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter curriculum mappings..."
                  value={mappingSearch}
                  onChange={(e) => setMappingSearch(e.target.value)}
                  className="input pl-8 py-1.5 text-xs w-full"
                />
              </div>
            </div>
          </div>

          {/* Mappings Table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Curriculum Applicability Mappings</h2>
                <p className="text-xs text-gray-500">
                  Maps canonical subjects to specific classes, examination boards, curriculum codes, and passing thresholds.
                </p>
              </div>
              <span className="text-xs font-medium text-gray-500">
                Total {subjectMappings.length} mapping{subjectMappings.length === 1 ? '' : 's'} active
              </span>
            </div>

            {isLoadingMappings ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
              </div>
            ) : subjectMappings.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-base font-medium text-gray-700">No curriculum mappings found</p>
                <p className="text-xs text-gray-500 mt-1">
                  Select a different standard/board or map a canonical subject to this standard.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 text-left text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Standard & Board</th>
                      <th className="py-3 px-4 font-semibold">Canonical Subject</th>
                      <th className="py-3 px-4 font-semibold">Curriculum Code</th>
                      <th className="py-3 px-4 font-semibold">Display Name in Syllabus</th>
                      <th className="py-3 px-4 font-semibold text-center">Max / Pass</th>
                      <th className="py-3 px-4 font-semibold text-center">Type</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subjectMappings.map((map) => (
                      <tr key={map.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">{map.standard_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Board: <span className="font-semibold text-emerald-700">{map.board_code || 'Universal'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-primary-600 flex-shrink-0" />
                            <span>{map.canonical_name}</span>
                          </div>
                          <div className="text-xs text-gray-400 font-mono pl-5.5">
                            Master: {map.canonical_code}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-700 font-bold">
                          {map.curriculum_code || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-gray-800 font-medium">
                          {map.display_name}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-gray-800">{map.max_marks}</span>
                          <span className="text-gray-400 text-xs"> / {map.pass_marks}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                              map.is_optional
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {map.is_optional ? 'Elective' : 'Compulsory'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isEditMode ? (
                            <button
                              onClick={() =>
                                setDeleteModalState({
                                  isOpen: true,
                                  targetType: 'mapping',
                                  id: map.id,
                                  name: `${map.display_name} in ${map.standard_name}`,
                                })
                              }
                              className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove mapping"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic flex items-center justify-end gap-1">
                              <Lock className="w-3 h-3 text-slate-400" /> Locked
                            </span>
                          )}
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

      {/* ADD / MAP SUBJECT MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          resetForms()
        }}
        title="Subject Configuration & Architecture"
      >
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setModalMode('map_existing')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                modalMode === 'map_existing'
                  ? 'bg-white text-primary-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Map Existing Subject (Recommended)</span>
            </button>
            <button
              onClick={() => setModalMode('create_canonical')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                modalMode === 'create_canonical'
                  ? 'bg-white text-primary-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Master Subject</span>
            </button>
          </div>

          {/* MODE 1: MAP EXISTING CANONICAL SUBJECT */}
          {modalMode === 'map_existing' && (
            <div className="space-y-3.5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Single Source of Truth Rule:</span> Select a canonical subject from the master catalog and map it to a specific standard and examination board. This prevents duplicate subject records.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Canonical Master Subject *
                </label>
                <select
                  className="input w-full text-sm"
                  value={mapForm.canonical_subject_id}
                  onChange={(e) => {
                    const selectedId = e.target.value
                    const cs = canonicalSubjects.find((c) => String(c.id) === selectedId)
                    setMapForm({
                      ...mapForm,
                      canonical_subject_id: selectedId,
                      display_name: cs ? cs.name : mapForm.display_name,
                      curriculum_code: cs ? `${cs.code}-STD` : mapForm.curriculum_code,
                    })
                  }}
                >
                  <option value="">Select subject identity from master catalog...</option>
                  {canonicalSubjects.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.name} ({cs.code}) — {cs.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Standard / Class *
                  </label>
                  <select
                    className="input w-full text-sm"
                    value={mapForm.standard_id}
                    onChange={(e) => setMapForm({ ...mapForm, standard_id: e.target.value })}
                  >
                    <option value="">Select class level...</option>
                    {standards.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Examination Board
                  </label>
                  <select
                    className="input w-full text-sm"
                    value={mapForm.board_id}
                    onChange={(e) => setMapForm({ ...mapForm, board_id: e.target.value })}
                  >
                    <option value="">All Boards / Universal</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Curriculum Subject Code
                  </label>
                  <input
                    className="input w-full text-sm"
                    placeholder="e.g. MATH-10, ENG-9"
                    value={mapForm.curriculum_code}
                    onChange={(e) => setMapForm({ ...mapForm, curriculum_code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Display Name in Syllabus
                  </label>
                  <input
                    className="input w-full text-sm"
                    placeholder="e.g. English Language & Literature"
                    value={mapForm.display_name}
                    onChange={(e) => setMapForm({ ...mapForm, display_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Max Marks</label>
                  <input
                    type="number"
                    className="input w-full text-sm"
                    value={mapForm.max_marks}
                    onChange={(e) => setMapForm({ ...mapForm, max_marks: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Passing Marks</label>
                  <input
                    type="number"
                    className="input w-full text-sm"
                    value={mapForm.pass_marks}
                    onChange={(e) => setMapForm({ ...mapForm, pass_marks: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="map_is_optional"
                  checked={mapForm.is_optional}
                  onChange={(e) => setMapForm({ ...mapForm, is_optional: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="map_is_optional" className="text-xs font-medium text-gray-700">
                  Elective / Optional subject (compulsory if unchecked)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    createMappingMutation.mutate({
                      canonical_subject_id: Number(mapForm.canonical_subject_id),
                      standard_id: Number(mapForm.standard_id),
                      board_id: mapForm.board_id ? Number(mapForm.board_id) : undefined,
                      curriculum_code: mapForm.curriculum_code.trim() || undefined,
                      display_name: mapForm.display_name.trim() || undefined,
                      max_marks: Number(mapForm.max_marks) || 100,
                      pass_marks: Number(mapForm.pass_marks) || 35,
                      is_optional: mapForm.is_optional,
                    })
                  }
                  disabled={
                    createMappingMutation.isPending ||
                    !mapForm.canonical_subject_id ||
                    !mapForm.standard_id
                  }
                  className="btn-primary text-xs"
                >
                  {createMappingMutation.isPending ? 'Mapping...' : 'Confirm Mapping'}
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: REGISTER NEW CANONICAL SUBJECT */}
          {modalMode === 'create_canonical' && (
            <div className="space-y-3.5">
              {/* Duplicate Check Alert Banner */}
              {duplicateCheck && (duplicateCheck.has_exact_match || duplicateCheck.similar_matches.length > 0) && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Duplicate Subject Warning: </span>
                      {duplicateCheck.message}
                    </div>
                  </div>

                  {/* 1-Click Reuse Button */}
                  {duplicateCheck.exact_match && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const m = duplicateCheck.exact_match!
                          setModalMode('map_existing')
                          setMapForm((prev) => ({
                            ...prev,
                            canonical_subject_id: String(m.id),
                            display_name: m.name,
                            curriculum_code: `${m.code}-STD`,
                          }))
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Reuse '{duplicateCheck.exact_match.name}' ({duplicateCheck.exact_match.code}) Instead</span>
                      </button>
                    </div>
                  )}

                  {/* Similar suggestions */}
                  {!duplicateCheck.has_exact_match && duplicateCheck.similar_matches.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-xs font-semibold text-amber-800">Similar Existing:</span>
                      {duplicateCheck.similar_matches.slice(0, 3).map((sim) => (
                        <button
                          key={sim.id}
                          type="button"
                          onClick={() => {
                            setModalMode('map_existing')
                            setMapForm((prev) => ({
                              ...prev,
                              canonical_subject_id: String(sim.id),
                              display_name: sim.name,
                              curriculum_code: `${sim.code}-STD`,
                            }))
                          }}
                          className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100 transition-colors"
                        >
                          {sim.name} ({sim.code})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Permanent Subject Name *
                </label>
                <div className="relative">
                  <input
                    className="input w-full text-sm"
                    placeholder="e.g. Mathematics, Sanskrit, Economics, Psychology"
                    value={canonicalForm.name}
                    onChange={(e) => {
                      const val = e.target.value
                      setCanonicalForm({
                        ...canonicalForm,
                        name: val,
                        code: canonicalForm.code || (val.length >= 3 ? `${val.slice(0, 4).toUpperCase()}001` : ''),
                      })
                    }}
                  />
                  {isCheckingDuplicate && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Permanent Subject Code *
                  </label>
                  <input
                    className="input w-full text-sm font-mono uppercase"
                    placeholder="e.g. MATH001, ENG001"
                    value={canonicalForm.code}
                    onChange={(e) => setCanonicalForm({ ...canonicalForm, code: e.target.value.toUpperCase() })}
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Stable across all standards & boards</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    className="input w-full text-sm"
                    value={canonicalForm.category}
                    onChange={(e) => setCanonicalForm({ ...canonicalForm, category: e.target.value })}
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Languages">Languages</option>
                    <option value="Social Sciences">Social Sciences</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="General">General / Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Known Aliases / Common Names
                </label>
                <input
                  className="input w-full text-sm"
                  placeholder="e.g. Math, Maths, Pure Mathematics"
                  value={canonicalForm.aliases}
                  onChange={(e) => setCanonicalForm({ ...canonicalForm, aliases: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description / Academic Scope
                </label>
                <input
                  className="input w-full text-sm"
                  placeholder="e.g. Standard algebra, calculus, and geometry curriculum"
                  value={canonicalForm.description}
                  onChange={(e) => setCanonicalForm({ ...canonicalForm, description: e.target.value })}
                />
              </div>

              {/* Immediate Mapping Checkbox */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto_map_check"
                    checked={canonicalForm.auto_map}
                    onChange={(e) => setCanonicalForm({ ...canonicalForm, auto_map: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="auto_map_check" className="text-xs font-bold text-gray-800">
                    Immediately map this new subject to a class/standard
                  </label>
                </div>

                {canonicalForm.auto_map && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Class / Standard *</label>
                      <select
                        className="input w-full text-xs"
                        value={canonicalForm.standard_id}
                        onChange={(e) => setCanonicalForm({ ...canonicalForm, standard_id: e.target.value })}
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
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Board</label>
                      <select
                        className="input w-full text-xs"
                        value={canonicalForm.board_id}
                        onChange={(e) => setCanonicalForm({ ...canonicalForm, board_id: e.target.value })}
                      >
                        <option value="">Universal / All</option>
                        {boards.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    createCanonicalMutation.mutate({
                      name: canonicalForm.name.trim(),
                      code: canonicalForm.code.trim().toUpperCase(),
                      category: canonicalForm.category,
                      description: canonicalForm.description.trim() || undefined,
                      aliases: canonicalForm.aliases.trim() || undefined,
                      auto_map: canonicalForm.auto_map,
                      standard_id: canonicalForm.standard_id,
                      board_id: canonicalForm.board_id,
                    })
                  }
                  disabled={
                    createCanonicalMutation.isPending ||
                    !canonicalForm.name.trim() ||
                    !canonicalForm.code.trim()
                  }
                  className="btn-primary text-xs"
                >
                  {createCanonicalMutation.isPending ? 'Registering...' : 'Register Canonical Subject'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete / Deactivate Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, targetType: 'canonical', id: null, name: '' })}
        scope={editScope}
        entityType={deleteModalState.targetType === 'canonical' ? 'Master Subject' : 'Curriculum Mapping'}
        entityName={deleteModalState.name}
        entityId={deleteModalState.id ?? undefined}
        onConfirm={async () => {
          if (!deleteModalState.id) return
          if (deleteModalState.targetType === 'canonical') {
            await deleteCanonicalMutation.mutateAsync(deleteModalState.id)
          } else {
            await deleteMappingMutation.mutateAsync(deleteModalState.id)
          }
        }}
        isLoading={deleteCanonicalMutation.isPending || deleteMappingMutation.isPending}
      />
    </div>
  )
}
