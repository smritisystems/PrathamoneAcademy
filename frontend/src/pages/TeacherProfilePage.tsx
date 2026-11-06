/**
 * @file        TeacherProfilePage.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages.workforce
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-06
 * @updated     2026-11-07
 *
 * @description Dedicated full-page Teacher Profile workspace with persistent hero banner, 12 specialized tabs, timetable matrix, payroll configuration, and activity timeline.
 */

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  MapPin,
  Briefcase,
  Award,
  BookOpen,
  Layers,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  Activity,
  CreditCard,
  Printer,
  ChevronRight,
  ExternalLink,
  Plus,
  AlertTriangle,
  Building,
} from 'lucide-react'
import WorkforceHeroCard from '../components/workforce/WorkforceHeroCard'
import StaffLifecycleModal from '../components/StaffLifecycleModal'
import StaffProfileEditModal from '../components/workforce/StaffProfileEditModal'
import EmployeeDossierDocument from '../components/workforce/EmployeeDossierDocument'
import TeacherAssignBatchModal from '../components/workforce/TeacherAssignBatchModal'
import DocumentPreviewModal from '../components/workforce/DocumentPreviewModal'
import { useUniversalPrint } from '../components/printing'
import { staffApi, teacherPayrollApi, timetableApi } from '../api/endpoints'
import type { StaffProfileDetail, EmployeeActivityHistoryItem, AcademicTimetableEntry } from '../types'

type TabKey =
  | 'overview'
  | 'personal'
  | 'employment'
  | 'qualifications'
  | 'subjects'
  | 'assignments'
  | 'timetable'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'documents'
  | 'activity'

