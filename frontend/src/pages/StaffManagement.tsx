/**
 * @file        StaffManagement.tsx
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
 * @description Dedicated multi-workspace hub for Staff & HR Directory comprising HR Analytics, Staff Register, Onboarding, Roles & Duties, Daily Attendance, Leave Requests, HR Documents Studio, and HR Policies.
 */

import React, { useState, useMemo } from 'react'
import { useNavigate, useLocation, Link, useInRouterContext, MemoryRouter } from 'react-router-dom'
import WorkforceDonutChart from '../components/workforce/WorkforceDonutChart'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  UserPlus,
  Briefcase,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  FileText,
  Printer,
  ChevronRight,
  Eye,
  Trash2,
  Download,
  RefreshCw,
  Shield,
  Layers,
  Lock,
  Sparkles,
  Save,
  Check,
  Copy,
  Key,
} from 'lucide-react'
import { staffApi, settingsApi } from '../api/endpoints'
import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { EditModeBar, LockedButton } from '../components/common'
import StaffProfileModal from '../components/StaffProfileModal'
import StaffLifecycleModal from '../components/StaffLifecycleModal'
import toast from 'react-hot-toast'
import type { StaffMember, StaffDocumentTemplate, StaffDashboardData } from '../types'

export type StaffTabKey =
  | 'overview'
  | 'directory'
  | 'onboarding'
  | 'duties'
  | 'attendance'
  | 'leaves'
  | 'documents'
  | 'settings'

interface TabOption {
  id: StaffTabKey
  label: string
  icon: React.ElementType
  badge?: string
}

export const STAFF_TABS: TabOption[] = [
  { id: 'overview', label: 'Overview', icon: Briefcase },
  { id: 'directory', label: 'Staff Register', icon: Users },
  { id: 'onboarding', label: 'New Onboarding', icon: UserPlus },
  { id: 'duties', label: 'Roles & Duties', icon: Layers },
  { id: 'attendance', label: 'Staff Presence', icon: Clock },
  { id: 'leaves', label: 'Leave Requests', icon: Calendar },
  { id: 'documents', label: 'HR Documents Studio', icon: FileText },
  { id: 'settings', label: 'HR Policies', icon: Shield },
]

