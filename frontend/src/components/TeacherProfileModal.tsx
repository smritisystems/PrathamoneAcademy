/**
 * @file        TeacherProfileModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
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
 * @description Comprehensive 15-tab profile modal for Teacher workforce management (Overview, Assignments, Timetable, Sessions, Attendance, Payroll, Activity Timeline).
 */

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  BookOpen,
  DollarSign,
  FileText,
  Activity,
  Layers,
  Award,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  ChevronRight,
  ExternalLink,
  Shield,
  CreditCard,
  Briefcase,
  GraduationCap,
} from 'lucide-react'
import Modal from './Modal'
import { staffApi, teacherPayrollApi, timetableApi } from '../api/endpoints'
import type { StaffProfileDetail, EmployeeActivityHistoryItem } from '../types'

export interface TeacherProfileModalProps {
  isOpen: boolean
  onClose: () => void
  teacherId: number | null
  onUpdate: () => void
  onOpenAssignModal?: (teacherId: number) => void
  onOpenLifecycleModal?: (teacher: any) => void
}

type TabKey =
  | 'overview'
  | 'personal'
  | 'employment'
  | 'qualifications'
  | 'specializations'
  | 'assignments'
  | 'timetable'
  | 'sessions'
  | 'attendance'
  | 'leaves'
  | 'payroll_config'
  | 'payroll_history'
  | 'payment_history'
  | 'documents'
  | 'activity_history'

interface TabDef {
  key: TabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'personal', label: 'Personal Info', icon: MapPin },
  { key: 'employment', label: 'Employment', icon: Briefcase },
  { key: 'qualifications', label: 'Qualifications', icon: Award },
  { key: 'specializations', label: 'Subjects', icon: BookOpen },
  { key: 'assignments', label: 'Batch Assignments', icon: Layers },
  { key: 'timetable', label: 'Timetable', icon: Clock },
  { key: 'sessions', label: 'Teaching Sessions', icon: CheckCircle2 },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'leaves', label: 'Leaves', icon: Clock },
  { key: 'payroll_config', label: 'Payroll Config', icon: DollarSign },
  { key: 'payroll_history', label: 'Payroll Slips', icon: FileText },
  { key: 'payment_history', label: 'Disbursements', icon: CreditCard },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'activity_history', label: 'Activity Timeline', icon: Activity },
]

