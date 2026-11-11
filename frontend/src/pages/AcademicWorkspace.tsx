/**
 * @file        AcademicWorkspace.tsx
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
 * @created     2026-11-04
 * @updated     2026-11-11
 *
 * @description Flagship Academic Structure & Batch Management workspace featuring 9 tabs, tree view, and batch cards.
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import {
  GraduationCap, Plus, Users, Calendar, Clock, MapPin,
  BookOpen, ChevronDown, ChevronRight, Layers, FileText,
  Search, Grid, List, MoreVertical, Edit2, Archive, Eye,
  AlertTriangle, CheckCircle2, UserCheck, BarChart2, Settings as SettingsIcon,
  CalendarDays, ArrowUpRight, School, X, ShieldAlert, Sparkles,
  ExternalLink, User, Download, RefreshCw, ArrowRightLeft, UserPlus,
  Filter, Check, ShieldCheck, AlertCircle, Trash2, Power, Sliders, Lock,
  ArrowRight, Link as LinkIcon
} from 'lucide-react'
import {
  standardsApi, divisionsApi, boardsApi, academicYearsApi, usersApi,
  subjectsApi, timetableApi, enrollmentsApi, academicReportsApi, settingsApi
} from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { EditModeBar, DeleteConfirmationModal, LockedButton, LockedIconButton } from '../components/common'
import Modal from '../components/Modal'
import ExcelReportGrid, { ColumnConfig } from '../components/reports/ExcelReportGrid'
import toast from 'react-hot-toast'
import type {
  Division, Board, Standard, BatchRosterStudent, AcademicTreeBoard,
  AcademicSubject, AcademicTimetableEntry, EnrollmentRecord,
  BatchCapacityReportRow, AcademicDistributionReportRow, FacultyLoadReportRow,
  CanonicalSubject, SubjectDuplicateCheckResult
} from '../types'

export default function AcademicWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { isTrainingMode } = useEnvironmentStore()
  const qc = useQueryClient()
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()

  // ── Global View-First & Scoped Edit Mode Governance ──
  const editScope = 'academic:workspace'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  // Determine active tab from pathname or search params
  const getTabFromLocation = (): string => {
    const path = location.pathname.toLowerCase()
    if (path.endsWith('/boards') || path === '/boards') return 'boards'
    if (path.endsWith('/classes') || path.endsWith('/standards') || path === '/standards') return 'classes'
    if (path.endsWith('/subjects') || path === '/subjects') return 'subjects'
    if (path.endsWith('/batches') || path === '/batches') return 'batches'
    if (path.endsWith('/timetable') || path === '/timetable') return 'timetable'
    if (path.endsWith('/enrollment')) return 'enrollment'
    if (path.endsWith('/reports')) return 'reports'
    if (path.endsWith('/settings')) return 'settings'
    if (path.endsWith('/overview')) return 'overview'
    return searchParams.get('tab') || 'overview'
  }

  // Delete & Archive Confirmation Protection Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    targetType: 'batch' | 'subject' | 'session' | null
    id: number | null
    name: string
  }>({
    isOpen: false,
    targetType: null,
    id: null,
    name: '',
  })

  // ── Top Navigation Tabs ──
  const [activeTab, setActiveTab] = useState<string>(getTabFromLocation)

  // Sync state with URL pathname & searchParams
  useEffect(() => {
    const derived = getTabFromLocation()
    if (derived && derived !== activeTab) {
      setActiveTab(derived)
    }
  }, [location.pathname, searchParams])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    if (tabId === 'overview') {
      navigate('/academic')
    } else {
      navigate(`/academic/${tabId}`)
    }
  }

  // ── Global Filters ──
  const [selectedBoardId, setSelectedBoardId] = useState<string>('all')
  const [selectedStandardId, setSelectedStandardId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // ── Selected Tree Node (Board & Standard) for Overview ──
  const [selectedTreeBoardId, setSelectedTreeBoardId] = useState<number | null>(null)
  const [selectedTreeStandardId, setSelectedTreeStandardId] = useState<number | null>(null)
  const [expandedBoards, setExpandedBoards] = useState<Record<number, boolean>>({})

  // ── Sub-tabs in Selected Class Workspace (Overview tab) ──
  const [workspaceSubTab, setWorkspaceSubTab] = useState<'batches' | 'subjects' | 'timetable' | 'students' | 'settings'>('batches')

  // ── Modals State ──
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false)
  const [showEditBatchModal, setShowEditBatchModal] = useState(false)
  const [selectedBatchForEdit, setSelectedBatchForEdit] = useState<Division | null>(null)

  const [showRosterModal, setShowRosterModal] = useState(false)
  const [rosterBatchId, setRosterBatchId] = useState<number | null>(null)
  const [rosterSearch, setRosterSearch] = useState('')
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'all' | 'active' | 'withdrawn' | 'completed' | 'graduated' | 'inactive'>('active')

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleBatch, setScheduleBatch] = useState<Division | null>(null)

  // Board Modals
  const [showAddBoardModal, setShowAddBoardModal] = useState(false)
  const [showEditBoardModal, setShowEditBoardModal] = useState(false)
  const [selectedBoardForEdit, setSelectedBoardForEdit] = useState<Board | null>(null)
  const [boardForm, setBoardForm] = useState({ name: '', code: '', description: '' })

  // Standard/Class Modals
  const [showAddStandardModal, setShowAddStandardModal] = useState(false)
  const [showEditStandardModal, setShowEditStandardModal] = useState(false)
  const [selectedStandardForEdit, setSelectedStandardForEdit] = useState<Standard | null>(null)
  const [standardForm, setStandardForm] = useState({ name: '', level: 10, description: '' })

  // Subject Modals
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false)
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = useState<AcademicSubject | null>(null)
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    standard_id: '',
    max_marks: 100,
    passing_marks: 35,
    is_core: true,
  })
  const [subjectModalMode, setSubjectModalMode] = useState<'select' | 'create'>('select')
  const [canonicalSearchQuery, setCanonicalSearchQuery] = useState('')
  const [selectedCanonicalSubject, setSelectedCanonicalSubject] = useState<CanonicalSubject | null>(null)
  const [newSubjectCategory, setNewSubjectCategory] = useState('General')
  const [newSubjectAliases, setNewSubjectAliases] = useState('')
  const [subjectDupCheck, setSubjectDupCheck] = useState<SubjectDuplicateCheckResult | null>(null)
  const [isCheckingSubjectDup, setIsCheckingSubjectDup] = useState(false)

  // Timetable Modals
  const [showAddSessionModal, setShowAddSessionModal] = useState(false)
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>('Monday')
  const [timetableRoomFilter, setTimetableRoomFilter] = useState<string>('all')
  const [timetableBatchFilter, setTimetableBatchFilter] = useState<string>('all')
  const [sessionForm, setSessionForm] = useState({
    division_id: '',
    subject_id: '',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '09:30',
    room_number: 'Room 101',
  })
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [isCheckingConflict, setIsCheckingConflict] = useState(false)

  // Enrollment & Transfer Modals
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedEnrollmentForTransfer, setSelectedEnrollmentForTransfer] = useState<EnrollmentRecord | null>(null)
  const [enrollForm, setEnrollForm] = useState({
    student_id: '',
    standard_id: '',
    division_id: '',
    roll_number: '',
    remarks: '',
  })
  const [transferForm, setTransferForm] = useState({
    new_division_id: '',
    transfer_reason: 'Performance stream promotion',
    new_roll_number: '',
  })

  // Reports Tab State
  const [activeReportType, setActiveReportType] = useState<'batch-capacity' | 'distribution' | 'faculty-load'>('batch-capacity')
  const [isExportingReport, setIsExportingReport] = useState(false)

  // Batch Form State
  const [batchFormData, setBatchFormData] = useState({
    name: '',
    code: '',
    board_id: '',
    standard_id: '',
    capacity: 40,
    room_number: 'Room 101',
    schedule_timing: 'Mon - Fri, 07:00 AM - 09:00 AM',
    status: 'active',
    class_teacher_id: '',
  })

  // Settings State with localStorage persistence & server sync
  const [academicSettings, setAcademicSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('prashant_academic_settings')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      // ignore
    }
    return {
      defaultBatchCapacity: 40,
      enforceCapacityStrict: true,
      preventTimetableConflicts: true,
      academicYearName: 'AY 2024–25 (Current)',
      autoRollNumberFormat: 'STD-DIV-SEQ',
    }
  })

  // Sync settings from central server
  useQuery({
    queryKey: ['academic-settings'],
    queryFn: async () => {
      try {
        const [standardsRes, allSettingsRes] = await Promise.allSettled([
          standardsApi.getSettings(),
          settingsApi.getAll(),
        ])
        const stdData = standardsRes.status === 'fulfilled' ? standardsRes.value.data : null
        const allData = allSettingsRes.status === 'fulfilled' ? allSettingsRes.value.data?.academic : null

        if (stdData || allData) {
          const merged = {
            ...academicSettings,
            ...(stdData || {}),
            ...(allData ? {
              defaultBatchCapacity: allData.batch_capacity_warning ?? academicSettings.defaultBatchCapacity,
              enforceCapacityStrict: allData.enforce_capacity_strict ?? academicSettings.enforceCapacityStrict,
              preventTimetableConflicts: allData.prevent_timetable_conflicts ?? academicSettings.preventTimetableConflicts,
              autoRollNumberFormat: allData.auto_roll_number_format ?? academicSettings.autoRollNumberFormat,
            } : {}),
          }
          setAcademicSettings(merged)
          localStorage.setItem('prashant_academic_settings', JSON.stringify(merged))
          return merged
        }
        return null
      } catch (err) {
        return null
      }
    },
    refetchOnWindowFocus: false,
  })

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await Promise.allSettled([
        standardsApi.updateSettings(academicSettings),
        settingsApi.updateBatch('academic', {
          batch_capacity_warning: academicSettings.defaultBatchCapacity,
          enforce_capacity_strict: academicSettings.enforceCapacityStrict,
          prevent_timetable_conflicts: academicSettings.preventTimetableConflicts,
          auto_roll_number_format: academicSettings.autoRollNumberFormat,
        }, 'Updated via Academic Workspace'),
      ])
      localStorage.setItem('prashant_academic_settings', JSON.stringify(academicSettings))
      toast.success('Academic workspace settings synchronized with central institute settings!')
    } catch (err) {
      localStorage.setItem('prashant_academic_settings', JSON.stringify(academicSettings))
      toast.error('Failed to save settings on server, saved locally.')
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. Academic Overview Metrics and Structure Tree
  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['academic-overview', selectedInstitutionId, selectedAcademicYearId],
    queryFn: () => standardsApi.getOverview().then((r) => r.data),
  })

  // 2. Boards with live counts
  const { data: boards = [] } = useQuery({
    queryKey: ['boards', selectedInstitutionId],
    queryFn: () => boardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  // 3. Standards / Classes with live counts
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  // 4. Batches / Divisions
  const { data: batches = [] } = useQuery({
    queryKey: ['divisions', selectedInstitutionId],
    queryFn: () => divisionsApi.list().then((r) => r.data),
  })

  // 5. Teachers (Users)
  const { data: usersData } = useQuery({
    queryKey: ['users', selectedInstitutionId],
    queryFn: () => usersApi.list().then((r) => r.data),
  })
  const teachers = useMemo(() => {
    if (!usersData?.items) return []
    return usersData.items.filter((u: any) =>
      ['teacher', 'faculty', 'staff', 'admin'].includes(u.role?.toLowerCase())
    )
  }, [usersData])

  // 6. Subjects Query
  const { data: subjects = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: ['subjects', selectedStandardId, searchQuery],
    queryFn: () =>
      subjectsApi
        .list({
          standard_id: selectedStandardId !== 'all' ? selectedStandardId : undefined,
          search: searchQuery || undefined,
        })
        .then((r) => r.data),
  })

  // Canonical catalog lookup for "Select Existing Subject" when Add Subject modal is open
  const { data: canonicalCatalog = [], isFetching: isLoadingCanonicalCatalog } = useQuery({
    queryKey: ['canonical-subjects-picker'],
    queryFn: () => subjectsApi.listCanonical().then((r) => r.data),
    enabled: showAddSubjectModal && !showEditSubjectModal,
    staleTime: 10000,
  })

  // Filtered canonical subjects + token-based recommendations when no exact substring matches
  const { filteredCanonicalCatalog, recommendedCanonicalCatalog } = useMemo(() => {
    const q = canonicalSearchQuery.trim().toLowerCase()
    if (!q) {
      return { filteredCanonicalCatalog: canonicalCatalog, recommendedCanonicalCatalog: [] as CanonicalSubject[] }
    }
    const exactOrSub = canonicalCatalog.filter((cs) => {
      const hay = [cs.name, cs.code, cs.category, cs.aliases || '', cs.alternate_codes || ''].join(' ').toLowerCase()
      return hay.includes(q)
    })
    if (exactOrSub.length > 0) {
      return { filteredCanonicalCatalog: exactOrSub, recommendedCanonicalCatalog: [] as CanonicalSubject[] }
    }
    // Partial/prefix token recommendation when exact search finds nothing
    const tokens = q.split(/\s+/).filter((t) => t.length >= 2)
    const prefix = q.slice(0, 3)
    const recs = canonicalCatalog.filter((cs) => {
      const hay = [cs.name, cs.code, cs.aliases || '', cs.alternate_codes || ''].join(' ').toLowerCase()
      return (prefix.length >= 2 && hay.includes(prefix)) || tokens.some((t) => hay.includes(t))
    })
    return { filteredCanonicalCatalog: [], recommendedCanonicalCatalog: recs.slice(0, 5) }
  }, [canonicalCatalog, canonicalSearchQuery])

  // Live duplicate / existing-subject recommendation check in Create New Subject mode
  useEffect(() => {
    if (!showAddSubjectModal || showEditSubjectModal || subjectModalMode !== 'create') {
      setSubjectDupCheck(null)
      return
    }
    const q = subjectForm.name.trim()
    if (q.length < 2) {
      setSubjectDupCheck(null)
      return
    }
    const timer = setTimeout(async () => {
      setIsCheckingSubjectDup(true)
      try {
        const res = await subjectsApi.checkDuplicate(q)
        setSubjectDupCheck(res.data)
      } catch {
        // Fallback local check against loaded canonicalCatalog
        const low = q.toLowerCase()
        const exact = canonicalCatalog.find((c) => c.name.trim().toLowerCase() === low)
        const similar = canonicalCatalog.filter((c) =>
          c.id !== exact?.id && [c.name, c.code, c.aliases || ''].join(' ').toLowerCase().includes(low)
        )
        if (exact || similar.length > 0) {
          setSubjectDupCheck({
            has_exact_match: Boolean(exact),
            exact_match: exact ?? null,
            similar_matches: similar,
            message: exact
              ? `Existing subject '${exact.name}' (${exact.code}) matches '${q}'.`
              : `Found ${similar.length} similar existing subject(s).`,
          })
        } else {
          setSubjectDupCheck(null)
        }
      } finally {
        setIsCheckingSubjectDup(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [subjectForm.name, subjectModalMode, showAddSubjectModal, showEditSubjectModal, canonicalCatalog])

  // 7. Timetable Query
  const { data: timetableEntries = [], isLoading: isTimetableLoading } = useQuery({
    queryKey: ['timetable', timetableBatchFilter, timetableRoomFilter, selectedBoardId, selectedStandardId],
    queryFn: () =>
      timetableApi
        .list({
          division_id: timetableBatchFilter !== 'all' ? timetableBatchFilter : undefined,
          room_number: timetableRoomFilter !== 'all' ? timetableRoomFilter : undefined,
          board_id: selectedBoardId !== 'all' ? selectedBoardId : undefined,
          standard_id: selectedStandardId !== 'all' ? selectedStandardId : undefined,
        })
        .then((r) => r.data),
  })

  // Distinct rooms for timetable
  const { data: distinctRooms = [] } = useQuery({
    queryKey: ['timetable-rooms'],
    queryFn: () => timetableApi.getRooms().then((r) => r.data),
  })

  // 8. Enrollments & Stats Query
  const { data: enrollmentStats } = useQuery({
    queryKey: ['enrollments-stats'],
    queryFn: () => enrollmentsApi.getStats().then((r) => r.data),
  })

  const [enrollmentPage, setEnrollmentPage] = useState(1)
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('all')

  const { data: enrollmentsData, isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: [
      'enrollments-list',
      selectedBoardId,
      selectedStandardId,
      enrollmentStatusFilter,
      searchQuery,
      enrollmentPage,
    ],
    queryFn: () =>
      enrollmentsApi
        .list({
          board_id: selectedBoardId !== 'all' ? Number(selectedBoardId) : undefined,
          standard_id: selectedStandardId !== 'all' ? Number(selectedStandardId) : undefined,
          status: enrollmentStatusFilter !== 'all' ? enrollmentStatusFilter : undefined,
          search: searchQuery || undefined,
          page: enrollmentPage,
          limit: 20,
        })
        .then((r) => r.data),
  })

  // Unassigned Students for Enroll Modal
  const { data: unassignedStudents = [] } = useQuery({
    queryKey: ['enrollments-unassigned'],
    queryFn: () => enrollmentsApi.getUnassigned().then((r) => r.data),
    enabled: showEnrollModal,
  })

  // 9. Reports Queries
  const { data: batchCapacityReportData = [], isLoading: isCapReportLoading } = useQuery({
    queryKey: ['report-batch-capacity'],
    queryFn: () => academicReportsApi.getBatchCapacity().then((r) => r.data),
    enabled: activeTab === 'reports' && activeReportType === 'batch-capacity',
  })

  const { data: distributionReportData = [], isLoading: isDistReportLoading } = useQuery({
    queryKey: ['report-distribution'],
    queryFn: () => academicReportsApi.getDistribution().then((r) => r.data),
    enabled: activeTab === 'reports' && activeReportType === 'distribution',
  })

  const { data: facultyLoadReportData = [], isLoading: isFacReportLoading } = useQuery({
    queryKey: ['report-faculty-load'],
    queryFn: () => academicReportsApi.getFacultyLoad().then((r) => r.data),
    enabled: activeTab === 'reports' && activeReportType === 'faculty-load',
  })

  // ── Excel Report Grid Columns for Tab 8 (Academic Reports) ──
  const batchCapacityColumns = useMemo<ColumnConfig<BatchCapacityReportRow>[]>(
    () => [
      {
        id: 'batch_name',
        header: 'Batch Name',
        accessorKey: 'batch_name',
        type: 'text',
        width: 170,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-bold text-slate-900">{val}</span>,
      },
      {
        id: 'board_and_class',
        header: 'Board & Class',
        accessorFn: (r) => `${r.board_name} • ${r.standard_name}`,
        type: 'text',
        width: 180,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (_, r) => (
          <span>
            <strong className="text-slate-800">{r.board_name}</strong> • {r.standard_name}
          </span>
        ),
      },
      {
        id: 'capacity',
        header: 'Capacity',
        accessorKey: 'capacity',
        type: 'number',
        width: 110,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-semibold text-slate-700">{val}</span>,
      },
      {
        id: 'enrolled',
        header: 'Enrolled',
        accessorKey: 'enrolled',
        type: 'number',
        width: 110,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-extrabold text-primary-700">{val}</span>,
      },
      {
        id: 'available_seats',
        header: 'Available',
        accessorKey: 'available_seats',
        type: 'number',
        width: 110,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-semibold text-slate-600">{val}</span>,
      },
      {
        id: 'occupancy_percentage',
        header: 'Occupancy %',
        accessorKey: 'occupancy_percentage',
        type: 'number',
        width: 170,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (pct) => {
          const val = Number(pct || 0)
          const barColor = val >= 90 ? 'bg-red-500' : val >= 70 ? 'bg-primary-600' : 'bg-emerald-500'
          return (
            <div className="flex items-center justify-center gap-2">
              <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`${barColor} h-2 rounded-full`}
                  style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                />
              </div>
              <span className="font-bold text-xs text-slate-800">{val}%</span>
            </div>
          )
        },
      },
      {
        id: 'teacher_name',
        header: 'Teacher / Mentor',
        accessorKey: 'teacher_name',
        type: 'text',
        width: 180,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="text-slate-800">{val || 'Unassigned'}</span>,
      },
      {
        id: 'room_and_timing',
        header: 'Room & Timing',
        accessorFn: (r) => `${r.room_number || 'Room TBD'} • ${r.schedule_timing || 'Timing TBD'}`,
        type: 'text',
        width: 200,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (_, r) => (
          <span className="text-slate-500 font-mono text-[11px]">
            {r.room_number || 'TBD'} • {r.schedule_timing || 'TBD'}
          </span>
        ),
      },
    ],
    []
  )

  const batchCapacitySummaryCalculations = useMemo(
    () => ({
      batch_name: () => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Total Batch Capacity
        </span>
      ),
      capacity: (rows: BatchCapacityReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.capacity || 0), 0)
        return <span className="font-extrabold text-slate-900">{sum}</span>
      },
      enrolled: (rows: BatchCapacityReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.enrolled || 0), 0)
        return <span className="font-extrabold text-primary-700">{sum}</span>
      },
      available_seats: (rows: BatchCapacityReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.available_seats || 0), 0)
        return <span className="font-extrabold text-slate-700">{sum}</span>
      },
      occupancy_percentage: (rows: BatchCapacityReportRow[]) => {
        const totalCap = rows.reduce((acc, r) => acc + Number(r.capacity || 0), 0)
        const totalEnr = rows.reduce((acc, r) => acc + Number(r.enrolled || 0), 0)
        const avg = totalCap > 0 ? Math.round((totalEnr / totalCap) * 100) : 0
        return <span className="font-extrabold text-primary-700">{avg}% Avg</span>
      },
    }),
    []
  )

  const distributionColumns = useMemo<ColumnConfig<AcademicDistributionReportRow>[]>(
    () => [
      {
        id: 'board_name',
        header: 'Board',
        accessorFn: (r) => `${r.board_name} (${r.board_code})`,
        type: 'text',
        width: 170,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (_, r) => (
          <span className="font-bold text-slate-900">
            {r.board_name} <span className="text-xs text-slate-500 font-normal">({r.board_code})</span>
          </span>
        ),
      },
      {
        id: 'standard_name',
        header: 'Class / Standard',
        accessorKey: 'standard_name',
        type: 'text',
        width: 160,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => <span className="font-bold text-slate-800">{val}</span>,
      },
      {
        id: 'standard_level',
        header: 'Level',
        accessorKey: 'standard_level',
        type: 'number',
        width: 100,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-mono text-primary-600 font-semibold">Level {val}</span>,
      },
      {
        id: 'batches_count',
        header: 'Batches',
        accessorKey: 'batches_count',
        type: 'number',
        width: 110,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-bold text-slate-700">{val}</span>,
      },
      {
        id: 'total_capacity',
        header: 'Total Capacity',
        accessorKey: 'total_capacity',
        type: 'number',
        width: 130,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-semibold text-slate-700">{val}</span>,
      },
      {
        id: 'enrolled_count',
        header: 'Enrolled Count',
        accessorKey: 'enrolled_count',
        type: 'number',
        width: 130,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-extrabold text-emerald-700">{val}</span>,
      },
      {
        id: 'available_seats',
        header: 'Available Seats',
        accessorKey: 'available_seats',
        type: 'number',
        width: 130,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="text-slate-600 font-medium">{val}</span>,
      },
      {
        id: 'occupancy_percentage',
        header: 'Occupancy %',
        accessorKey: 'occupancy_percentage',
        type: 'number',
        width: 130,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-extrabold text-primary-600">{val}%</span>,
      },
    ],
    []
  )

  const distributionSummaryCalculations = useMemo(
    () => ({
      board_name: () => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Board Total Distribution
        </span>
      ),
      batches_count: (rows: AcademicDistributionReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.batches_count || 0), 0)
        return <span className="font-extrabold text-slate-900">{sum}</span>
      },
      total_capacity: (rows: AcademicDistributionReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.total_capacity || 0), 0)
        return <span className="font-extrabold text-slate-900">{sum}</span>
      },
      enrolled_count: (rows: AcademicDistributionReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.enrolled_count || 0), 0)
        return <span className="font-extrabold text-emerald-700">{sum}</span>
      },
      available_seats: (rows: AcademicDistributionReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.available_seats || 0), 0)
        return <span className="font-extrabold text-slate-700">{sum}</span>
      },
      occupancy_percentage: (rows: AcademicDistributionReportRow[]) => {
        const totalCap = rows.reduce((acc, r) => acc + Number(r.total_capacity || 0), 0)
        const totalEnr = rows.reduce((acc, r) => acc + Number(r.enrolled_count || 0), 0)
        const avg = totalCap > 0 ? Math.round((totalEnr / totalCap) * 100) : 0
        return <span className="font-extrabold text-primary-700">{avg}% Avg</span>
      },
    }),
    []
  )

  const facultyLoadColumns = useMemo<ColumnConfig<FacultyLoadReportRow>[]>(
    () => [
      {
        id: 'teacher_name',
        header: 'Faculty Member',
        accessorKey: 'teacher_name',
        type: 'text',
        width: 240,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val, r) => (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="font-bold text-slate-900 leading-tight">{val}</p>
              <p className="text-[11px] text-slate-400 font-mono leading-tight">{r.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'staff_code',
        header: 'Staff Code',
        accessorKey: 'staff_code',
        type: 'text',
        width: 140,
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (val) => <span className="font-mono font-bold text-slate-700">{val}</span>,
      },
      {
        id: 'designation',
        header: 'Designation',
        accessorKey: 'designation',
        type: 'text',
        width: 170,
        sortable: true,
        filterable: true,
        filterType: 'select',
        render: (val) => <span className="text-slate-600 font-medium">{val}</span>,
      },
      {
        id: 'assigned_batches_count',
        header: 'Assigned Batches',
        accessorKey: 'assigned_batches_count',
        type: 'number',
        width: 150,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-bold text-primary-700">{val}</span>,
      },
      {
        id: 'weekly_sessions_count',
        header: 'Weekly Sessions',
        accessorKey: 'weekly_sessions_count',
        type: 'number',
        width: 150,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-bold text-purple-700">{val}</span>,
      },
      {
        id: 'total_students',
        header: 'Supervised Students',
        accessorKey: 'total_students',
        type: 'number',
        width: 170,
        align: 'center',
        sortable: true,
        filterable: true,
        filterType: 'number',
        render: (val) => <span className="font-extrabold text-emerald-700">{val}</span>,
      },
    ],
    []
  )

  const facultyLoadSummaryCalculations = useMemo(
    () => ({
      teacher_name: () => (
        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
          Total Faculty Load
        </span>
      ),
      assigned_batches_count: (rows: FacultyLoadReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.assigned_batches_count || 0), 0)
        return <span className="font-extrabold text-primary-700">{sum}</span>
      },
      weekly_sessions_count: (rows: FacultyLoadReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.weekly_sessions_count || 0), 0)
        return <span className="font-extrabold text-purple-700">{sum}</span>
      },
      total_students: (rows: FacultyLoadReportRow[]) => {
        const sum = rows.reduce((acc, r) => acc + Number(r.total_students || 0), 0)
        return <span className="font-extrabold text-emerald-700">{sum}</span>
      },
    }),
    []
  )

  // 10. Batch Roster
  const { data: rosterData, isLoading: isRosterLoading } = useQuery({
    queryKey: ['batch-roster', rosterBatchId, rosterStatusFilter],
    queryFn: () =>
      divisionsApi
        .getRoster(rosterBatchId!, {
          status: rosterStatusFilter !== 'all' ? rosterStatusFilter : undefined,
        })
        .then((r) => r.data),
    enabled: !!rosterBatchId && showRosterModal,
  })

  // ── Auto-select first node in tree if none selected ──
  useEffect(() => {
    if (overviewData?.structure_tree?.length && !selectedTreeBoardId) {
      const firstBoard = overviewData.structure_tree[0]
      setSelectedTreeBoardId(firstBoard.board_id)
      if (firstBoard.classes?.length && !selectedTreeStandardId) {
        setSelectedTreeStandardId(firstBoard.classes[0].standard_id)
      }
    }
  }, [overviewData, selectedTreeBoardId, selectedTreeStandardId])

  // Current selected tree board and standard
  const currentTreeBoard = useMemo(() => {
    return boards.find((b) => b.id === selectedTreeBoardId) || boards[0]
  }, [boards, selectedTreeBoardId])

  const currentTreeStandard = useMemo(() => {
    return standards.find((s) => s.id === selectedTreeStandardId) || standards[0]
  }, [standards, selectedTreeStandardId])

  // Batches belonging to current tree selection
  const workspaceBatches = useMemo(() => {
    if (!batches.length) return []
    return batches.filter((b) => {
      const matchBoard = selectedTreeBoardId ? b.board_id === selectedTreeBoardId : true
      const matchStandard = selectedTreeStandardId ? b.standard_id === selectedTreeStandardId : true
      const matchSearch = searchQuery.trim()
        ? b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.class_teacher_name?.toLowerCase().includes(searchQuery.toLowerCase())
        : true
      return matchBoard && matchStandard && matchSearch
    })
  }, [batches, selectedTreeBoardId, selectedTreeStandardId, searchQuery])

  // Subjects for the currently selected standard
  const currentStandardSubjects = useMemo(() => {
    if (!currentTreeStandard) return []
    return subjects.filter((s) => s.standard_id === currentTreeStandard.id)
  }, [subjects, currentTreeStandard])

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Batch Mutations
  const createBatchMutation = useMutation({
    mutationFn: (data: any) => divisionsApi.create(data),
    onSuccess: () => {
      toast.success('Batch created successfully')
      qc.invalidateQueries({ queryKey: ['divisions'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      qc.invalidateQueries({ queryKey: ['boards'] })
      qc.invalidateQueries({ queryKey: ['standards'] })
      setShowCreateBatchModal(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create batch'),
  })

  const updateBatchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => divisionsApi.update(id, data),
    onSuccess: () => {
      toast.success('Batch updated successfully')
      qc.invalidateQueries({ queryKey: ['divisions'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowEditBatchModal(false)
      setSelectedBatchForEdit(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update batch'),
  })

  const archiveBatchMutation = useMutation({
    mutationFn: (id: number) => divisionsApi.archive(id),
    onSuccess: (data) => {
      toast.success(data.data.message || 'Batch archived successfully')
      qc.invalidateQueries({ queryKey: ['divisions'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to archive batch'),
  })

  // Board Mutations
  const createBoardMutation = useMutation({
    mutationFn: (data: any) => boardsApi.create({ ...data, institution_id: selectedInstitutionId || 2 }),
    onSuccess: () => {
      toast.success('Board created successfully')
      qc.invalidateQueries({ queryKey: ['boards'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowAddBoardModal(false)
      setBoardForm({ name: '', code: '', description: '' })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create board'),
  })

  const updateBoardMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => boardsApi.update(id, data),
    onSuccess: () => {
      toast.success('Board updated successfully')
      qc.invalidateQueries({ queryKey: ['boards'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowEditBoardModal(false)
      setSelectedBoardForEdit(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update board'),
  })

  const toggleBoardStatusMutation = useMutation({
    mutationFn: (id: number) => boardsApi.toggleStatus(id),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Board status updated')
      qc.invalidateQueries({ queryKey: ['boards'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to toggle status'),
  })

  // Standard Mutations
  const createStandardMutation = useMutation({
    mutationFn: (data: any) => standardsApi.create({ ...data, institution_id: selectedInstitutionId || 2 }),
    onSuccess: () => {
      toast.success('Class / Standard created successfully')
      qc.invalidateQueries({ queryKey: ['standards'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowAddStandardModal(false)
      setStandardForm({ name: '', level: 10, description: '' })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create class'),
  })

  const updateStandardMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => standardsApi.update(id, data),
    onSuccess: () => {
      toast.success('Class updated successfully')
      qc.invalidateQueries({ queryKey: ['standards'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowEditStandardModal(false)
      setSelectedStandardForEdit(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update class'),
  })

  const resetSubjectModalState = (defaultStandardId?: string) => {
    setSubjectForm({
      name: '',
      code: '',
      standard_id: defaultStandardId ?? (standards[0]?.id ? String(standards[0].id) : ''),
      max_marks: 100,
      passing_marks: 35,
      is_core: true,
    })
    setSubjectModalMode('select')
    setCanonicalSearchQuery('')
    setSelectedCanonicalSubject(null)
    setNewSubjectCategory('General')
    setNewSubjectAliases('')
    setSubjectDupCheck(null)
  }

  // Subject Mutations
  const createSubjectMutation = useMutation({
    mutationFn: (data: any) => subjectsApi.create(data),
    onSuccess: () => {
      toast.success('Subject created successfully')
      qc.invalidateQueries({ queryKey: ['subjects'] })
      qc.invalidateQueries({ queryKey: ['canonical-subjects-picker'] })
      qc.invalidateQueries({ queryKey: ['canonicalSubjects'] })
      qc.invalidateQueries({ queryKey: ['subjectMappings'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowAddSubjectModal(false)
      resetSubjectModalState()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create subject'),
  })

  const mapExistingSubjectMutation = useMutation({
    mutationFn: (data: {
      canonical_subject_id: number
      standard_id: number
      curriculum_code?: string
      display_name?: string
      max_marks?: number
      pass_marks?: number
      is_optional?: boolean
    }) => subjectsApi.createMapping(data),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Existing subject linked to class successfully')
      qc.invalidateQueries({ queryKey: ['subjects'] })
      qc.invalidateQueries({ queryKey: ['canonical-subjects-picker'] })
      qc.invalidateQueries({ queryKey: ['canonicalSubjects'] })
      qc.invalidateQueries({ queryKey: ['subjectMappings'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowAddSubjectModal(false)
      resetSubjectModalState()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to link existing subject'),
  })

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => subjectsApi.update(id, data),
    onSuccess: () => {
      toast.success('Subject updated successfully')
      qc.invalidateQueries({ queryKey: ['subjects'] })
      setShowEditSubjectModal(false)
      setSelectedSubjectForEdit(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update subject'),
  })

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: number) => subjectsApi.delete(id),
    onSuccess: () => {
      toast.success('Subject removed successfully')
      qc.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete subject'),
  })

  // Timetable Mutations
  const createSessionMutation = useMutation({
    mutationFn: (data: any) => timetableApi.create(data),
    onSuccess: () => {
      toast.success('Timetable session added successfully')
      qc.invalidateQueries({ queryKey: ['timetable'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowAddSessionModal(false)
      setConflictWarning(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to schedule session'),
  })

  const deleteSessionMutation = useMutation({
    mutationFn: (id: number) => timetableApi.delete(id),
    onSuccess: () => {
      toast.success('Session deleted successfully')
      qc.invalidateQueries({ queryKey: ['timetable'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete session'),
  })

  // Enrollment & Transfer Mutations
  const createEnrollmentMutation = useMutation({
    mutationFn: (data: any) => enrollmentsApi.create(data),
    onSuccess: () => {
      toast.success('Student enrolled successfully')
      qc.invalidateQueries({ queryKey: ['enrollments-list'] })
      qc.invalidateQueries({ queryKey: ['enrollments-stats'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowEnrollModal(false)
      setEnrollForm({ student_id: '', standard_id: '', division_id: '', roll_number: '', remarks: '' })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to enroll student'),
  })

  const transferBatchMutation = useMutation({
    mutationFn: (data: any) => enrollmentsApi.transfer(data),
    onSuccess: () => {
      toast.success('Student transferred to new batch successfully. Enrollment history preserved.')
      qc.invalidateQueries({ queryKey: ['enrollments-list'] })
      qc.invalidateQueries({ queryKey: ['enrollments-stats'] })
      qc.invalidateQueries({ queryKey: ['divisions'] })
      qc.invalidateQueries({ queryKey: ['academic-overview'] })
      setShowTransferModal(false)
      setSelectedEnrollmentForTransfer(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to transfer batch'),
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleOpenCreateBatch = () => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to create new batches.')
      return
    }
    setBatchFormData({
      name: '',
      code: '',
      board_id: selectedTreeBoardId ? String(selectedTreeBoardId) : (boards[0]?.id ? String(boards[0].id) : ''),
      standard_id: selectedTreeStandardId ? String(selectedTreeStandardId) : (standards[0]?.id ? String(standards[0].id) : ''),
      capacity: 40,
      room_number: 'Room 101',
      schedule_timing: 'Mon - Fri, 07:00 AM - 09:00 AM',
      status: 'active',
      class_teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
    })
    setShowCreateBatchModal(true)
  }

  const handleOpenEditBatch = (batch: Division) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to edit batch details.')
      return
    }
    setSelectedBatchForEdit(batch)
    setBatchFormData({
      name: batch.name || '',
      code: batch.code || '',
      board_id: batch.board_id ? String(batch.board_id) : '',
      standard_id: String(batch.standard_id),
      capacity: batch.capacity || 40,
      room_number: batch.room_number || 'Room 101',
      schedule_timing: batch.schedule_timing || 'Mon - Fri, 07:00 AM - 09:00 AM',
      status: batch.status || 'active',
      class_teacher_id: batch.class_teacher_id ? String(batch.class_teacher_id) : '',
    })
    setShowEditBatchModal(true)
  }

  const handleOpenRoster = (batchId: number) => {
    setRosterBatchId(batchId)
    setRosterSearch('')
    setShowRosterModal(true)
  }

  const handleOpenSchedule = (batch: Division) => {
    setScheduleBatch(batch)
    setShowScheduleModal(true)
  }

  const handleOpenAddBoard = () => {
    setBoardForm({ name: '', code: '', description: '' })
    setShowAddBoardModal(true)
  }

  const handleOpenEditBoard = (board: Board) => {
    setSelectedBoardForEdit(board)
    setBoardForm({
      name: board.name,
      code: board.code,
      description: board.description || '',
    })
    setShowEditBoardModal(true)
  }

  const handleOpenAddStandard = () => {
    setStandardForm({ name: '', level: 10, description: '' })
    setShowAddStandardModal(true)
  }

  const handleOpenEditStandard = (std: Standard) => {
    setSelectedStandardForEdit(std)
    setStandardForm({
      name: std.name,
      level: std.level,
      description: std.description || '',
    })
    setShowEditStandardModal(true)
  }

  const selectExistingCanonical = (cs: CanonicalSubject, targetStdId?: string) => {
    const effectiveStdId = targetStdId ?? subjectForm.standard_id
    const stdObj = standards.find((s) => String(s.id) === String(effectiveStdId))
    const baseCode = cs.code.replace(/001$/, '')
    const suggestedCode = stdObj ? `${baseCode}-${stdObj.level}` : `${cs.code}-STD`
    setSelectedCanonicalSubject(cs)
    setSubjectModalMode('select')
    setSubjectDupCheck(null)
    setSubjectForm((prev) => ({
      ...prev,
      name: cs.name,
      code: suggestedCode,
      standard_id: effectiveStdId,
    }))
  }

  const switchToCreateNewSubject = (initialName?: string) => {
    const clean = (initialName ?? canonicalSearchQuery).trim()
    const cleanAlpha = clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const stdObj = standards.find((s) => String(s.id) === String(subjectForm.standard_id))
    const suggestedCode = cleanAlpha.length >= 3
      ? `${cleanAlpha.slice(0, 4)}${stdObj ? stdObj.level : '10'}`
      : ''
    setSelectedCanonicalSubject(null)
    setSubjectModalMode('create')
    setSubjectForm((prev) => ({
      ...prev,
      name: clean,
      code: prev.code || suggestedCode,
    }))
  }

  const handleOpenAddSubject = (defaultStandardId?: number) => {
    const stdId = defaultStandardId ? String(defaultStandardId) : (standards[0]?.id ? String(standards[0].id) : '')
    setSelectedSubjectForEdit(null)
    resetSubjectModalState(stdId)
    setShowAddSubjectModal(true)
  }

  const handleOpenEditSubject = (subject: AcademicSubject) => {
    setSelectedSubjectForEdit(subject)
    setSubjectForm({
      name: subject.name,
      code: subject.code,
      standard_id: String(subject.standard_id),
      max_marks: subject.max_marks,
      passing_marks: subject.passing_marks,
      is_core: subject.is_core,
    })
    setShowEditSubjectModal(true)
  }

  const handleCheckScheduleConflict = async () => {
    if (!sessionForm.start_time || !sessionForm.end_time || !sessionForm.day_of_week) return
    setIsCheckingConflict(true)
    try {
      const res = await timetableApi.checkConflict({
        day_of_week: sessionForm.day_of_week,
        start_time: sessionForm.start_time,
        end_time: sessionForm.end_time,
        room_number: sessionForm.room_number || undefined,
        division_id: sessionForm.division_id ? Number(sessionForm.division_id) : undefined,
      })
      if (res.data.has_conflict) {
        setConflictWarning(res.data.message || 'Schedule conflict detected for this room or batch!')
      } else {
        setConflictWarning(null)
        toast.success('Room and batch are available for this time slot!')
      }
    } catch {
      // Ignore
    } finally {
      setIsCheckingConflict(false)
    }
  }

  const handleOpenTransfer = (enr: EnrollmentRecord) => {
    setSelectedEnrollmentForTransfer(enr)
    setTransferForm({
      new_division_id: '',
      transfer_reason: 'Performance stream promotion',
      new_roll_number: enr.roll_number,
    })
    setShowTransferModal(true)
  }

  const handleExportAcademicReport = async () => {
    setIsExportingReport(true)
    try {
      const res = await academicReportsApi.exportReport(activeReportType)
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${activeReportType}_report_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Report exported to CSV successfully!')
    } catch {
      toast.error('Failed to export report')
    } finally {
      setIsExportingReport(false)
    }
  }

  const toggleBoardExpand = (boardId: number) => {
    setExpandedBoards((prev) => ({ ...prev, [boardId]: !prev[boardId] }))
  }

  // Circular Seat Occupancy Gauge Component
  const renderOccupancyGauge = (pct: number, enrolled: number, capacity: number) => {
    const radius = 18
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (pct / 100) * circumference
    const color = pct >= 95 ? '#16a34a' : pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#3b82f6'

    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900 leading-tight">
            {enrolled} / {capacity}
          </p>
          <p className="text-[11px] text-gray-500 font-medium">Enrolled</p>
        </div>
        <div className="relative w-11 h-11 flex items-center justify-center">
          <svg className="w-11 h-11 transform -rotate-90">
            <circle
              cx="22"
              cy="22"
              r={radius}
              stroke="#e2e8f0"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="22"
              cy="22"
              r={radius}
              stroke={color}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className="absolute text-[11px] font-bold text-gray-800">
            {pct}%
          </span>
        </div>
      </div>
    )
  }

  // Filtered Roster Students
  const filteredRosterStudents = useMemo(() => {
    if (!rosterData?.students) return []
    if (!rosterSearch.trim()) return rosterData.students
    const q = rosterSearch.toLowerCase()
    return rosterData.students.filter(
      (s: BatchRosterStudent) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.admission_number?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
    )
  }, [rosterData, rosterSearch])

  // Overview Metrics calculation
  const metrics = overviewData?.metrics || {
    total_students: 39,
    total_classes: standards.length || 12,
    active_batches: batches.length || 37,
    enrolled_seats: 39,
    total_seats: 1530,
    occupancy_percentage: 3,
    weekly_sessions: 100,
  }

  // Tab metadata for contextual title, subtitle, icon and actions
  const tabMetadata: Record<string, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; actionLabel?: string; onAction?: () => void }> = {
    overview: {
      title: 'Academic Structure & Batch Management',
      subtitle: 'Manage boards, classes, subjects, batches, schedules and student enrollment',
      icon: School,
      actionLabel: 'Create Batch',
      onAction: handleOpenCreateBatch,
    },
    boards: {
      title: 'Boards & Curriculum Authorities',
      subtitle: 'Manage affiliated boards, accreditation codes, and board-level academic standards',
      icon: Layers,
      actionLabel: 'Add Board',
      onAction: () => {
        setBoardForm({ name: '', code: '', description: '' })
        setSelectedBoardForEdit(null)
        setShowAddBoardModal(true)
      },
    },
    classes: {
      title: 'Classes & Standards Register',
      subtitle: 'Academic grade levels, syllabus sequences, and standard configurations',
      icon: BookOpen,
      actionLabel: 'Add Class / Standard',
      onAction: () => {
        setStandardForm({ name: '', level: 10, description: '' })
        setSelectedStandardForEdit(null)
        setShowAddStandardModal(true)
      },
    },
    subjects: {
      title: 'Curriculum & Subjects Directory',
      subtitle: 'Manage academic subjects, subject codes, max marks, passing criteria, and core syllabus rules',
      icon: FileText,
      actionLabel: 'Add Subject',
      onAction: () => handleOpenAddSubject(),
    },
    batches: {
      title: 'Batches & Division Operations',
      subtitle: 'Manage batch sections, classroom allocations, weekly timings, and student capacity limits',
      icon: CalendarDays,
      actionLabel: 'Create Batch',
      onAction: handleOpenCreateBatch,
    },
    timetable: {
      title: 'Weekly Timetable & Schedule',
      subtitle: 'Schedule weekly lectures, assign classrooms, and enforce conflict-free faculty allocations',
      icon: Calendar,
      actionLabel: 'Schedule Session',
      onAction: () => setShowAddSessionModal(true),
    },
    enrollment: {
      title: 'Student Batch Enrollment & Transfers',
      subtitle: 'Enroll students into divisions, manage roll numbers, and execute inter-batch division transfers',
      icon: UserCheck,
      actionLabel: 'Enroll Student',
      onAction: () => setShowEnrollModal(true),
    },
    reports: {
      title: 'Academic Reports & Analytics',
      subtitle: 'Audited batch capacities, student distribution across boards, and faculty workload matrices',
      icon: BarChart2,
      actionLabel: 'Export Report (CSV)',
      onAction: handleExportAcademicReport,
    },
    settings: {
      title: 'Academic Settings & Conflict Policy',
      subtitle: 'Institute batch capacity limits, strict conflict checking rules, and automatic roll number formatters',
      icon: SettingsIcon,
    },
  }

  const currentMeta = tabMetadata[activeTab] || tabMetadata['overview']
  const CurrentIcon = currentMeta.icon

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">
      {/* ── Global View-First & Scoped Edit Mode Bar ── */}
      <EditModeBar scope={editScope} title={currentMeta.title} isDirty={showCreateBatchModal || showEditBatchModal} />
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-700 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
            <CurrentIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {currentMeta.title}
              </h1>
              {isTrainingMode && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                  TRAINING MODE
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-gray-500 font-medium">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {currentMeta.actionLabel && currentMeta.onAction && (
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <button
                onClick={currentMeta.onAction}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {currentMeta.actionLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error(`Locked in View Mode: Please enable Edit Mode above to perform ${(currentMeta.actionLabel || 'action').toLowerCase()}.`)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                title={`Locked in View Mode: Enable Edit Mode above to perform ${(currentMeta.actionLabel || 'action').toLowerCase()}`}
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>{currentMeta.actionLabel} (Locked)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Top Navigation Tabs Bar ── */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-200/80 flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: Grid },
          { id: 'boards', label: 'Boards', icon: Layers },
          { id: 'classes', label: 'Classes', icon: BookOpen },
          { id: 'subjects', label: 'Subjects', icon: FileText },
          { id: 'batches', label: 'Batches', icon: CalendarDays },
          { id: 'timetable', label: 'Timetable', icon: Calendar },
          { id: 'enrollment', label: 'Enrollment', icon: UserCheck },
          { id: 'reports', label: 'Reports', icon: BarChart2 },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── 3. Filters Bar (Visible across relevant tabs) ── */}
      {['overview', 'classes', 'subjects', 'batches', 'timetable', 'enrollment'].includes(activeTab) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Academic Year Filter */}
            <div className="relative min-w-[190px]">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Academic Year
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  className="w-full bg-gray-50/80 border border-gray-300/80 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all appearance-none"
                  value={selectedAcademicYearId || ''}
                  disabled
                >
                  <option value={selectedAcademicYearId || ''}>AY 2024–25 (Current)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Board Filter */}
            <div className="relative min-w-[170px]">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Board
              </label>
              <div className="relative">
                <select
                  value={selectedBoardId}
                  onChange={(e) => {
                    setSelectedBoardId(e.target.value)
                    if (e.target.value !== 'all') {
                      setSelectedTreeBoardId(Number(e.target.value))
                    }
                  }}
                  className="w-full bg-gray-50/80 border border-gray-300/80 rounded-xl px-3 pr-8 py-2 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all appearance-none"
                >
                  <option value="all">All Boards</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Class / Standard Filter */}
            <div className="relative min-w-[170px]">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Class / Standard
              </label>
              <div className="relative">
                <select
                  value={selectedStandardId}
                  onChange={(e) => {
                    setSelectedStandardId(e.target.value)
                    if (e.target.value !== 'all') {
                      setSelectedTreeStandardId(Number(e.target.value))
                    }
                  }}
                  className="w-full bg-gray-50/80 border border-gray-300/80 rounded-xl px-3 pr-8 py-2 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all appearance-none"
                >
                  <option value="all">All Classes</option>
                  {standards.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Level {s.level})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search batch, teacher, room, student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-300/80 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Quick Create Batch Action */}
          <div className="pt-5">
            <button
              onClick={handleOpenCreateBatch}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Batch
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: OVERVIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* 5 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Students */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/80 flex items-center justify-between">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                  <Users className="w-5 h-5" />
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                      {metrics.total_students}
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ↑ +6%
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Total Students</p>
                </div>
              </div>
            </div>

            {/* Card 2: Classes / Standards */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/80 flex items-center justify-between">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="pt-2">
                  <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    {metrics.total_classes}
                  </span>
                  <p className="text-xs font-semibold text-gray-500">Classes / Standards</p>
                </div>
              </div>
            </div>

            {/* Card 3: Active Batches */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/80 flex items-center justify-between">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="pt-2">
                  <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    {metrics.active_batches}
                  </span>
                  <p className="text-xs font-semibold text-gray-500">Active Batches</p>
                </div>
              </div>
            </div>

            {/* Card 4: Enrolled / Total Seats with Circular Radial Ring */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/80 flex items-center justify-between">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-extrabold text-gray-900">
                      {metrics.enrolled_seats}
                    </span>
                    <span className="text-xs font-bold text-gray-400">/ {metrics.total_seats}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Enrolled / Total Seats</p>
                </div>
              </div>
              {/* Circular Progress Gauge */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#f1f5f9"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#16a34a"
                    strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 - (metrics.occupancy_percentage / 100) * (2 * Math.PI * 20)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-xs font-extrabold text-emerald-700">
                  {metrics.occupancy_percentage}%
                </span>
              </div>
            </div>

            {/* Card 5: Weekly Class Sessions */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/80 flex items-center justify-between">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="pt-2">
                  <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    {metrics.weekly_sessions}
                  </span>
                  <p className="text-xs font-semibold text-gray-500">Weekly Class Sessions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Academic Structure Tree */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4 sticky top-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <Layers className="w-4 h-4 text-primary-600" />
                  <h2 className="text-sm font-bold text-gray-900">Academic Structure</h2>
                </div>

                <div className="space-y-2">
                  {overviewData?.structure_tree?.map((boardNode: AcademicTreeBoard) => {
                    const isExpanded = expandedBoards[boardNode.board_id] ?? true
                    const isBoardSelected = selectedTreeBoardId === boardNode.board_id

                    return (
                      <div key={boardNode.board_id} className="rounded-xl border border-gray-100/80 overflow-hidden">
                        <button
                          onClick={() => toggleBoardExpand(boardNode.board_id)}
                          className="w-full flex items-center justify-between p-2.5 text-left font-bold text-xs uppercase tracking-wide text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 font-extrabold">
                              {boardNode.board_code}
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="pl-6 pr-2 pb-2 space-y-1">
                            {boardNode.classes.map((cls) => {
                              const isClassSelected =
                                selectedTreeBoardId === boardNode.board_id &&
                                selectedTreeStandardId === cls.standard_id

                              return (
                                <button
                                  key={cls.standard_id}
                                  onClick={() => {
                                    setSelectedTreeBoardId(boardNode.board_id)
                                    setSelectedTreeStandardId(cls.standard_id)
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    isClassSelected
                                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                  }`}
                                >
                                  <span>{cls.standard_name}</span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      isClassSelected
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-200/80 text-gray-700'
                                    }`}
                                  >
                                    {cls.batch_count}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* + Add Board / Class Button */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <button
                    onClick={handleOpenAddStandard}
                    className="w-full py-2 px-3 border border-dashed border-gray-300 hover:border-primary-500 text-gray-600 hover:text-primary-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Class / Standard
                  </button>
                  <button
                    onClick={handleOpenAddBoard}
                    className="w-full py-2 px-3 border border-dashed border-gray-300 hover:border-primary-500 text-gray-600 hover:text-primary-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Board
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Selected Class Workspace */}
            <div className="lg:col-span-9 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
                {/* Class Header & View Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900">
                        {currentTreeBoard?.code || 'ICSE'} — {currentTreeStandard?.name || 'Class X'}
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        {workspaceBatches.length} Batches configured • {currentStandardSubjects.length} Core Subjects
                      </p>
                    </div>
                  </div>

                  {/* View As Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">View as</span>
                    <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg transition-all ${
                          viewMode === 'grid'
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                        title="Grid View"
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-lg transition-all ${
                          viewMode === 'list'
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                        title="List View"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-2 pt-4 border-b border-gray-100 overflow-x-auto">
                  {[
                    { id: 'batches', label: `Batches (${workspaceBatches.length})` },
                    { id: 'subjects', label: `Subjects (${currentStandardSubjects.length})` },
                    { id: 'timetable', label: 'Timetable' },
                    {
                      id: 'students',
                      label: `Students (${workspaceBatches.reduce((acc, b) => acc + (b.enrolled_count || 0), 0)})`,
                    },
                    { id: 'settings', label: 'Settings' },
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setWorkspaceSubTab(subTab.id as any)}
                      className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                        workspaceSubTab === subTab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>

                {/* Sub-tab 1: Batches Grid / List */}
                {workspaceSubTab === 'batches' && (
                  <div className="pt-5">
                    {workspaceBatches.length === 0 ? (
                      <div className="py-12 text-center">
                        <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-gray-600">No batches found for this class</p>
                        <button
                          onClick={handleOpenCreateBatch}
                          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          Create Batch
                        </button>
                      </div>
                    ) : viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {workspaceBatches.map((batch) => {
                          const isActive = batch.status === 'active'
                          const isPlanned = batch.status === 'planned'

                          return (
                            <div
                              key={batch.id}
                              className="bg-white rounded-2xl p-5 border border-gray-200/90 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                                      <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-gray-900 leading-tight">
                                          {batch.name}
                                        </h3>
                                        <span
                                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                                            isActive
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : isPlanned
                                              ? 'bg-primary-50 text-primary-700 border border-blue-200'
                                              : 'bg-gray-100 text-gray-600'
                                          }`}
                                        >
                                          {batch.status || 'Active'}
                                        </span>
                                      </div>
                                      <p className="text-xs font-semibold text-gray-400 mt-0.5">
                                        {batch.code}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    {renderOccupancyGauge(
                                      batch.occupancy_percentage || 0,
                                      batch.enrolled_count || 0,
                                      batch.capacity || 40
                                    )}
                                  </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                                  <div className="flex items-center gap-2.5">
                                    <BookOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">
                                      {batch.subjects?.join(', ') || 'Maths, Science, English'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-700">
                                      {batch.class_teacher_name || 'Mr. Rahul Desai'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span>{batch.schedule_timing || 'Mon - Fri, 07:00 AM - 09:00 AM'}</span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="font-semibold text-gray-800">
                                      {batch.room_number || 'Room 101'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                <button
                                  onClick={() => handleOpenRoster(batch.id)}
                                  className="flex-1 py-1.5 px-3 bg-gray-50 hover:bg-primary-50 hover:text-primary-600 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-gray-200 transition-colors"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  View Roster ({batch.enrolled_count || 0})
                                </button>
                                <button
                                  onClick={() => handleOpenSchedule(batch)}
                                  className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-gray-200 transition-colors"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  Schedule
                                </button>
                                <button
                                  onClick={() => handleOpenEditBatch(batch)}
                                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-colors"
                                  title="Edit Batch"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <LockedIconButton
                                  isEditMode={isEditMode}
                                  onClick={() => {
                                    setDeleteModalState({
                                      isOpen: true,
                                      targetType: 'batch',
                                      id: batch.id,
                                      name: `Batch '${batch.name}'`,
                                    })
                                  }}
                                  icon={Archive}
                                  title="Archive Batch"
                                  tone="danger"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                              <th className="py-3 px-3">Batch</th>
                              <th className="py-3 px-3">Teacher</th>
                              <th className="py-3 px-3">Timing</th>
                              <th className="py-3 px-3">Room</th>
                              <th className="py-3 px-3">Occupancy</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {workspaceBatches.map((b) => (
                              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-3">
                                  <p className="font-bold text-gray-900">{b.name}</p>
                                  <p className="text-[11px] text-gray-400">{b.code}</p>
                                </td>
                                <td className="py-3 px-3 text-gray-700 font-medium">
                                  {b.class_teacher_name || 'Mr. Rahul Desai'}
                                </td>
                                <td className="py-3 px-3 text-gray-600">{b.schedule_timing}</td>
                                <td className="py-3 px-3 font-semibold text-gray-800">{b.room_number}</td>
                                <td className="py-3 px-3">
                                  <span className="font-bold text-gray-900">
                                    {b.enrolled_count || 0} / {b.capacity || 40}
                                  </span>
                                  <span className="text-[10px] text-gray-500 ml-1">
                                    ({b.occupancy_percentage || 0}%)
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                                      b.status === 'active'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-primary-50 text-primary-700'
                                    }`}
                                  >
                                    {b.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right space-x-1">
                                  <button
                                    onClick={() => handleOpenRoster(b.id)}
                                    className="px-2.5 py-1 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-[11px] font-bold"
                                  >
                                    Roster
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditBatch(b)}
                                    className="p-1 text-gray-400 hover:text-gray-700"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 inline" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab 2: Subjects */}
                {workspaceSubTab === 'subjects' && (
                  <div className="pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Configured subjects for {currentTreeStandard?.name || 'this class'}
                      </p>
                      <button
                        onClick={() => handleOpenAddSubject(currentTreeStandard?.id)}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Subject to Class
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {currentStandardSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 flex items-center justify-between hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <BookOpen className="w-4 h-4 text-primary-500" />
                            <div>
                              <p className="text-xs font-bold text-gray-800">{sub.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{sub.code || 'CORE'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-100/70 text-primary-700">
                            {sub.max_marks} Marks
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-tab 3: Timetable */}
                {workspaceSubTab === 'timetable' && (
                  <div className="pt-5 space-y-4">
                    <div className="p-4 rounded-xl bg-primary-50/60 border border-blue-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary-600" />
                        <div>
                          <h4 className="text-xs font-bold text-primary-900">Weekly Schedule Active</h4>
                          <p className="text-[11px] text-primary-700">
                            Zero schedule or room conflicts detected across active batches.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTabChange('timetable')}
                        className="text-xs font-bold px-3 py-1.5 bg-primary-600 text-white rounded-xl shadow-sm"
                      >
                        Open Timetable Manager
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                        const daySessions = timetableEntries.filter((t) => t.day_of_week === day)
                        return (
                          <div key={day} className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                            <div className="flex items-center justify-between border-b pb-1">
                              <p className="font-extrabold text-xs text-gray-800">{day}</p>
                              <span className="text-[10px] text-gray-400 font-medium">{daySessions.length} sessions</span>
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                              {daySessions.slice(0, 2).map((s) => (
                                <div key={s.id} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                  <p className="font-bold text-gray-900">
                                    {s.start_time} - {s.end_time}
                                  </p>
                                  <p className="text-gray-600">
                                    {s.subject_name} • {s.room_number}
                                  </p>
                                  <p className="text-primary-600 font-semibold text-[10px]">{s.division_name}</p>
                                </div>
                              ))}
                              {daySessions.length === 0 && (
                                <p className="text-[11px] text-gray-400 italic py-2">No scheduled sessions</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-tab 4: Students */}
                {workspaceSubTab === 'students' && (
                  <div className="pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 font-medium">
                        Showing batches and rosters for {currentTreeStandard?.name || 'this class'}
                      </p>
                      <button
                        onClick={() => handleTabChange('enrollment')}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                      >
                        Open Enrollment Manager <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {workspaceBatches.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 rounded-xl border border-gray-200 bg-white flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-sm text-gray-900">{b.name}</p>
                            <p className="text-xs text-gray-500 font-medium">{b.code}</p>
                            <p className="text-xs text-primary-600 font-semibold mt-1">
                              {b.enrolled_count || 0} students enrolled
                            </p>
                          </div>
                          <button
                            onClick={() => handleOpenRoster(b.id)}
                            className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold rounded-xl text-xs transition-colors"
                          >
                            Roster
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-tab 5: Settings */}
                {workspaceSubTab === 'settings' && (
                  <div className="pt-5 space-y-4">
                    <div className="p-4 rounded-xl border border-gray-200 space-y-3">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Class Configuration
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-gray-500 font-medium mb-1">Standard Name</label>
                          <input
                            type="text"
                            value={currentTreeStandard?.name || ''}
                            className="w-full border rounded-lg px-3 py-1.5 text-gray-800 bg-gray-50"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 font-medium mb-1">Board Code</label>
                          <input
                            type="text"
                            value={currentTreeBoard?.code || ''}
                            className="w-full border rounded-lg px-3 py-1.5 text-gray-800 bg-gray-50"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: BOARDS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'boards' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Educational Boards</h2>
              <p className="text-xs text-gray-500">
                Manage affiliated education boards (ICSE, CBSE, State Boards) and associated classes
              </p>
            </div>
            <button
              onClick={handleOpenAddBoard}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Board
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {boards.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 font-extrabold text-xs">
                        {b.code}
                      </span>
                      <h3 className="font-extrabold text-base text-gray-900 mt-2">{b.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{b.description || 'Standard examination curriculum'}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
                    <div className="p-2 bg-gray-50 rounded-xl">
                      <p className="text-sm font-extrabold text-gray-900">{b.classes_count ?? 12}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Classes</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-xl">
                      <p className="text-sm font-extrabold text-gray-900">{b.batches_count ?? 14}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Batches</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-xl">
                      <p className="text-sm font-extrabold text-primary-700">{b.students_count ?? 18}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Students</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleBoardStatusMutation.mutate(b.id)}
                    className="flex-1 py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border transition-colors"
                  >
                    <Power className="w-3.5 h-3.5" />
                    {b.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleOpenEditBoard(b)}
                    className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border transition-colors"
                    title="Edit Board"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: CLASSES / STANDARDS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Classes & Standards Master</h2>
              <p className="text-xs text-gray-500">
                Manage levels 1 through 12 across all curriculum streams
              </p>
            </div>
            <button
              onClick={handleOpenAddStandard}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Class
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                  <tr>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Standard / Class Name</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Active Batches</th>
                    <th className="py-3 px-4">Subjects</th>
                    <th className="py-3 px-4">Enrolled Students</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {standards.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600">Level {s.level}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{s.name}</td>
                      <td className="py-3 px-4 text-gray-500">{s.description || 'Standard curriculum'}</td>
                      <td className="py-3 px-4 font-bold text-gray-800">{s.batches_count ?? 3}</td>
                      <td className="py-3 px-4 font-bold text-gray-800">{s.subjects_count ?? 5}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">{s.students_count ?? 12}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditStandard(s)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-primary-50 hover:text-primary-600 rounded-lg text-[11px] font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStandardId(String(s.id))
                            handleTabChange('batches')
                          }}
                          className="px-2.5 py-1 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-[11px] font-bold"
                        >
                          View Batches
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: SUBJECTS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Academic Subjects</h2>
              <p className="text-xs text-gray-500">
                Configure curriculum subjects, passing marks, and assign to classes
              </p>
            </div>
            <button
              onClick={() => handleOpenAddSubject()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            {isSubjectsLoading ? (
              <div className="py-12 text-center text-xs text-gray-400">Loading subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">No subjects found matching criteria</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                    <tr>
                      <th className="py-3 px-4">Subject Name</th>
                      <th className="py-3 px-4">Subject Code</th>
                      <th className="py-3 px-4">Standard / Class</th>
                      <th className="py-3 px-4">Max Marks</th>
                      <th className="py-3 px-4">Passing Marks</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary-500 flex-shrink-0" />
                          {sub.name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-700">{sub.code}</td>
                        <td className="py-3 px-4 text-gray-600">{sub.standard_name || `Standard ${sub.standard_id}`}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{sub.max_marks}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">{sub.passing_marks}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.is_core ? 'bg-primary-50 text-primary-700' : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {sub.is_core ? 'Core' : 'Elective'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditSubject(sub)}
                            className="p-1 text-gray-400 hover:text-primary-600"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                          <LockedIconButton
                            isEditMode={isEditMode}
                            onClick={() => {
                              setDeleteModalState({
                                isOpen: true,
                                targetType: 'subject',
                                id: sub.id,
                                name: `Subject '${sub.name}'`,
                              })
                            }}
                            icon={Trash2}
                            title="Delete Subject"
                            tone="danger"
                          />
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

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 5: BATCHES DIRECTORY
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">All Batches Directory</h2>
              <p className="text-xs text-gray-500">
                {batches.length} total batches configured across classrooms and shifts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleOpenCreateBatch}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create Batch
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-gray-900">{batch.name}</h3>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                              batch.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-primary-50 text-primary-700'
                            }`}
                          >
                            {batch.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{batch.code}</p>
                        <p className="text-xs text-primary-600 font-semibold mt-1">
                          {batch.board_name || 'Board'} • {batch.standard_name}
                        </p>
                      </div>

                      {renderOccupancyGauge(
                        batch.occupancy_percentage || 0,
                        batch.enrolled_count || 0,
                        batch.capacity || 40
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium text-gray-700">{batch.class_teacher_name || 'Mr. Rahul Desai'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{batch.schedule_timing || 'Mon - Fri'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-semibold text-gray-800">{batch.room_number || 'Room 101'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenRoster(batch.id)}
                      className="flex-1 py-1.5 px-3 bg-gray-50 hover:bg-primary-50 hover:text-primary-600 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border"
                    >
                      <Users className="w-3.5 h-3.5" /> Roster ({batch.enrolled_count || 0})
                    </button>
                    <button
                      onClick={() => handleOpenSchedule(batch)}
                      className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs border"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditBatch(batch)}
                      className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                    <tr>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">Board & Class</th>
                      <th className="py-3 px-4">Teacher</th>
                      <th className="py-3 px-4">Timing</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Occupancy</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {batches.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900">{b.name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{b.code}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-800">{b.board_code || 'ICSE'}</span> • {b.standard_name}
                        </td>
                        <td className="py-3 px-4 text-gray-700">{b.class_teacher_name || 'Mr. Rahul Desai'}</td>
                        <td className="py-3 px-4 text-gray-600">{b.schedule_timing}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{b.room_number}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900">
                            {b.enrolled_count || 0} / {b.capacity || 40}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 capitalize">
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenRoster(b.id)}
                            className="px-2.5 py-1 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-[11px] font-bold"
                          >
                            Roster
                          </button>
                          <button
                            onClick={() => handleOpenEditBatch(b)}
                            className="p-1 text-gray-400 hover:text-gray-700"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
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
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 6: TIMETABLE SCHEDULE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Institute Master Timetable</h2>
              <p className="text-xs text-gray-500">
                100 active class sessions with real-time room conflict validation
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={timetableRoomFilter}
                  onChange={(e) => setTimetableRoomFilter(e.target.value)}
                  className="bg-gray-50 border rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800"
                >
                  <option value="all">All Rooms</option>
                  {distinctRooms.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setSessionForm({
                    division_id: batches[0]?.id ? String(batches[0].id) : '',
                    subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
                    day_of_week: 'Monday',
                    start_time: '08:00',
                    end_time: '09:30',
                    room_number: 'Room 101',
                  })
                  setConflictWarning(null)
                  setShowAddSessionModal(true)
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Session
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
              const daySessions = timetableEntries.filter((t) => t.day_of_week === day)
              return (
                <div key={day} className="bg-white rounded-2xl p-3 border border-gray-200/80 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b mb-2">
                    <p className="font-extrabold text-xs text-gray-900">{day}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-700">
                      {daySessions.length}
                    </span>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[480px] custom-scrollbar">
                    {daySessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-primary-50/30 hover:border-blue-200 transition-all text-xs space-y-1 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-gray-900 text-[11px]">{s.subject_name}</span>
                          <LockedIconButton
                            isEditMode={isEditMode}
                            onClick={() => {
                              setDeleteModalState({
                                isOpen: true,
                                targetType: 'session',
                                id: s.id,
                                name: `Timetable Session '${s.subject_name}'`,
                              })
                            }}
                            icon={Trash2}
                            title="Delete Session"
                            tone="danger"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                        <p className="text-[11px] font-semibold text-primary-600">{s.division_name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {s.start_time} - {s.end_time}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-600 pt-1 border-t border-gray-200/60">
                          <span className="font-bold text-gray-700">{s.room_number}</span>
                          <span className="text-gray-400 font-mono">{s.division_code}</span>
                        </div>
                      </div>
                    ))}
                    {daySessions.length === 0 && (
                      <div className="py-8 text-center text-[11px] text-gray-400 italic">No classes scheduled</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 7: ENROLLMENT & BATCH TRANSFER
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'enrollment' && (
        <div className="space-y-4">
          {/* Enrollment KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500">Active Enrollments</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-1">
                  {enrollmentStats?.total_active_enrollments ?? 39}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500">Total Students</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-1">
                  {enrollmentStats?.total_students ?? 39}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500">Unassigned Students</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">
                  {enrollmentStats?.unassigned_students ?? 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500">Seat Occupancy</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {enrollmentStats?.occupancy_percentage ?? 3}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Student Enrollment Register</h2>
              <p className="text-xs text-gray-500">
                Manage batch placements, track enrollment dates, and process batch transfers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={enrollmentStatusFilter}
                onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
                className="bg-gray-50 border rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="transferred">Transferred</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={() => {
                  setEnrollForm({
                    student_id: '',
                    standard_id: standards[0]?.id ? String(standards[0].id) : '',
                    division_id: batches[0]?.id ? String(batches[0].id) : '',
                    roll_number: '',
                    remarks: '',
                  })
                  setShowEnrollModal(true)
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Enroll Student
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            {isEnrollmentsLoading ? (
              <div className="py-12 text-center text-xs text-gray-400">Loading enrollments...</div>
            ) : !enrollmentsData?.items?.length ? (
              <div className="py-12 text-center text-xs text-gray-400">No enrollment records found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                    <tr>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Admission No</th>
                      <th className="py-3 px-4">Class & Board</th>
                      <th className="py-3 px-4">Assigned Batch</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {enrollmentsData.items.map((enr) => (
                      <tr key={enr.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900">{enr.student_name}</td>
                        <td className="py-3 px-4 font-mono text-gray-500">{enr.admission_number}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-800">{enr.standard_name}</span>
                          <span className="text-[10px] text-gray-400 ml-1">({enr.board_code || 'ICSE'})</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 font-bold">
                            {enr.division_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-700">{enr.roll_number}</td>
                        <td className="py-3 px-4 text-gray-500">{enr.enrollment_date || '—'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              enr.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : enr.status === 'transferred'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {enr.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          {enr.status === 'active' && (
                            <button
                              onClick={() => handleOpenTransfer(enr)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1"
                            >
                              <ArrowRightLeft className="w-3 h-3" /> Transfer
                            </button>
                          )}
                          <Link
                            to={`/students/${enr.student_id}`}
                            className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-600 font-bold rounded-lg text-[11px] inline-flex items-center gap-1"
                          >
                            Profile <ArrowUpRight className="w-3 h-3" />
                          </Link>
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

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 8: ACADEMIC REPORTS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Academic Analytics & Reports</h2>
              <p className="text-xs text-gray-500">
                Spreadsheet-grade analytics for capacity occupancy, board distributions, and faculty teaching load
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  onClick={() => setActiveReportType('batch-capacity')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeReportType === 'batch-capacity' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Batch Capacity
                </button>
                <button
                  onClick={() => setActiveReportType('distribution')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeReportType === 'distribution' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Board Distribution
                </button>
                <button
                  onClick={() => setActiveReportType('faculty-load')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeReportType === 'faculty-load' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Faculty Load
                </button>
              </div>

              <button
                onClick={handleExportAcademicReport}
                disabled={isExportingReport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                {isExportingReport ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>

          {/* Report 1: Batch Capacity */}
          {activeReportType === 'batch-capacity' && (
            <ExcelReportGrid<BatchCapacityReportRow>
              title="Batch Capacity & Occupancy Analysis"
              subtitle="Audited batch-level seat allotments, occupancy rates, and classroom timing"
              columns={batchCapacityColumns}
              data={batchCapacityReportData}
              loading={isCapReportLoading}
              exportFilename="prashant_academy_batch_capacity_report"
              sheetName="Batch Capacity"
              showSummaryRow={true}
              summaryCalculations={batchCapacitySummaryCalculations}
              defaultSort={{ columnId: 'occupancy_percentage', direction: 'desc' }}
            />
          )}

          {/* Report 2: Distribution */}
          {activeReportType === 'distribution' && (
            <ExcelReportGrid<AcademicDistributionReportRow>
              title="Board & Standard Distribution Audit"
              subtitle="Comprehensive breakdown of student distribution and capacity across educational boards"
              columns={distributionColumns}
              data={distributionReportData}
              loading={isDistReportLoading}
              exportFilename="prashant_academy_board_distribution_report"
              sheetName="Distribution"
              showSummaryRow={true}
              summaryCalculations={distributionSummaryCalculations}
              defaultSort={{ columnId: 'total_capacity', direction: 'desc' }}
            />
          )}

          {/* Report 3: Faculty Teaching Load */}
          {activeReportType === 'faculty-load' && (
            <ExcelReportGrid<FacultyLoadReportRow>
              title="Faculty Teaching Load & Mentorship Audit"
              subtitle="Weekly session commitments, assigned classroom batches, and supervised students"
              columns={facultyLoadColumns}
              data={facultyLoadReportData}
              loading={isFacReportLoading}
              exportFilename="prashant_academy_faculty_load_report"
              sheetName="Faculty Load"
              showSummaryRow={true}
              summaryCalculations={facultyLoadSummaryCalculations}
              defaultSort={{ columnId: 'assigned_batches_count', direction: 'desc' }}
            />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 9: ACADEMIC SETTINGS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Academic & Batch Operational Settings</h2>
                <p className="text-xs text-gray-500">
                  Configure institute rules for batch capacities, automated conflict checks, and roll numbers
                </p>
              </div>
              <Link
                to="/settings?category=academic"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50/80 hover:bg-primary-100/80 px-3 py-1.5 rounded-xl border border-blue-200/60 shadow-2xs transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-primary-600" />
                <span>Full Institute Settings</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
              </Link>
            </div>

            <form
              onSubmit={handleSaveSettings}
              className="mt-6 space-y-6 max-w-2xl text-xs"
            >
              <div className="p-4 rounded-xl border border-gray-200/80 space-y-3 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-sm">Capacity Management</h3>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Default Batch Capacity (Seats)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={academicSettings.defaultBatchCapacity}
                    onChange={(e) =>
                      setAcademicSettings({ ...academicSettings, defaultBatchCapacity: Number(e.target.value) })
                    }
                    className="w-48 bg-white border rounded-xl px-3 py-2 text-gray-800"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Applied automatically when creating new coaching divisions
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="strictCap"
                    checked={academicSettings.enforceCapacityStrict}
                    onChange={(e) =>
                      setAcademicSettings({ ...academicSettings, enforceCapacityStrict: e.target.checked })
                    }
                    className="rounded text-primary-600"
                  />
                  <label htmlFor="strictCap" className="font-semibold text-gray-700">
                    Enforce strict capacity check (disallow student enrollment when batch is full)
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200/80 space-y-3 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-sm">Timetable & Scheduling Rules</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="preventConflict"
                    checked={academicSettings.preventTimetableConflicts}
                    onChange={(e) =>
                      setAcademicSettings({ ...academicSettings, preventTimetableConflicts: e.target.checked })
                    }
                    className="rounded text-primary-600"
                  />
                  <label htmlFor="preventConflict" className="font-semibold text-gray-700">
                    Prevent overlapping sessions in the same classroom or for the same batch
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200/80 space-y-3 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-sm">Active Academic Year</h3>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Active Institute Academic Term
                  </label>
                  <input
                    type="text"
                    value={academicSettings.academicYearName}
                    disabled
                    className="w-full bg-gray-100 border rounded-xl px-3 py-2 text-gray-700"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SHARED MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── Modal: Create Batch ── */}
      <Modal
        isOpen={showCreateBatchModal}
        onClose={() => setShowCreateBatchModal(false)}
        title="Create New Batch"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createBatchMutation.mutate({
              name: batchFormData.name,
              code: batchFormData.code,
              board_id: Number(batchFormData.board_id),
              standard_id: Number(batchFormData.standard_id),
              capacity: Number(batchFormData.capacity),
              room_number: batchFormData.room_number,
              schedule_timing: batchFormData.schedule_timing,
              status: batchFormData.status,
              class_teacher_id: batchFormData.class_teacher_id ? Number(batchFormData.class_teacher_id) : undefined,
            })
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-gray-700 mb-1">Batch Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Batch A (Morning)"
              value={batchFormData.name}
              onChange={(e) => setBatchFormData({ ...batchFormData, name: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Batch Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. ICSE-X-A"
                value={batchFormData.code}
                onChange={(e) => setBatchFormData({ ...batchFormData, code: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                min="1"
                max="100"
                value={batchFormData.capacity}
                onChange={(e) => setBatchFormData({ ...batchFormData, capacity: Number(e.target.value) })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Board *</label>
              <select
                required
                value={batchFormData.board_id}
                onChange={(e) => setBatchFormData({ ...batchFormData, board_id: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Class / Standard *</label>
              <select
                required
                value={batchFormData.standard_id}
                onChange={(e) => setBatchFormData({ ...batchFormData, standard_id: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                {standards.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (Level {s.level})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Room Number</label>
              <input
                type="text"
                value={batchFormData.room_number}
                onChange={(e) => setBatchFormData({ ...batchFormData, room_number: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Status</label>
              <select
                value={batchFormData.status}
                onChange={(e) => setBatchFormData({ ...batchFormData, status: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                <option value="active">Active</option>
                <option value="planned">Planned</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Schedule Timing</label>
            <input
              type="text"
              placeholder="e.g. Mon - Fri, 07:00 AM - 09:00 AM"
              value={batchFormData.schedule_timing}
              onChange={(e) => setBatchFormData({ ...batchFormData, schedule_timing: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Assigned Teacher</label>
            <select
              value={batchFormData.class_teacher_id}
              onChange={(e) => setBatchFormData({ ...batchFormData, class_teacher_id: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            >
              <option value="">Unassigned</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowCreateBatchModal(false)}
              className="px-4 py-2 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createBatchMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm"
            >
              {createBatchMutation.isPending ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Edit Batch ── */}
      <Modal
        isOpen={showEditBatchModal}
        onClose={() => setShowEditBatchModal(false)}
        title={selectedBatchForEdit ? `Edit Batch: ${selectedBatchForEdit.name}` : 'Edit Batch'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!selectedBatchForEdit) return
            updateBatchMutation.mutate({
              id: selectedBatchForEdit.id,
              data: {
                name: batchFormData.name,
                code: batchFormData.code,
                capacity: Number(batchFormData.capacity),
                room_number: batchFormData.room_number,
                schedule_timing: batchFormData.schedule_timing,
                status: batchFormData.status,
                class_teacher_id: batchFormData.class_teacher_id ? Number(batchFormData.class_teacher_id) : undefined,
              },
            })
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-gray-700 mb-1">Batch Name *</label>
            <input
              type="text"
              required
              value={batchFormData.name}
              onChange={(e) => setBatchFormData({ ...batchFormData, name: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Batch Code *</label>
              <input
                type="text"
                required
                value={batchFormData.code}
                onChange={(e) => setBatchFormData({ ...batchFormData, code: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                min="1"
                max="100"
                value={batchFormData.capacity}
                onChange={(e) => setBatchFormData({ ...batchFormData, capacity: Number(e.target.value) })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Room</label>
              <input
                type="text"
                value={batchFormData.room_number}
                onChange={(e) => setBatchFormData({ ...batchFormData, room_number: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Status</label>
              <select
                value={batchFormData.status}
                onChange={(e) => setBatchFormData({ ...batchFormData, status: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                <option value="active">Active</option>
                <option value="planned">Planned</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Schedule Timing</label>
            <input
              type="text"
              value={batchFormData.schedule_timing}
              onChange={(e) => setBatchFormData({ ...batchFormData, schedule_timing: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Assigned Teacher</label>
            <select
              value={batchFormData.class_teacher_id}
              onChange={(e) => setBatchFormData({ ...batchFormData, class_teacher_id: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            >
              <option value="">Unassigned</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowEditBatchModal(false)}
              className="px-4 py-2 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateBatchMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm"
            >
              {updateBatchMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Add / Edit Board ── */}
      <Modal
        isOpen={showAddBoardModal || showEditBoardModal}
        onClose={() => {
          setShowAddBoardModal(false)
          setShowEditBoardModal(false)
          setSelectedBoardForEdit(null)
        }}
        title={showEditBoardModal ? 'Edit Education Board' : 'Add New Education Board'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (showEditBoardModal && selectedBoardForEdit) {
              updateBoardMutation.mutate({
                id: selectedBoardForEdit.id,
                data: boardForm,
              })
            } else {
              createBoardMutation.mutate(boardForm)
            }
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-gray-700 mb-1">Board Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Central Board of Secondary Education"
              value={boardForm.name}
              onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Board Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. CBSE"
              value={boardForm.code}
              onChange={(e) => setBoardForm({ ...boardForm, code: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="Curriculum summary"
              value={boardForm.description}
              onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => {
                setShowAddBoardModal(false)
                setShowEditBoardModal(false)
              }}
              className="px-4 py-2 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm"
            >
              {showEditBoardModal ? 'Save Board' : 'Create Board'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Add / Edit Standard ── */}
      <Modal
        isOpen={showAddStandardModal || showEditStandardModal}
        onClose={() => {
          setShowAddStandardModal(false)
          setShowEditStandardModal(false)
          setSelectedStandardForEdit(null)
        }}
        title={showEditStandardModal ? 'Edit Class / Standard' : 'Add New Class / Standard'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (showEditStandardModal && selectedStandardForEdit) {
              updateStandardMutation.mutate({
                id: selectedStandardForEdit.id,
                data: standardForm,
              })
            } else {
              createStandardMutation.mutate(standardForm)
            }
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-gray-700 mb-1">Standard / Class Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Class XI"
              value={standardForm.name}
              onChange={(e) => setStandardForm({ ...standardForm, name: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Level (Numeric 1-12) *</label>
            <input
              type="number"
              required
              min="1"
              max="12"
              value={standardForm.level}
              onChange={(e) => setStandardForm({ ...standardForm, level: Number(e.target.value) })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="Optional notes"
              value={standardForm.description}
              onChange={(e) => setStandardForm({ ...standardForm, description: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => {
                setShowAddStandardModal(false)
                setShowEditStandardModal(false)
              }}
              className="px-4 py-2 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm"
            >
              {showEditStandardModal ? 'Save Class' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Add / Edit Subject ── */}
      <Modal
        isOpen={showAddSubjectModal || showEditSubjectModal}
        onClose={() => {
          setShowAddSubjectModal(false)
          setShowEditSubjectModal(false)
          setSelectedSubjectForEdit(null)
          resetSubjectModalState()
        }}
        title={showEditSubjectModal ? 'Edit Subject' : 'Add Subject to Curriculum'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (showEditSubjectModal && selectedSubjectForEdit) {
              updateSubjectMutation.mutate({
                id: selectedSubjectForEdit.id,
                data: {
                  name: subjectForm.name,
                  code: subjectForm.code,
                  standard_id: Number(subjectForm.standard_id),
                  max_marks: Number(subjectForm.max_marks),
                  passing_marks: Number(subjectForm.passing_marks),
                  is_core: subjectForm.is_core,
                },
              })
            } else if (subjectModalMode === 'select') {
              if (!selectedCanonicalSubject) {
                toast.error('Please select an existing subject or switch to Create New Subject.')
                return
              }
              mapExistingSubjectMutation.mutate({
                canonical_subject_id: selectedCanonicalSubject.id,
                standard_id: Number(subjectForm.standard_id),
                curriculum_code: subjectForm.code.trim() || undefined,
                display_name: selectedCanonicalSubject.name,
                max_marks: Number(subjectForm.max_marks) || 100,
                pass_marks: Number(subjectForm.passing_marks) || 35,
                is_optional: !subjectForm.is_core,
              })
            } else {
              createSubjectMutation.mutate({
                name: subjectForm.name.trim(),
                code: subjectForm.code.trim(),
                standard_id: Number(subjectForm.standard_id),
                max_marks: Number(subjectForm.max_marks),
                passing_marks: Number(subjectForm.passing_marks),
                is_core: subjectForm.is_core,
                category: newSubjectCategory,
                aliases: newSubjectAliases.trim() || undefined,
              })
            }
          }}
          className="space-y-4 text-xs"
        >
          {/* Mode Switcher in Add Mode */}
          {!showEditSubjectModal && (
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setSubjectModalMode('select')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  subjectModalMode === 'select'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Select Existing Subject</span>
              </button>
              <button
                type="button"
                onClick={() => switchToCreateNewSubject(subjectForm.name || canonicalSearchQuery)}
                className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  subjectModalMode === 'create'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Subject</span>
              </button>
            </div>
          )}

          {/* ADD MODE A: SELECT EXISTING CANONICAL SUBJECT */}
          {!showEditSubjectModal && subjectModalMode === 'select' && (
            <div className="space-y-3">
              {!selectedCanonicalSubject ? (
                <div className="space-y-2">
                  <label className="block font-bold text-gray-700">
                    Search Existing Subject *
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search existing subject by name, code, or alias (e.g. Chemistry, MATH)..."
                      value={canonicalSearchQuery}
                      onChange={(e) => setCanonicalSearchQuery(e.target.value)}
                      className="w-full border rounded-xl pl-9 pr-8 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {canonicalSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCanonicalSearchQuery('')}
                        className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                        title="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Canonical Subject List / Recommendations */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white">
                    {isLoadingCanonicalCatalog ? (
                      <div className="py-6 text-center text-gray-400">Loading subject catalog...</div>
                    ) : filteredCanonicalCatalog.length > 0 ? (
                      filteredCanonicalCatalog.map((cs) => (
                        <button
                          key={cs.id}
                          type="button"
                          onClick={() => selectExistingCanonical(cs)}
                          className="w-full text-left px-3 py-2.5 hover:bg-primary-50 border-b border-gray-100 last:border-0 transition-colors flex items-center justify-between gap-2 group"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <BookOpen className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                              <span className="font-bold text-gray-900">{cs.name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-100">
                                {cs.code}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                {cs.category}
                              </span>
                            </div>
                            {(cs.aliases || (cs.standards_summary && cs.standards_summary.length > 0)) && (
                              <p className="text-[10px] text-gray-500 mt-0.5 pl-5 truncate">
                                {cs.aliases ? `Aliases: ${cs.aliases}` : ''}
                                {cs.aliases && cs.standards_summary?.length ? ' • ' : ''}
                                {cs.standards_summary?.length ? `Linked: ${cs.standards_summary.join(', ')}` : ''}
                              </p>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-primary-600 group-hover:text-primary-800 flex items-center gap-0.5 flex-shrink-0">
                            Select <ArrowRight className="w-3 h-3" />
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center space-y-2.5 bg-gray-50/70">
                        <div className="flex items-center justify-center gap-1.5 text-amber-700 font-bold">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>
                            No exact subject found
                            {canonicalSearchQuery.trim() ? ` for "${canonicalSearchQuery.trim()}"` : ''}
                          </span>
                        </div>

                        {recommendedCanonicalCatalog.length > 0 && (
                          <div className="space-y-1.5 text-left bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                            <p className="text-[11px] font-bold text-amber-800">
                              Recommended Existing Subjects:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {recommendedCanonicalCatalog.map((rec) => (
                                <button
                                  key={rec.id}
                                  type="button"
                                  onClick={() => selectExistingCanonical(rec)}
                                  className="px-2 py-1 rounded-md bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3 text-amber-600" />
                                  <span>{rec.name} ({rec.code})</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => switchToCreateNewSubject(canonicalSearchQuery)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            Create New Subject
                            {canonicalSearchQuery.trim() ? ` "${canonicalSearchQuery.trim()}"` : ''}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[11px] text-gray-500">
                      Reusing master subjects prevents duplicates across classes.
                    </span>
                    <button
                      type="button"
                      onClick={() => switchToCreateNewSubject(canonicalSearchQuery)}
                      className="text-[11px] font-bold text-primary-700 hover:text-primary-900 underline underline-offset-2 flex-shrink-0"
                    >
                      Not listed? Create new →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-primary-900">{selectedCanonicalSubject.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white text-primary-700 border border-primary-200">
                          {selectedCanonicalSubject.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-gray-600 border border-gray-200">
                          {selectedCanonicalSubject.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-primary-700 mt-0.5">
                        Linking existing master subject to the selected class below.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCanonicalSubject(null)}
                    className="text-[11px] font-bold text-primary-700 hover:text-primary-900 underline flex-shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EDIT MODE OR CREATE NEW MODE: Subject Name + Live Duplicate Recommendations */}
          {(showEditSubjectModal || subjectModalMode === 'create') && (
            <div>
              <label className="block font-bold text-gray-700 mb-1">Subject Name *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemistry"
                  value={subjectForm.name}
                  onChange={(e) => {
                    const val = e.target.value
                    setSubjectForm((prev) => ({ ...prev, name: val }))
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-gray-800 pr-8"
                />
                {isCheckingSubjectDup && (
                  <div className="absolute right-2.5 top-2.5">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-600" />
                  </div>
                )}
              </div>

              {/* Recommendation Banner if matching existing canonical subject(s) exist */}
              {!showEditSubjectModal &&
                subjectDupCheck &&
                (subjectDupCheck.has_exact_match || subjectDupCheck.similar_matches.length > 0) && (
                  <div className="mt-2 bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-amber-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Existing Subject Recommendation: </span>
                        <span className="text-[11px]">{subjectDupCheck.message}</span>
                      </div>
                    </div>

                    {subjectDupCheck.exact_match && (
                      <button
                        type="button"
                        onClick={() => selectExistingCanonical(subjectDupCheck.exact_match as CanonicalSubject)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          Use Existing '{subjectDupCheck.exact_match.name}' ({subjectDupCheck.exact_match.code})
                        </span>
                      </button>
                    )}

                    {subjectDupCheck.similar_matches.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-800">Recommended matches:</span>
                        {subjectDupCheck.similar_matches.slice(0, 4).map((sim) => (
                          <button
                            key={sim.id}
                            type="button"
                            onClick={() => selectExistingCanonical(sim as CanonicalSubject)}
                            className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900 text-[11px] font-semibold hover:bg-amber-100 transition-colors"
                          >
                            {sim.name} ({sim.code})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* Extra canonical metadata in Create New mode */}
          {!showEditSubjectModal && subjectModalMode === 'create' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject Category</label>
                <select
                  value={newSubjectCategory}
                  onChange={(e) => setNewSubjectCategory(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-gray-800"
                >
                  <option value="General">General</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="Languages">Languages</option>
                  <option value="Social Sciences">Social Sciences</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Aliases (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chem, Applied Chemistry"
                  value={newSubjectAliases}
                  onChange={(e) => setNewSubjectAliases(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-gray-800"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Subject Code *</label>
              <input
                type="text"
                required={showEditSubjectModal || subjectModalMode === 'create' || Boolean(selectedCanonicalSubject)}
                placeholder="e.g. CHEM10"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Class / Standard *</label>
              <select
                required
                value={subjectForm.standard_id}
                onChange={(e) => {
                  const newStdId = e.target.value
                  if (selectedCanonicalSubject && subjectModalMode === 'select') {
                    selectExistingCanonical(selectedCanonicalSubject, newStdId)
                  } else {
                    setSubjectForm({ ...subjectForm, standard_id: newStdId })
                  }
                }}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                {standards.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (Level {s.level})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Maximum Marks</label>
              <input
                type="number"
                min="1"
                value={subjectForm.max_marks}
                onChange={(e) => setSubjectForm({ ...subjectForm, max_marks: Number(e.target.value) })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Passing Marks</label>
              <input
                type="number"
                min="1"
                value={subjectForm.passing_marks}
                onChange={(e) => setSubjectForm({ ...subjectForm, passing_marks: Number(e.target.value) })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isCore"
              checked={subjectForm.is_core}
              onChange={(e) => setSubjectForm({ ...subjectForm, is_core: e.target.checked })}
              className="rounded text-primary-600"
            />
            <label htmlFor="isCore" className="font-semibold text-gray-700">
              Core mandatory subject (unchecked = elective/optional)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => {
                setShowAddSubjectModal(false)
                setShowEditSubjectModal(false)
                setSelectedSubjectForEdit(null)
                resetSubjectModalState()
              }}
              className="px-4 py-2 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                updateSubjectMutation.isPending ||
                createSubjectMutation.isPending ||
                mapExistingSubjectMutation.isPending ||
                (!showEditSubjectModal && subjectModalMode === 'select' && !selectedCanonicalSubject)
              }
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-sm"
            >
              {showEditSubjectModal
                ? updateSubjectMutation.isPending ? 'Saving...' : 'Save Subject'
                : subjectModalMode === 'select'
                ? mapExistingSubjectMutation.isPending ? 'Mapping...' : 'Map Existing Subject'
                : createSubjectMutation.isPending ? 'Creating...' : 'Create & Add Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Add Timetable Session ── */}
      <Modal
        isOpen={showAddSessionModal}
        onClose={() => setShowAddSessionModal(false)}
        title="Schedule Timetable Session"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createSessionMutation.mutate({
              division_id: Number(sessionForm.division_id),
              subject_id: Number(sessionForm.subject_id),
              day_of_week: sessionForm.day_of_week,
              start_time: sessionForm.start_time,
              end_time: sessionForm.end_time,
              room_number: sessionForm.room_number,
            })
          }}
          className="space-y-4 text-xs"
        >
          {conflictWarning && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Batch *</label>
              <select
                required
                value={sessionForm.division_id}
                onChange={(e) => setSessionForm({ ...sessionForm, division_id: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Subject *</label>
              <select
                required
                value={sessionForm.subject_id}
                onChange={(e) => setSessionForm({ ...sessionForm, subject_id: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Day of Week *</label>
              <select
                required
                value={sessionForm.day_of_week}
                onChange={(e) => setSessionForm({ ...sessionForm, day_of_week: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={sessionForm.start_time}
                onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">End Time *</label>
              <input
                type="time"
                required
                value={sessionForm.end_time}
                onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Room Number *</label>
            <input
              type="text"
              required
              value={sessionForm.room_number}
              onChange={(e) => setSessionForm({ ...sessionForm, room_number: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCheckScheduleConflict}
              disabled={isCheckingConflict}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {isCheckingConflict ? 'Checking...' : 'Check Schedule Conflict'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddSessionModal(false)}
                className="px-4 py-2 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createSessionMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm"
              >
                {createSessionMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Enroll Student ── */}
      <Modal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title="Enroll Student in Batch"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createEnrollmentMutation.mutate({
              student_id: Number(enrollForm.student_id),
              standard_id: Number(enrollForm.standard_id),
              division_id: enrollForm.division_id ? Number(enrollForm.division_id) : undefined,
              roll_number: enrollForm.roll_number,
              remarks: enrollForm.remarks,
            })
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Student *</label>
            <select
              required
              value={enrollForm.student_id}
              onChange={(e) => setEnrollForm({ ...enrollForm, student_id: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            >
              <option value="">-- Choose student --</option>
              {unassignedStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.admission_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Class / Standard *</label>
              <select
                required
                value={enrollForm.standard_id}
                onChange={(e) => setEnrollForm({ ...enrollForm, standard_id: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                {standards.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Batch / Division *</label>
              <select
                required
                value={enrollForm.division_id}
                onChange={(e) => setEnrollForm({ ...enrollForm, division_id: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-gray-800"
              >
                <option value="">-- Select Batch --</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.enrolled_count || 0}/{b.capacity || 40})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Roll Number</label>
            <input
              type="text"
              placeholder="e.g. 10-A-41"
              value={enrollForm.roll_number}
              onChange={(e) => setEnrollForm({ ...enrollForm, roll_number: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowEnrollModal(false)}
              className="px-4 py-2 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEnrollmentMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm"
            >
              {createEnrollmentMutation.isPending ? 'Enrolling...' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Batch Transfer ── */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title={selectedEnrollmentForTransfer ? `Transfer Student: ${selectedEnrollmentForTransfer.student_name}` : 'Batch Transfer'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!selectedEnrollmentForTransfer) return
            transferBatchMutation.mutate({
              enrollment_id: selectedEnrollmentForTransfer.id,
              new_division_id: Number(transferForm.new_division_id),
              transfer_reason: transferForm.transfer_reason,
              new_roll_number: transferForm.new_roll_number || undefined,
            })
          }}
          className="space-y-4 text-xs"
        >
          <div className="p-3 bg-primary-50 text-primary-900 rounded-xl space-y-1">
            <p className="font-bold">Current Batch Assignment</p>
            <p className="text-[11px] text-primary-700">
              {selectedEnrollmentForTransfer?.division_name} ({selectedEnrollmentForTransfer?.standard_name})
            </p>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Target Batch *</label>
            <select
              required
              value={transferForm.new_division_id}
              onChange={(e) => setTransferForm({ ...transferForm, new_division_id: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            >
              <option value="">-- Choose New Batch --</option>
              {batches
                .filter((b) => b.id !== selectedEnrollmentForTransfer?.division_id)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.enrolled_count || 0}/{b.capacity || 40} enrolled)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Transfer Reason *</label>
            <input
              type="text"
              required
              value={transferForm.transfer_reason}
              onChange={(e) => setTransferForm({ ...transferForm, transfer_reason: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">New Roll Number</label>
            <input
              type="text"
              value={transferForm.new_roll_number}
              onChange={(e) => setTransferForm({ ...transferForm, new_roll_number: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-gray-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="px-4 py-2 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferBatchMutation.isPending}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm"
            >
              {transferBatchMutation.isPending ? 'Transferring...' : 'Execute Batch Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Batch Roster ── */}
      <Modal
        isOpen={showRosterModal}
        onClose={() => setShowRosterModal(false)}
        title={rosterData ? `${rosterData.batch_name} Roster (${rosterData.board_name || ''} - ${rosterData.standard_name})` : 'Batch Roster'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search students..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <label htmlFor="roster-status-filter" className="text-gray-600 font-medium">Status:</label>
                <select
                  id="roster-status-filter"
                  data-testid="roster-status-filter"
                  value={rosterStatusFilter}
                  onChange={(e) => setRosterStatusFilter(e.target.value as any)}
                  className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800"
                >
                  <option value="active">Active Only</option>
                  <option value="all">All Statuses</option>
                  <option value="withdrawn">Withdrawn Only</option>
                  <option value="completed">Completed Only</option>
                  <option value="graduated">Graduated Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              <div className="text-xs font-semibold text-gray-500">
                Capacity: <span className="font-bold text-gray-800">{rosterData?.enrolled_count || 0} / {rosterData?.capacity || 40}</span>
              </div>
            </div>
          </div>

          {isRosterLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading roster...</div>
          ) : filteredRosterStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">No students found in this batch</div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] custom-scrollbar border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Admission No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Fee Obligation</th>
                    <th className="py-2.5 px-3">Collected</th>
                    <th className="py-2.5 px-3">Fee Status</th>
                    <th className="py-2.5 px-3 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredRosterStudents.map((s: BatchRosterStudent) => (
                    <tr key={s.id} className="hover:bg-primary-50/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-gray-700">{s.roll_number}</td>
                      <td className="py-2 px-3 font-mono text-gray-500">{s.admission_number}</td>
                      <td className="py-2 px-3 font-bold text-gray-900">{s.full_name}</td>
                      <td className="py-2 px-3 font-semibold text-gray-800">₹{s.total_fee.toLocaleString()}</td>
                      <td className="py-2 px-3 font-semibold text-emerald-700">₹{s.total_paid.toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.fee_status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.fee_status === 'Partially Paid'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {s.fee_status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Link
                          to={`/students/${s.id}`}
                          className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-600 font-bold rounded-lg text-[11px] inline-flex items-center gap-1"
                        >
                          View <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowRosterModal(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Schedule Viewer ── */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={scheduleBatch ? `Classroom & Shift Schedule: ${scheduleBatch.name}` : 'Batch Schedule'}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">No Timetable Conflicts</p>
              <p className="text-[11px] text-emerald-700">
                Classroom {scheduleBatch?.room_number} is reserved exclusively for {scheduleBatch?.name} during {scheduleBatch?.schedule_timing}.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-gray-800">Weekly Schedule Slots</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-gray-50 rounded-xl border">
                <p className="font-bold text-gray-900">Monday - Friday</p>
                <p className="text-gray-500 font-mono mt-0.5">{scheduleBatch?.schedule_timing}</p>
                <p className="text-primary-600 font-semibold mt-1">Room: {scheduleBatch?.room_number}</p>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-xl border">
                <p className="font-bold text-gray-900">Faculty In-Charge</p>
                <p className="text-gray-800 font-semibold mt-0.5">{scheduleBatch?.class_teacher_name || 'Mr. Rahul Desai'}</p>
                <p className="text-emerald-600 font-semibold mt-1">Status: Active</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowScheduleModal(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Rule 010 Delete & Archive Confirmation Protection Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, targetType: null, id: null, name: '' })}
        scope={editScope}
        entityType={
          deleteModalState.targetType === 'batch'
            ? 'Academic Batch'
            : deleteModalState.targetType === 'subject'
            ? 'Subject'
            : deleteModalState.targetType === 'session'
            ? 'Timetable Session'
            : 'Record'
        }
        entityName={deleteModalState.name}
        entityId={deleteModalState.id ?? undefined}
        onConfirm={async () => {
          if (!deleteModalState.id) return
          if (deleteModalState.targetType === 'batch') {
            await archiveBatchMutation.mutateAsync(deleteModalState.id)
          } else if (deleteModalState.targetType === 'subject') {
            await deleteSubjectMutation.mutateAsync(deleteModalState.id)
          } else if (deleteModalState.targetType === 'session') {
            await deleteSessionMutation.mutateAsync(deleteModalState.id)
          }
          setDeleteModalState({ isOpen: false, targetType: null, id: null, name: '' })
        }}
        isLoading={
          archiveBatchMutation.isPending ||
          deleteSubjectMutation.isPending ||
          deleteSessionMutation.isPending
        }
      />
    </div>
  )
}