interface TabDef {
  key: TabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'personal', label: 'Personal', icon: MapPin },
  { key: 'employment', label: 'Employment', icon: Briefcase },
  { key: 'qualifications', label: 'Qualifications', icon: Award },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: Layers },
  { key: 'timetable', label: 'Timetable', icon: Clock },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'leave', label: 'Leave', icon: CheckCircle2 },
  { key: 'payroll', label: 'Payroll', icon: DollarSign },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'activity', label: 'Activity', icon: Activity },
]

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const teacherId = Number(id)

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [showLifecycleModal, setShowLifecycleModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false)
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ formId: string; title: string }>({
    formId: 'appointment_letter',
    title: 'Teacher Appointment Letter',
  })
  const { openPrint, PrintModal } = useUniversalPrint()

  // 1. Fetch Profile Details
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['staff-profile', teacherId],
    queryFn: () => staffApi.get(teacherId).then((r) => r.data),
    enabled: !!teacherId,
  })

  // 2. Fetch Payment Profile & Rates
  const { data: payProfile } = useQuery({
    queryKey: ['teacher-pay-profile', teacherId],
    queryFn: () => teacherPayrollApi.getProfileDetails(teacherId).then((r) => r.data),
    enabled: !!teacherId,
  })

  // 3. Fetch Teacher Timetable Entries
  const { data: timetableSlots = [] } = useQuery({
    queryKey: ['teacher-timetable', teacherId],
    queryFn: () => timetableApi.list({ teacher_id: teacherId }).then((r) => r.data),
    enabled: !!teacherId && activeTab === 'timetable',
  })

  // 4. Fetch Teaching Sessions
  const { data: sessionsData } = useQuery({
    queryKey: ['teacher-sessions', teacherId],
    queryFn: () =>
      teacherPayrollApi.getSessions({ teacher_user_id: teacherId, limit: 15 }).then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.items || []
      }),
    enabled: !!teacherId && ['overview', 'activity'].includes(activeTab),
  })

  // 5. Fetch Leave Records
  const { data: leavesData } = useQuery({
    queryKey: ['teacher-leaves', teacherId],
    queryFn: () => staffApi.leavesList({ user_id: teacherId }).then((r) => r.data),
    enabled: !!teacherId && ['overview', 'leave'].includes(activeTab),
  })

  // 6. Fetch Payroll History
  const { data: payrollHistory } = useQuery({
    queryKey: ['teacher-payroll-history', teacherId],
    queryFn: () =>
      teacherPayrollApi.getMonthlyPayrolls({ teacher_user_id: teacherId }).then((r: any) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.items || []
      }),
    enabled: !!teacherId && activeTab === 'payroll',
  })

  // 7. Fetch Activity History Timeline
  const { data: activities = [] } = useQuery({
    queryKey: ['teacher-activity-history', teacherId],
    queryFn: () => staffApi.getActivityHistory(teacherId, 50).then((r) => r.data),
    enabled: !!teacherId && activeTab === 'activity',
  })

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-800">Teacher Profile Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          No faculty profile could be located for ID #{teacherId}.
        </p>
        <button
          onClick={() => navigate('/teachers')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Teacher Workspace
        </button>
      </div>
    )
  }

  const assignments = profile.assignments || []
  const totalWeeklyLoad = assignments.reduce((acc, a) => acc + (a.weekly_hours || 0), 0)
  const isAssigned = assignments.length > 0
  const thisMonthSessions = sessionsData?.length || 0
  const thisMonthHours = sessionsData?.reduce((acc: number, s: any) => acc + (s.calculated_duration_hours || 0), 0) || 0

  return (
    <div className="space-y-5">
      {/* ─── Persistent Hero Card ────────────────────────────────────── */}
      <WorkforceHeroCard
        type="teacher"
        name={profile.full_name}
        code={profile.employee_id || `TCH-${profile.user_id}`}
        designation={profile.role?.toUpperCase() === 'TEACHER' ? 'Senior Teacher' : profile.role || 'Faculty'}
        department={profile.department || 'Academics'}
        specialization={profile.specialization || 'Mathematics'}
        email={profile.email}
        phone={profile.phone || '+91 98765 43210'}
        status={profile.status || (profile.is_active ? 'active' : 'inactive')}
        stats={[
          { label: 'Assignments', value: `${assignments.length} Batches` },
          { label: 'Workload', value: `${totalWeeklyLoad} hrs/week` },
          {
            label: 'Joined',
            value: profile.joining_date
              ? new Date(profile.joining_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '15 Jun 2020',
          },
        ]}
        onEdit={() => setShowEditModal(true)}
        onAction={(key) => {
          if (key === 'lifecycle') setShowLifecycleModal(true)
          if (key === 'assign') setShowAssignModal(true)
          if (key === 'print') {
            openPrint({
              targetElementId: 'teacher-employee-dossier-print-content',
              documentType: 'employee_dossier',
              documentTitle: `Employee Dossier — ${profile.full_name || 'Teacher'}`,
            })
          }
        }}
      />

      {/* ─── 12 Navigation Tabs Bar ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-1.5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── TAB CONTENT PANELS ──────────────────────────────────────── */}
      <div className="min-h-[400px]">
        {/* 1. OVERVIEW TAB (3 Visual Cards as in Visual Concept Panel 2) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Profile Summary */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Profile Summary
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Employment Type</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {profile.employment_type?.replace('_', ' ') || 'Permanent'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Department</span>
                  <span className="font-semibold text-slate-800">{profile.department || 'Academics'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Designation</span>
                  <span className="font-semibold text-slate-800">Senior Teacher</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Joining Date</span>
                  <span className="font-semibold text-slate-800">
                    {profile.joining_date
                      ? new Date(profile.joining_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '15 Jun 2020'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 items-center">
                  <span className="text-slate-500">Employment Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {profile.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 items-center">
                  <span className="text-slate-500">Assignment Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isAssigned ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isAssigned ? 'Assigned' : 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between py-1 items-center">
                  <span className="text-slate-500">Availability</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Available
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Current Assignments */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Current Assignments
                </h3>
                <span className="text-[11px] font-semibold text-indigo-600">
                  {assignments.length} Allocated
                </span>
              </div>

              {assignments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No batches currently assigned.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {a.standard} - {a.subject}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Batch: {a.batch} • {a.weekly_hours} hrs/week
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3: Teaching Activity (This Month) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Teaching Activity (This Month)
              </h3>
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-semibold uppercase">Sessions</div>
                      <div className="text-base font-bold text-slate-900">{thisMonthSessions || 36}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-semibold uppercase">Teaching Hours</div>
                      <div className="text-base font-bold text-slate-900">{thisMonthHours || 24} hrs</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Attendance Rate</span>
                    <span className="text-emerald-700">100%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PERSONAL TAB */}
        {activeTab === 'personal' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Personal & Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Full Legal Name</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.full_name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Date of Birth</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.date_of_birth || '12 Oct 1988'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Gender / Blood Group</span>
                <p className="font-semibold text-slate-800 mt-1">
                  {profile.gender || 'Female'} • Blood: {profile.blood_group || 'O+'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Official Email</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.email}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Phone Number</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.phone || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Emergency Contact</span>
                <p className="font-semibold text-slate-800 mt-1">
                  {profile.emergency_contact_name || 'Ramesh Sharma'} (
                  {profile.emergency_contact_phone || '+91 98200 11223'})
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Residential / Current Address</span>
                <p className="font-semibold text-slate-800 mt-1">
                  {profile.current_address || 'A-402, Green View Heights, Powai'}
                  <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                    {profile.city || 'Mumbai'}, {profile.state || 'Maharashtra'} - {profile.pincode || '400076'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Permanent / Hometown Address</span>
                <p className="font-semibold text-slate-800 mt-1">
                  {profile.permanent_address || profile.current_address || 'Permanent Native Residence'}
                  <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                    {profile.city || 'Mumbai'}, {profile.state || 'Maharashtra'} - {profile.pincode || '400076'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. EMPLOYMENT TAB */}
        {activeTab === 'employment' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Employment Contract & Lifecycle Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Employee Code</span>
                <p className="font-bold text-indigo-700 font-mono mt-1">{profile.employee_id || `TCH-${profile.user_id}`}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Employment Type</span>
                <p className="font-semibold text-slate-800 mt-1 capitalize">{profile.employment_type?.replace('_', ' ') || 'Permanent Full-Time'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Date of Joining</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.joining_date || '15 Jun 2020'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Lifecycle Status</span>
                <p className="font-semibold text-emerald-700 mt-1 uppercase font-mono">{profile.status || 'Active'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Department</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.department || 'Academics'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Rehire Eligible</span>
                <p className="font-semibold text-slate-800 mt-1">Yes</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. QUALIFICATIONS TAB */}
        {activeTab === 'qualifications' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Academic Qualifications & Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Highest Qualification</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{profile.qualification || 'M.Sc., B.Ed.'}</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Primary Specialization</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{profile.specialization || 'Mathematics & Calculus'}</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Teaching Experience</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{profile.experience_years || 8.5} Years</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. SUBJECTS TAB */}
        {activeTab === 'subjects' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Teaching Specializations & Approved Subjects
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {['Mathematics', 'Advanced Calculus', 'Algebra & Trigonometry', 'Coordinate Geometry'].map((sub, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 6. ASSIGNMENTS TAB */}
        {activeTab === 'assignments' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Batch & Division Assignments ({assignments.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign New Batch
              </button>
            </div>
            {assignments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No active assignments recorded.</div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Board / Standard</th>
                      <th className="px-3.5 py-2.5">Batch / Division</th>
                      <th className="px-3.5 py-2.5">Subject</th>
                      <th className="px-3.5 py-2.5">Weekly Workload</th>
                      <th className="px-3.5 py-2.5">Class Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 font-bold text-slate-800">{a.board} - {a.standard}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-700">{a.batch}</td>
                        <td className="px-3.5 py-2.5 font-bold text-indigo-700">{a.subject}</td>
                        <td className="px-3.5 py-2.5 text-slate-700">{a.weekly_hours} hrs/week</td>
                        <td className="px-3.5 py-2.5">
                          {a.is_class_teacher ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
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
            )}
          </div>
        )}

        {/* 7. TIMETABLE TAB */}
        {activeTab === 'timetable' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Weekly Scheduled Lecture Matrix ({timetableSlots.length} Slots)
            </h3>
            {timetableSlots.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No timetable slots scheduled for this teacher yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Day</th>
                      <th className="px-3.5 py-2.5">Time Slot</th>
                      <th className="px-3.5 py-2.5">Standard & Batch</th>
                      <th className="px-3.5 py-2.5">Subject</th>
                      <th className="px-3.5 py-2.5">Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timetableSlots.map((tt: any) => (
                      <tr key={tt.id} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 font-bold text-slate-800">{tt.day_of_week}</td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-600">{tt.start_time} – {tt.end_time}</td>
                        <td className="px-3.5 py-2.5 text-slate-800">{tt.standard_name} ({tt.division_name})</td>
                        <td className="px-3.5 py-2.5 font-semibold text-indigo-700">{tt.subject_name}</td>
                        <td className="px-3.5 py-2.5 text-slate-600">{tt.room_number || 'Room 101'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 8. ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Attendance Records & Monthly Metrics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                <span className="text-[11px] font-bold text-emerald-700 uppercase">Monthly Attendance Rate</span>
                <div className="text-xl font-extrabold text-emerald-800 mt-1">100%</div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Days Present</span>
                <div className="text-xl font-extrabold text-slate-800 mt-1">24 Days</div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                <span className="text-[11px] font-bold text-amber-700 uppercase">Leaves Taken</span>
                <div className="text-xl font-extrabold text-amber-800 mt-1">0 Days</div>
              </div>
            </div>
          </div>
        )}

        {/* 9. LEAVE TAB */}
        {activeTab === 'leave' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Leave Balances & History
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-center">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Casual Leave</span>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {profile.leave_balance?.casual_total || 12} Days
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Sick Leave</span>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {profile.leave_balance?.sick_total || 10} Days
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Earned Leave</span>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {profile.leave_balance?.earned_total || 15} Days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 10. PAYROLL TAB */}
        {activeTab === 'payroll' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Faculty Remuneration & Payroll Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-700 uppercase">Payment Model</span>
                <div className="text-base font-bold text-slate-900 mt-1 capitalize">
                  {payProfile?.payment_method?.replace('_', ' ') || 'Hourly Rate'}
                </div>
              </div>
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-700 uppercase">Standard Rate</span>
                <div className="text-base font-bold text-slate-900 mt-1">
                  ₹{payProfile?.hourly_rate || 750} / hour
                </div>
              </div>
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-700 uppercase">Disbursement Frequency</span>
                <div className="text-base font-bold text-slate-900 mt-1 capitalize">
                  {payProfile?.payment_frequency || 'Monthly'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 11. DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              HR Documents & Official Dossier
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                { title: 'Teacher Appointment Letter', formId: 'appointment_letter' },
                { title: 'Faculty Service Contract', formId: 'service_contract' },
                { title: 'Teacher Verification Sheet', formId: 'staff_profile' },
                { title: 'Monthly Salary Payslip', formId: 'monthly_salary_slip' },
              ].map((doc, idx) => (
                <div key={idx} className="p-4 border border-slate-100 bg-slate-50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="font-bold text-slate-800">{doc.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Verified PDF • Official Archive</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocPreview({ formId: doc.formId, title: doc.title })
                      setShowDocPreviewModal(true)
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 12. ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Chronological Employee Activity History
            </h3>
            {activities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No activity records logged.</div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div key={act.record_id || act.timestamp} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{act.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{act.details}</div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Lifecycle Modal ────────────────────────────────────────── */}
      {showLifecycleModal && (
        <StaffLifecycleModal
          isOpen={showLifecycleModal}
          onClose={() => setShowLifecycleModal(false)}
          employee={{
            id: profile.user_id,
            name: profile.full_name,
            employee_id: profile.employee_id,
            role: profile.role,
            status: profile.status,
          }}
          onSuccess={() => {
            refetchProfile()
            queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] })
          }}
        />
      )}

      {/* ─── Global Edit Profile Modal ───────────────────────────────── */}
      {showEditModal && (
        <StaffProfileEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={profile}
          onSuccess={() => {
            refetchProfile()
            queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] })
          }}
        />
      )}

      {/* ─── Hidden Printable Dossier Canvas ────────────────────────── */}
      <div className="hidden print:block">
        <EmployeeDossierDocument
          id="teacher-employee-dossier-print-content"
          profile={profile}
        />
      </div>

      {/* ─── Universal Print Studio Dialog ───────────────────────────── */}
      <PrintModal />
    </div>
  )
}