export default function TeacherProfileModal({
  isOpen,
  onClose,
  teacherId,
  onUpdate,
  onOpenAssignModal,
  onOpenLifecycleModal,
}: TeacherProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  // 1. Fetch Core Staff Profile & Assignments
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['teacher-profile', teacherId],
    queryFn: () => staffApi.get(teacherId!).then((r) => r.data),
    enabled: !!teacherId && isOpen,
  })

  // 2. Fetch Activity History
  const { data: activities, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['employee-activities', teacherId],
    queryFn: () => staffApi.getActivityHistory(teacherId!, 40).then((r) => r.data),
    enabled: !!teacherId && isOpen && activeTab === 'activity_history',
  })

  // 3. Fetch Teacher Payroll Profile & Rates
  const { data: payrollProfile } = useQuery({
    queryKey: ['teacher-payroll-profile', teacherId],
    queryFn: () => teacherPayrollApi.getProfileDetails(teacherId!).then((r) => r.data),
    enabled: !!teacherId && isOpen && ['overview', 'payroll_config', 'employment'].includes(activeTab),
  })

  // 4. Fetch Teaching Sessions
  const { data: sessionsData } = useQuery({
    queryKey: ['teacher-sessions', teacherId],
    queryFn: () => teacherPayrollApi.getSessions({ teacher_user_id: teacherId, limit: 30 }).then((r) => r.data),
    enabled: !!teacherId && isOpen && activeTab === 'sessions',
  })

  // 5. Fetch Monthly Payroll History
  const { data: payrollHistory } = useQuery({
    queryKey: ['teacher-payroll-history', teacherId],
    queryFn: () => teacherPayrollApi.getMonthlyPayrolls({ teacher_user_id: teacherId }).then((r) => r.data),
    enabled: !!teacherId && isOpen && activeTab === 'payroll_history',
  })

  // 6. Fetch Disbursement Vouchers
  const { data: vouchersData } = useQuery({
    queryKey: ['teacher-vouchers', teacherId],
    queryFn: () => teacherPayrollApi.getVouchers({ teacher_user_id: teacherId }).then((r) => r.data),
    enabled: !!teacherId && isOpen && activeTab === 'payment_history',
  })

  // 7. Fetch Leaves
  const { data: leavesData } = useQuery({
    queryKey: ['teacher-leaves', teacherId],
    queryFn: () => staffApi.leavesList({ user_id: teacherId || undefined }).then((r) => r.data),
    enabled: !!teacherId && isOpen && activeTab === 'leaves',
  })

  if (!teacherId) return null

  const assignments = profile?.assignments || []
  const isAssigned = assignments.length > 0
  const isDeparted = ['resigned', 'terminated', 'contract_ended'].includes(profile?.status?.toLowerCase() || '')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Teacher Profile & Workspace" size="2xl">
      <div className="space-y-4">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-full bg-indigo-500/30 border-2 border-indigo-400/50 flex items-center justify-center text-white text-lg font-bold shadow-inner flex-shrink-0">
              {profile ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}` : 'T'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading Teacher...'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                  profile?.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  profile?.status === 'on_leave' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  isDeparted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                }`}>
                  {profile?.status || 'Active'}
                </span>
                {isAssigned ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    {assignments.length} Batch{assignments.length > 1 ? 'es' : ''} Assigned
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Unassigned Teacher
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Emp ID: <strong className="text-white">{profile?.employee_id || 'N/A'}</strong></span>
                <span>Role: <strong className="text-white">{profile?.role || 'Teacher'}</strong></span>
                <span>Dept: <strong className="text-white">{profile?.department || 'Academics'}</strong></span>
                <span>Method: <strong className="text-white capitalize">{payrollProfile?.payment_method || 'Hourly'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenLifecycleModal && (
              <button
                type="button"
                onClick={() =>
                  onOpenLifecycleModal({
                    id: teacherId,
                    name: profile ? `${profile.first_name} ${profile.last_name}` : 'Teacher',
                    employee_id: profile?.employee_id,
                    role: profile?.role || 'Teacher',
                    status: profile?.status || 'active',
                  })
                }
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                Lifecycle Actions
              </button>
            )}

            {onOpenAssignModal && (
              <button
                type="button"
                onClick={() => onOpenAssignModal(teacherId)}
                className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20 flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Assign Batches
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-1 scrollbar-none text-xs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.key === 'assignments' && assignments.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                    {assignments.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content Display Area */}
        <div className="min-h-[360px] max-h-[520px] overflow-y-auto pr-1">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Assigned Batches</div>
                  <div className="text-xl font-bold text-slate-800 mt-1">{assignments.length}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isAssigned ? 'Active academic duties' : 'Pending batch allocation'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Weekly Hours</div>
                  <div className="text-xl font-bold text-slate-800 mt-1">
                    {profile?.total_weekly_hours || 0} hrs
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Allocated academic load</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Payment Model</div>
                  <div className="text-base font-bold text-slate-800 mt-1 capitalize">
                    {payrollProfile?.payment_method || 'Hourly'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {payrollProfile?.payment_method === 'hourly' ? `₹${payrollProfile?.hourly_rate || 0}/hr` :
                     payrollProfile?.payment_method === 'per_lecture' ? `₹${payrollProfile?.per_lecture_rate || 0}/lec` :
                     `₹${payrollProfile?.monthly_fixed_amount || 0}/mo`}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Joining Date</div>
                  <div className="text-base font-bold text-slate-800 mt-1">
                    {profile?.joining_date || 'N/A'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Exp: {profile?.experience_years || 0} years
                  </div>
                </div>
              </div>

              {/* Assignment Notice */}
              {!isAssigned && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-900">Teacher is Currently Unassigned</div>
                      <div className="text-xs text-amber-700 mt-0.5">
                        This teacher has an active profile but no batches or subjects assigned in the academic timetable.
                      </div>
                    </div>
                  </div>
                  {onOpenAssignModal && (
                    <button
                      type="button"
                      onClick={() => onOpenAssignModal(teacherId)}
                      className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded shadow-sm whitespace-nowrap"
                    >
                      Assign Batches Now
                    </button>
                  )}
                </div>
              )}

              {/* Quick Contact & Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" /> Contact Information
                  </h4>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-800">{profile?.email}</span></div>
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-800">{profile?.phone || 'N/A'}</span></div>
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Emergency Contact:</span> <span className="font-medium text-slate-800">{profile?.emergency_contact_name || 'N/A'} ({profile?.emergency_contact_phone || 'N/A'})</span></div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" /> Academic Credentials
                  </h4>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Qualification:</span> <span className="font-medium text-slate-800">{profile?.qualification || 'N/A'}</span></div>
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Specialization:</span> <span className="font-medium text-slate-800">{profile?.specialization || 'N/A'}</span></div>
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Employment Type:</span> <span className="font-medium text-slate-800 capitalize">{profile?.employment_type?.replace('_', ' ') || 'Full Time'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PERSONAL INFO TAB */}
          {activeTab === 'personal' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                Personal & Identity Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div><span className="text-slate-500 block">Date of Birth</span><span className="font-semibold text-slate-800">{profile?.date_of_birth || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">Gender</span><span className="font-semibold text-slate-800 capitalize">{profile?.gender || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">Blood Group</span><span className="font-semibold text-slate-800">{profile?.blood_group || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">Aadhar Number</span><span className="font-semibold text-slate-800">{profile?.aadhar_number || '•••• •••• ••••'}</span></div>
                <div><span className="text-slate-500 block">PAN Number</span><span className="font-semibold text-slate-800">{profile?.pan_number || '••••••••••'}</span></div>
              </div>

              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 pt-2">
                Residential Address
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block mb-1">Current Residential Address</span>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    {profile?.current_address || 'No current address recorded'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Permanent Address</span>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    {profile?.permanent_address || 'Same as current address'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. EMPLOYMENT TAB */}
          {activeTab === 'employment' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                Employment Terms & Lifecycle
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div><span className="text-slate-500 block">Employee Code / ID</span><span className="font-semibold text-slate-800">{profile?.employee_id || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">Employment Status</span><span className="font-semibold text-slate-800 uppercase">{profile?.status || 'Active'}</span></div>
                <div><span className="text-slate-500 block">Employment Type</span><span className="font-semibold text-slate-800 capitalize">{profile?.employment_type?.replace('_', ' ') || 'Full Time'}</span></div>
                <div><span className="text-slate-500 block">Joining Date</span><span className="font-semibold text-slate-800">{profile?.joining_date || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">Department</span><span className="font-semibold text-slate-800">{profile?.department || 'Academics'}</span></div>
                <div><span className="text-slate-500 block">Basic Base Salary</span><span className="font-semibold text-slate-800">₹{profile?.basic_salary || 0}</span></div>
              </div>
            </div>
          )}

          {/* 4 & 5. QUALIFICATIONS & SPECIALIZATIONS */}
          {(activeTab === 'qualifications' || activeTab === 'specializations') && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                Academic Qualifications & Subject Mastery
              </h4>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-semibold text-slate-800 text-sm">{profile?.qualification || 'Degree Not Recorded'}</div>
                  <div className="text-slate-500 mt-1">Specialization Focus: <strong>{profile?.specialization || 'General Subject Faculty'}</strong></div>
                  <div className="text-slate-500 mt-0.5">Teaching Experience: <strong>{profile?.experience_years || 0} Years</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* 6. BATCH ASSIGNMENTS TAB */}
          {activeTab === 'assignments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Active Batch & Subject Allocations ({assignments.length})
                </h4>
                {onOpenAssignModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAssignModal(teacherId)}
                    className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" /> Add Assignment
                  </button>
                )}
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                  <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-700">No Batches Currently Assigned</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">This teacher is marked as unassigned.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Board / Standard</th>
                        <th className="px-3 py-2">Batch / Division</th>
                        <th className="px-3 py-2">Subject</th>
                        <th className="px-3 py-2">Weekly Load</th>
                        <th className="px-3 py-2">Class Teacher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignments.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{a.board} - {a.standard}</td>
                          <td className="px-3 py-2 text-slate-700">{a.batch}</td>
                          <td className="px-3 py-2 font-semibold text-indigo-700">{a.subject}</td>
                          <td className="px-3 py-2 text-slate-700">{a.weekly_hours} hrs/wk</td>
                          <td className="px-3 py-2">
                            {a.is_class_teacher ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                                Yes
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
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Weekly Timetable Schedule</span>
                <span className="text-slate-500 font-normal">Active Lecture Slots</span>
              </h4>
              <p className="text-slate-500 text-xs">
                Shows timetable entries scheduled for this faculty across all standards and batches.
              </p>
              {assignments.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                  Teacher is unassigned. Assign batches and divisions first to generate timetable slots.
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Clock className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                  <div>Weekly schedule active for {assignments.length} assigned subject batches.</div>
                  <div className="text-[11px] text-slate-400 mt-1">Manage slots from Academic Timetable tab.</div>
                </div>
              )}
            </div>
          )}

          {/* 8. TEACHING SESSIONS TAB */}
          {activeTab === 'sessions' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Verified Teaching Sessions Register
              </h4>
              {(!sessionsData || sessionsData.length === 0) ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
                  No teaching sessions registered for this teacher yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Batch / Division</th>
                        <th className="px-3 py-2">Subject / Topic</th>
                        <th className="px-3 py-2">Duration</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sessionsData.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{s.session_date}</td>
                          <td className="px-3 py-2 text-slate-700">{s.division_name || 'Standard Batch'}</td>
                          <td className="px-3 py-2 text-slate-800">{s.subject_name || s.topic_covered || 'Lecture'}</td>
                          <td className="px-3 py-2 text-slate-600">{s.duration_hours || 1.0} hrs</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              s.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              s.approval_status === 'submitted' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {s.approval_status || 'Submitted'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">₹{s.calculated_amount || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 9 & 10. ATTENDANCE & LEAVES */}
          {(activeTab === 'attendance' || activeTab === 'leaves') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Casual Leave Balance</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {profile?.leave_balance?.casual_total ? (profile.leave_balance.casual_total - profile.leave_balance.casual_used) : 12} Days
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Sick Leave Balance</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {profile?.leave_balance?.sick_total ? (profile.leave_balance.sick_total - profile.leave_balance.sick_used) : 10} Days
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Earned Leave Balance</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {profile?.leave_balance?.earned_total ? (profile.leave_balance.earned_total - profile.leave_balance.earned_used) : 15} Days
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5">
                  Leave Applications History
                </h4>
                {(!leavesData || leavesData.length === 0) ? (
                  <div className="text-center py-4 text-slate-400">No leave requests recorded for this faculty.</div>
                ) : (
                  <div className="space-y-2">
                    {leavesData.map((l: any) => (
                      <div key={l.id} className="p-2 border border-slate-100 rounded flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-800 capitalize">{l.leave_type} Leave ({l.days_count} days)</div>
                          <div className="text-[11px] text-slate-500">{l.start_date} to {l.end_date} • {l.reason}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          l.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          l.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 11. PAYROLL CONFIGURATION TAB */}
          {activeTab === 'payroll_config' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                Teacher Payment Profile & Compensation Rates
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div><span className="text-slate-500 block">Payment Method</span><span className="font-bold text-slate-800 capitalize">{payrollProfile?.payment_method || 'Hourly'}</span></div>
                <div><span className="text-slate-500 block">Hourly Rate</span><span className="font-bold text-slate-800">₹{payrollProfile?.hourly_rate || 0}/hr</span></div>
                <div><span className="text-slate-500 block">Per Lecture Rate</span><span className="font-bold text-slate-800">₹{payrollProfile?.per_lecture_rate || 0}/lecture</span></div>
                <div><span className="text-slate-500 block">Monthly Fixed Amount</span><span className="font-bold text-slate-800">₹{payrollProfile?.monthly_fixed_amount || 0}/mo</span></div>
              </div>

              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 pt-2">
                Bank & Remittance Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><span className="text-slate-500 block">Bank Name</span><span className="font-semibold text-slate-800">{profile?.bank_name || 'HDFC Bank'}</span></div>
                <div><span className="text-slate-500 block">Account Number</span><span className="font-semibold text-slate-800">{profile?.bank_account_number || '••••••••1234'}</span></div>
                <div><span className="text-slate-500 block">IFSC Code</span><span className="font-semibold text-slate-800">{profile?.bank_ifsc || 'HDFC0001234'}</span></div>
              </div>
            </div>
          )}

          {/* 12 & 13. PAYROLL HISTORY & PAYMENT VOUCHERS */}
          {(activeTab === 'payroll_history' || activeTab === 'payment_history') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {activeTab === 'payroll_history' ? 'Generated Monthly Payroll Slips' : 'Payment Disbursement Vouchers'}
              </h4>
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
                Full ledger and remittance records managed under Teacher Payroll workspace.
              </div>
            </div>
          )}

          {/* 14. DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                Employment Documents & KYC Records
              </h4>
              <p className="text-slate-500">
                Official offer letters, faculty appointment agreements, experience certificates, and government KYC forms.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {['Faculty Appointment Letter', 'Teaching Service Agreement', 'Monthly Remittance Payslip', 'Relieving & Experience Certificate'].map((docName, idx) => (
                  <div key={idx} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <div className="font-medium text-slate-800">{docName}</div>
                    </div>
                    <span className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1">
                      Render <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 15. ACTIVITY TIMELINE TAB */}
          {activeTab === 'activity_history' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-600" /> Unified Activity History Timeline
              </h4>

              {isActivitiesLoading ? (
                <div className="text-center py-8 text-xs text-slate-500">Loading continuous employee ledger...</div>
              ) : (!activities || activities.length === 0) ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
                  No activity events recorded yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-indigo-200 ml-3.5 space-y-4 py-2">
                  {activities.map((act: EmployeeActivityHistoryItem, idx: number) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow-sm" />
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-slate-800">{act.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">{act.details}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                            {act.category}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                            {act.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="text-[11px] text-slate-500">
            PrathamOne EduOS • Canonical Teacher Identity #{teacherId}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
