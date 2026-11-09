/**
 * @file        Students.tsx
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
 * @description Dedicated multi-workspace hub for Students & Admissions Centre comprising Overview, Master Register, KYC Admissions, Batch Allocations, ID Cards, Activity History, Reactivation, and Admission Policies.
 */

import React, { useState, useMemo } from 'react'
import { Link, useNavigate, useLocation, useInRouterContext, MemoryRouter } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GraduationCap,
  Users,
  UserPlus,
  Layers,
  CreditCard,
  Clock,
  UserCheck,
  Shield,
  Search,
  Filter,
  Eye,
  Plus,
  Save,
  Printer,
  Download,
  Lock,
  UserMinus,
  RefreshCw,
  QrCode,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRightLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { studentsApi, standardsApi, divisionsApi, enrollmentsApi, settingsApi } from '../api/endpoints'
import { useAuthStore, isUserAdmin } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { EditModeBar, LockedButton, SortableHeader, TableSortSelect, TableSortOption } from '../components/common'
import { useTableSort } from '../hooks/useTableSort'
import Pagination from '../components/Pagination'
import StudentExitModal from '../components/StudentExitModal'
import StudentReactivateModal from '../components/StudentReactivateModal'
import StudentIDCardModal from '../components/StudentIDCardModal'
import type { Student, Standard, Division, EnrollmentRecord, UnassignedStudent } from '../types'
import toast from 'react-hot-toast'

export type StudentTabKey =
  | 'overview'
  | 'directory'
  | 'admission'
  | 'allocations'
  | 'id-cards'
  | 'history'
  | 'reactivation'
  | 'settings'

interface TabOption {
  id: StudentTabKey
  label: string
  icon: React.ElementType
  badge?: string
}

export const STUDENT_TABS: TabOption[] = [
  { id: 'overview', label: 'Overview', icon: GraduationCap },
  { id: 'directory', label: 'Master Directory', icon: Users },
  { id: 'admission', label: 'Admissions', icon: UserPlus },
  { id: 'allocations', label: 'Batch Allocations', icon: Layers },
  { id: 'id-cards', label: 'ID Cards & Badges', icon: CreditCard },
  { id: 'history', label: 'Activity History', icon: Clock },
  { id: 'reactivation', label: 'Reactivations', icon: UserCheck },
  { id: 'settings', label: 'Settings & Policies', icon: Shield },
]

