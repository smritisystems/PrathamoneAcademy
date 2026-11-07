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
 * @updated     2026-11-08
 *
 * @description Comprehensive Teacher & Staff Management workspace with Directory, Academic Assignments, Attendance, Leaves, and 28 Printable Documents.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkforceDonutChart from '../components/workforce/WorkforceDonutChart'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, UserPlus, Briefcase, Calendar, Clock, Award,
  CheckCircle2, XCircle, AlertCircle, Search, Filter,
  FileText, Printer, ChevronRight, Eye, Edit3, Trash2,
  Download, RefreshCw, Shield, Layers, BookOpen, AlertTriangle,
  Copy, Key, Activity, DollarSign, CreditCard
} from 'lucide-react'
import { staffApi, boardsApi, standardsApi, divisionsApi, subjectsApi } from '../api/endpoints'
import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton, LockedIconButton } from '../components/common'
import { Lock } from 'lucide-react'
import StaffProfileModal from '../components/StaffProfileModal'
import StaffLifecycleModal from '../components/StaffLifecycleModal'
import toast from 'react-hot-toast'
import type { StaffMember, TeacherAssignmentItem, StaffDocumentTemplate } from '../types'

export default function StaffManagement() {
  const { user } = useAuthStore()
  const editScope = 'workforce:staff'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAdmin = isUserAdmin(user)
  const isSysAdmin = isUserSysAdmin(user)

  // Active Workspace Tab: 'directory' | 'assignments' | 'attendance' | 'leaves' | 'dashboard' | 'documents'
  const [activeTab, setActiveTab] = useState<'directory' | 'assignments' | 'attendance' | 'leaves' | 'dashboard' | 'documents'>('directory')

  // Search & Filters for Directory
  const [search, setSearch] = useState('')
  const [selectedStaffType, setSelectedStaffType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')
  const [page, setPage] = useState(1)

  // Selected staff for view/document rendering
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  // Dedicated Profile & Lifecycle Modals
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

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false)
  const [activeDocTemplate, setActiveDocTemplate] = useState<string | null>(null)
  const [docPeriodMonth, setDocPeriodMonth] = useState('October 2026')
  const [docCategoryFilter, setDocCategoryFilter] = useState('')
  const [docSearch, setDocSearch] = useState('')

  // Attendance Date
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0])

  // Secure Created Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string
    temporary_password?: string
    employee_id?: string
    name?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // New Staff Form State
  const [newStaff, setNewStaff] = useState({
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
    specialization: 'Senior Mathematics & Calculus',
    experience_years: 5.0,
    employment_type: 'full_time',
    basic_salary: 65000,
  })

  // New Assignment State
  const [newAssignment, setNewAssignment] = useState({
    teacher_user_id: 121,
    academic_year_id: 1,
    board_id: 1,
    standard_id: 10,
    division_id: 25,
    subject_id: 1,
    weekly_hours: 4.0,
    is_class_teacher: false,
    notes: '',
  })

  // ─── Queries ───────────────────────────────────────────────────────────────

  // 1. Staff Directory Query
  const { data: staffData, isLoading: isStaffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['staff-list', search, selectedStaffType, selectedStatus, page],
    queryFn: () =>
      staffApi
        .list({
          search: search || undefined,
          staff_type: selectedStaffType || undefined,
          status: selectedStatus || undefined,
          page,
          limit: 15,
        })
        .then((r) => r.data),
  })

  // 2. Staff Profile Detail Query
  const { data: staffDetail } = useQuery({
    queryKey: ['staff-detail', selectedUserId],
    queryFn: () => staffApi.get(selectedUserId!).then((r) => r.data),
    enabled: !!selectedUserId,
  })

  // 3. Academic Assignments Query
  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => staffApi.assignmentsList({ academic_year_id: 1 }).then((r) => r.data),
    enabled: activeTab === 'assignments' || showAssignModal,
  })

  // 4. Daily Attendance Query
  const { data: dailyAtt, isLoading: isAttLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['staff-daily-attendance', attendanceDate],
    queryFn: () => staffApi.dailyAttendance({ attendance_date: attendanceDate }).then((r) => r.data),
    enabled: activeTab === 'attendance',
  })

  // 5. Leaves Query
  const { data: leaves = [], refetch: refetchLeaves } = useQuery({
    queryKey: ['staff-leaves'],
    queryFn: () => staffApi.leavesList().then((r) => r.data),
    enabled: activeTab === 'leaves',
  })

  // 6. Role-Based Dashboard Stats
  const { data: dashStats } = useQuery({
    queryKey: ['staff-dashboard-stats'],
    queryFn: () => staffApi.dashboardStats().then((r) => r.data),
  })

  // 6b. Live Non-Teaching Staff Workforce Dashboard Metrics
  const { data: staffDashboard, refetch: refetchStaffDashboard } = useQuery({
    queryKey: ['staff-workforce-dashboard'],
    queryFn: () => staffApi.getStaffDashboard().then((r) => r.data),
  })

  // 7. Documents Catalogue Query
  const { data: docCatalogue = [] } = useQuery({
    queryKey: ['staff-doc-catalogue', docCategoryFilter],
    queryFn: () => staffApi.documentCatalogue({ category: docCategoryFilter || undefined }).then((r) => r.data),
    enabled: activeTab === 'documents',
  })

  // 8. Document Render Query
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

  // Supporting Dropdown Lists for Academic Structure
  const { data: boards = [] } = useQuery({ queryKey: ['boards-dropdown'], queryFn: () => boardsApi.list().then((r) => r.data) })
  const { data: standards = [] } = useQuery({ queryKey: ['standards-dropdown'], queryFn: () => standardsApi.list().then((r) => r.data) })
  const { data: divisions = [] } = useQuery({ queryKey: ['divisions-dropdown'], queryFn: () => divisionsApi.list().then((r) => r.data) })
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects-dropdown'], queryFn: () => subjectsApi.list().then((r) => r.data) })

  // ─── Mutations ─────────────────────────────────────────────────────────────

  // Create Staff Mutation
  const createStaffMutation = useMutation({
    mutationFn: (payload: any) => staffApi.create(payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      setShowCreateModal(false)
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
        role: 'teacher',
        staff_type: 'Teacher',
        department: 'Teaching & Academics',
        qualification: 'M.Sc., B.Ed.',
        specialization: 'Senior Mathematics & Calculus',
        experience_years: 5.0,
        employment_type: 'full_time',
        basic_salary: 65000,
      })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to register staff member')
    },
  })

  // Assign Teacher Mutation
  const assignTeacherMutation = useMutation({
    mutationFn: (payload: any) => staffApi.createAssignment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] })
      setShowAssignModal(false)
      toast.success('Teacher assignment recorded successfully!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to record assignment')
    },
  })

  // Delete Assignment Mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => staffApi.deleteAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] })
    },
  })

  // Mark Attendance Single/Status Change
  const markAttendanceMutation = useMutation({
    mutationFn: (payload: any) => staffApi.markAttendance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-daily-attendance', attendanceDate] })
    },
  })

  // Leave Action Mutation (Approve/Reject)
  const leaveActionMutation = useMutation({
    mutationFn: ({ leaveId, action }: { leaveId: number; action: 'approve' | 'reject' }) =>
      staffApi.actionLeave(leaveId, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-leaves'] })
      toast.success('Leave application processed successfully!')
    },
  })

  const handlePrintDocument = () => {
    window.print()
  }

  const departmentColors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#8B5CF6', '#14B8A6', '#F97316']
  const departmentSegments = (staffDashboard?.department_headcounts && staffDashboard.department_headcounts.length > 0)
    ? staffDashboard.department_headcounts.map((d: any, idx: number) => ({
        label: d.department,
        count: d.count,
        color: departmentColors[idx % departmentColors.length],
      }))
    : [
        { label: 'Administration', count: 10, color: '#3B82F6' },
        { label: 'Accounts', count: 4, color: '#10B981' },
        { label: 'IT & Systems', count: 3, color: '#F59E0B' },
        { label: 'Library', count: 3, color: '#EC4899' },
        { label: 'Others', count: 8, color: '#6366F1' },
      ]

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Non-Teaching Staff & Administrative Workforce" isDirty={showCreateModal || showAssignModal} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl border border-blue-100">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Workspace</h1>
              <p className="text-sm text-slate-500">
                Manage non-teaching staff, departments, designations and employee lifecycle
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            isEditMode ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to add staff members.')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 text-sm font-semibold rounded-xl cursor-not-allowed shadow-2xs"
                title="Locked in View Mode: Enable Edit Mode above to add staff members"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Add Staff Member (Locked)</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ─── LIVE 8 STAFF METRIC CARDS (VISUAL CONCEPT PANEL 3) ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Card 1: Total Staff */}
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total Staff</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{staffDashboard?.metrics?.total_staff ?? (staffData?.total || 28)}</div>
          <div className="text-[10px] text-slate-400">Headcount</div>
        </div>
        {/* Card 2: Active */}
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Active</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{staffDashboard?.metrics?.active_staff ?? 24}</div>
          <div className="text-[10px] text-slate-400">On duty</div>
        </div>
        {/* Card 3: Unassigned */}
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold text-amber-700 uppercase">Unassigned</div>
          <div className="text-xl font-bold text-amber-700 mt-1">{staffDashboard?.metrics?.unassigned_staff ?? 3}</div>
          <div className="text-[10px] text-slate-400">No department</div>
        </div>
        {/* Card 4: On Leave */}
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold text-purple-700 uppercase">On Leave</div>
          <div className="text-xl font-bold text-purple-700 mt-1">{staffDashboard?.metrics?.staff_on_leave ?? 2}</div>
          <div className="text-[10px] text-slate-400">Approved leave</div>
        </div>
        {/* Card 5: Inactive */}
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold text-slate-700 uppercase">Inactive</div>
          <div className="text-xl font-bold text-slate-700 mt-1">{staffDashboard?.metrics?.inactive_staff ?? 1}</div>
          <div className="text-[10px] text-slate-400">Dormant</div>
        </div>
        {/* Card 6: Departed */}
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold text-rose-700 uppercase">Departed</div>
          <div className="text-xl font-bold text-rose-700 mt-1">{staffDashboard?.metrics?.departed_staff ?? 3}</div>
          <div className="text-[10px] text-slate-400">Exited</div>
        </div>
        {/* Card 7: Upcoming Joining */}
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold text-primary-700 uppercase">Upcoming Joining</div>
          <div className="text-xl font-bold text-primary-700 mt-1">{staffDashboard?.metrics?.upcoming_joining ?? 2}</div>
          <div className="text-[10px] text-slate-400">Onboarding</div>
        </div>
        {/* Card 8: Departments */}
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold text-sky-700 uppercase">Departments</div>
          <div className="text-xl font-bold text-sky-700 mt-1">{staffDashboard?.metrics?.departments_count ?? 7}</div>
          <div className="text-[10px] text-slate-400">Operational units</div>
        </div>
      </div>

      {/* ─── VISUAL CONCEPT PANEL 3: DEPARTMENT DONUT & SALARY LIABILITIES ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WorkforceDonutChart
          title="Staff by Department"
          totalCount={staffDashboard?.metrics?.total_staff ?? 28}
          unitLabel="Staff"
          segments={departmentSegments}
        />

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salary Payable (Current Month)</span>
              <div className="text-2xl font-extrabold text-slate-900">
                ₹{(staffDashboard?.metrics?.salary_payable || 784500).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400">Total approved monthly staff compensation</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Pending Payments</span>
              <div className="text-2xl font-extrabold text-rose-700">
                ₹{(staffDashboard?.metrics?.pending_payments || 126000).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400">Unsettled vouchers requiring disbursement</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs overflow-x-auto">
        {[
          { key: 'directory', label: 'Staff Directory', icon: Users, badge: staffData?.total },
          { key: 'assignments', label: 'Academic Assignments', icon: Layers, badge: assignments.length },
          { key: 'attendance', label: 'Daily Attendance', icon: Clock },
          { key: 'leaves', label: 'Leave Applications', icon: Calendar, badge: dashStats?.pending_leaves },
          { key: 'dashboard', label: 'Role Dashboard', icon: Award },
          { key: 'documents', label: 'Staff Documents (28)', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── TAB 1: STAFF DIRECTORY ────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search faculty by name, employee ID, specialization..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={selectedStaffType}
                onChange={(e) => setSelectedStaffType(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Staff Types</option>
                <option value="Teacher">Teacher / Faculty</option>
                <option value="Admin">Administrator</option>
                <option value="Accountant">Accountant</option>
                <option value="Counselor">Counselor</option>
                <option value="Receptionist">Receptionist</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="active">Active Staff</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive / Resigned</option>
              </select>

              <button
                onClick={() => refetchStaff()}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                title="Refresh Directory"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Employee</th>
                    <th className="px-6 py-3.5">Designation & Dept</th>
                    <th className="px-6 py-3.5">Specialization</th>
                    <th className="px-6 py-3.5 text-center">Assigned Load</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isStaffLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Loading faculty & staff directory...
                      </td>
                    </tr>
                  ) : staffData?.items?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No faculty or staff found matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    staffData?.items?.map((staff) => (
                      <tr key={staff.profile_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0">
                              {staff.first_name[0]}{staff.last_name[0]}
                            </div>
                            <div>
                              <div
                                onClick={() => navigate(`/staff/${staff.user_id}`)}
                                className="font-semibold text-slate-900 hover:text-primary-600 cursor-pointer"
                              >
                                {staff.full_name}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                <span className="font-mono text-primary-600 font-medium">{staff.employee_id}</span>
                                <span>•</span>
                                <span>{staff.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{staff.staff_type}</div>
                          <div className="text-xs text-slate-500">{staff.department || 'Academics'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-800">{staff.specialization || staff.qualification || 'General'}</div>
                          <div className="text-xs text-slate-400">{staff.experience_years} yrs exp</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {staff.staff_type === 'Teacher' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold">
                              {staff.assignments_count} Batches ({staff.total_weekly_hours}h/wk)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Administrative</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            staff.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : staff.status === 'on_leave'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {staff.status === 'active' ? 'Active' : staff.status === 'on_leave' ? 'On Leave' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedUserId(staff.user_id)
                                setActiveDocTemplate('monthly_salary_slip')
                                setShowDocPreviewModal(true)
                              }}
                              className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Generate Official Documents"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/staff/${staff.user_id}`)}
                              className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="View Full Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {(isAdmin || isSysAdmin) && (
                              <button
                                onClick={() => {
                                  setLifecycleTargetStaff({
                                    id: staff.user_id,
                                    name: staff.full_name,
                                    employee_id: staff.employee_id,
                                    role: staff.role || staff.staff_type,
                                    status: staff.status,
                                  })
                                  setShowLifecycleModal(true)
                                }}
                                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                title="Manage Lifecycle (Activate, Leave, Resign, Rehire)"
                              >
                                <Activity className="w-4 h-4" />
                              </button>
                            )}
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

      {/* ─── TAB 2: ACADEMIC ASSIGNMENTS ───────────────────────────────────── */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Faculty Academic Workload Matrix</h2>
              <p className="text-xs text-slate-500">Live allocation of teachers across standards, batches, and subjects for AY 2026-27</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>New Batch Assignment</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Board & Standard</th>
                  <th className="px-6 py-3.5">Batch / Division</th>
                  <th className="px-6 py-3.5">Subject</th>
                  <th className="px-6 py-3.5">Faculty Member</th>
                  <th className="px-6 py-3.5 text-center">Weekly Hours</th>
                  <th className="px-6 py-3.5 text-center">Class Teacher</th>
                  {isAdmin && <th className="px-6 py-3.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No academic assignments recorded for the current session.
                    </td>
                  </tr>
                ) : (
                  assignments.map((item: TeacherAssignmentItem) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{item.standard_name}</div>
                        <div className="text-xs text-slate-500">{item.board_name}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">{item.batch_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-xs font-semibold">
                          {item.subject_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{item.teacher_name}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-medium text-slate-700">
                        {item.weekly_hours} hrs/wk
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.is_class_teacher ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                            Class Teacher
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Subject Faculty</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <LockedIconButton
                            isEditMode={isEditMode}
                            onClick={() => {
                              if (!isEditMode) {
                                toast.error('Locked in View Mode: Activate Edit Mode above to unlink assignments.')
                                return
                              }
                              deleteAssignmentMutation.mutate(item.id)
                            }}
                            icon={Trash2}
                            title="Unlink Assignment"
                            tone="danger"
                          />
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: DAILY ATTENDANCE ───────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary-600" />
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Attendance Register Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {dailyAtt && (
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                  Present: {dailyAtt.present_count}
                </span>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                  Absent: {dailyAtt.absent_count}
                </span>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                  Late: {dailyAtt.late_count}
                </span>
                <span className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg border border-blue-200">
                  On Leave: {dailyAtt.leave_count}
                </span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Staff Member</th>
                  <th className="px-6 py-3.5">Type & Department</th>
                  <th className="px-6 py-3.5 text-center">Timings</th>
                  <th className="px-6 py-3.5 text-center">Attendance Status</th>
                  {isAdmin && <th className="px-6 py-3.5 text-right">Quick Mark</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyAtt?.records?.map((rec) => (
                  <tr key={rec.user_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{rec.full_name}</div>
                      <div className="text-xs text-primary-600 font-mono">{rec.employee_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800">{rec.staff_type}</div>
                      <div className="text-xs text-slate-400">{rec.department}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs">
                      {rec.check_in_time} – {rec.check_out_time}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        rec.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'absent'
                          ? 'bg-rose-100 text-rose-800'
                          : rec.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-primary-100 text-primary-800'
                      }`}>
                        {rec.status.replace('_', ' ')}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {['present', 'absent', 'late', 'half_day', 'on_leave'].map((st) => (
                            <button
                              key={st}
                              onClick={() => {
                                markAttendanceMutation.mutate({
                                  date: attendanceDate,
                                  records: [{ user_id: rec.user_id, status: st }],
                                })
                              }}
                              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                                rec.status === st
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st === 'present' ? 'P' : st === 'absent' ? 'A' : st === 'late' ? 'L' : st === 'half_day' ? 'HD' : 'LV'}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: LEAVE APPLICATIONS ─────────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Faculty Leave Applications & Approvals</h2>
              <p className="text-xs text-slate-500">Track pending leaves, medical justifications, and balance encashments</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaves.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200">
                No leave requests found.
              </div>
            ) : (
              leaves.map((lv) => (
                <div key={lv.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{lv.staff_name}</h3>
                      <p className="text-xs text-slate-500">{lv.email}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                      lv.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : lv.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {lv.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Leave Type:</span>
                      <span className="font-semibold text-slate-800 capitalize">{lv.leave_type} Leave</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-semibold text-slate-800">{lv.days_count} Day(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dates:</span>
                      <span className="font-semibold text-slate-800">{lv.start_date} to {lv.end_date}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 italic">"{lv.reason}"</p>

                  {isAdmin && lv.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <LockedButton
                        isEditMode={isEditMode}
                        onClick={() => leaveActionMutation.mutate({ leaveId: lv.id, action: 'approve' })}
                        icon={CheckCircle2}
                        size="xs"
                        className={isEditMode ? 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white' : 'flex-1'}
                      >
                        Approve
                      </LockedButton>
                      <LockedButton
                        isEditMode={isEditMode}
                        onClick={() => leaveActionMutation.mutate({ leaveId: lv.id, action: 'reject' })}
                        icon={XCircle}
                        size="xs"
                        variant="outline"
                        className={isEditMode ? 'flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' : 'flex-1'}
                      >
                        Reject
                      </LockedButton>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: ROLE DASHBOARD ─────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Staff</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{dashStats?.total_staff ?? 6}</div>
              <div className="text-xs text-primary-600 mt-2 font-medium">
                {dashStats?.teachers_count ?? 4} Teaching • {dashStats?.non_teaching_count ?? 2} Non-Teaching
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Attendance Rate</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{dashStats?.attendance_rate ?? 100}%</div>
              <div className="text-xs text-slate-500 mt-2 font-medium">
                {dashStats?.present_today ?? 6} Present • {dashStats?.absent_today ?? 0} Absent
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leave Approvals</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{dashStats?.pending_leaves ?? 1}</div>
              <div className="text-xs text-slate-500 mt-2">Requires Principal sanction</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Session</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">AY 2026-27</div>
              <div className="text-xs text-emerald-600 mt-2 font-medium">Current Active Cycle</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: STAFF DOCUMENTS & FORMS CENTER (28 TEMPLATES) ─────────── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Document Category Filters & Search */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {['', 'Onboarding', 'Attendance & Leave', 'Academic & Teaching', 'Payroll & Employment', 'HR Governance'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDocCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    docCategoryFilter === cat
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat || 'All Templates (28)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedUserId || 121}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700"
              >
                <option value={121}>Rahul Desai (TCH-001)</option>
                <option value={122}>Priya Mehta (TCH-002)</option>
                <option value={123}>Amit Patil (TCH-003)</option>
                <option value={124}>Neha Kulkarni (TCH-004)</option>
                <option value={2}>Rajesh Sharma (ACC-001)</option>
              </select>

              <select
                value={docPeriodMonth}
                onChange={(e) => setDocPeriodMonth(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700"
              >
                <option value="October 2026">October 2026</option>
                <option value="November 2026">November 2026</option>
                <option value="September 2026">September 2026</option>
              </select>
            </div>
          </div>

          {/* Document Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docCatalogue.map((tpl: StaffDocumentTemplate) => (
              <div
                key={tpl.id}
                className="bg-white p-5 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-primary-50 text-primary-700 border border-blue-200 rounded text-[11px] font-mono font-bold">
                      {tpl.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{tpl.category}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{tpl.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{tpl.description}</p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-600">Printable Layout</span>
                  <button
                    onClick={() => {
                      setActiveDocTemplate(tpl.id)
                      setShowDocPreviewModal(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-primary-600 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors"
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

      {/* ─── MODAL: DOCUMENT PREVIEW & PRINT ──────────────────────────────── */}
      {showDocPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 print:hidden">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-primary-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Official Document Print Preview</h3>
                  <p className="text-xs text-slate-500">Ref Code: {renderedDoc?.reference_number || 'DOC-PREVIEW'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDocument}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setShowDocPreviewModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Render Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50">
              {isRenderingDoc ? (
                <div className="p-16 text-center text-slate-500 font-semibold">
                  Generating official document snapshot with dynamic data...
                </div>
              ) : (
                <div
                  className="bg-white shadow-md rounded-lg overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: renderedDoc?.html_content || '<p>No content generated.</p>' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: NEW STAFF REGISTRATION ─────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-slate-900 text-sm">Register New Faculty / Staff Member</h3>
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
                    value={newStaff.first_name}
                    onChange={(e) => setNewStaff({ ...newStaff, first_name: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Anand"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.last_name}
                    onChange={(e) => setNewStaff({ ...newStaff, last_name: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Joshi"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.username}
                    onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. anand.joshi"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="anand.joshi@prashantacademy.in"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Staff Role Type *</label>
                  <select
                    value={newStaff.staff_type}
                    onChange={(e) => setNewStaff({ ...newStaff, staff_type: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="Teacher">Teacher / Faculty</option>
                    <option value="Admin">Administrator</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Counselor">Counselor</option>
                    <option value="Receptionist">Receptionist</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Specialization / Subject</label>
                  <input
                    type="text"
                    value={newStaff.specialization}
                    onChange={(e) => setNewStaff({ ...newStaff, specialization: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Chemistry & Organic Science"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Basic Salary (₹/month)</label>
                  <input
                    type="number"
                    value={newStaff.basic_salary}
                    onChange={(e) => setNewStaff({ ...newStaff, basic_salary: Number(e.target.value) })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="+91 98200 12345"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Temporary Password <span className="text-slate-400 font-normal">(Leave blank to auto-generate)</span>
                  </label>
                  <input
                    type="text"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Leave empty for secure auto-generated temporary password"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    If left empty, a secure 10-character random password is generated and displayed on submission.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => createStaffMutation.mutate(newStaff)}
                disabled={!newStaff.first_name || !newStaff.username || !newStaff.email}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
              >
                Create Staff Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATED CREDENTIALS DISPLAY ────────────────────────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Staff Account Created</h3>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                A new staff account has been provisioned. Please securely provide these temporary login credentials to <strong className="text-slate-900">{createdCredentials.name}</strong>.
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
                    <span className="font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-blue-200">
                      {createdCredentials.temporary_password}
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800">
                <strong>Security Notice:</strong> The temporary password will only be displayed once. Copy and share it via a secure onboarding channel.
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const credText = `PrathamOne EduOS Staff Credentials\nName: ${createdCredentials.name}\nEmployee ID: ${createdCredentials.employee_id || 'N/A'}\nUsername: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.temporary_password || 'N/A'}`;
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
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: TEACHER BATCH ASSIGNMENT ───────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm">Assign Faculty to Class & Subject</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Faculty Member *</label>
                <select
                  value={newAssignment.teacher_user_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, teacher_user_id: Number(e.target.value) })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value={121}>Rahul Desai (Senior Math)</option>
                  <option value={122}>Priya Mehta (Senior Science)</option>
                  <option value={123}>Amit Patil (Social Studies)</option>
                  <option value={124}>Neha Kulkarni (Languages)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Board *</label>
                  <select
                    value={newAssignment.board_id}
                    onChange={(e) => setNewAssignment({ ...newAssignment, board_id: Number(e.target.value) })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Standard *</label>
                  <select
                    value={newAssignment.standard_id}
                    onChange={(e) => setNewAssignment({ ...newAssignment, standard_id: Number(e.target.value) })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {standards.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
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
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Subject *</label>
                  <select
                    value={newAssignment.subject_id}
                    onChange={(e) => setNewAssignment({ ...newAssignment, subject_id: Number(e.target.value) })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_class_teacher"
                  checked={newAssignment.is_class_teacher}
                  onChange={(e) => setNewAssignment({ ...newAssignment, is_class_teacher: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <label htmlFor="is_class_teacher" className="text-xs font-semibold text-slate-700">
                  Designate as Batch Class Teacher (Mentor)
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => assignTeacherMutation.mutate(newAssignment)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Assign Workload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: 10/15-TAB STAFF PROFILE ─────────────────────────────── */}
      <StaffProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false)
          setProfileModalStaffId(null)
        }}
        staffId={profileModalStaffId}
        onUpdate={() => {
          refetchStaff()
          refetchStaffDashboard()
        }}
        onOpenLifecycleModal={(stf) => {
          setLifecycleTargetStaff(stf)
          setShowLifecycleModal(true)
        }}
      />

      {/* ─── MODAL: LIFECYCLE MANAGEMENT ─────────────────────────────────── */}
      <StaffLifecycleModal
        isOpen={showLifecycleModal}
        onClose={() => {
          setShowLifecycleModal(false)
          setLifecycleTargetStaff(null)
        }}
        employee={lifecycleTargetStaff}
        onSuccess={() => {
          refetchStaff()
          refetchStaffDashboard()
        }}
      />
    </div>
  )
}

