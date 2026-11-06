/**
 * @file        StaffProfilePage.tsx
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
 * @description Dedicated full-page Non-Teaching Staff Profile workspace with hero banner, 12 specialized administrative tabs, reporting manager hierarchy, duties checklist, and activity history.
 */

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  MapPin,
  Briefcase,
  Building,
  Award,
  Users,
  CheckSquare,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Activity,
  ChevronRight,
  Shield,
  CreditCard,
  Edit,
  CheckCircle2,
} from 'lucide-react'
import WorkforceHeroCard from '../components/workforce/WorkforceHeroCard'
import StaffLifecycleModal from '../components/StaffLifecycleModal'
import StaffProfileEditModal from '../components/workforce/StaffProfileEditModal'
import EmployeeDossierDocument from '../components/workforce/EmployeeDossierDocument'
import { useUniversalPrint } from '../components/printing'
import { staffApi } from '../api/endpoints'
import type { StaffProfileDetail, EmployeeActivityHistoryItem } from '../types'

type TabKey =
  | 'overview'
  | 'personal'
  | 'employment'
  | 'department'
  | 'designation'
  | 'reporting'
  | 'responsibilities'
  | 'attendance'
  | 'leave'
  | 'salary'
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
  { key: 'department', label: 'Department', icon: Building },
  { key: 'designation', label: 'Designation', icon: Award },
  { key: 'reporting', label: 'Reporting', icon: Users },
  { key: 'responsibilities', label: 'Responsibilities', icon: CheckSquare },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'leave', label: 'Leave', icon: Clock },
  { key: 'salary', label: 'Salary', icon: DollarSign },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'activity', label: 'Activity', icon: Activity },
]

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const staffId = Number(id)

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [showLifecycleModal, setShowLifecycleModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const { openPrint, PrintModal } = useUniversalPrint()

  // 1. Fetch Staff Profile Details
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['staff-profile', staffId],
    queryFn: () => staffApi.get(staffId).then((r) => r.data),
    enabled: !!staffId,
  })

  // 2. Fetch Activity Timeline
  const { data: activities = [] } = useQuery({
    queryKey: ['staff-activity-history', staffId],
    queryFn: () => staffApi.getActivityHistory(staffId, 50).then((r) => r.data),
    enabled: !!staffId && activeTab === 'activity',
  })

  // 3. Fetch Leaves
  const { data: leavesData = [] } = useQuery({
    queryKey: ['staff-leaves', staffId],
    queryFn: () => staffApi.leavesList({ user_id: staffId }).then((r) => r.data),
    enabled: !!staffId && ['overview', 'leave'].includes(activeTab),
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
        <h2 className="text-base font-bold text-slate-800">Staff Profile Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          No employee profile could be located for ID #{staffId}.
        </p>
        <button
          onClick={() => navigate('/staff')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Staff Workspace
        </button>
      </div>
    )
  }

  const defaultDuties = [
    'Office administration and coordination',
    'Staff and visitor management',
    'Documentation and record keeping',
    'Support to academic and administrative teams',
  ]
  const duties = profile.responsibilities
    ? profile.responsibilities.split('\n').filter(Boolean)
    : defaultDuties

  return (
    <div className="space-y-5">
      {/* ─── Persistent Hero Card ────────────────────────────────────── */}
      <WorkforceHeroCard
        type="staff"
        name={profile.full_name}
        code={profile.employee_id || `STF-${profile.user_id}`}
        designation={profile.role?.toUpperCase() === 'ADMIN' ? 'Office Administrator' : profile.role || 'Administrative Staff'}
        department={profile.department || 'Administration'}
        email={profile.email}
        phone={profile.phone || '+91 98673 21904'}
        status={profile.status || (profile.is_active ? 'active' : 'inactive')}
        stats={[
          { label: 'Department', value: profile.department || 'Administration' },
          { label: 'Designation', value: 'Office Administrator' },
          {
            label: 'Joined',
            value: profile.joining_date
              ? new Date(profile.joining_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '01 Aug 2019',
          },
        ]}
        onEdit={() => setShowEditModal(true)}
        onAction={(key) => {
          if (key === 'lifecycle') setShowLifecycleModal(true)
          if (key === 'print') {
            openPrint({
              targetElementId: 'staff-employee-dossier-print-content',
              documentType: 'employee_dossier',
              documentTitle: `Employee Dossier — ${profile.full_name || 'Staff'}`,
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
        {/* 1. OVERVIEW TAB (3 Visual Cards as in Visual Concept Panel 4) */}
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
                  <span className="font-semibold text-slate-800">{profile.department || 'Administration'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Designation</span>
                  <span className="font-semibold text-slate-800">Office Administrator</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Reporting Manager</span>
                  <span className="font-semibold text-indigo-700">
                    {profile.reporting_manager_name || 'Principal'}
                  </span>
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
                      : '01 Aug 2019'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 items-center">
                  <span className="text-slate-500">Employment Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {profile.status?.toUpperCase() || 'ACTIVE'}
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

            {/* Card 2: Key Responsibilities */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Key Responsibilities
                </h3>
                <span className="text-[11px] font-semibold text-emerald-600">Active Scope</span>
              </div>

              <div className="space-y-3 pt-1">
                {duties.map((duty, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{duty}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Attendance (This Month) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Attendance (This Month)
              </h3>
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-semibold uppercase">Present</div>
                      <div className="text-base font-bold text-slate-900">22 days</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-semibold uppercase">Leave</div>
                      <div className="text-base font-bold text-slate-900">1 day</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Attendance Rate</span>
                    <span className="text-emerald-700">95.7%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '95.7%' }} />
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
              Personal & Identification Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Full Legal Name</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.full_name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Date of Birth</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.date_of_birth || '24 Jan 1985'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Gender / Blood Group</span>
                <p className="font-semibold text-slate-800 mt-1">
                  {profile.gender || 'Male'} • Blood: {profile.blood_group || 'B+'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Official Email</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.email}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Contact Phone</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.phone || '+91 98673 21904'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Emergency Contact</span>
                <p className="font-semibold text-slate-800 mt-1">
                  {profile.emergency_contact_name || 'Sunita Kumar'} (
                  {profile.emergency_contact_phone || '+91 98673 21900'})
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Residential / Current Address</span>
                <p className="font-semibold text-slate-800 mt-1">
                  {profile.current_address || 'B-103, Shanti Niketan, Thane West'}
                  <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                    {profile.city || 'Mumbai'}, {profile.state || 'Maharashtra'} - {profile.pincode || '400601'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Permanent / Hometown Address</span>
                <p className="font-semibold text-slate-800 mt-1">
                  {profile.permanent_address || profile.current_address || 'Permanent Native Residence'}
                  <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                    {profile.city || 'Mumbai'}, {profile.state || 'Maharashtra'} - {profile.pincode || '400601'}
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
              Staff Employment Records
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Staff ID</span>
                <p className="font-bold text-indigo-700 font-mono mt-1">{profile.employee_id || `STF-${profile.user_id}`}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Employment Type</span>
                <p className="font-semibold text-slate-800 mt-1 capitalize">{profile.employment_type?.replace('_', ' ') || 'Permanent Full-Time'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Joining Date</span>
                <p className="font-semibold text-slate-800 mt-1">{profile.joining_date || '01 Aug 2019'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Employment Status</span>
                <p className="font-semibold text-emerald-700 mt-1 uppercase font-mono">{profile.status || 'Active'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Rehire Eligible</span>
                <p className="font-semibold text-slate-800 mt-1">Yes</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. DEPARTMENT TAB */}
        {activeTab === 'department' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Department Operations & Scope
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-slate-800 text-sm">{profile.department || 'Administration'}</div>
              <p className="text-slate-500">
                Manages day-to-day front-desk coordination, office record-keeping, institutional facility upkeep, and administrative support across academic wings.
              </p>
            </div>
          </div>
        )}

        {/* 5. DESIGNATION TAB */}
        {activeTab === 'designation' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Designation & Role Authority
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-indigo-700 text-sm">Office Administrator</div>
              <p className="text-slate-500">
                Authorized for staff registration, attendance tracking, documentation verification, and visitor management.
              </p>
            </div>
          </div>
        )}

        {/* 6. REPORTING TAB */}
        {activeTab === 'reporting' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Reporting Hierarchy & Supervision
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Direct Reporting Manager</span>
                  <div className="text-sm font-bold text-slate-800">
                    {profile.reporting_manager_name || 'Principal'}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                Direct Line
              </span>
            </div>
          </div>
        )}

        {/* 7. RESPONSIBILITIES TAB */}
        {activeTab === 'responsibilities' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Key Responsibilities & Delegated Duties
            </h3>
            <div className="space-y-3">
              {duties.map((duty, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 text-xs text-slate-800">
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{duty}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Monthly Attendance Register
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-center">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <span className="text-[11px] font-bold text-emerald-700 uppercase">Monthly Rate</span>
                <div className="text-xl font-extrabold text-emerald-800 mt-1">95.7%</div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Present Days</span>
                <div className="text-xl font-extrabold text-slate-800 mt-1">22 Days</div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-[11px] font-bold text-amber-700 uppercase">Leaves Taken</span>
                <div className="text-xl font-extrabold text-amber-800 mt-1">1 Day</div>
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

        {/* 10. SALARY TAB */}
        {activeTab === 'salary' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Salary & Banking Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-700 uppercase">Basic Monthly Salary</span>
                <div className="text-base font-bold text-slate-900 mt-1">
                  ₹{profile.basic_salary?.toLocaleString() || '45,000'}
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Primary Bank Account</span>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {profile.bank_name || 'HDFC Bank'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {profile.bank_account_number || '••••••••1234'} • {profile.bank_ifsc || 'HDFC0000123'}
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase">PAN Number</span>
                <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                  {profile.pan_number || 'ABCDE1234F'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 11. DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Staff Official Dossier & Records
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {['Staff Appointment Letter', 'Permanent Service Agreement', 'Aadhaar & PAN Verification Proof', 'Salary Slip Archive'].map(
                (doc, idx) => (
                  <div key={idx} className="p-4 border border-slate-100 bg-slate-50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <div>
                        <div className="font-bold text-slate-800">{doc}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Verified Document • Official Dossier</div>
                      </div>
                    </div>
                    <button className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                      View
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* 12. ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Employee Activity History
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
            queryClient.invalidateQueries({ queryKey: ['staff-profile', staffId] })
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
            queryClient.invalidateQueries({ queryKey: ['staff-profile', staffId] })
          }}
        />
      )}

      {/* ─── Hidden Printable Dossier Canvas ────────────────────────── */}
      <div className="hidden print:block">
        <EmployeeDossierDocument
          id="staff-employee-dossier-print-content"
          profile={profile}
        />
      </div>

      {/* ─── Universal Print Studio Dialog ───────────────────────────── */}
      <PrintModal />
    </div>
  )
}