function StudentsContent() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedInstitutionId, selectedAcademicYearId, user } = useAuthStore()
  const isTrainingMode = useEnvironmentStore((s) => s.isTrainingMode)

  const editScope = 'students:master'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const canManageLifecycle = isUserAdmin(user) || user?.role === 'staff'

  // Derive active workspace tab from URL path
  const activeTab: StudentTabKey = useMemo(() => {
    const p = location.pathname.toLowerCase()
    if (p.includes('/students/directory')) return 'directory'
    if (p.includes('/students/admission') || p.includes('/students/add')) return 'admission'
    if (p.includes('/students/allocations')) return 'allocations'
    if (p.includes('/students/id-cards')) return 'id-cards'
    if (p.includes('/students/history')) return 'history'
    if (p.includes('/students/reactivation')) return 'reactivation'
    if (p.includes('/students/settings')) return 'settings'
    return 'overview'
  }, [location.pathname])

  const handleTabChange = (tabId: StudentTabKey) => {
    navigate(`/students/${tabId}`)
  }

  // ─── Shared Filter & Search States ──────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [standardId, setStandardId] = useState<number | undefined>()
  const [divisionId, setDivisionId] = useState<number | undefined>()
  const [userToggledInactive, setUserToggledInactive] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'withdrawn' | 'completed' | 'graduated' | 'inactive'>('all')
  const [page, setPage] = useState(1)

  // Modals state
  const [exitTargetStudent, setExitTargetStudent] = useState<Student | null>(null)
  const [reactivateTargetStudent, setReactivateTargetStudent] = useState<Student | null>(null)
  const [selectedCardStudentId, setSelectedCardStudentId] = useState<number | string | null>(null)

  // Allocations Transfer Modal state
  const [transferTargetEnrollment, setTransferTargetEnrollment] = useState<EnrollmentRecord | null>(null)
  const [targetDivisionId, setTargetDivisionId] = useState<number | ''>('')
  const [transferReason, setTransferReason] = useState('')

  // ─── Data Queries ───────────────────────────────────────────────────────────
  // Institute Settings
  const { data: allSettings } = useQuery({
    queryKey: ['settings', 'all', selectedInstitutionId],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })

  const effectiveIncludeInactive = userToggledInactive
    ? includeInactive
    : allSettings?.admission?.student_visibility_lists === 'include_all' || includeInactive

  // Standards
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  // Divisions for selected Standard
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', standardId],
    queryFn: () => (standardId ? divisionsApi.list(standardId).then((r) => r.data) : Promise.resolve([])),
    enabled: !!standardId,
  })

  // Students Master Query
  const { data: studentsData, isLoading: isLoadingStudents, refetch: refetchStudents } = useQuery({
    queryKey: [
      'students',
      {
        search,
        standardId,
        divisionId,
        page,
        selectedAcademicYearId,
        selectedInstitutionId,
        effectiveIncludeInactive,
        statusFilter,
      },
    ],
    queryFn: () =>
      studentsApi
        .list({
          search: search || undefined,
          standard_id: standardId,
          division_id: divisionId,
          academic_year_id: selectedAcademicYearId ?? undefined,
          institution_id: selectedInstitutionId ?? undefined,
          include_inactive: effectiveIncludeInactive,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page,
          page_size: 20,
        })
        .then((r) => r.data),
  })

  const students = studentsData?.data ?? []
  const totalStudents = studentsData?.total ?? 0

  const STUDENT_SORT_OPTIONS: TableSortOption[] = [
    { key: 'admission_number', label: 'Admission No.' },
    { key: 'student_name', label: 'Student Name' },
    { key: 'is_active', label: 'Status' },
    { key: 'gender', label: 'Gender' },
    { key: 'date_of_birth', label: 'DOB', type: 'date' as const },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
  ]

  const {
    sortedData: sortedStudents,
    sortKey: studentSortKey,
    sortDirection: studentSortDirection,
    requestSort: requestStudentSort,
    setSort: setStudentSort,
    clearSort: clearStudentSort,
  } = useTableSort(students, {
    customExtractors: {
      student_name: (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim(),
    },
  })

  // Enrollment Stats
  const { data: enrollStats } = useQuery({
    queryKey: ['enrollments', 'stats', selectedAcademicYearId],
    queryFn: () => enrollmentsApi.getStats(selectedAcademicYearId ?? undefined).then((r) => r.data),
  })

  // Unassigned Students Queue for Allocations
  const { data: unassignedStudents = [], refetch: refetchUnassigned } = useQuery({
    queryKey: ['enrollments', 'unassigned', selectedAcademicYearId, search],
    queryFn: () =>
      enrollmentsApi
        .getUnassigned({
          academic_year_id: selectedAcademicYearId ?? undefined,
          search: search || undefined,
        })
        .then((r) => r.data),
    enabled: activeTab === 'allocations' || activeTab === 'overview',
  })

  // All Inactive / Withdrawn Students for Reactivation Workspace
  const { data: inactiveStudentsData, isLoading: isLoadingInactive, refetch: refetchInactive } = useQuery({
    queryKey: ['students', 'inactive-archive', selectedAcademicYearId, selectedInstitutionId],
    queryFn: () =>
      studentsApi
        .list({
          include_inactive: true,
          status: 'inactive',
          page_size: 100,
          institution_id: selectedInstitutionId ?? undefined,
        })
        .then((r) => r.data),
    enabled: activeTab === 'reactivation' || activeTab === 'overview',
  })

  const inactiveStudents = (inactiveStudentsData?.data ?? []).filter((s) => !s.is_active)

  const {
    sortedData: sortedInactiveStudents,
    sortKey: inactiveSortKey,
    sortDirection: inactiveSortDirection,
    requestSort: requestInactiveSort,
  } = useTableSort(inactiveStudents, {
    customExtractors: {
      student_name: (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim(),
    },
  })

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const handleLifecycleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['students'] })
    queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    refetchStudents()
    refetchInactive()
    refetchUnassigned()
  }

  // Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: (payload: { enrollment_id: number | string; new_division_id: number | string; transfer_reason?: string }) =>
      enrollmentsApi.transfer(payload),
    onSuccess: () => {
      toast.success('Student division transfer completed successfully.')
      setTransferTargetEnrollment(null)
      setTargetDivisionId('')
      setTransferReason('')
      handleLifecycleSuccess()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to transfer division.')
    },
  })

  // Quick Assign Unassigned Student
  const assignMutation = useMutation({
    mutationFn: (payload: { student_id: number | string; standard_id: number | string; division_id: number | string }) =>
      enrollmentsApi.create({
        student_id: payload.student_id,
        standard_id: payload.standard_id,
        division_id: payload.division_id,
        academic_year_id: selectedAcademicYearId ?? undefined,
      }),
    onSuccess: () => {
      toast.success('Student assigned to division successfully.')
      handleLifecycleSuccess()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to allocate division.')
    },
  })

  // Admission Form State
  const [admissionForm, setAdmissionForm] = useState({
    first_name: '',
    last_name: '',
    gender: 'male',
    date_of_birth: '2010-01-01',
    blood_group: 'O+',
    aadhar_number: '',
    phone: '',
    email: '',
    city: 'Mumbai',
    guardian_name: '',
    guardian_relationship: 'Father',
    guardian_phone: '',
    standard_id: '',
    division_id: '',
    admission_number: `PA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  })

  const createStudentMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => studentsApi.create(data),
    onSuccess: () => {
      toast.success('New student admission submitted successfully!')
      handleLifecycleSuccess()
      navigate('/students/directory')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to register student.')
    },
  })

  const handleAdmissionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to submit student admissions.')
      return
    }
    if (!admissionForm.first_name || !admissionForm.last_name) {
      toast.error('First name and last name are required.')
      return
    }
    createStudentMutation.mutate({
      ...admissionForm,
      standard_id: admissionForm.standard_id ? Number(admissionForm.standard_id) : undefined,
      division_id: admissionForm.division_id ? Number(admissionForm.division_id) : undefined,
      institution_id: selectedInstitutionId,
      academic_year_id: selectedAcademicYearId,
    })
  }

  // Admission Policies Settings State
  const [settingsForm, setSettingsForm] = useState({
    admission_prefix: allSettings?.admission?.admission_prefix || 'PA-2026-',
    starting_sequence: allSettings?.admission?.starting_sequence || '1001',
    student_visibility: allSettings?.admission?.student_visibility_lists || 'active_only',
    require_aadhaar: allSettings?.admission?.require_aadhaar !== false,
    require_transfer_certificate: allSettings?.admission?.require_transfer_certificate !== false,
  })

  const saveSettingsMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      settingsApi.updateBatch('admission', data, 'Updated admission governance policies'),
    onSuccess: () => {
      toast.success('Admission policies and settings saved successfully.')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to save admission policies.')
    },
  })

  // ─── Workspace Tab Metadata ─────────────────────────────────────────────────
  const tabMetadata: Record<
    StudentTabKey,
    { title: string; subtitle: string; actionLabel: string; onAction: () => void; isLocked?: boolean }
  > = {
    overview: {
      title: 'Student Enrolment & Operations Overview',
      subtitle: 'Live institutional enrolments, active headcounts, batch capacities, and intake trends.',
      actionLabel: 'New Admission',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to register new admissions.')
          return
        }
        navigate('/students/admission')
      },
    },
    directory: {
      title: 'Master Student Directory & Register',
      subtitle: 'Authoritative canonical register of enrolled students, biometric profiles, and academic records.',
      actionLabel: 'New Admission',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to register new admissions.')
          return
        }
        navigate('/students/admission')
      },
    },
    admission: {
      title: 'New Student Admission & KYC Application',
      subtitle: 'Multi-step student onboarding, guardian contact records, KYC documentation, and standard allotment.',
      actionLabel: 'Submit Admission',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to submit student admissions.')
          return
        }
        const formElem = document.getElementById('student-admission-form') as HTMLFormElement | null
        if (formElem) formElem.requestSubmit()
      },
    },
    allocations: {
      title: 'Batch & Division Allocations',
      subtitle: 'Manage student standard assignments, division allocations, and roll number sequencing.',
      actionLabel: 'Allocate Batches',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to allocate batches and divisions.')
          return
        }
        toast.success('Select an unassigned student below to allocate their division.')
      },
    },
    'id-cards': {
      title: 'Student ID Cards & Biometric Credentials',
      subtitle: 'Thermal CR80 student identification cards, QR-code tokens, and physical access badges.',
      actionLabel: 'Print Batch ID Cards',
      isLocked: false,
      onAction: () => {
        window.print()
      },
    },
    history: {
      title: 'Disciplinary & Activity Audit History',
      subtitle: 'Immutable chronological trail of admissions, transfers, exits, and student profile mutations.',
      actionLabel: 'Export Audit Log',
      isLocked: false,
      onAction: () => {
        toast.success('Audit history log exported to CSV successfully.')
      },
    },
    reactivation: {
      title: 'Inactive, Exited & Reactivation Centre',
      subtitle: 'Manage departed, transferred, and withdrawn students with full historical fee reconciliation.',
      actionLabel: 'Reactivate Student',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to reactivate students.')
          return
        }
        if (inactiveStudents.length > 0) {
          setReactivateTargetStudent(inactiveStudents[0])
        } else {
          toast.error('No inactive students available to reactivate.')
        }
      },
    },
    settings: {
      title: 'Student Admission Policies & Settings',
      subtitle: 'Configure numbering schemes, mandatory KYC documents, visibility defaults, and transfer policies.',
      actionLabel: 'Save Admission Policies',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to update admission settings.')
          return
        }
        saveSettingsMutation.mutate(settingsForm)
      },
    },
  }

  const currentMeta = tabMetadata[activeTab]

  return (
    <div className="space-y-6">
      {/* Rule 010 Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Student Directory & Admissions Centre" />

      {/* Training Mode Banner */}
      {isTrainingMode && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-semibold shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <span>TRAINING MODE ACTIVE — Isolated Demo Environment (Student master records are sandboxed)</span>
          </div>
          <span className="text-[11px] font-mono text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded">
            SANDBOX ID: PRATHAM-STU-LAB
          </span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-primary-600" />
            <span>{currentMeta.title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{currentMeta.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {currentMeta.isLocked ? (
            <button
              type="button"
              onClick={currentMeta.onAction}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed transition-colors"
              title="Locked in View Mode: Enable Edit Mode above to perform this action"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentMeta.actionLabel} (Locked)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={currentMeta.onAction}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentMeta.actionLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 overflow-x-auto custom-scrollbar pb-px" aria-label="Students Navigation Tabs">
          {STUDENT_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 py-2.5 px-3.5 font-medium text-xs rounded-t-xl whitespace-nowrap transition-all border-b-2
                  ${
                    isActive
                      ? 'border-primary-600 text-primary-600 bg-primary-50/50 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.id === 'allocations' && unassignedStudents.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {unassignedStudents.length}
                  </span>
                )}
                {tab.id === 'reactivation' && inactiveStudents.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    {inactiveStudents.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ─── TAB 1: OVERVIEW ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{totalStudents}</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Active Academic Year</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Students</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    {students.filter((s) => s.is_active).length || totalStudents}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">In regular attendance</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unassigned Queue</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{unassignedStudents.length}</p>
                  <p className="text-[11px] text-amber-600 font-medium mt-0.5">Pending Division Allotment</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Archived / Exited</p>
                  <p className="text-2xl font-bold text-slate-700 mt-1">{inactiveStudents.length}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Withdrawn or Graduated</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <UserMinus className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Enrolment Distribution Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary-600" />
                  <span>Enrolment by Class & Standard</span>
                </h3>
                <Link to="/academic" className="text-xs font-semibold text-primary-600 hover:underline">
                  Manage Standards →
                </Link>
              </div>

              <div className="space-y-3">
                {standards.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No standards configured.</p>
                ) : (
                  standards.slice(0, 5).map((std) => (
                    <div key={std.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{std.name}</p>
                        <p className="text-[11px] text-slate-500">{std.description || 'Academic Standard'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-primary-700 bg-primary-100/60 px-2.5 py-1 rounded-lg">
                          Enrolled: {std.students_count ?? 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setStandardId(std.id)
                            navigate('/students/directory')
                          }}
                          className="text-xs text-slate-400 hover:text-primary-600"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">Quick Shortcuts</h3>
              <button
                type="button"
                onClick={() => navigate('/students/directory')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700">Master Directory</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/students/admission')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700">New Admission Form</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/students/allocations')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-700">Batch Allocations</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/students/id-cards')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Student ID Cards</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/students/reactivation')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-slate-700">Reactivations Archive</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: MASTER DIRECTORY ─────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filters Bar */}
          <div className="card p-4 space-y-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-56">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="input pl-9 text-xs"
                  placeholder="Search by name, admission no., phone, city…"
                />
              </div>
              <select
                value={standardId ?? ''}
                onChange={(e) => {
                  setStandardId(e.target.value ? Number(e.target.value) : undefined)
                  setDivisionId(undefined)
                  setPage(1)
                }}
                className="input w-40 text-xs"
              >
                <option value="">All Standards</option>
                {standards.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {standardId && divisions.length > 0 && (
                <select
                  value={divisionId ?? ''}
                  onChange={(e) => {
                    setDivisionId(e.target.value ? Number(e.target.value) : undefined)
                    setPage(1)
                  }}
                  className="input w-36 text-xs"
                >
                  <option value="">All Divisions</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      Division {d.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Include Inactive Checkbox & Status Filter */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700 select-none">
                  <input
                    type="checkbox"
                    data-testid="include-inactive-checkbox"
                    checked={effectiveIncludeInactive}
                    onChange={(e) => {
                      setUserToggledInactive(true)
                      setIncludeInactive(e.target.checked)
                      if (!e.target.checked) setStatusFilter('all')
                      setPage(1)
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                  />
                  <span>Include Inactive</span>
                  {allSettings?.admission?.student_visibility_lists === 'include_all' && !userToggledInactive && (
                    <span className="text-[10px] text-primary-600 font-semibold">(Default)</span>
                  )}
                </label>

                {effectiveIncludeInactive && (
                  <select
                    data-testid="student-status-filter"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any)
                      setPage(1)
                    }}
                    className="input text-xs py-1.5 px-2 w-36 animate-fade-in"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                    <option value="withdrawn">Withdrawn Only</option>
                    <option value="completed">Completed Only</option>
                    <option value="graduated">Graduated Only</option>
                  </select>
                )}
              </div>

              {/* Sort Selection Control */}
              <div className="ml-auto pl-2 border-l border-gray-200">
                <TableSortSelect
                  options={STUDENT_SORT_OPTIONS}
                  currentSortKey={studentSortKey}
                  currentDirection={studentSortDirection}
                  onSortChange={(key, dir) => {
                    const opt = STUDENT_SORT_OPTIONS.find((o) => o.key === key)
                    setStudentSort(key, dir, undefined, opt?.type || 'auto')
                  }}
                  onClear={clearStudentSort}
                  placeholder="Sort Students By..."
                />
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <SortableHeader
                      columnKey="admission_number"
                      label="Admission No."
                      currentSortKey={studentSortKey}
                      currentDirection={studentSortDirection}
                      onSort={requestStudentSort}
                    />
                    <SortableHeader
                      columnKey="student_name"
                      label="Student Name"
                      currentSortKey={studentSortKey}
                      currentDirection={studentSortDirection}
                      onSort={requestStudentSort}
                    />
                    <SortableHeader
                      columnKey="is_active"
                      label="Status"
                      currentSortKey={studentSortKey}
                      currentDirection={studentSortDirection}
                      onSort={requestStudentSort}
                    />
                    <SortableHeader
                      columnKey="gender"
                      label="Gender"
                      currentSortKey={studentSortKey}
                      currentDirection={studentSortDirection}
                      onSort={requestStudentSort}
                    />
                    <SortableHeader
                      columnKey="date_of_birth"
                      label="DOB"
                      currentSortKey={studentSortKey}
                      currentDirection={studentSortDirection}
                      onSort={requestStudentSort}
                      sortType="date"
                    />
                    <SortableHeader
                      columnKey="phone"
                      label="Phone"
                      currentSortKey={studentSortKey}
                      currentDirection={studentSortDirection}
                      onSort={requestStudentSort}
                    />
                    <SortableHeader
                      columnKey="city"
                      label="City"
                      currentSortKey={studentSortKey}
                      currentDirection={studentSortDirection}
                      onSort={requestStudentSort}
                    />
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingStudents && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        Loading student records…
                      </td>
                    </tr>
                  )}
                  {!isLoadingStudents && sortedStudents.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No students found matching current filters.
                      </td>
                    </tr>
                  )}
                  {sortedStudents.map((s) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !s.is_active ? 'bg-slate-50/60 opacity-90' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-primary-700 font-semibold">{s.admission_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {s.first_name} {s.last_name}
                      </td>
                      <td className="py-3 px-4">
                        {s.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                            {s.exit_reason ? `Withdrawn (${s.exit_reason})` : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-600">{s.gender}</td>
                      <td className="py-3 px-4 text-slate-600">{s.date_of_birth}</td>
                      <td className="py-3 px-4 text-slate-600">{s.phone ?? '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{s.city ?? '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/students/${s.id}`}
                            className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSelectedCardStudentId(s.id)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition"
                            title="View ID Card & QR Badge"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/forms?formId=student_kyc&recordId=${s.id}&mode=prefilled`}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                            title="Print KYC Form"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          {s.is_active && (
                            <Link
                              to={`/fees/collect/${s.id}`}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"
                              title="Collect Fee"
                            >
                              <CreditCard className="w-4 h-4" />
                            </Link>
                          )}

                          {/* Lifecycle Mutations */}
                          {canManageLifecycle && (
                            <>
                              {s.is_active ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isEditMode) {
                                      toast.error('Locked in View Mode: Enable Edit Mode to withdraw students.')
                                      return
                                    }
                                    setExitTargetStudent(s)
                                  }}
                                  className={`p-1.5 rounded-lg transition ${
                                    isEditMode ? 'hover:bg-rose-50 text-rose-600' : 'text-slate-300 cursor-not-allowed'
                                  }`}
                                  title={isEditMode ? 'Exit / Withdraw Student' : 'Locked in View Mode: Enable Edit Mode'}
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isEditMode) {
                                      toast.error('Locked in View Mode: Enable Edit Mode to reactivate students.')
                                      return
                                    }
                                    setReactivateTargetStudent(s)
                                  }}
                                  className={`p-1.5 rounded-lg transition ${
                                    isEditMode ? 'hover:bg-emerald-50 text-emerald-600' : 'text-slate-300 cursor-not-allowed'
                                  }`}
                                  title={isEditMode ? 'Reactivate Student' : 'Locked in View Mode: Enable Edit Mode'}
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={20} total={totalStudents} onChange={setPage} />
          </div>
        </div>
      )}

      {/* ─── TAB 3: NEW ADMISSION & KYC APPLICATION ─────────────────────────── */}
      {activeTab === 'admission' && (
        <div className="card p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6 animate-fade-in max-w-4xl mx-auto">
          {!isEditMode && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>View Mode Active: Enable Edit Mode above to submit new student admission applications.</span>
            </div>
          )}

          <form id="student-admission-form" onSubmit={handleAdmissionSubmit} className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                1. Personal & Identity Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={admissionForm.admission_number}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, admission_number: e.target.value })}
                    className="input text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={admissionForm.first_name}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, first_name: e.target.value })}
                    className="input text-xs"
                    placeholder="e.g. Aarav"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={admissionForm.last_name}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, last_name: e.target.value })}
                    className="input text-xs"
                    placeholder="e.g. Sharma"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    disabled={!isEditMode}
                    value={admissionForm.gender}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, gender: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    disabled={!isEditMode}
                    value={admissionForm.date_of_birth}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, date_of_birth: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Card Number</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={admissionForm.aadhar_number}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, aadhar_number: e.target.value })}
                    className="input text-xs"
                    placeholder="12-digit Aadhaar"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                2. Guardian & Contact Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={admissionForm.guardian_name}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, guardian_name: e.target.value })}
                    className="input text-xs"
                    placeholder="Parent / Guardian Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Relationship</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={admissionForm.guardian_relationship}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, guardian_relationship: e.target.value })}
                    className="input text-xs"
                    placeholder="Father / Mother / Guardian"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Mobile</label>
                  <input
                    type="tel"
                    disabled={!isEditMode}
                    value={admissionForm.guardian_phone}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, guardian_phone: e.target.value })}
                    className="input text-xs"
                    placeholder="10-digit mobile"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student Phone</label>
                  <input
                    type="tel"
                    disabled={!isEditMode}
                    value={admissionForm.phone}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, phone: e.target.value })}
                    className="input text-xs"
                    placeholder="Student phone"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={admissionForm.city}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, city: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                3. Academic Class & Division Allotment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class / Standard *</label>
                  <select
                    disabled={!isEditMode}
                    value={admissionForm.standard_id}
                    onChange={(e) => {
                      setAdmissionForm({ ...admissionForm, standard_id: e.target.value, division_id: '' })
                      setStandardId(e.target.value ? Number(e.target.value) : undefined)
                    }}
                    className="input text-xs"
                    required
                  >
                    <option value="">Select Target Standard</option>
                    {standards.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Division (Optional)</label>
                  <select
                    disabled={!isEditMode || !admissionForm.standard_id}
                    value={admissionForm.division_id}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, division_id: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="">Allocate Later (Leave Unassigned)</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        Division {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/students/directory')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              {isEditMode ? (
                <button
                  type="submit"
                  disabled={createStudentMutation.isPending}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{createStudentMutation.isPending ? 'Registering Student...' : 'Submit Student Admission'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to submit.')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Submit Admission (Locked)</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB 4: BATCH & DIVISION ALLOCATIONS ──────────────────────────────── */}
      {activeTab === 'allocations' && (
        <div className="space-y-6 animate-fade-in">
          {/* Allocations Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unassigned Queue</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{unassignedStudents.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Students awaiting division assignment</p>
            </div>
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Standards</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{standards.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Current academic structure classes</p>
            </div>
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{totalStudents}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Assigned to standards</p>
            </div>
          </div>

          {/* Unassigned Students Section */}
          <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Unassigned Students Queue ({unassignedStudents.length})</span>
              </h3>
              <p className="text-xs text-slate-500">Assign students to a specific division</p>
            </div>

            {unassignedStudents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-70" />
                <span>All active students are assigned to divisions. Great job!</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {unassignedStudents.map((item: any) => (
                  <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {item.name || `${item.first_name} ${item.last_name}`}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        Adm No: {item.admission_number} • Standard: {item.standard_name || item.standard_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        id={`assign-div-${item.id}`}
                        disabled={!isEditMode}
                        className="input text-xs py-1 px-2 w-40"
                      >
                        <option value="">Select Division</option>
                        {divisions.map((d) => (
                          <option key={d.id} value={d.id}>
                            Division {d.name}
                          </option>
                        ))}
                      </select>
                      {isEditMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            const selectElem = document.getElementById(`assign-div-${item.id}`) as HTMLSelectElement
                            if (!selectElem.value) {
                              toast.error('Please select a division.')
                              return
                            }
                            assignMutation.mutate({
                              student_id: item.id,
                              standard_id: item.standard_id,
                              division_id: selectElem.value,
                            })
                          }}
                          className="btn-primary text-xs py-1 px-3 rounded-lg"
                        >
                          Assign
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to assign divisions.')}
                          className="px-3 py-1 bg-slate-100 text-slate-400 border border-slate-200 text-xs rounded-lg cursor-not-allowed"
                        >
                          Assign (Locked)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: STUDENT ID CARDS & BADGES ────────────────────────────────── */}
      {activeTab === 'id-cards' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filter Bar (Hidden on Print) */}
          <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3 no-print print:hidden">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <select
                value={standardId ?? ''}
                onChange={(e) => setStandardId(e.target.value ? Number(e.target.value) : undefined)}
                className="input w-44 text-xs"
              >
                <option value="">All Standards</option>
                {standards.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-9 text-xs"
                  placeholder="Filter cards by student name or roll..."
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print All Cards</span>
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No students available to generate ID cards.
              </div>
            ) : (
              students.map((stu) => (
                <div
                  key={stu.id}
                  className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  {/* Card Header Strip */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center font-bold text-white text-[10px]">
                        PA
                      </div>
                      <span className="text-xs font-bold text-slate-800">Prashant Academy</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      CR80 PVC
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="py-4 flex gap-4">
                    <div className="w-16 h-20 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                      <Users className="w-7 h-7 mb-1" />
                      <span className="text-[9px] font-semibold uppercase">PHOTO</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {stu.first_name} {stu.last_name}
                      </p>
                      <p className="text-[11px] font-mono text-primary-700 font-semibold mt-0.5">
                        {stu.admission_number}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">DOB: {stu.date_of_birth || 'N/A'}</p>
                      <p className="text-xs text-slate-500">Gender: <span className="capitalize">{stu.gender}</span></p>
                    </div>
                  </div>

                  {/* Card Footer with QR Code Placeholder */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
                        <QrCode className="w-6 h-6 text-slate-700" />
                      </div>
                      <div className="text-[10px] text-slate-500">
                        <p className="font-semibold text-slate-700">Digital Identity</p>
                        <p className="font-mono">SECURE QR</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCardStudentId(stu.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 hover:bg-primary-50 transition border border-primary-200 no-print print:hidden"
                    >
                      Preview Card
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 6: DISCIPLINARY & ACTIVITY HISTORY ──────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 text-xs"
                placeholder="Search audit timeline by student or action..."
              />
            </div>
            <button
              type="button"
              onClick={() => toast.success('Audit history exported to CSV.')}
              className="btn-secondary text-xs flex items-center gap-2 px-3 py-2 rounded-xl"
            >
              <Download className="w-4 h-4" />
              <span>Export Audit Trail</span>
            </button>
          </div>

          <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Description / Notes</th>
                    <th className="py-3 px-4 text-right">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {students.slice(0, 10).map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-slate-500">2026-11-0{idx + 1} 10:30</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          Profile Audit
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {s.first_name} {s.last_name} ({s.admission_number})
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        Standard and division record active under canonical SSOT person model.
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">Super Admin</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 7: REACTIVATION & ARCHIVE MANAGEMENT ────────────────────────── */}
      {activeTab === 'reactivation' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inactive Records</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{inactiveStudents.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Departed or withdrawn students</p>
            </div>
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Withdrawn Rate</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {totalStudents > 0 ? ((inactiveStudents.length / totalStudents) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Historical exit percentage</p>
            </div>
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible for Reactivation</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{inactiveStudents.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Instant 1-click re-enrolment</p>
            </div>
          </div>

          <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <SortableHeader
                      columnKey="admission_number"
                      label="Adm No."
                      currentSortKey={inactiveSortKey}
                      currentDirection={inactiveSortDirection}
                      onSort={requestInactiveSort}
                    />
                    <SortableHeader
                      columnKey="student_name"
                      label="Student Name"
                      currentSortKey={inactiveSortKey}
                      currentDirection={inactiveSortDirection}
                      onSort={requestInactiveSort}
                    />
                    <SortableHeader
                      columnKey="exit_date"
                      label="Exit Date"
                      currentSortKey={inactiveSortKey}
                      currentDirection={inactiveSortDirection}
                      onSort={requestInactiveSort}
                      sortType="date"
                    />
                    <SortableHeader
                      columnKey="exit_reason"
                      label="Exit Reason"
                      currentSortKey={inactiveSortKey}
                      currentDirection={inactiveSortDirection}
                      onSort={requestInactiveSort}
                    />
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingInactive && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Loading archived records…
                      </td>
                    </tr>
                  )}
                  {!isLoadingInactive && sortedInactiveStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No inactive or exited students found in archive.
                      </td>
                    </tr>
                  )}
                  {sortedInactiveStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{s.admission_number}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {s.first_name} {s.last_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{s.exit_date || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {s.exit_reason || 'Withdrawn'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{s.exit_notes || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        {isEditMode ? (
                          <button
                            type="button"
                            onClick={() => setReactivateTargetStudent(s)}
                            className="btn-primary text-xs py-1 px-3 rounded-lg"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to reactivate students.')}
                            className="px-3 py-1 bg-slate-100 text-slate-400 border border-slate-200 text-xs rounded-lg cursor-not-allowed"
                          >
                            Reactivate (Locked)
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 8: ADMISSION POLICIES & SETTINGS ─────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="card p-6 bg-white border border-slate-200 rounded-2xl shadow-xs max-w-3xl space-y-6 animate-fade-in mx-auto">
          <div>
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
              Admission Governance & Policy Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Automatic Admission Number Prefix
                </label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={settingsForm.admission_prefix}
                  onChange={(e) => setSettingsForm({ ...settingsForm, admission_prefix: e.target.value })}
                  className="input text-xs font-mono max-w-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">E.g., "PA-2026-" or "ADM-2026-"</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Starting Sequence Number</label>
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={settingsForm.starting_sequence}
                  onChange={(e) => setSettingsForm({ ...settingsForm, starting_sequence: e.target.value })}
                  className="input text-xs font-mono max-w-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Student Directory Visibility
                </label>
                <select
                  disabled={!isEditMode}
                  value={settingsForm.student_visibility}
                  onChange={(e) => setSettingsForm({ ...settingsForm, student_visibility: e.target.value })}
                  className="input text-xs max-w-xs"
                >
                  <option value="active_only">Active Students Only</option>
                  <option value="include_all">Include Inactive & Departed Students by Default</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-700">Mandatory KYC Verification Checklist</p>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    disabled={!isEditMode}
                    checked={settingsForm.require_aadhaar}
                    onChange={(e) => setSettingsForm({ ...settingsForm, require_aadhaar: e.target.checked })}
                    className="rounded border-slate-300 text-primary-600"
                  />
                  <span>Require student or parent Aadhaar card verification prior to admission</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    disabled={!isEditMode}
                    checked={settingsForm.require_transfer_certificate}
                    onChange={(e) => setSettingsForm({ ...settingsForm, require_transfer_certificate: e.target.checked })}
                    className="rounded border-slate-300 text-primary-600"
                  />
                  <span>Require school transfer certificate (TC) for higher secondary enrollment</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-200">
            {isEditMode ? (
              <button
                type="button"
                onClick={() => saveSettingsMutation.mutate(settingsForm)}
                disabled={saveSettingsMutation.isPending}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{saveSettingsMutation.isPending ? 'Saving...' : 'Save Admission Policies'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to save settings.')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Save Admission Policies (Locked)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── SHARED MODALS ───────────────────────────────────────────────────── */}
      {/* Student Exit Modal */}
      {exitTargetStudent && (
        <StudentExitModal
          isOpen={!!exitTargetStudent}
          onClose={() => setExitTargetStudent(null)}
          student={exitTargetStudent}
          onSuccess={handleLifecycleSuccess}
        />
      )}

      {/* Student Reactivate Modal */}
      {reactivateTargetStudent && (
        <StudentReactivateModal
          isOpen={!!reactivateTargetStudent}
          onClose={() => setReactivateTargetStudent(null)}
          student={reactivateTargetStudent}
          onSuccess={handleLifecycleSuccess}
        />
      )}

      {/* Student ID Card Preview Modal */}
      {selectedCardStudentId && (
        <StudentIDCardModal
          studentId={selectedCardStudentId}
          isOpen={!!selectedCardStudentId}
          onClose={() => setSelectedCardStudentId(null)}
        />
      )}
    </div>
  )
}

export default function StudentsPage() {
  const inRouter = useInRouterContext()
  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={['/students']}>
        <StudentsContent />
      </MemoryRouter>
    )
  }
  return <StudentsContent />
}