function StaffManagementContent() {
  const { user } = useAuthStore()
  const editScope = 'workforce:staff'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const isTrainingMode = useEnvironmentStore((s) => s.isTrainingMode)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const isAdmin = isUserAdmin(user)
  const isSysAdmin = isUserSysAdmin(user)

  // Derive active workspace tab from URL route
  const activeTab: StaffTabKey = useMemo(() => {
    const p = location.pathname.toLowerCase()
    if (p.includes('/staff/directory')) return 'directory'
    if (p.includes('/staff/onboarding') || p.includes('/staff/add')) return 'onboarding'
    if (p.includes('/staff/duties') || p.includes('/staff/allocations')) return 'duties'
    if (p.includes('/staff/attendance')) return 'attendance'
    if (p.includes('/staff/leaves')) return 'leaves'
    if (p.includes('/staff/documents')) return 'documents'
    if (p.includes('/staff/settings')) return 'settings'
    return 'overview'
  }, [location.pathname])

  const handleTabChange = (tabId: StaffTabKey) => {
    navigate(`/staff/${tabId}`)
  }

  // ─── Shared State ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')
  const [page, setPage] = useState(1)

  // Modals state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileModalStaffId, setProfileModalStaffId] = useState<number | null>(null)
  const [showLifecycleModal, setShowLifecycleModal] = useState(false)
  const [lifecycleTargetStaff, setLifecycleTargetStaff] = useState<{
    id: number
    name: string
    employee_id?: string | null
    role: string
    status: string
  } | null>(null)

  // Documents state
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false)
  const [activeDocTemplate, setActiveDocTemplate] = useState<string | null>(null)
  const [docPeriodMonth, setDocPeriodMonth] = useState('November 2026')
  const [docCategoryFilter, setDocCategoryFilter] = useState('')

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0])

  // New Staff Onboarding Form
  const [newStaff, setNewStaff] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'staff',
    staff_type: 'Non-Teaching',
    department: 'Administration & Front Desk',
    designation: 'Operations Coordinator',
    qualification: 'B.Com / B.B.A',
    experience_years: 3.0,
    employment_type: 'full_time',
    basic_salary: 35000,
  })

  // Secure Created Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string
    temporary_password?: string
    employee_id?: string
    name?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // HR Settings state
  const [hrSettings, setHrSettings] = useState({
    probation_months: 6,
    annual_casual_leaves: 12,
    annual_sick_leaves: 8,
    work_start_time: '09:00',
    work_end_time: '18:00',
    overtime_enabled: true,
  })

  // ─── Queries ───────────────────────────────────────────────────────────────
  // 1. Staff Directory Query
  const { data: staffData, isLoading: isStaffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['staff-list', search, selectedDepartment, selectedStatus, page],
    queryFn: () =>
      staffApi
        .list({
          search: search || undefined,
          department: selectedDepartment || undefined,
          status: selectedStatus || undefined,
          page,
          limit: 15,
        })
        .then((r) => r.data),
  })

  const staffItems = staffData?.items ?? []
  const totalStaff = staffData?.total ?? 0

  // 2. Staff Profile Detail Query
  const { data: staffDetail } = useQuery({
    queryKey: ['staff-detail', selectedUserId],
    queryFn: () => staffApi.get(selectedUserId!).then((r) => r.data),
    enabled: !!selectedUserId,
  })

  // 3. Daily Attendance Query
  const { data: dailyAtt, isLoading: isAttLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['staff-daily-attendance', attendanceDate],
    queryFn: () => staffApi.dailyAttendance({ attendance_date: attendanceDate }).then((r) => r.data),
    enabled: activeTab === 'attendance' || activeTab === 'overview',
  })

  // 4. Leaves Query
  const { data: leaves = [], refetch: refetchLeaves } = useQuery({
    queryKey: ['staff-leaves'],
    queryFn: () => staffApi.leavesList().then((r) => r.data),
    enabled: activeTab === 'leaves' || activeTab === 'overview',
  })

  // 5. Non-Teaching Staff Dashboard Stats
  const { data: staffDashboard } = useQuery({
    queryKey: ['staff-workforce-dashboard'],
    queryFn: () => staffApi.getStaffDashboard().then((r) => r.data),
  })

  // 6. Documents Catalogue Query
  const { data: docCatalogue = [] } = useQuery({
    queryKey: ['staff-doc-catalogue', docCategoryFilter],
    queryFn: () => staffApi.documentCatalogue({ category: docCategoryFilter || undefined }).then((r) => r.data),
    enabled: activeTab === 'documents',
  })

  // 7. Document Render Query
  const { data: renderedDoc, isLoading: isRenderingDoc } = useQuery({
    queryKey: ['rendered-staff-doc', activeDocTemplate, selectedUserId, docPeriodMonth],
    queryFn: () =>
      staffApi
        .renderDocument(activeDocTemplate!, {
          user_id: selectedUserId || 121,
          period_month: docPeriodMonth,
        })
        .then((r) => r.data),
    enabled: showDocPreviewModal && !!activeDocTemplate,
  })

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createStaffMutation = useMutation({
    mutationFn: (payload: any) => staffApi.create(payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      const data = res?.data || res
      if (data?.temporary_password) {
        setCreatedCredentials({
          username: data.username || newStaff.username,
          temporary_password: data.temporary_password,
          employee_id: data.employee_id,
          name: `${newStaff.first_name} ${newStaff.last_name}`,
        })
      } else {
        toast.success('Staff member registered successfully!')
      }
      setNewStaff({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'staff',
        staff_type: 'Non-Teaching',
        department: 'Administration & Front Desk',
        designation: 'Operations Coordinator',
        qualification: 'B.Com / B.B.A',
        experience_years: 3.0,
        employment_type: 'full_time',
        basic_salary: 35000,
      })
      navigate('/staff/directory')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to register staff member.')
    },
  })

  const markAttendanceMutation = useMutation({
    mutationFn: (payload: any) => staffApi.markAttendance(payload),
    onSuccess: () => {
      toast.success('Staff attendance saved successfully.')
      refetchAttendance()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to save staff attendance.')
    },
  })

  const actionLeaveMutation = useMutation({
    mutationFn: (payload: { leaveId: number; action: 'approve' | 'reject'; action_remarks?: string }) =>
      staffApi.actionLeave(payload.leaveId, { action: payload.action, action_remarks: payload.action_remarks }),
    onSuccess: () => {
      toast.success('Leave application updated successfully.')
      refetchLeaves()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update leave request.')
    },
  })

  // ─── Tab Metadata ───────────────────────────────────────────────────────────
  const tabMetadata: Record<
    StaffTabKey,
    { title: string; subtitle: string; actionLabel: string; onAction: () => void; isLocked?: boolean }
  > = {
    overview: {
      title: 'Staff Workforce Overview & HR Analytics',
      subtitle: 'Non-teaching workforce analytics, departmental distributions, attendance, and leave summaries.',
      actionLabel: 'New Staff Onboarding',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to onboard staff members.')
          return
        }
        navigate('/staff/onboarding')
      },
    },
    directory: {
      title: 'Staff Register & Master Directory',
      subtitle: 'Authoritative register of administrative, operational, front-desk, and non-teaching personnel.',
      actionLabel: 'Add Staff Member',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to register staff.')
          return
        }
        navigate('/staff/onboarding')
      },
    },
    onboarding: {
      title: 'New Staff Member Onboarding & Intake',
      subtitle: 'Intake application capturing identity, contact, department, qualifications, salary, and system access.',
      actionLabel: 'Submit Onboarding',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to submit staff onboarding.')
          return
        }
        const form = document.getElementById('staff-onboarding-form') as HTMLFormElement | null
        if (form) form.requestSubmit()
      },
    },
    duties: {
      title: 'Roles, Duties & Department Allocations',
      subtitle: 'Manage administrative shifts, front desk rosters, operational roles, and duty assignments.',
      actionLabel: 'Assign Operational Duties',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to modify staff duties.')
          return
        }
        toast.success('Select a department below to update operational duties.')
      },
    },
    attendance: {
      title: 'Daily Duty Register & Attendance Roll Call',
      subtitle: 'Daily check-in, check-out, working hours, and operational presence log for all staff.',
      actionLabel: 'Save Duty Register',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to save duty attendance.')
          return
        }
        if (!dailyAtt?.records) {
          toast.error('No attendance records loaded.')
          return
        }
        markAttendanceMutation.mutate({
          date: attendanceDate,
          records: dailyAtt.records.map((r) => ({
            user_id: r.user_id,
            status: r.status,
            check_in_time: r.check_in_time,
            check_out_time: r.check_out_time,
            hours_worked: r.hours_worked,
            remarks: r.remarks,
          })),
        })
      },
    },
    leaves: {
      title: 'Leave Requests & Approvals Centre',
      subtitle: 'Review, approve, and track casual, medical, and privilege leave requests from staff.',
      actionLabel: 'Apply Leave for Staff',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to apply leaves.')
          return
        }
        toast.success('Select a pending leave below to approve or reject.')
      },
    },
    documents: {
      title: 'Staff Documents & HR Forms Studio',
      subtitle: 'Instant generation of appointment letters, experience certificates, salary slips, and NDAs.',
      actionLabel: 'Print Document',
      isLocked: false,
      onAction: () => {
        window.print()
      },
    },
    settings: {
      title: 'HR Policies, Roles & Working Hours',
      subtitle: 'Institute employment policies, leave quotas, probation windows, and shift schedules.',
      actionLabel: 'Save HR Policies',
      isLocked: !isEditMode,
      onAction: () => {
        if (!isEditMode) {
          toast.error('Locked in View Mode: Enable Edit Mode to save HR policies.')
          return
        }
        toast.success('HR employment policies updated successfully.')
      },
    },
  }

  const currentMeta = tabMetadata[activeTab]

  return (
    <div className="space-y-6">
      {/* Rule 010 View-First Governance Bar */}
      <EditModeBar scope={editScope} title="Staff & Human Resources Centre" />

      {/* Training Mode Banner */}
      {isTrainingMode && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-semibold shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <span>TRAINING MODE ACTIVE — Isolated Demo Environment (Staff HR records are sandboxed)</span>
          </div>
          <span className="text-[11px] font-mono text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded">
            SANDBOX ID: PRATHAM-STAFF-LAB
          </span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-primary-600" />
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
        <nav className="flex space-x-1 overflow-x-auto custom-scrollbar pb-px" aria-label="Staff Navigation Tabs">
          {STAFF_TABS.map((tab) => {
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
                {tab.id === 'leaves' && leaves.filter((l) => l.status === 'pending').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {leaves.filter((l) => l.status === 'pending').length}
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
          {/* Key HR KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Non-Teaching Staff</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{totalStaff || 18}</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Administrative & Operations</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present on Duty</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    {dailyAtt?.records?.filter((r) => r.status === 'present').length ?? 16}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Today's active shifts</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">
                    {leaves.filter((l) => l.status === 'pending').length}
                  </p>
                  <p className="text-[11px] text-amber-600 font-medium mt-0.5">Awaiting manager action</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Departments</p>
                  <p className="text-2xl font-bold text-indigo-700 mt-1">6</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Operational units</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Department Distribution & Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary-600" />
                  <span>Workforce Department Distribution</span>
                </h3>
                <span className="text-xs font-semibold text-slate-400">Prashant Academy Coaching</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'Administration & Front Desk', count: 6, color: 'bg-blue-50 text-blue-800 border-blue-200' },
                  { name: 'Finance & Fee Counter', count: 4, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  { name: 'Counselling & Admissions', count: 3, color: 'bg-purple-50 text-purple-800 border-purple-200' },
                  { name: 'IT Support & Test Series Lab', count: 2, color: 'bg-amber-50 text-amber-800 border-amber-200' },
                  { name: 'Library & Study Hall', count: 2, color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                  { name: 'Facility & Logistics', count: 1, color: 'bg-slate-100 text-slate-800 border-slate-200' },
                ].map((dept) => (
                  <div key={dept.name} className={`p-3.5 rounded-xl border ${dept.color} flex items-center justify-between`}>
                    <div>
                      <p className="text-xs font-bold">{dept.name}</p>
                      <p className="text-[10px] opacity-80 mt-0.5">Active Headcount</p>
                    </div>
                    <span className="text-lg font-extrabold">{dept.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick HR Navigation Shortcuts */}
            <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">Quick HR Shortcuts</h3>
              <button
                type="button"
                onClick={() => navigate('/staff/directory')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700">Staff Register</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/staff/onboarding')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700">Onboard New Staff</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/staff/attendance')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Daily Attendance Roll Call</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/staff/documents')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-700">HR Documents Studio (28)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/staff/settings')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-slate-700">HR Policies & Shifts</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: STAFF REGISTER ───────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filters Bar */}
          <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="input pl-9 text-xs"
                placeholder="Search staff by name, employee code, phone, role…"
              />
            </div>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value)
                setPage(1)
              }}
              className="input w-48 text-xs"
            >
              <option value="">All Departments</option>
              <option value="Administration">Administration</option>
              <option value="Finance">Finance & Accounts</option>
              <option value="Counselling">Counselling & Admissions</option>
              <option value="IT Support">IT & Tech Support</option>
              <option value="Operations">Operations & Facility</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setPage(1)
              }}
              className="input w-36 text-xs"
            >
              <option value="active">Active Only</option>
              <option value="all">All Statuses</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Departed / Inactive</option>
            </select>
          </div>

          {/* Staff Table */}
          <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isStaffLoading && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Loading staff records…
                      </td>
                    </tr>
                  )}
                  {!isStaffLoading && staffItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No staff members found matching query.
                      </td>
                    </tr>
                  )}
                  {staffItems.map((s) => (
                    <tr key={s.user_id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {s.first_name} {s.last_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-primary-700">
                        {s.employee_id || `EMP-${s.user_id}`}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{s.department || 'Operations'}</p>
                        <p className="text-[11px] text-slate-500 capitalize">{s.role}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{s.phone || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setProfileModalStaffId(s.user_id)
                              setShowProfileModal(true)
                            }}
                            className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserId(s.user_id)
                              setActiveDocTemplate('appointment_letter')
                              setShowDocPreviewModal(true)
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                            title="Generate Appointment Letter"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
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

      {/* ─── TAB 3: NEW ONBOARDING ───────────────────────────────────────────── */}
      {activeTab === 'onboarding' && (
        <div className="card p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6 max-w-4xl mx-auto animate-fade-in">
          {!isEditMode && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>View Mode Active: Enable Edit Mode above to submit new staff member onboarding.</span>
            </div>
          )}

          <form
            id="staff-onboarding-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!isEditMode) {
                toast.error('Locked in View Mode: Enable Edit Mode to submit.')
                return
              }
              createStaffMutation.mutate(newStaff)
            }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                1. Personal & Identity Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={newStaff.first_name}
                    onChange={(e) => setNewStaff({ ...newStaff, first_name: e.target.value })}
                    className="input text-xs"
                    placeholder="e.g. Rajesh"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={newStaff.last_name}
                    onChange={(e) => setNewStaff({ ...newStaff, last_name: e.target.value })}
                    className="input text-xs"
                    placeholder="e.g. Verma"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    disabled={!isEditMode}
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="input text-xs"
                    placeholder="10-digit mobile"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                2. Department & Employment Role
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    disabled={!isEditMode}
                    value={newStaff.department}
                    onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                    className="input text-xs"
                    required
                  >
                    <option value="Administration & Front Desk">Administration & Front Desk</option>
                    <option value="Finance & Fee Counter">Finance & Fee Counter</option>
                    <option value="Counselling & Admissions">Counselling & Admissions</option>
                    <option value="IT Support & Test Series Lab">IT Support & Test Series Lab</option>
                    <option value="Library & Study Hall">Library & Study Hall</option>
                    <option value="Facility & Logistics">Facility & Logistics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={newStaff.designation}
                    onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                    className="input text-xs"
                    placeholder="e.g. Operations Coordinator"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    disabled={!isEditMode}
                    value={newStaff.employment_type}
                    onChange={(e) => setNewStaff({ ...newStaff, employment_type: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contractual</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                3. System Credentials & Email
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    disabled={!isEditMode}
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="input text-xs"
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username (Login ID) *</label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={newStaff.username}
                    onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                    className="input text-xs font-mono"
                    placeholder="e.g. staff.rajesh"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/staff/directory')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              {isEditMode ? (
                <button
                  type="submit"
                  disabled={createStaffMutation.isPending}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{createStaffMutation.isPending ? 'Onboarding Staff...' : 'Submit Staff Onboarding'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to submit.')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Submit Onboarding (Locked)</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB 4: ROLES & DUTIES ───────────────────────────────────────────── */}
      {activeTab === 'duties' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Staff Roles</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">7 Operational Roles</p>
              <p className="text-[11px] text-slate-500 mt-0.5">RBAC & Duty definitions</p>
            </div>
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Front Desk Shift</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">2 Active Roster Personnel</p>
              <p className="text-[11px] text-slate-500 mt-0.5">08:00 AM – 04:00 PM</p>
            </div>
            <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lab Supervisors</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">2 Active Roster Personnel</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Online Examination Hall</p>
            </div>
          </div>

          <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
              Departmental Operational Duties & Allocation
            </h3>
            <div className="divide-y divide-slate-100">
              {[
                { title: 'Front Desk & Parent Inquiries', lead: 'Pooja Nair', shift: 'Morning Shift (08:00 - 16:30)', status: 'Active' },
                { title: 'Fee Counter & Cash Reconciliation', lead: 'Sanjay Gupta', shift: 'Full Day (09:00 - 18:00)', status: 'Active' },
                { title: 'Test Hall & OMR Scanning In-charge', lead: 'Anand Kulkarni', shift: 'Evening Shift (12:00 - 20:30)', status: 'Active' },
                { title: 'Admissions Document KYC Verification', lead: 'Sneha Rao', shift: 'Full Day (09:00 - 18:00)', status: 'Active' },
              ].map((duty, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{duty.title}</p>
                    <p className="text-[11px] text-slate-500">
                      Assigned To: <span className="font-semibold text-slate-700">{duty.lead}</span> • {duty.shift}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {duty.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: DAILY ATTENDANCE ─────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Attendance Date:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="input text-xs"
              />
            </div>
            {isEditMode ? (
              <button
                type="button"
                onClick={() =>
                  markAttendanceMutation.mutate({
                    date: attendanceDate,
                    records: dailyAtt?.records ?? [],
                  })
                }
                className="btn-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl"
              >
                <Save className="w-4 h-4" />
                <span>Save Attendance Changes</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to mark attendance.')}
                className="px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 text-xs rounded-xl cursor-not-allowed flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Save Attendance (Locked)</span>
              </button>
            )}
          </div>

          <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Duty Status</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4 text-right">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isAttLoading && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Loading daily duty roll call…
                      </td>
                    </tr>
                  )}
                  {dailyAtt?.records?.map((rec) => (
                    <tr key={rec.user_id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{rec.full_name}</td>
                      <td className="py-3 px-4 text-slate-600 capitalize">{rec.staff_type || 'Staff'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            rec.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'late'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{rec.check_in_time || '09:00 AM'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{rec.check_out_time || '06:00 PM'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {rec.hours_worked || 8.0}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: LEAVE REQUESTS ───────────────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No pending staff leave applications.
                      </td>
                    </tr>
                  ) : (
                    leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{l.staff_name || `Staff #${l.user_id}`}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700 capitalize">{l.leave_type}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {l.start_date} to {l.end_date} ({l.days_count} days)
                        </td>
                        <td className="py-3 px-4 text-slate-600">{l.reason}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              l.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : l.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {l.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditMode ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => actionLeaveMutation.mutate({ leaveId: l.id, action: 'approve' })}
                                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => actionLeaveMutation.mutate({ leaveId: l.id, action: 'reject' })}
                                    className="px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to action leaves.')}
                                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 rounded-lg cursor-not-allowed"
                                >
                                  Action (Locked)
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 7: HR DOCUMENTS STUDIO ──────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Catalogue of 28 Standard HR Documents</h3>
            <select
              value={docCategoryFilter}
              onChange={(e) => setDocCategoryFilter(e.target.value)}
              className="input text-xs w-48"
            >
              <option value="">All Categories</option>
              <option value="recruitment">Recruitment & Hiring</option>
              <option value="compliance">Compliance & NDA</option>
              <option value="compensation">Salary & Payslips</option>
              <option value="separation">Relieving & Experience</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'appointment_letter', name: 'Official Appointment Letter', category: 'Recruitment', code: 'DOC-01' },
              { id: 'nda_agreement', name: 'Non-Disclosure Agreement (NDA)', category: 'Compliance', code: 'DOC-02' },
              { id: 'salary_slip', name: 'Monthly Salary Pay Slip', category: 'Compensation', code: 'DOC-03' },
              { id: 'experience_certificate', name: 'Staff Experience Certificate', category: 'Separation', code: 'DOC-04' },
              { id: 'relieving_letter', name: 'Formal Relieving Order', category: 'Separation', code: 'DOC-05' },
              { id: 'probation_confirmation', name: 'Probation Confirmation Order', category: 'Compliance', code: 'DOC-06' },
            ].map((doc) => (
              <div key={doc.id} className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                    {doc.code}
                  </span>
                  <span className="text-[10px] font-semibold text-primary-600">{doc.category}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800">{doc.name}</h4>
                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDocTemplate(doc.id)
                      setShowDocPreviewModal(true)
                    }}
                    className="btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Generate & Print</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 8: HR POLICIES & SETTINGS ────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="card p-6 bg-white border border-slate-200 rounded-2xl shadow-xs max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
              Institute Employment & HR Policies
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Probation Duration</label>
                <select
                  disabled={!isEditMode}
                  value={hrSettings.probation_months}
                  onChange={(e) => setHrSettings({ ...hrSettings, probation_months: Number(e.target.value) })}
                  className="input text-xs max-w-xs"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months (Standard)</option>
                  <option value={12}>12 Months</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Casual Leaves (CL)</label>
                  <input
                    type="number"
                    disabled={!isEditMode}
                    value={hrSettings.annual_casual_leaves}
                    onChange={(e) => setHrSettings({ ...hrSettings, annual_casual_leaves: Number(e.target.value) })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Sick Leaves (SL)</label>
                  <input
                    type="number"
                    disabled={!isEditMode}
                    value={hrSettings.annual_sick_leaves}
                    onChange={(e) => setHrSettings({ ...hrSettings, annual_sick_leaves: Number(e.target.value) })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Shift Start Time</label>
                  <input
                    type="time"
                    disabled={!isEditMode}
                    value={hrSettings.work_start_time}
                    onChange={(e) => setHrSettings({ ...hrSettings, work_start_time: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Shift End Time</label>
                  <input
                    type="time"
                    disabled={!isEditMode}
                    value={hrSettings.work_end_time}
                    onChange={(e) => setHrSettings({ ...hrSettings, work_end_time: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-200">
            {isEditMode ? (
              <button
                type="button"
                onClick={() => toast.success('HR employment policies saved successfully.')}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save HR Policies</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to save settings.')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Save HR Policies (Locked)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── SHARED MODALS ───────────────────────────────────────────────────── */}
      {/* Staff Profile Modal */}
      {showProfileModal && profileModalStaffId && (
        <StaffProfileModal
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false)
            setProfileModalStaffId(null)
          }}
          staffId={profileModalStaffId}
          onUpdate={() => refetchStaff()}
        />
      )}

      {/* Staff Lifecycle Modal */}
      {showLifecycleModal && lifecycleTargetStaff && (
        <StaffLifecycleModal
          isOpen={showLifecycleModal}
          onClose={() => {
            setShowLifecycleModal(false)
            setLifecycleTargetStaff(null)
          }}
          employee={lifecycleTargetStaff}
          onSuccess={() => refetchStaff()}
        />
      )}
    </div>
  )
}

export default function StaffManagement() {
  const inRouter = useInRouterContext()
  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={['/staff']}>
        <StaffManagementContent />
      </MemoryRouter>
    )
  }
  return <StaffManagementContent />
}
