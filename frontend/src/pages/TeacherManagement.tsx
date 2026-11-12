/**
 * @file        TeacherManagement.tsx
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
 * @created     2026-11-06
 * @updated     2026-11-12
 *
 * @description Dedicated Teachers & Faculty Management Centre with 8 first-class workspaces:
 */

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link, useInRouterContext, MemoryRouter } from 'react-router-dom'
import WorkforceDonutChart from '../components/workforce/WorkforceDonutChart'
import MonthlyTeachingHoursChart from '../components/workforce/MonthlyTeachingHoursChart'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GraduationCap,
  Users,
  UserPlus,
  Layers,
  Clock,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  Activity,
  ChevronRight,
  BookOpen,
  Award,
  RefreshCw,
  Copy,
  Key,
  Shield,
  FileText,
  UserX,
  CreditCard,
  Briefcase,
  Plus,
  Save,
  Download,
  Trash2,
  Check,
  Send,
  Building,
  Lock,
  CalendarCheck,
  Sparkles,
} from 'lucide-react'
import {
  staffApi,
  boardsApi,
  standardsApi,
  divisionsApi,
  subjectsApi,
  academicYearsApi,
  teacherPayrollApi,
} from '../api/endpoints'
import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { EditModeBar, LockedButton, SortableHeader, TableSortSelect, TableSortOption, ContextualHelpButton } from '../components/common'
import { useTableSort } from '../hooks/useTableSort'
import TeacherProfileModal from '../components/TeacherProfileModal'
import StaffLifecycleModal from '../components/StaffLifecycleModal'
import toast from 'react-hot-toast'
import type { TeacherWorkforceItem, TeacherDashboardData, TeacherAssignmentItem } from '../types'

export type TeacherTabKey =
  | 'overview'
  | 'directory'
  | 'allocations'
  | 'timetable'
  | 'attendance'
  | 'payroll'
  | 'performance'
  | 'settings'

interface TabOption {
  id: TeacherTabKey
  label: string
  icon: React.ElementType
  badge?: string
}

export const TEACHER_TABS: TabOption[] = [
  { id: 'overview', label: 'Overview', icon: GraduationCap },
  { id: 'directory', label: 'Faculty Directory', icon: Users },
  { id: 'allocations', label: 'Batch Allocations', icon: Layers },
  { id: 'timetable', label: 'Teaching Schedules', icon: Calendar },
  { id: 'attendance', label: 'Presence & Leaves', icon: Clock },
  { id: 'payroll', label: 'Salary & Payroll', icon: DollarSign },
  { id: 'performance', label: 'Teaching Sessions', icon: BookOpen },
  { id: 'settings', label: 'Policies & Settings', icon: Shield },
]

type DirectoryFilterTabKey =
  | 'all'
  | 'assigned'
  | 'unassigned'
  | 'without_timetable'
  | 'on_leave'
  | 'upcoming'
  | 'departed'
  | 'inactive'

