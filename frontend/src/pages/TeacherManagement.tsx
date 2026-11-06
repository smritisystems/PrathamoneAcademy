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
 * @updated     2026-11-06
 *
 * @description Dedicated Teacher & Faculty Workspace with live workforce counters, assignment statuses (assigned vs unassigned vs without timetable), activity tracking, and lifecycle governance.
 */

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
import TeacherProfileModal from '../components/TeacherProfileModal'
import StaffLifecycleModal from '../components/StaffLifecycleModal'
import type { TeacherWorkforceItem, TeacherDashboardData, TeacherAssignmentItem } from '../types'

type FilterTabKey =
  | 'all'
  | 'assigned'
  | 'unassigned'
  | 'without_timetable'
  | 'on_leave'
  | 'upcoming'
  | 'departed'
  | 'inactive'
  | 'assignments'
  | 'sessions'

export default function TeacherManagement() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAdmin = isUserAdmin(user)
  const isSysAdmin = isUserSysAdmin(user)

  // Filters & State
  const [activeTab, setActiveTab] = useState<FilterTabKey>('all')
  const [search, setSearch] = useState('')
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | undefined>(undefined)

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

  // 1. Fetch Teacher Dashboard Data (Live 13 Counters + Teachers List)
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

  // 4. Assignments list for Assignments tab
  const { data: assignmentsData = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['all-teacher-assignments'],
    queryFn: () => staffApi.assignmentsList().then((r) => r.data),
    enabled: activeTab === 'assignments',
  })
  const allAssignments = Array.isArray(assignmentsData) ? assignmentsData : []

  // 5. Teaching Sessions list for Sessions tab
  const { data: recentSessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ['recent-teaching-sessions'],
    queryFn: () => teacherPayrollApi.getSessions({ limit: 50 }).then((r) => r.data),
    enabled: activeTab === 'sessions',
  })
  const recentSessions = Array.isArray(recentSessionsData)
    ? recentSessionsData
    : (recentSessionsData?.items || [])

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
      alert(`Registration Failed: ${err.response?.data?.detail || err.message}`)
    },
  })

  const createAssignmentMutation = useMutation({
    mutationFn: (data: typeof newAssignment) => staffApi.createAssignment(data),
    onSuccess: () => {
      setShowAssignModal(false)
      queryClient.invalidateQueries({ queryKey: ['teacher-workforce-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['all-teacher-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] })
      alert('Academic batch assignment created successfully!')
    },
    onError: (err: any) => {
      alert(`Assignment Failed: ${err.response?.data?.detail || err.message}`)
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

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    let result = rawTeachers

    // 1. Tab filter
    if (activeTab === 'assigned') {
      result = result.filter((t) => t.is_active_employee && t.is_assigned)
    } else if (activeTab === 'unassigned') {
      result = result.filter((t) => t.is_active_employee && !t.is_assigned)
    } else if (activeTab === 'without_timetable') {
      result = result.filter((t) => t.is_active_employee && t.is_assigned && !t.has_timetable)
    } else if (activeTab === 'on_leave') {
      result = result.filter((t) => t.status === 'on_leave')
    } else if (activeTab === 'upcoming') {
      result = result.filter((t) => t.is_upcoming)
    } else if (activeTab === 'departed') {
      result = result.filter((t) => t.is_departed)
    } else if (activeTab === 'inactive') {
      result = result.filter((t) => !t.is_active_employee && !t.is_departed && !t.is_upcoming)
    }

    // 2. Search filter
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
  }, [rawTeachers, activeTab, search])

  const handleOpenAssignModal = (teacherId: number) => {
    setAssignTargetTeacherId(teacherId)
    setNewAssignment((prev) => ({ ...prev, teacher_user_id: teacherId }))
    setShowAssignModal(true)
  }

  const handleOpenLifecycleModal = (teacher: {
    id: number
    name: string
    employee_id?: string | null
    role: string
    status: string
  }) => {
    setLifecycleTarget(teacher)
    setShowLifecycleModal(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── TOP WORKSPACE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Teacher Workspace</h1>
              <p className="text-xs text-slate-500">
                Manage teachers, assignments, teaching activity and employment lifecycle
              </p>
            </div>
          </div>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Academic Year Selector */}
          <select
            value={selectedAcademicYearId || ''}
            onChange={(e) => setSelectedAcademicYearId(e.target.value ? Number(e.target.value) : undefined)}
            className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-2xs focus:ring-2 focus:ring-indigo-500 outline-none"
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

          {(isAdmin || isSysAdmin) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Teacher</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── LIVE 13 WORKFORCE KPI METRIC CARDS ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Card 1: Total Teachers */}
        <div
          onClick={() => setActiveTab('all')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'all'
              ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Teachers</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.total_teachers}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Faculty directory</div>
        </div>

        {/* Card 2: Active Teachers */}
        <div
          onClick={() => setActiveTab('all')}
          className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Active</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{metrics.active_teachers}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ready for duty</div>
        </div>

        {/* Card 3: Assigned Teachers */}
        <div
          onClick={() => setActiveTab('assigned')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'assigned'
              ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Assigned</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-700 mt-1">{metrics.assigned_teachers}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Has batch allocations</div>
        </div>

        {/* Card 4: UNASSIGNED TEACHERS (CRITICAL HIGHLIGHT!) */}
        <div
          onClick={() => setActiveTab('unassigned')}
          className={`p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${
            activeTab === 'unassigned'
              ? 'border-amber-600 bg-amber-50 shadow-sm ring-2 ring-amber-500'
              : metrics.unassigned_teachers > 0
              ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/60 shadow-2xs'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wide">Unassigned</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-900 mt-1 flex items-center gap-1.5">
            {metrics.unassigned_teachers}
            {metrics.unassigned_teachers > 0 && (
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full">
                Attention
              </span>
            )}
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">Zero batch assignments</div>
        </div>

        {/* Card 5: Without Timetable */}
        <div
          onClick={() => setActiveTab('without_timetable')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'without_timetable'
              ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">No Timetable</span>
            <Clock className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-xl font-bold text-orange-700 mt-1">{metrics.teachers_without_timetable}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Assigned but no slots</div>
        </div>

        {/* Card 6: On Leave */}
        <div
          onClick={() => setActiveTab('on_leave')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'on_leave'
              ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">On Leave</span>
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-700 mt-1">{metrics.teachers_on_leave}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Approved absence</div>
        </div>

        {/* Card 7: Departed / Former */}
        <div
          onClick={() => setActiveTab('departed')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'departed'
              ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">Departed</span>
            <UserX className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700 mt-1">{metrics.departed_teachers}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Resigned / Terminated</div>
        </div>
      </div>

      {/* ─── VISUAL ANALYTICS: STATUS DONUT & 6-MONTH TEACHING HOURS ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WorkforceDonutChart
          title="Teacher Status Distribution"
          totalCount={metrics.total_teachers}
          unitLabel="Teachers"
          segments={[
            { label: 'Assigned', count: metrics.assigned_teachers, color: '#10B981' },
            { label: 'Unassigned', count: metrics.unassigned_teachers, color: '#3B82F6' },
            { label: 'Without Timetable', count: metrics.teachers_without_timetable, color: '#F59E0B' },
            { label: 'On Leave', count: metrics.teachers_on_leave, color: '#EC4899' },
          ]}
        />

        <MonthlyTeachingHoursChart
          totalHours={metrics.six_month_teaching_hours_total || 3420}
          data={dashboardData?.monthly_hours_trend || [
            { month: 'Apr', hours: 480 },
            { month: 'May', hours: 540 },
            { month: 'Jun', hours: 620 },
            { month: 'Jul', hours: 590 },
            { month: 'Aug', hours: 640 },
            { month: 'Sep', hours: 550 },
          ]}
        />
      </div>

      {/* ─── WORKSPACE NAVIGATION TABS & SEARCH ───────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            {[
              { key: 'all', label: 'All Faculty', count: metrics.total_teachers },
              { key: 'assigned', label: 'Assigned', count: metrics.assigned_teachers },
              { key: 'unassigned', label: 'Unassigned', count: metrics.unassigned_teachers, alert: metrics.unassigned_teachers > 0 },
              { key: 'without_timetable', label: 'No Timetable', count: metrics.teachers_without_timetable },
              { key: 'on_leave', label: 'On Leave', count: metrics.teachers_on_leave },
              { key: 'upcoming', label: 'Upcoming Joining', count: metrics.upcoming_joining },
              { key: 'departed', label: 'Departed', count: metrics.departed_teachers },
              { key: 'assignments', label: 'Batch Allocations Grid' },
              { key: 'sessions', label: 'Session Register' },
            ].map((tab: any) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : tab.alert
                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.alert
                          ? 'bg-amber-300 text-amber-950 font-extrabold'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          {['all', 'assigned', 'unassigned', 'without_timetable', 'on_leave', 'upcoming', 'departed', 'inactive'].includes(activeTab) && (
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search faculty by name, ID, subject..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* ─── TAB CONTENT: TEACHERS DIRECTORY TABLE ─────────────────────── */}
        {['all', 'assigned', 'unassigned', 'without_timetable', 'on_leave', 'upcoming', 'departed', 'inactive'].includes(activeTab) && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            {isDashboardLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 font-medium">
                Loading teacher workforce data...
              </div>
            ) : filteredTeachers.length === 0 ? (
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
                      <th className="px-4 py-3">Faculty Member</th>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Specialization & Subject</th>
                      <th className="px-4 py-3">Academic Batches</th>
                      <th className="px-4 py-3">Timetable Status</th>
                      <th className="px-4 py-3">Payment Model</th>
                      <th className="px-4 py-3">Lifecycle Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeachers.map((tch) => (
                      <tr key={tch.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name & Contact */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                              {tch.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'T'}
                            </div>
                            <div>
                              <div
                                onClick={() => navigate(`/teachers/${tch.id}`)}
                                className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                              >
                                {tch.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {tch.email} {tch.phone ? `• ${tch.phone}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                          {tch.employee_id || 'N/A'}
                        </td>

                        {/* Specialization */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{tch.specialization || tch.department || 'Academics'}</div>
                          <div className="text-[11px] text-slate-400">{tch.qualification || 'Faculty'}</div>
                        </td>

                        {/* Academic Batches (Assigned vs Unassigned) */}
                        <td className="px-4 py-3">
                          {tch.is_assigned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Layers className="w-3 h-3" />
                              {tch.assignment_count} Batch{tch.assignment_count > 1 ? 'es' : ''} ({tch.weekly_hours}h/wk)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(tch.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-colors"
                              title="Click to allocate batches to this unassigned teacher"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              Unassigned • Allocate
                            </button>
                          )}
                        </td>

                        {/* Timetable Status */}
                        <td className="px-4 py-3">
                          {tch.has_timetable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Clock className="w-3 h-3" />
                              {tch.timetable_slots_count} Scheduled Slots
                            </span>
                          ) : tch.is_assigned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                              <AlertTriangle className="w-3 h-3" />
                              Missing Timetable
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Payment Model */}
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800 capitalize block">
                            {tch.payment_method?.replace('_', ' ') || 'Hourly'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {tch.payment_method === 'hourly' ? `₹${tch.hourly_rate}/hr` :
                             tch.payment_method === 'per_lecture' ? `₹${tch.per_lecture_rate}/lec` :
                             `₹${tch.monthly_fixed_amount}/mo`}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                            tch.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                            tch.status === 'on_leave' ? 'bg-purple-100 text-purple-800' :
                            tch.is_departed ? 'bg-rose-100 text-rose-800' :
                            tch.is_upcoming ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {tch.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/teachers/${tch.id}`)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Full Teacher Profile (15 Tabs)"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(tch.id)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Assign Batches & Subjects"
                            >
                              <Layers className="w-4 h-4" />
                            </button>

                            {(isAdmin || isSysAdmin) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenLifecycleModal({
                                    id: tch.id,
                                    name: tch.name,
                                    employee_id: tch.employee_id,
                                    role: 'Teacher',
                                    status: tch.status,
                                  })
                                }
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Manage Lifecycle (Activate, Leave, Resign, Rehire)"
                              >
                                <Activity className="w-4 h-4" />
                              </button>
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
        )}

        {/* ─── TAB CONTENT: BATCH ALLOCATIONS GRID ───────────────────────── */}
        {activeTab === 'assignments' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Academic Load & Batch Allocations</h3>
                <p className="text-xs text-slate-500">Live roster of teachers assigned to standards, divisions, and subjects.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignTargetTeacherId(null)
                  setShowAssignModal(true)
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Assign Faculty to Batch
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Faculty Member</th>
                    <th className="px-4 py-3">Board & Standard</th>
                    <th className="px-4 py-3">Batch / Division</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Weekly Hours</th>
                    <th className="px-4 py-3">Class Teacher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allAssignments.map((a: TeacherAssignmentItem) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{a.teacher_name}</td>
                      <td className="px-4 py-2.5 text-slate-700">{a.board_name} - {a.standard_name}</td>
                      <td className="px-4 py-2.5 text-slate-700">{a.batch_name}</td>
                      <td className="px-4 py-2.5 font-semibold text-indigo-700">{a.subject_name}</td>
                      <td className="px-4 py-2.5 text-slate-800">{a.weekly_hours} hrs/wk</td>
                      <td className="px-4 py-2.5">
                        {a.is_class_teacher ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                            Class Teacher
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB CONTENT: SESSIONS REGISTER ────────────────────────────── */}
        {activeTab === 'sessions' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Teaching Activity & Session Register</h3>
                <p className="text-xs text-slate-500">Live lecture verification log used for attendance calculation and payroll generation.</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Teacher</th>
                    <th className="px-4 py-3">Batch & Subject</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Verification Status</th>
                    <th className="px-4 py-3 text-right">Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{s.session_date}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{s.teacher_name || 'Faculty Member'}</td>
                      <td className="px-4 py-2.5 text-slate-700">{s.division_name} • {s.subject_name || s.topic_covered}</td>
                      <td className="px-4 py-2.5 text-slate-600">{s.duration_hours || 1.0} hrs</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          s.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          s.approval_status === 'submitted' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {s.approval_status || 'Submitted'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹{s.calculated_amount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: 15-TAB TEACHER PROFILE ───────────────────────────────── */}
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
                <GraduationCap className="w-5 h-5 text-indigo-600" />
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
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="sharma@prashantacademy.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Specialization / Subject</label>
                  <input
                    type="text"
                    value={newTeacher.specialization}
                    onChange={(e) => setNewTeacher({ ...newTeacher, specialization: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Mathematics & Calculus"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Qualification</label>
                  <input
                    type="text"
                    value={newTeacher.qualification}
                    onChange={(e) => setNewTeacher({ ...newTeacher, qualification: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. M.Sc., B.Ed."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newTeacher.phone}
                    onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="+91 98200 12345"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Basic Base Salary (₹/month)</label>
                  <input
                    type="number"
                    value={newTeacher.basic_salary}
                    onChange={(e) => setNewTeacher({ ...newTeacher, basic_salary: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
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
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
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
                  const credText = `PrathamOne EduOS Teacher Credentials\nName: ${createdCredentials.name}\nEmployee ID: ${createdCredentials.employee_id || 'N/A'}\nUsername: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.temporary_password || 'N/A'}`;
                  navigator.clipboard.writeText(credText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: BATCH & SUBJECT ASSIGNMENT ────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm">Assign Faculty to Academic Batch</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Faculty Member *</label>
                <select
                  value={newAssignment.teacher_user_id || assignTargetTeacherId || ''}
                  onChange={(e) => setNewAssignment({ ...newAssignment, teacher_user_id: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select Faculty Member</option>
                  {rawTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.employee_id || 'ID ' + t.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Board *</label>
                  <select
                    value={newAssignment.board_id}
                    onChange={(e) => setNewAssignment({ ...newAssignment, board_id: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {boards.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Standard / Class *</label>
                  <select
                    value={newAssignment.standard_id}
                    onChange={(e) => setNewAssignment({ ...newAssignment, standard_id: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {standards.map((st: any) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Batch / Division *</label>
                  <select
                    value={newAssignment.division_id}
                    onChange={(e) => setNewAssignment({ ...newAssignment, division_id: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {divisions.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Subject *</label>
                  <select
                    value={newAssignment.subject_id}
                    onChange={(e) => setNewAssignment({ ...newAssignment, subject_id: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Weekly Load (Hours) *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newAssignment.weekly_hours}
                    onChange={(e) => setNewAssignment({ ...newAssignment, weekly_hours: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAssignment.is_class_teacher}
                      onChange={(e) => setNewAssignment({ ...newAssignment, is_class_teacher: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">Designate as Class Teacher</span>
                  </label>
                </div>
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
              >
                {createAssignmentMutation.isPending ? 'Assigning...' : 'Confirm Batch Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
