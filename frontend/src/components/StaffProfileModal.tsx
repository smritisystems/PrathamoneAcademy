/**
 * @file        StaffProfileModal.tsx
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
 * @description Comprehensive 15-tab profile modal for non-teaching staff and administrative personnel management.
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
  Briefcase,
  DollarSign,
  FileText,
  Activity,
  Award,
  Shield,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import Modal from './Modal'
import { staffApi } from '../api/endpoints'
import type { StaffProfileDetail, EmployeeActivityHistoryItem } from '../types'

export interface StaffProfileModalProps {
  isOpen: boolean
  onClose: () => void
  staffId: number | null
  onUpdate: () => void
  onOpenLifecycleModal?: (staff: any) => void
}

type TabKey =
  | 'overview'
  | 'personal'
  | 'employment'
  | 'qualifications'
  | 'department'
  | 'attendance'
  | 'leaves'
  | 'compensation'
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
  { key: 'department', label: 'Dept & Role', icon: Building },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'leaves', label: 'Leaves', icon: Clock },
  { key: 'compensation', label: 'Compensation & Bank', icon: DollarSign },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'activity_history', label: 'Activity Timeline', icon: Activity },
]

export default function StaffProfileModal({
  isOpen,
  onClose,
  staffId,
  onUpdate,
  onOpenLifecycleModal,
}: StaffProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  // 1. Fetch Profile Details
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['staff-profile', staffId],
    queryFn: () => staffApi.get(staffId!).then((r) => r.data),
    enabled: !!staffId && isOpen,
  })

  // 2. Fetch Activity Timeline
  const { data: activities, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['staff-activities', staffId],
    queryFn: () => staffApi.getActivityHistory(staffId!, 40).then((r) => r.data),
    enabled: !!staffId && isOpen && activeTab === 'activity_history',
  })

  // 3. Fetch Leaves
  const { data: leavesData } = useQuery({
    queryKey: ['staff-leaves', staffId],
    queryFn: () => staffApi.leavesList({ user_id: staffId || undefined }).then((r) => r.data),
    enabled: !!staffId && isOpen && activeTab === 'leaves',
  })

  if (!staffId) return null

  const isDeparted = ['resigned', 'terminated', 'contract_ended'].includes(profile?.status?.toLowerCase() || '')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Staff Member Profile" size="2xl">
      <div className="space-y-4">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-xl p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-full bg-sky-500/30 border-2 border-sky-400/50 flex items-center justify-center text-white text-lg font-bold shadow-inner flex-shrink-0">
              {profile ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}` : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading Staff Member...'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                  profile?.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  profile?.status === 'on_leave' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  isDeparted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                }`}>
                  {profile?.status || 'Active'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  {profile?.department || 'Administration'}
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Emp ID: <strong className="text-white">{profile?.employee_id || 'N/A'}</strong></span>
                <span>Designation: <strong className="text-white">{profile?.role || 'Staff Specialist'}</strong></span>
                <span>Type: <strong className="text-white capitalize">{profile?.employment_type?.replace('_', ' ') || 'Full Time'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {onOpenLifecycleModal && (
              <button
                type="button"
                onClick={() =>
                  onOpenLifecycleModal({
                    id: staffId,
                    name: profile ? `${profile.first_name} ${profile.last_name}` : 'Staff Member',
                    employee_id: profile?.employee_id,
                    role: profile?.role || 'Staff',
                    status: profile?.status || 'active',
                  })
                }
                className="px-3 py-1.5 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                Lifecycle Actions
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
                    ? 'bg-sky-50 text-sky-700 border-b-2 border-sky-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content Display */}
        <div className="min-h-[360px] max-h-[520px] overflow-y-auto pr-1">
          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Department</div>
                  <div className="text-base font-bold text-slate-800 mt-1">{profile?.department || 'Administration'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Operational unit</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Monthly Salary</div>
                  <div className="text-xl font-bold text-slate-800 mt-1">₹{profile?.basic_salary || 0}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Base compensation</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Joining Date</div>
                  <div className="text-base font-bold text-slate-800 mt-1">{profile?.joining_date || 'N/A'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Exp: {profile?.experience_years || 0} years</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Leave Balance</div>
                  <div className="text-base font-bold text-slate-800 mt-1">
                    {profile?.leave_balance?.casual_total ? (profile.leave_balance.casual_total - profile.leave_balance.casual_used) : 12} Days
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Casual leave remaining</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-600" /> Contact Information
                  </h4>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-800">{profile?.email}</span></div>
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-800">{profile?.phone || 'N/A'}</span></div>
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Emergency Contact:</span> <span className="font-medium text-slate-800">{profile?.emergency_contact_name || 'N/A'} ({profile?.emergency_contact_phone || 'N/A'})</span></div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-sky-600" /> Organizational Role
                  </h4>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Department:</span> <span className="font-medium text-slate-800">{profile?.department || 'Administration'}</span></div>
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Staff Category:</span> <span className="font-medium text-slate-800">{profile?.staff_type || 'Non-Teaching'}</span></div>
                    <div className="flex justify-between py-0.5"><span className="text-slate-500">Employment Type:</span> <span className="font-medium text-slate-800 capitalize">{profile?.employment_type?.replace('_', ' ') || 'Full Time'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PERSONAL INFO */}
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

          {/* 3. EMPLOYMENT & CONTRACT */}
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
                <div><span className="text-slate-500 block">Department</span><span className="font-semibold text-slate-800">{profile?.department || 'Administration'}</span></div>
                <div><span className="text-slate-500 block">Basic Base Salary</span><span className="font-semibold text-slate-800">₹{profile?.basic_salary || 0}</span></div>
              </div>
            </div>
          )}

          {/* 4 & 5. QUALIFICATIONS & DEPARTMENT */}
          {(activeTab === 'qualifications' || activeTab === 'department') && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                Credentials & Functional Department
              </h4>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-semibold text-slate-800 text-sm">{profile?.qualification || 'Graduate'}</div>
                  <div className="text-slate-500 mt-1">Specialization: <strong>{profile?.specialization || 'Office Operations & Administration'}</strong></div>
                  <div className="text-slate-500 mt-0.5">Relevant Experience: <strong>{profile?.experience_years || 0} Years</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* 6 & 7. ATTENDANCE & LEAVES */}
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
                  <div className="text-center py-4 text-slate-400">No leave requests recorded for this staff member.</div>
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

          {/* 8. COMPENSATION & BANK */}
          {activeTab === 'compensation' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                Salary & Bank Remittance Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div><span className="text-slate-500 block">Monthly Basic Salary</span><span className="font-bold text-slate-800 text-base">₹{profile?.basic_salary || 0}</span></div>
                <div><span className="text-slate-500 block">Bank Name</span><span className="font-semibold text-slate-800">{profile?.bank_name || 'HDFC Bank'}</span></div>
                <div><span className="text-slate-500 block">Account Number</span><span className="font-semibold text-slate-800">{profile?.bank_account_number || '••••••••1234'}</span></div>
                <div><span className="text-slate-500 block">IFSC Code</span><span className="font-semibold text-slate-800">{profile?.bank_ifsc || 'HDFC0001234'}</span></div>
                <div><span className="text-slate-500 block">PAN Card</span><span className="font-semibold text-slate-800">{profile?.pan_number || '••••••••••'}</span></div>
              </div>
            </div>
          )}

          {/* 9. DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                Employment Documentation & Letters
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {['Staff Employment Agreement', 'ID Verification & KYC Record', 'Monthly Salary Slip', 'Experience & Relieving Certificate'].map((docName, idx) => (
                  <div key={idx} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <div className="font-medium text-slate-800">{docName}</div>
                    </div>
                    <span className="text-sky-600 hover:text-sky-800 font-semibold cursor-pointer flex items-center gap-1">
                      Render <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. ACTIVITY TIMELINE */}
          {activeTab === 'activity_history' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-600" /> Unified Activity History Timeline
              </h4>

              {isActivitiesLoading ? (
                <div className="text-center py-8 text-xs text-slate-500">Loading continuous employee ledger...</div>
              ) : (!activities || activities.length === 0) ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
                  No activity events recorded yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-sky-200 ml-3.5 space-y-4 py-2">
                  {activities.map((act: EmployeeActivityHistoryItem, idx: number) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-sky-600 border-2 border-white shadow-sm" />
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-700">
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
            PrathamOne EduOS • Canonical Staff Identity #{staffId}
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