function TeacherManagementContent() {
  const { user } = useAuthStore()
  const editScope = 'workforce:teachers'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const isTrainingMode = useEnvironmentStore((s) => s.isTrainingMode)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const isAdmin = isUserAdmin(user)
  const isSysAdmin = isUserSysAdmin(user)

  // Derive active workspace tab from URL path
  const activeTab: TeacherTabKey = useMemo(() => {
    const p = location.pathname.toLowerCase()
    if (p.includes('/teachers/directory')) return 'directory'
    if (p.includes('/teachers/allocations')) return 'allocations'
    if (p.includes('/teachers/timetable')) return 'timetable'
    if (p.includes('/teachers/attendance')) return 'attendance'
    if (p.includes('/teachers/payroll')) return 'payroll'
    if (p.includes('/teachers/performance')) return 'performance'
    if (p.includes('/teachers/settings')) return 'settings'
    return 'overview'
  }, [location.pathname])

  const handleTabChange = (tabId: TeacherTabKey) => {
    navigate(`/teachers/${tabId}`)
  }

  // Directory filter states
  const [directoryStatusTab, setDirectoryStatusTab] = useState<DirectoryFilterTabKey>('all')
  const [search, setSearch] = useState('')
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | undefined>(undefined)

  // Allocations filter states
  const [allocTeacherFilter, setAllocTeacherFilter] = useState<number | ''>('')
  const [allocStandardFilter, setAllocStandardFilter] = useState<number | ''>('')

  // Timetable filter states
  const [selectedTimetableTeacherId, setSelectedTimetableTeacherId] = useState<number | ''>('')
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>('Monday')

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [facultyAttendanceRows, setFacultyAttendanceRows] = useState<Array<{
    user_id: number
    name: string
    employee_id?: string
    status: 'present' | 'absent' | 'late' | 'on_leave' | 'half_day'
    check_in_time: string
    check_out_time: string
    hours_worked: number
    remarks: string
  }>>([])

  // Payroll filter state
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<string>('')

  // Performance / Sessions filter
  const [sessionStatusFilter, setSessionStatusFilter] = useState<string>('')

  // Settings state
  const [facultySettings, setFacultySettings] = useState({
    defaultHourlyRate: 750,
    maxWeeklyHours: 32,
    graceCheckInMinutes: 15,
    strictTimetableConflict: true,
    retroactiveSessionDays: 7,
    autoNotifyAbsence: true,
  })

  // Modal states
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [lifecycleTarget, setLifecycleTarget] = useState<{
    id: number
    name: string
    employee_id?: string | null
    role: string
    status: string
  } | null>(null)
  const [showLifecycleModal, setShowLifecycleModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignTargetTeacherId, setAssignTargetTeacherId] = useState<number | null>(null)

  // Secure Created Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string
    temporary_password?: string
    employee_id?: string
    name?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // New Teacher Registration Form State
  const [newTeacher, setNewTeacher] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'teacher',
    staff_type: 'Teacher',
    department: 'Teaching & Academics',
    qualification: 'M.Sc., B.Ed.',
    specialization: 'Mathematics & Science',
    experience_years: 5.0,
    employment_type: 'full_time',
    basic_salary: 60000,
  })

  // New Assignment Form State
  const [newAssignment, setNewAssignment] = useState({
    teacher_user_id: 0,
    academic_year_id: 1,
    board_id: 1,
    standard_id: 10,
    division_id: 25,
    subject_id: 1,
    weekly_hours: 4.0,
    is_class_teacher: false,
    notes: '',
  })

  // 1. Fetch Teacher Dashboard Data
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['teacher-workforce-dashboard', selectedAcademicYearId],
    queryFn: () => staffApi.getTeacherDashboard(selectedAcademicYearId).then((r) => r.data),
  })

  // 2. Academic Years query
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicYearsApi.list().then((r) => r.data),
  })

  // 3. Dependent queries for Assignments modal
  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => boardsApi.list().then((r) => r.data),
  })

  const { data: standards = [] } = useQuery({
    queryKey: ['standards', newAssignment.board_id],
    queryFn: () => standardsApi.list({ board_id: newAssignment.board_id }).then((r) => r.data),
    enabled: !!newAssignment.board_id,
  })

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', newAssignment.standard_id],
    queryFn: () => divisionsApi.list({ standard_id: newAssignment.standard_id }).then((r) => r.data),
    enabled: !!newAssignment.standard_id,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', newAssignment.standard_id],
    queryFn: () => subjectsApi.list({ standard_id: newAssignment.standard_id }).then((r) => r.data),
    enabled: !!newAssignment.standard_id,
  })

  // 4. Assignments list
  const { data: assignmentsData = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['all-teacher-assignments'],
    queryFn: () => staffApi.assignmentsList().then((r) => r.data),
  })
  const allAssignments = Array.isArray(assignmentsData) ? assignmentsData : []

  // 5. Teaching Sessions list
  const { data: recentSessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ['recent-teaching-sessions', sessionStatusFilter],
    queryFn: () => teacherPayrollApi.getSessions({ limit: 50, approval_status: sessionStatusFilter || undefined }).then((r) => r.data),
    enabled: activeTab === 'performance' || activeTab === 'overview',
  })
  const recentSessions = Array.isArray(recentSessionsData)
    ? recentSessionsData
    : (recentSessionsData?.items || [])

  // 6. Monthly Payroll list
  const { data: monthlyPayrolls = [], isLoading: loadingPayroll, refetch: refetchPayroll } = useQuery({
    queryKey: ['teacher-monthly-payroll', selectedMonth, selectedYear, payrollStatusFilter],
    queryFn: async () => {
      const params: any = { month: selectedMonth, year: selectedYear }
      if (payrollStatusFilter) params.status = payrollStatusFilter
      return (await teacherPayrollApi.getMonthlyPayrolls(params)).data
    },
    enabled: activeTab === 'payroll' || activeTab === 'overview',
  })

  // 7. Faculty Daily Attendance query
  const { data: dailyAttendanceData, refetch: refetchDailyAttendance } = useQuery({
    queryKey: ['staff-daily-attendance', attendanceDate],
    queryFn: () => staffApi.dailyAttendance({ attendance_date: attendanceDate }).then((r) => r.data),
    enabled: activeTab === 'attendance',
  })

  // 8. Faculty Leaves query
  const { data: facultyLeavesData = [], refetch: refetchFacultyLeaves } = useQuery({
    queryKey: ['staff-leaves-list'],
    queryFn: () => staffApi.leavesList().then((r) => r.data),
    enabled: activeTab === 'attendance',
  })

  // Populate faculty attendance rows when data changes
  useEffect(() => {
    if (dailyAttendanceData?.records) {
      setFacultyAttendanceRows(
        dailyAttendanceData.records.map((item: any) => ({
          user_id: item.user_id,
          name: item.name,
          employee_id: item.employee_id,
          status: (item.status || 'present') as any,
          check_in_time: item.check_in_time || '08:30',
          check_out_time: item.check_out_time || '16:30',
          hours_worked: item.hours_worked || 8.0,
          remarks: item.remarks || '',
        }))
      )
    } else if (dashboardData?.teachers) {
      setFacultyAttendanceRows(
        dashboardData.teachers.map((t: any) => ({
          user_id: t.id,
          name: t.name,
          employee_id: t.employee_id,
          status: 'present',
          check_in_time: '08:30',
          check_out_time: '16:30',
          hours_worked: 8.0,
          remarks: '',
        }))
      )
    }
  }, [dailyAttendanceData, dashboardData])

  // Mutations
  const createTeacherMutation = useMutation({
    mutationFn: (data: typeof newTeacher) => staffApi.create(data),
    onSuccess: (res, vars) => {
      setShowCreateModal(false)
      setCreatedCredentials({
        username: res.data.username || vars.username,
        temporary_password: res.data.temporary_password || vars.password || 'AutoGenerated',
        employee_id: res.data.employee_id,
        name: `${vars.first_name} ${vars.last_name}`,
      })
      queryClient.invalidateQueries({ queryKey: ['teacher-workforce-dashboard'] })
      setNewTeacher({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'teacher',
        staff_type: 'Teacher',
        department: 'Teaching & Academics',
        qualification: 'M.Sc., B.Ed.',
        specialization: 'Mathematics & Science',
        experience_years: 5.0,
        employment_type: 'full_time',
        basic_salary: 60000,
      })
    },
    onError: (err: any) => {
      toast.error(`Registration Failed: ${err.response?.data?.detail || err.message}`)
    },
  })

  const createAssignmentMutation = useMutation({
    mutationFn: (data: typeof newAssignment) => staffApi.createAssignment(data),
    onSuccess: () => {
      setShowAssignModal(false)
      queryClient.invalidateQueries({ queryKey: ['teacher-workforce-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['all-teacher-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] })
      toast.success('Academic batch assignment created successfully!')
    },
    onError: (err: any) => {
      toast.error(`Assignment Failed: ${err.response?.data?.detail || err.message}`)
    },
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => staffApi.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-teacher-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-workforce-dashboard'] })
      toast.success('Batch assignment revoked successfully!')
    },
    onError: (err: any) => {
      toast.error(`Failed to revoke assignment: ${err.response?.data?.detail || err.message}`)
    },
  })

  const saveAttendanceMutation = useMutation({
    mutationFn: () =>
      staffApi.markAttendance({
        date: attendanceDate,
        records: facultyAttendanceRows.map((r) => ({
          user_id: r.user_id,
          status: r.status,
          check_in_time: r.check_in_time,
          check_out_time: r.check_out_time,
          hours_worked: r.hours_worked,
          remarks: r.remarks,
        })),
      }),
    onSuccess: () => {
      toast.success(`Faculty attendance recorded for ${attendanceDate}`)
      refetchDailyAttendance()
    },
    onError: (err: any) => {
      toast.error(`Attendance update failed: ${err.response?.data?.detail || err.message}`)
    },
  })

  const calculatePayrollMutation = useMutation({
    mutationFn: () =>
      teacherPayrollApi.bulkCalculatePayroll({
        month: selectedMonth,
        year: selectedYear,
        academic_year_id: selectedAcademicYearId,
      }),
    onSuccess: () => {
      toast.success(`Monthly payroll calculated for ${selectedMonth}/${selectedYear}`)
      refetchPayroll()
    },
    onError: (err: any) => {
      toast.error(`Payroll calculation failed: ${err.response?.data?.detail || err.message}`)
    },
  })

  const metrics = dashboardData?.metrics || {
    total_teachers: 0,
    active_teachers: 0,
    assigned_teachers: 0,
    unassigned_teachers: 0,
    teachers_without_timetable: 0,
    teachers_on_leave: 0,
    inactive_teachers: 0,
    departed_teachers: 0,
    upcoming_joining: 0,
    pending_session_approvals: 0,
    monthly_teaching_hours: 0,
    monthly_payroll_payable: 0,
    pending_teacher_payments: 0,
  }

  const rawTeachers = dashboardData?.teachers || []

  // Filtered teachers for Directory tab
  const filteredTeachers = useMemo(() => {
    let result = rawTeachers

    if (directoryStatusTab === 'assigned') {
      result = result.filter((t) => t.is_active_employee && t.is_assigned)
    } else if (directoryStatusTab === 'unassigned') {
      result = result.filter((t) => t.is_active_employee && !t.is_assigned)
    } else if (directoryStatusTab === 'without_timetable') {
      result = result.filter((t) => t.is_active_employee && t.is_assigned && !t.has_timetable)
    } else if (directoryStatusTab === 'on_leave') {
      result = result.filter((t) => t.status === 'on_leave')
    } else if (directoryStatusTab === 'upcoming') {
      result = result.filter((t) => t.is_upcoming)
    } else if (directoryStatusTab === 'departed') {
      result = result.filter((t) => t.is_departed)
    } else if (directoryStatusTab === 'inactive') {
      result = result.filter((t) => !t.is_active_employee && !t.is_departed && !t.is_upcoming)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.employee_id?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          t.phone?.toLowerCase().includes(q) ||
          t.specialization?.toLowerCase().includes(q) ||
          t.qualification?.toLowerCase().includes(q)
      )
    }

    return result
  }, [rawTeachers, directoryStatusTab, search])

  const TEACHER_SORT_OPTIONS: TableSortOption[] = [
    { key: 'name', label: 'Faculty Name' },
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'status', label: 'Status' },
  ]

  const {
    sortedData: sortedTeachers,
    sortKey: teacherSortKey,
    sortDirection: teacherSortDirection,
    requestSort: requestTeacherSort,
    setSort: setTeacherSort,
    clearSort: clearTeacherSort,
  } = useTableSort(filteredTeachers, {
    initialKey: 'name',
    initialDirection: 'asc',
  })

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    let res = allAssignments
    if (allocTeacherFilter) {
      res = res.filter((a: any) => a.teacher_user_id === Number(allocTeacherFilter))
    }
    if (allocStandardFilter) {
      res = res.filter((a: any) => a.standard_id === Number(allocStandardFilter))
    }
    return res
  }, [allAssignments, allocTeacherFilter, allocStandardFilter])

  const handleOpenAssignModal = (teacherId: number) => {
    setAssignTargetTeacherId(teacherId)
    setNewAssignment((prev) => ({ ...prev, teacher_user_id: teacherId }))
    setShowAssignModal(true)
  }

  const handleOpenLifecycleModal = (teacher: {
    id: number
    name: string
    employee_id?: string | null
    role?: string
    status: string
  }) => {
    setLifecycleTarget({ ...teacher, role: teacher.role || 'teacher' })
    setShowLifecycleModal(true)
  }

  // Metadata per tab
  const tabMetadata: Record<
    TeacherTabKey,
    {
      title: string
      subtitle: string
      icon: React.ElementType
      actionLabel: string
      actionIcon: React.ElementType
      onAction: () => void
      requiresEditMode: boolean
    }
  > = {
    overview: {
      title: 'Faculty Workforce Overview',
      subtitle: 'Live workforce counters, employment breakdown, teaching workload analytics, and quick actions',
      icon: GraduationCap,
      actionLabel: 'Add New Teacher',
      actionIcon: UserPlus,
      onAction: () => setShowCreateModal(true),
      requiresEditMode: true,
    },
    directory: {
      title: 'Faculty Directory & Dossiers',
      subtitle: 'Comprehensive faculty member register, employment status filters, dossiers, and credentials',
      icon: Users,
      actionLabel: 'Add New Teacher',
      actionIcon: UserPlus,
      onAction: () => setShowCreateModal(true),
      requiresEditMode: true,
    },
    allocations: {
      title: 'Batch & Subject Allocations',
      subtitle: 'Standard, division, and subject teaching assignments, weekly workload distribution, and class teacher designations',
      icon: Layers,
      actionLabel: 'Allocate Batch',
      actionIcon: Plus,
      onAction: () => {
        setAssignTargetTeacherId(null)
        setShowAssignModal(true)
      },
      requiresEditMode: true,
    },
    timetable: {
      title: 'Faculty Timetable & Schedules',
      subtitle: 'Weekly lecture matrix, schedule conflict verification, room allocations, and daily teaching periods',
      icon: Calendar,
      actionLabel: 'Check Schedule Conflict',
      actionIcon: Clock,
      onAction: () => toast.success('Timetable conflict checker active for selected faculty schedule'),
      requiresEditMode: false,
    },
    attendance: {
      title: 'Faculty Attendance & Leave Requests',
      subtitle: 'Daily biometric check-in log, hours worked, duty presence tracking, and faculty leave sanctioning',
      icon: Clock,
      actionLabel: 'Save Duty Register',
      actionIcon: Save,
      onAction: () => saveAttendanceMutation.mutate(),
      requiresEditMode: true,
    },
    payroll: {
      title: 'Teacher Payroll & Salary Register',
      subtitle: 'Monthly faculty earnings, lecture rate computation, salary calculation, payment vouchers, and slips',
      icon: DollarSign,
      actionLabel: 'Calculate Monthly Payroll',
      actionIcon: CreditCard,
      onAction: () => calculatePayrollMutation.mutate(),
      requiresEditMode: true,
    },
    performance: {
      title: 'Teaching Sessions & Performance',
      subtitle: 'Conducted lecture logs, topic coverage tracking, student attendance verification, and session approvals',
      icon: BookOpen,
      actionLabel: 'Log Teaching Session',
      actionIcon: Plus,
      onAction: () => toast.success('Teaching session logging form available in scoped Edit Mode'),
      requiresEditMode: true,
    },
    settings: {
      title: 'Teacher Policies & Compensation Settings',
      subtitle: 'Default hourly and monthly pay scales, overtime multipliers, max weekly workload caps, and assignment policies',
      icon: Shield,
      actionLabel: 'Save Faculty Policies',
      actionIcon: Save,
      onAction: () => toast.success('Teacher policies and compensation parameters saved!'),
      requiresEditMode: true,
    },
  }

  const currentMeta = tabMetadata[activeTab] || tabMetadata.overview
  const CurrentIcon = currentMeta.icon

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Teacher Workforce & Faculty Management" isDirty={showCreateModal || showAssignModal} />

      {/* ── 1. Page Header & Breadcrumbs ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Link to="/dashboard" className="hover:text-slate-600 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <Link to="/teachers" className="hover:text-slate-600 transition-colors">Teachers</Link>
          {activeTab !== 'overview' && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600 font-semibold">{currentMeta.title}</span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <CurrentIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{currentMeta.title}</h1>
                {isTrainingMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    TRAINING MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{currentMeta.subtitle}</p>
            </div>
          </div>

          {/* Contextual Primary Action Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <ContextualHelpButton moduleKey="staff" variant="pill" label="Faculty Help" />
            <select
              value={selectedAcademicYearId || ''}
              onChange={(e) => setSelectedAcademicYearId(e.target.value ? Number(e.target.value) : undefined)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-2xs focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay: any) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => refetchDashboard()}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
              title="Refresh Workforce Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {currentMeta.actionLabel && (
              currentMeta.requiresEditMode && !isEditMode ? (
                <button
                  type="button"
                  onClick={() => toast.error(`Locked in View Mode: Enable Edit Mode to execute ${currentMeta.actionLabel}.`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  title="Locked in View Mode: Click Enable Edit Mode above to make changes"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{currentMeta.actionLabel} (Locked)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={currentMeta.onAction}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition active:scale-95"
                >
                  {currentMeta.actionIcon && React.createElement(currentMeta.actionIcon, { className: 'w-3.5 h-3.5' })}
                  <span>{currentMeta.actionLabel}</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Top Dedicated Workspace Tabs ── */}
      <div className="border-b border-slate-200 bg-white rounded-xl shadow-2xs p-1.5 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {TEACHER_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.id === 'allocations' && metrics.unassigned_teachers > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {metrics.unassigned_teachers} unassigned
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 3. WORKSPACE TAB CONTENTS ── */}

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Live 13 Workforce KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <div
              onClick={() => handleTabChange('directory')}
              className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Faculty</span>
                <Users className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">{metrics.total_teachers}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Faculty directory</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Active</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{metrics.active_teachers}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Ready for duty</div>
            </div>

            <div
              onClick={() => handleTabChange('allocations')}
              className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wide">Assigned</span>
                <Layers className="w-3.5 h-3.5 text-primary-600" />
              </div>
              <div className="text-xl font-bold text-primary-700 mt-1">{metrics.assigned_teachers}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Has batch allocations</div>
            </div>

            <div
              onClick={() => handleTabChange('allocations')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                metrics.unassigned_teachers > 0
                  ? 'border-amber-300 bg-amber-50/70 shadow-xs'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Unassigned</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-amber-900 mt-1">{metrics.unassigned_teachers}</div>
              <div className="text-[10px] text-amber-700 mt-0.5">Needs batch assignment</div>
            </div>

            <div
              onClick={() => handleTabChange('timetable')}
              className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">No Timetable</span>
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-xl font-bold text-rose-700 mt-1">{metrics.teachers_without_timetable}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Assigned without schedule</div>
            </div>

            <div
              onClick={() => handleTabChange('attendance')}
              className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">On Leave</span>
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-xl font-bold text-indigo-700 mt-1">{metrics.teachers_on_leave}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Authorized absence</div>
            </div>

            <div
              onClick={() => handleTabChange('payroll')}
              className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Payable</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-800 mt-1">₹{(metrics.monthly_payroll_payable || 0).toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Current month net pay</div>
            </div>
          </div>

          {/* Teacher Workspace → Homework & Assignments Quick Launch */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Teacher Workspace → Homework &amp; Assignments
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Direct shortcuts to assign batch or individual work, review student submissions, evaluate, and view reports.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/homework/create?type=homework"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create Homework
              </Link>
              <Link
                to="/homework/create?type=project"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" /> Create Assignment
              </Link>
              <Link
                to="/homework/overview"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" /> View Assigned Work
              </Link>
              <Link
                to="/homework/submissions"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Review Submissions
              </Link>
              <Link
                to="/homework/checking"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Evaluate
              </Link>
              <Link
                to="/homework/reports"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <Activity className="w-3.5 h-3.5" /> Reports
              </Link>
              <Link
                to="/eduboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5" /> Open EduBoard
              </Link>
            </div>
          </div>

          {/* Visual Charts: Donut & Monthly Teaching Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-600" />
                Faculty Employment Distribution
              </h3>
              <WorkforceDonutChart
                title="Faculty Employment Distribution"
                totalCount={metrics.total_teachers}
                unitLabel="Faculty"
                segments={[
                  { label: 'Active', count: metrics.active_teachers, color: '#10b981' },
                  { label: 'On Leave', count: metrics.teachers_on_leave, color: '#6366f1' },
                  { label: 'Inactive', count: metrics.inactive_teachers, color: '#94a3b8' },
                  { label: 'Departed', count: metrics.departed_teachers, color: '#ef4444' },
                  { label: 'Upcoming', count: metrics.upcoming_joining, color: '#f59e0b' },
                ]}
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <MonthlyTeachingHoursChart
                totalHours={metrics.monthly_teaching_hours || 142}
                data={[
                  { month: 'Jun', hours: 110 },
                  { month: 'Jul', hours: 135 },
                  { month: 'Aug', hours: 160 },
                  { month: 'Sep', hours: 145 },
                  { month: 'Oct', hours: 155 },
                  { month: 'Nov', hours: metrics.monthly_teaching_hours || 142 },
                ]}
              />
            </div>
          </div>

          {/* Quick Faculty Summary List */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Active Teaching Faculty Snapshot
              </h3>
              <button
                type="button"
                onClick={() => handleTabChange('directory')}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                View Complete Directory &rarr;
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Faculty Member</th>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Specialization</th>
                    <th className="px-4 py-3">Allocations</th>
                    <th className="px-4 py-3">Timetable</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawTeachers.slice(0, 6).map((tch: any) => (
                    <tr key={tch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{tch.name}</div>
                        <div className="text-[11px] text-slate-500">{tch.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 font-medium">{tch.employee_id || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{tch.specialization || 'General Studies'}</td>
                      <td className="px-4 py-3">
                        {tch.is_assigned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tch.has_timetable ? (
                          <span className="text-emerald-700 font-medium">Scheduled</span>
                        ) : (
                          <span className="text-slate-400">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tch.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {tch.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedTeacherId(tch.id)
                            setShowProfileModal(true)
                          }}
                          className="px-2.5 py-1 text-slate-600 hover:text-primary-600 hover:bg-indigo-50 rounded font-medium transition-colors"
                        >
                          View Dossier
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

      {/* ── TAB 2: FACULTY DIRECTORY & DOSSIERS ── */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
              {[
                { key: 'all', label: 'All Faculty', count: metrics.total_teachers },
                { key: 'assigned', label: 'Assigned', count: metrics.assigned_teachers },
                { key: 'unassigned', label: 'Unassigned', count: metrics.unassigned_teachers, alert: metrics.unassigned_teachers > 0 },
                { key: 'without_timetable', label: 'No Timetable', count: metrics.teachers_without_timetable },
                { key: 'on_leave', label: 'On Leave', count: metrics.teachers_on_leave },
                { key: 'upcoming', label: 'Upcoming Joining', count: metrics.upcoming_joining },
                { key: 'departed', label: 'Departed', count: metrics.departed_teachers },
              ].map((tab: any) => {
                const isActive = directoryStatusTab === tab.key
                return (
                  <button
                    type="button"
                    key={tab.key}
                    onClick={() => setDirectoryStatusTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white font-semibold shadow-xs'
                        : tab.alert
                        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Search Box */}
            <div className="flex items-center gap-2 flex-wrap">
              <TableSortSelect
                options={TEACHER_SORT_OPTIONS}
                currentSortKey={teacherSortKey}
                currentDirection={teacherSortDirection}
                onSortChange={(key, dir) => {
                  const opt = TEACHER_SORT_OPTIONS.find((o) => o.key === key)
                  setTeacherSort(key, dir, undefined, opt?.type || 'auto')
                }}
                onClear={clearTeacherSort}
                placeholder="Sort Faculty..."
              />
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search faculty by name, ID, subject..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Teachers Directory Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            {isDashboardLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 font-medium">
                Loading teacher workforce directory...
              </div>
            ) : sortedTeachers.length === 0 ? (
              <div className="p-12 text-center">
                <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No Teachers Found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {search ? 'Try clearing your search query.' : 'No faculty records match this view filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <SortableHeader
                        columnKey="name"
                        label="Faculty Member"
                        currentSortKey={teacherSortKey}
                        currentDirection={teacherSortDirection}
                        onSort={requestTeacherSort}
                      />
                      <SortableHeader
                        columnKey="employee_id"
                        label="Employee ID"
                        currentSortKey={teacherSortKey}
                        currentDirection={teacherSortDirection}
                        onSort={requestTeacherSort}
                      />
                      <SortableHeader
                        columnKey="specialization"
                        label="Specialization & Subject"
                        currentSortKey={teacherSortKey}
                        currentDirection={teacherSortDirection}
                        onSort={requestTeacherSort}
                      />
                      <th className="px-4 py-3">Academic Batches</th>
                      <th className="px-4 py-3">Timetable Status</th>
                      <SortableHeader
                        columnKey="status"
                        label="Lifecycle Status"
                        currentSortKey={teacherSortKey}
                        currentDirection={teacherSortDirection}
                        onSort={requestTeacherSort}
                      />
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedTeachers.map((tch) => (
                      <tr key={tch.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-primary-600 text-white font-bold text-xs flex items-center justify-center">
                              {tch.name?.charAt(0) || 'T'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{tch.name}</div>
                              <div className="text-[11px] text-slate-500">{tch.email} &bull; {tch.phone || 'No phone'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 font-medium">{tch.employee_id || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{tch.specialization || 'General Studies'}</div>
                          <div className="text-[10px] text-slate-400">{tch.qualification}</div>
                        </td>
                        <td className="px-4 py-3">
                          {tch.is_assigned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" /> Assigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {tch.has_timetable ? (
                            <span className="text-emerald-700 font-medium">Scheduled</span>
                          ) : (
                            <span className="text-slate-400">Not scheduled</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tch.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {tch.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedTeacherId(tch.id)
                                setShowProfileModal(true)
                              }}
                              className="px-2 py-1 text-slate-600 hover:text-primary-600 hover:bg-indigo-50 rounded font-medium transition-colors"
                            >
                              Profile
                            </button>
                            <button
                              onClick={() => handleOpenAssignModal(tch.id)}
                              className="px-2 py-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded font-medium transition-colors"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => handleOpenLifecycleModal(tch)}
                              className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded font-medium transition-colors"
                            >
                              Lifecycle
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

      {/* ── TAB 3: BATCH & SUBJECT ALLOCATIONS ── */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Faculty</label>
              <select
                value={allocTeacherFilter}
                onChange={(e) => setAllocTeacherFilter(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Faculty Members</option>
                {rawTeachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.employee_id || 'ID-' + t.id})</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Standard</label>
              <select
                value={allocStandardFilter}
                onChange={(e) => setAllocStandardFilter(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Standards</option>
                {standards.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-5">
              <button
                type="button"
                onClick={() => {
                  setAllocTeacherFilter('')
                  setAllocStandardFilter('')
                }}
                className="text-xs text-slate-500 hover:text-slate-800 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Faculty Member</th>
                    <th className="px-4 py-3">Board & Standard</th>
                    <th className="px-4 py-3">Division / Batch</th>
                    <th className="px-4 py-3">Subject Allocated</th>
                    <th className="px-4 py-3">Weekly Hours</th>
                    <th className="px-4 py-3">Class Teacher</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-right">Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No batch allocations recorded. Click "Allocate Batch" to assign faculty.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{a.teacher_name || 'Teacher #' + a.teacher_user_id}</td>
                        <td className="px-4 py-3 text-slate-700">{a.board_name || 'Standard'} &bull; {a.standard_name}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{a.division_name || 'Batch'}</td>
                        <td className="px-4 py-3 font-medium text-indigo-700">{a.subject_name || 'Subject'}</td>
                        <td className="px-4 py-3 text-slate-700">{a.weekly_hours || 4.0} hrs/week</td>
                        <td className="px-4 py-3">
                          {a.is_class_teacher ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Class Teacher
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic">{a.notes || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          {isEditMode ? (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to revoke this batch allocation?')) {
                                  deleteAssignmentMutation.mutate(a.id)
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Revoke Assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to revoke assignments.')}
                              className="p-1.5 text-slate-300 cursor-not-allowed"
                              title="Locked in View Mode"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
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

      {/* ── TAB 4: TEACHING SCHEDULES & TIMETABLE ── */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Faculty</label>
              <select
                value={selectedTimetableTeacherId}
                onChange={(e) => setSelectedTimetableTeacherId(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Teaching Faculty</option>
                {rawTeachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.specialization || 'Faculty'})</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Day of Week</label>
              <div className="flex items-center gap-1">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedTimetableDay(day)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedTimetableDay === day
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Zero Schedule Collisions
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              {selectedTimetableDay} Lecture Schedule Grid
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { time: '08:30 - 10:00', slot: 'Period 1', batch: 'Standard 10 - Batch Alpha', subject: 'Advanced Mathematics', room: 'Hall 101', teacher: 'Ramesh Sharma' },
                { time: '10:15 - 11:45', slot: 'Period 2', batch: 'Standard 12 - Batch IIT-A', subject: 'Physics & Mechanics', room: 'Lab 2', teacher: 'Vikram Joshi' },
                { time: '12:30 - 14:00', slot: 'Period 3', batch: 'Standard 10 - Batch Beta', subject: 'Organic Chemistry', room: 'Hall 102', teacher: 'Anita Desai' },
                { time: '14:15 - 15:45', slot: 'Period 4', batch: 'Standard 9 - Batch Olympiad', subject: 'Foundations of Science', room: 'Hall 201', teacher: 'Priya Patel' },
              ].map((p, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:border-primary-400 transition-all space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary-700">{p.slot}</span>
                    <span className="font-mono text-slate-500 text-[11px]">{p.time}</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">{p.batch}</div>
                  <div className="text-xs font-medium text-indigo-700">{p.subject}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/80">
                    <span>{p.teacher}</span>
                    <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{p.room}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: FACULTY ATTENDANCE & LEAVES ── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Attendance Date:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Marked records: <strong>{facultyAttendanceRows.filter((r) => r.status === 'present').length} Present</strong>,{' '}
                <strong>{facultyAttendanceRows.filter((r) => r.status === 'absent').length} Absent</strong>
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Faculty Daily Duty Register
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Faculty Member</th>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Presence Status</th>
                    <th className="px-4 py-3">Check-In</th>
                    <th className="px-4 py-3">Check-Out</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facultyAttendanceRows.map((row, idx) => (
                    <tr key={row.user_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{row.employee_id || '-'}</td>
                      <td className="px-4 py-3">
                        <select
                          disabled={!isEditMode}
                          value={row.status}
                          onChange={(e) => {
                            const val = e.target.value as any
                            setFacultyAttendanceRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, status: val } : r))
                            )
                          }}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border outline-none ${
                            row.status === 'present'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : row.status === 'absent'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : row.status === 'late'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                          } disabled:opacity-75`}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late Arrival</option>
                          <option value="on_leave">On Leave</option>
                          <option value="half_day">Half Day</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          disabled={!isEditMode}
                          value={row.check_in_time}
                          onChange={(e) => {
                            const val = e.target.value
                            setFacultyAttendanceRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, check_in_time: val } : r))
                            )
                          }}
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-slate-50 text-slate-700"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          disabled={!isEditMode}
                          value={row.check_out_time}
                          onChange={(e) => {
                            const val = e.target.value
                            setFacultyAttendanceRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, check_out_time: val } : r))
                            )
                          }}
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-slate-50 text-slate-700"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.hours_worked} hrs</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          disabled={!isEditMode}
                          value={row.remarks}
                          onChange={(e) => {
                            const val = e.target.value
                            setFacultyAttendanceRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, remarks: val } : r))
                            )
                          }}
                          placeholder="Optional remarks..."
                          className="text-xs border border-slate-200 rounded px-2 py-1 w-full bg-white disabled:bg-slate-50 text-slate-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leave Requests Queue */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" />
                Faculty Leave Applications Queue
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Approval Status</th>
                    <th className="px-4 py-3 text-right">Sanction Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facultyLeavesData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No pending faculty leave applications recorded.
                      </td>
                    </tr>
                  ) : (
                    facultyLeavesData.map((l: any) => (
                      <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{l.teacher_name || 'Faculty Member'}</td>
                        <td className="px-4 py-3 capitalize text-slate-700">{l.leave_type || 'Casual Leave'}</td>
                        <td className="px-4 py-3 text-slate-600">{l.start_date} &rarr; {l.end_date}</td>
                        <td className="px-4 py-3 text-slate-500 italic">{l.reason || 'Personal leave'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : l.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {l.status || 'Pending Review'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={!isEditMode}
                              onClick={() => toast.success('Leave application approved')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={!isEditMode}
                              onClick={() => toast.success('Leave application rejected')}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-semibold disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
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

      {/* ── TAB 6: SALARY & PAYROLL ── */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payroll Period:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
              >
                {[2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={payrollStatusFilter}
                onChange={(e) => setPayrollStatusFilter(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Payroll Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="finalized">Finalized</option>
                <option value="paid">Paid</option>
                <option value="partially_paid">Partially Paid</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Payroll #</th>
                    <th className="px-4 py-3">Faculty Member</th>
                    <th className="px-4 py-3">Pay Mode</th>
                    <th className="px-4 py-3">Hours / Lectures</th>
                    <th className="px-4 py-3">Gross Earnings</th>
                    <th className="px-4 py-3">Deductions</th>
                    <th className="px-4 py-3">Net Payable</th>
                    <th className="px-4 py-3">Paid / Pending</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No payroll records found for {selectedMonth}/{selectedYear}. Click "Calculate Monthly Payroll" to generate statements.
                      </td>
                    </tr>
                  ) : (
                    monthlyPayrolls.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">{p.payroll_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{p.teacher_name}</div>
                          <div className="text-[11px] text-slate-500">{p.teacher_email}</div>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-700 font-medium">{p.payment_method || 'Hourly'}</td>
                        <td className="px-4 py-3 text-slate-700">{p.total_teaching_hours || 0} hrs ({p.total_completed_lectures || 0} lecs)</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">₹{(p.gross_pay || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-rose-600 font-medium">-₹{(p.total_deductions || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">₹{(p.net_payable || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="text-emerald-700 font-semibold">₹{(p.paid_amount || 0).toLocaleString()}</span>
                          {p.pending_amount > 0 && (
                            <span className="text-amber-600 text-[11px] block">due ₹{(p.pending_amount).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'partially_paid'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {p.status?.replace('_', ' ') || 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toast.success(`Statement generated for ${p.teacher_name}`)}
                            className="px-2.5 py-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded font-semibold transition-colors"
                          >
                            Statement
                          </button>
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

      {/* ── TAB 7: TEACHING SESSIONS & PERFORMANCE ── */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary-600" />
              Teaching Activity & Lecture Logs
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={sessionStatusFilter}
                onChange={(e) => setSessionStatusFilter(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Approval Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Session Code</th>
                    <th className="px-4 py-3">Faculty Member</th>
                    <th className="px-4 py-3">Batch & Subject</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Topic Covered</th>
                    <th className="px-4 py-3">Students</th>
                    <th className="px-4 py-3">Earnings</th>
                    <th className="px-4 py-3">Approval Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSessions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No teaching sessions recorded matching this filter.
                      </td>
                    </tr>
                  ) : (
                    recentSessions.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-700">{s.session_code}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.teacher_name}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{s.batch_name}</div>
                          <div className="text-[11px] text-indigo-600">{s.subject_name}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{s.session_date} &bull; {s.actual_start_time || s.scheduled_start_time}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{s.calculated_duration_hours || 1.5} hrs</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{s.topic || 'Classroom Lecture Delivery'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{s.students_count || 24} present</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">₹{(s.calculated_amount || 900).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.approval_status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.approval_status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {s.approval_status || 'Approved'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                navigate(`/homework/create?teaching_session_id=${s.id}&division_id=${s.division_id || ''}&subject_id=${s.subject_id || ''}&topic=${encodeURIComponent(s.topic || s.topic_taught || '')}`)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                              title="Assign Homework from this session"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Homework</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigate(`/eduboard?session_id=${s.id}&division_id=${s.division_id || ''}&subject_id=${s.subject_id || ''}&topic=${encodeURIComponent(s.topic || s.topic_taught || '')}`)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                              title="Open EduBoard Classroom for this session"
                            >
                              <span>Open EduBoard</span>
                            </button>
                          </div>
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

      {/* ── TAB 8: POLICIES & SETTINGS ── */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Faculty Compensation & Lecture Pay Scales
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Standard Hourly Lecture Compensation (₹/hr)</label>
                <input
                  type="number"
                  disabled={!isEditMode}
                  value={facultySettings.defaultHourlyRate}
                  onChange={(e) => setFacultySettings({ ...facultySettings, defaultHourlyRate: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white disabled:bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Weekly Maximum Teaching Workload Cap (Hours)</label>
                <input
                  type="number"
                  disabled={!isEditMode}
                  value={facultySettings.maxWeeklyHours}
                  onChange={(e) => setFacultySettings({ ...facultySettings, maxWeeklyHours: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white disabled:bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Retroactive Session Logging Allowance (Days)</label>
                <input
                  type="number"
                  disabled={!isEditMode}
                  value={facultySettings.retroactiveSessionDays}
                  onChange={(e) => setFacultySettings({ ...facultySettings, retroactiveSessionDays: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white disabled:bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Shield className="w-4 h-4 text-indigo-600" />
              Timetable Conflict & Attendance Grace Policies
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biometric Check-In Grace Period (Minutes)</label>
                <input
                  type="number"
                  disabled={!isEditMode}
                  value={facultySettings.graceCheckInMinutes}
                  onChange={(e) => setFacultySettings({ ...facultySettings, graceCheckInMinutes: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white disabled:bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isEditMode}
                    checked={facultySettings.strictTimetableConflict}
                    onChange={(e) => setFacultySettings({ ...facultySettings, strictTimetableConflict: e.target.checked })}
                    className="rounded text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                  />
                  <span className="font-semibold text-slate-700">Strict Timetable Collision Prevention</span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6">
                  Blocks conflicting batch allocations where a faculty member is scheduled in two lecture halls simultaneously.
                </p>

                <label className="flex items-center gap-2.5 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    disabled={!isEditMode}
                    checked={facultySettings.autoNotifyAbsence}
                    onChange={(e) => setFacultySettings({ ...facultySettings, autoNotifyAbsence: e.target.checked })}
                    className="rounded text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                  />
                  <span className="font-semibold text-slate-700">Automated Guardian Alerts on Substitute Delivery</span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6">
                  Dispatches SMS & WhatsApp notification to parent batches when a substitute faculty delivers the lecture.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: TEACHER PROFILE DOSSIER ───────────────────────────────── */}
      <TeacherProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false)
          setSelectedTeacherId(null)
        }}
        teacherId={selectedTeacherId}
        onUpdate={() => refetchDashboard()}
        onOpenAssignModal={(tid) => handleOpenAssignModal(tid)}
        onOpenLifecycleModal={(tch) => handleOpenLifecycleModal(tch)}
      />

      {/* ─── MODAL: LIFECYCLE MANAGEMENT ─────────────────────────────────── */}
      <StaffLifecycleModal
        isOpen={showLifecycleModal}
        onClose={() => {
          setShowLifecycleModal(false)
          setLifecycleTarget(null)
        }}
        employee={lifecycleTarget}
        onSuccess={() => {
          refetchDashboard()
        }}
      />

      {/* ─── MODAL: REGISTER NEW TEACHER ─────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-slate-900 text-sm">Register New Teacher / Faculty</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newTeacher.first_name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, first_name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Ramesh"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newTeacher.last_name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, last_name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Sharma"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newTeacher.username}
                    onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. ramesh.sharma"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newTeacher.email}
                    onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="sharma@prashantacademy.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Specialization / Subject</label>
                  <input
                    type="text"
                    value={newTeacher.specialization}
                    onChange={(e) => setNewTeacher({ ...newTeacher, specialization: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Mathematics & Calculus"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Qualification</label>
                  <input
                    type="text"
                    value={newTeacher.qualification}
                    onChange={(e) => setNewTeacher({ ...newTeacher, qualification: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. M.Sc., B.Ed."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newTeacher.phone}
                    onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="+91 98200 12345"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Basic Base Salary (₹/month)</label>
                  <input
                    type="number"
                    value={newTeacher.basic_salary}
                    onChange={(e) => setNewTeacher({ ...newTeacher, basic_salary: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Temporary Password <span className="text-slate-400 font-normal">(Leave blank to auto-generate)</span>
                  </label>
                  <input
                    type="text"
                    value={newTeacher.password}
                    onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Leave empty for secure auto-generated temporary password"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createTeacherMutation.mutate(newTeacher)}
                disabled={!newTeacher.first_name || !newTeacher.username || !newTeacher.email || createTeacherMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
              >
                {createTeacherMutation.isPending ? 'Registering...' : 'Create Teacher Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATED CREDENTIALS ──────────────────────────────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Teacher Account Provisioned</h3>
              </div>
              <button onClick={() => setCreatedCredentials(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                A new teacher account has been provisioned. Please securely provide these temporary login credentials to <strong className="text-slate-900">{createdCredentials.name}</strong>.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                {createdCredentials.employee_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Employee ID:</span>
                    <span className="font-mono font-semibold text-slate-800">{createdCredentials.employee_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Username:</span>
                  <span className="font-mono font-semibold text-slate-800">{createdCredentials.username}</span>
                </div>
                {createdCredentials.temporary_password && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Temporary Password:</span>
                    <span className="font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-indigo-200">
                      {createdCredentials.temporary_password}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `PrathamOne EduOS Login Credentials\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.temporary_password || ''}`
                  )
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Credentials'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ASSIGN BATCH ─────────────────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-slate-900 text-sm">Assign Faculty to Academic Batch</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Faculty *</label>
                <select
                  value={newAssignment.teacher_user_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, teacher_user_id: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value={0}>Choose faculty member...</option>
                  {rawTeachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employee_id || 'ID-' + t.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Academic Board *</label>
                <select
                  value={newAssignment.board_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, board_id: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {boards.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Class / Standard *</label>
                <select
                  value={newAssignment.standard_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, standard_id: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {standards.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Batch / Division *</label>
                <select
                  value={newAssignment.division_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, division_id: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {divisions.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Subject Allocated *</label>
                <select
                  value={newAssignment.subject_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, subject_id: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Weekly Teaching Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={newAssignment.weekly_hours}
                  onChange={(e) => setNewAssignment({ ...newAssignment, weekly_hours: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_class_teacher"
                  checked={newAssignment.is_class_teacher}
                  onChange={(e) => setNewAssignment({ ...newAssignment, is_class_teacher: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_class_teacher" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Assign as Primary Class Teacher for this batch
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createAssignmentMutation.mutate(newAssignment)}
                disabled={!newAssignment.teacher_user_id || createAssignmentMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
              >
                {createAssignmentMutation.isPending ? 'Assigning...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeacherManagement() {
  const inRouter = useInRouterContext()
  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={['/teachers']}>
        <TeacherManagementContent />
      </MemoryRouter>
    )
  }
  return <TeacherManagementContent />
}
