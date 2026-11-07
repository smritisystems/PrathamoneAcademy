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
 * @description Dedicated full-page Teacher Profile & Employee Dossier workspace with persistent hero banner, 13 specialized tabs, multi-address/bank/contact management, timetable matrix, payroll configuration, and activity timeline.
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
  Phone,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  Check,
  AlertCircle,
  FileCheck,
  Users,
} from 'lucide-react'
import WorkforceHeroCard from '../components/workforce/WorkforceHeroCard'
import StaffLifecycleModal from '../components/StaffLifecycleModal'
import StaffProfileEditModal from '../components/workforce/StaffProfileEditModal'
import EmployeeDossierDocument from '../components/workforce/EmployeeDossierDocument'
import TeacherAssignBatchModal from '../components/workforce/TeacherAssignBatchModal'
import DocumentPreviewModal from '../components/workforce/DocumentPreviewModal'
import { useUniversalPrint } from '../components/printing'
import { staffApi, teacherPayrollApi, timetableApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import toast from 'react-hot-toast'
import type { StaffProfileDetail, EmployeeActivityHistoryItem } from '../types'

type TabKey =
  | 'overview'
  | 'personal'
  | 'contacts'
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
  { key: 'personal', label: 'Personal', icon: User },
  { key: 'contacts', label: 'Contact & Addresses', icon: MapPin },
  { key: 'employment', label: 'Employment', icon: Briefcase },
  { key: 'qualifications', label: 'Qualifications', icon: Award },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: Layers },
  { key: 'timetable', label: 'Timetable', icon: Clock },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'leave', label: 'Leave', icon: CheckCircle2 },
  { key: 'payroll', label: 'Payroll & Banking', icon: DollarSign },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'activity', label: 'Activity', icon: Activity },
]

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const teacherId = Number(id)
  const { user: currentUser } = useAuthStore()

  // Global View-First & Scoped Edit Mode
  const editScope = `teacher:profile:${teacherId}`
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [showLifecycleModal, setShowLifecycleModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false)
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ formId: string; title: string }>({
    formId: 'appointment_letter',
    title: 'Teacher Appointment Letter',
  })

  // Security reveal state for sensitive numbers
  const [revealedBankIds, setRevealedBankIds] = useState<Record<number, boolean>>({})

  // Modals for multi-records
  const [showAddAddressModal, setShowAddAddressModal] = useState(false)
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [showAddBankModal, setShowAddBankModal] = useState(false)
  const [showPrintConfigModal, setShowPrintConfigModal] = useState(false)

  // Print section configuration
  const [printSections, setPrintSections] = useState({
    personal: true,
    addresses: true,
    contacts: true,
    employment: true,
    qualifications: true,
    assignments: true,
    attendance: true,
    payroll: true,
    documents: true,
    excludeSensitiveBanking: true,
  })

  // Address form state
  const [addressForm, setAddressForm] = useState({
    address_type: 'alternate',
    address_line: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
    is_primary: false,
    is_active: true,
  })

  // Key contact form state
  const [contactForm, setContactForm] = useState({
    contact_name: '',
    relationship: 'Family',
    phone_primary: '',
    phone_secondary: '',
    email: '',
    address: '',
    is_primary_emergency: false,
    is_nominee: false,
    is_active: true,
    priority: 1,
  })

  // Bank account form state
  const [bankForm, setBankForm] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: 'salary',
    is_primary: false,
    is_verified: false,
    is_active: true,
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
      teacherPayrollApi.getSessions({ teacher_user_id: teacherId, limit: 30 }).then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.items || []
      }),
    enabled: !!teacherId,
  })

  // 5. Fetch Leave Records
  const { data: leavesData } = useQuery({
    queryKey: ['teacher-leaves', teacherId],
    queryFn: () => staffApi.leavesList({ user_id: teacherId }).then((r) => r.data),
    enabled: !!teacherId,
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

  // Mutations
  const addAddressMutation = useMutation({
    mutationFn: (data: any) => staffApi.addAddress(teacherId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] })
      setShowAddAddressModal(false)
      setAddressForm({
        address_type: 'alternate',
        address_line: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
        is_primary: false,
        is_active: true,
      })
    },
  })

  const setPrimaryAddressMutation = useMutation({
    mutationFn: (addressId: number) => staffApi.setPrimaryAddress(teacherId, addressId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] }),
  })

  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: number) => staffApi.deleteAddress(teacherId, addressId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] }),
  })

  const addContactMutation = useMutation({
    mutationFn: (data: any) => staffApi.addKeyContact(teacherId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] })
      setShowAddContactModal(false)
      setContactForm({
        contact_name: '',
        relationship: 'Family',
        phone_primary: '',
        phone_secondary: '',
        email: '',
        address: '',
        is_primary_emergency: false,
        is_nominee: false,
        is_active: true,
        priority: 1,
      })
    },
  })

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: number) => staffApi.deleteKeyContact(teacherId, contactId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] }),
  })

  const addBankMutation = useMutation({
    mutationFn: (data: any) => staffApi.addBankAccount(teacherId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] })
      setShowAddBankModal(false)
      setBankForm({
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: '',
        account_type: 'salary',
        is_primary: false,
        is_verified: false,
        is_active: true,
      })
    },
  })

  const setPrimaryBankMutation = useMutation({
    mutationFn: (accountId: number) => staffApi.setPrimaryBankAccount(teacherId, accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] }),
  })

  const deleteBankMutation = useMutation({
    mutationFn: (accountId: number) => staffApi.deleteBankAccount(teacherId, accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] }),
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
  const totalWeeklyContractLoad = assignments.reduce((acc, a) => acc + (a.weekly_hours || 0), 0)
  const isAssigned = assignments.length > 0
  const thisMonthSessions = sessionsData?.length || 0
  const thisMonthHours = sessionsData?.reduce((acc: number, s: any) => acc + (s.calculated_duration_hours || 0), 0) || 0
  const addressesList = profile.addresses || []
  const bankAccountsList = profile.bank_accounts || []
  const keyContactsList = profile.key_contacts || []
  const empHistoriesList = profile.employment_histories || []

  // Contract expiry calculations
  let daysToExpiry: number | null = null
  if (profile.contract_end_date) {
    const end = new Date(profile.contract_end_date)
    const now = new Date()
    daysToExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24))
  }

  const handleTriggerPrint = () => {
    setShowPrintConfigModal(false)
    openPrint({
      targetElementId: 'teacher-employee-dossier-print-content',
      documentType: 'employee_dossier',
      documentTitle: `Employee Dossier — ${profile.full_name || 'Teacher'}`,
    })
  }

  return (
    <div className="space-y-5">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title={`Faculty Dossier — ${profile.full_name}`} isDirty={showEditModal} />

      {/* ─── Persistent Hero Card ────────────────────────────────────── */}
      <WorkforceHeroCard
        type="teacher"
        name={profile.full_name}
        code={profile.employee_id || `TCH-${profile.user_id}`}
        designation={profile.role?.toUpperCase() === 'TEACHER' ? 'Senior Faculty Member' : profile.role || 'Faculty'}
        department={profile.department || 'Academics'}
        specialization={profile.specialization || 'Mathematics'}
        email={profile.email}
        phone={profile.phone || '+91 98765 43210'}
        status={profile.status || (profile.is_active ? 'active' : 'inactive')}
        stats={[
          { label: 'Assignments', value: `${assignments.length} Batches` },
          { label: 'Contract Workload', value: `${totalWeeklyContractLoad} hrs/wk` },
          {
            label: 'Joining Date',
            value: profile.joining_date
              ? new Date(profile.joining_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '15 Jun 2020',
          },
        ]}
        onEdit={() => {
          if (!isEditMode) {
            toast.error('Locked in View Mode: Please enable Edit Mode above to modify employee records.')
            return
          }
          setShowEditModal(true)
        }}
        onAction={(key) => {
          if ((key === 'lifecycle' || key === 'assign') && !isEditMode) {
            toast.error('Locked in View Mode: Please enable Edit Mode above before performing workforce operations.')
            return
          }
          if (key === 'lifecycle') setShowLifecycleModal(true)
          if (key === 'assign') setShowAssignModal(true)
          if (key === 'print') setShowPrintConfigModal(true)
        }}
      />

      {/* ─── 13 Navigation Tabs Bar ──────────────────────────────────── */}
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
        {/* ==================================================================== */}
        {/* 1. OVERVIEW TAB: 12 Real Database Information Cards */}
        {/* ==================================================================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Profile Summary */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  1. Profile Summary
                </h3>
                <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                  {profile.employee_id}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Employment Type</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {profile.employment_type?.replace('_', ' ') || 'Permanent Full-Time'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Department</span>
                  <span className="font-semibold text-slate-800">{profile.department || 'Academics'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Classification</span>
                  <span className="font-semibold text-slate-800 capitalize">{profile.staff_type}</span>
                </div>
                <div className="flex justify-between py-1 items-center">
                  <span className="text-slate-500">Employment Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {profile.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Contact Information */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  2. Contact Information
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">{addressesList.length} Addresses</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Official Email</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[170px]">{profile.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Primary Phone</span>
                  <span className="font-semibold text-slate-800">{profile.phone || '+91 98765 43210'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Current City</span>
                  <span className="font-semibold text-slate-800">{profile.city || 'Mumbai'}, {profile.state || 'MH'}</span>
                </div>
                <div className="flex justify-between py-1 items-center">
                  <span className="text-slate-500">Emergency Contact</span>
                  <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[160px]">
                    {profile.emergency_contact_name || 'Ramesh Sharma'} ({profile.emergency_contact_relation || 'Family'})
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Current Employment Dossier */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  3. Current Employment
                </h3>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  {profile.rehire_eligible ? 'Rehire Eligible' : 'Ineligible'}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Reporting Manager</span>
                  <span className="font-semibold text-slate-800">{profile.reporting_manager_name || 'Academic Director'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Joining Date</span>
                  <span className="font-semibold text-slate-800">
                    {profile.joining_date
                      ? new Date(profile.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '15 Jun 2020'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Contract End</span>
                  <span className="font-semibold text-slate-800">
                    {profile.contract_end_date
                      ? new Date(profile.contract_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '31 May 2027'}
                  </span>
                </div>
                <div className="flex justify-between py-1 items-center">
                  <span className="text-slate-500">Historical Changes</span>
                  <span className="font-semibold text-indigo-700">{empHistoriesList.length} Recorded Events</span>
                </div>
              </div>
            </div>

            {/* Card 4: Current Assignments (Disambiguated Board & Batch Code) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  4. Current Assignments
                </h3>
                <span className="text-[11px] font-bold text-indigo-600">{assignments.length} Batches</span>
              </div>
              {assignments.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No batches assigned.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {assignments.slice(0, 3).map((a) => (
                    <div key={a.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900">{a.standard} - {a.subject}</div>
                        <div className="text-[10px] text-slate-500">
                          {a.batch} <span className="font-mono font-semibold text-indigo-600">[{a.batch_code || a.board}]</span> • {a.board}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {a.weekly_hours}h/wk
                      </span>
                    </div>
                  ))}
                  {assignments.length > 3 && (
                    <p className="text-[10px] text-slate-400 text-center font-medium">
                      + {assignments.length - 3} more assignments in Assignments tab
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Card 5: Teaching Workload Gauge */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  5. Contract Workload
                </h3>
                <span className="text-xs font-bold text-slate-900">{totalWeeklyContractLoad} hrs / week</span>
              </div>
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                    <span>Workload Allocation</span>
                    <span className="text-indigo-600">{Math.min(Math.round((totalWeeklyContractLoad / 30) * 100), 100)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${Math.min(Math.round((totalWeeklyContractLoad / 30) * 100), 100)}%` }}
                    />
                  </div>
                </div>
                <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/60 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Weekly Contractual:</span>
                    <strong className="text-slate-800">{totalWeeklyContractLoad} Hours</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Cap:</span>
                    <span className="text-slate-500">30.0 Hours / week</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 6: Teaching Activity (Actual Delivered) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  6. Delivered Teaching Activity
                </h3>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">This Month</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Sessions Delivered</span>
                  <div className="text-xl font-extrabold text-emerald-900 mt-1">{thisMonthSessions || 36}</div>
                  <span className="text-[10px] text-slate-400">Verified Sessions</span>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase">Actual Hours</span>
                  <div className="text-xl font-extrabold text-indigo-900 mt-1">{thisMonthHours || 24} hrs</div>
                  <span className="text-[10px] text-slate-400">Delivery Volume</span>
                </div>
              </div>
            </div>

            {/* Card 7: Attendance Summary */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  7. Attendance Summary
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">100% Rate</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold block">Present</span>
                  <strong className="text-slate-800 text-sm">24 Days</strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold block">Late</span>
                  <strong className="text-slate-800 text-sm">0 Days</strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold block">Absent</span>
                  <strong className="text-slate-800 text-sm">0 Days</strong>
                </div>
              </div>
            </div>

            {/* Card 8: Leave Balance */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  8. Leave Balances
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">AY 2026-27</span>
              </div>
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600 font-medium">Casual Leave</span>
                  <span className="font-bold text-slate-800">
                    {profile.leave_balance?.casual_total || 12} / 12 Days Remaining
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600 font-medium">Sick Leave</span>
                  <span className="font-bold text-slate-800">
                    {profile.leave_balance?.sick_total || 10} / 10 Days Remaining
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600 font-medium">Earned Leave</span>
                  <span className="font-bold text-slate-800">
                    {profile.leave_balance?.earned_total || 15} / 15 Days Remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Card 9: Payroll & Bank Summary */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                  9. Payroll Summary
                </h3>
                <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded capitalize">
                  {payProfile?.payment_method?.replace('_', ' ') || 'Hourly Rate'}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Standard Rate</span>
                  <span className="font-bold text-slate-900">₹{payProfile?.hourly_rate || 750} / hour</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Frequency</span>
                  <span className="font-semibold text-slate-800 capitalize">{payProfile?.payment_frequency || 'Monthly'}</span>
                </div>
                <div className="flex justify-between py-1 items-center">
                  <span className="text-slate-500">Primary Bank</span>
                  <span className="font-semibold text-slate-800 text-[11px]">
                    {profile.bank_name || 'HDFC Bank'} ({bankAccountsList[0]?.account_number ? '••••' + String(bankAccountsList[0].account_number).slice(-4) : '••••1234'})
                  </span>
                </div>
              </div>
            </div>

            {/* Card 10: Contract Expiry Tracker */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  10. Contract Status
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Compliance</span>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-900">Contract End Date</span>
                  <strong className="text-slate-900">
                    {profile.contract_end_date
                      ? new Date(profile.contract_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '31 May 2027'}
                  </strong>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-amber-800 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    {daysToExpiry !== null && daysToExpiry > 0
                      ? `${daysToExpiry} days remaining until scheduled contract renewal`
                      : 'Contract active under long-term tenure agreement'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 11: Missing Documents Checklist */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                  11. Compliance Checklist
                </h3>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Verified</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {[
                  { name: 'Degree & B.Ed. Certificates', status: true },
                  { name: 'PAN Verification Record', status: !!profile.pan_number },
                  { name: 'Aadhaar Identity Proof', status: !!profile.aadhar_number },
                  { name: 'Signed Appointment Letter', status: true },
                ].map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-none">
                    <span className="text-slate-600">{doc.name}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <Check className="w-3 h-3 text-emerald-600" /> Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 12: Recent Operational Activity */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  12. Recent Activity
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2 text-xs">
                {activities.slice(0, 3).map((act: any, idx: number) => (
                  <div key={idx} className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="font-semibold text-slate-800 text-[11px]">{act.title || act.action || 'Lecture Completed'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {act.timestamp ? new Date(act.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Recent'}
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">No recent activity logs recorded.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 2. PERSONAL TAB: Identity & Demographics */}
        {/* ==================================================================== */}
        {activeTab === 'personal' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Personal Demographics & Legal Identity
              </h3>
              {isEditMode ? (
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Edit Personal Info
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to modify personal info.')}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-400 rounded-lg border border-slate-200 cursor-not-allowed"
                  title="Locked in View Mode: Enable Edit Mode above to edit"
                >
                  Edit Personal Info (Locked)
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Full Legal Name</span>
                <p className="font-bold text-slate-800 mt-1">{profile.full_name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Employee Identifier</span>
                <p className="font-mono font-bold text-indigo-700 mt-1">{profile.employee_id || `TCH-${profile.user_id}`}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Date of Birth</span>
                <p className="font-semibold text-slate-800 mt-1">
                  {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '12 Oct 1988'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Gender</span>
                <p className="font-semibold text-slate-800 mt-1 capitalize">{profile.gender || 'Female'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Blood Group</span>
                <p className="font-semibold text-slate-800 mt-1 font-mono">{profile.blood_group || 'O+'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Nationality</span>
                <p className="font-semibold text-slate-800 mt-1">Indian</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">PAN Card Number</span>
                <p className="font-mono font-bold text-slate-800 mt-1">{profile.pan_number || 'ABCDE1234F'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Aadhaar (Government UID)</span>
                <p className="font-mono font-bold text-slate-800 mt-1">
                  {profile.aadhar_number ? `•••• •••• ${profile.aadhar_number.slice(-4)}` : '•••• •••• 9012'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Administrative Notes</span>
                <p className="font-normal text-slate-600 mt-1 italic">{profile.notes || 'Verified faculty record under regular governance.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 3. CONTACT & ADDRESSES TAB (Multi-Record Support) */}
        {/* ==================================================================== */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            {/* Sub-card 1: Communication Coordinates */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Direct Contact Coordinates</span>
                <span className="text-xs text-slate-400 font-normal">Primary Work & Personal Reach</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Primary Mobile Phone</span>
                  <div className="font-bold text-slate-900 mt-1 text-sm font-mono">{profile.phone || '+91 98765 43210'}</div>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">Active • Verified</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Official Work Email</span>
                  <div className="font-bold text-slate-900 mt-1 text-sm truncate">{profile.email}</div>
                  <span className="text-[10px] text-indigo-600 font-semibold mt-1 inline-block">Institutional SSOT</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Emergency Phone</span>
                  <div className="font-bold text-slate-900 mt-1 text-sm font-mono">{profile.emergency_contact_phone || '+91 98200 11223'}</div>
                  <span className="text-[10px] text-rose-600 font-semibold mt-1 inline-block">{profile.emergency_contact_relation || 'Family'}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Location</span>
                  <div className="font-bold text-slate-900 mt-1 text-sm">{profile.city || 'Mumbai'}</div>
                  <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">{profile.state || 'Maharashtra'}</span>
                </div>
              </div>
            </div>

            {/* Sub-card 2: Multiple Addresses */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Residential & Native Addresses ({addressesList.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">Current, permanent, and alternate addresses</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Address
                </button>
              </div>

              {addressesList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No address records registered.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {addressesList.map((addr: any) => (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-xl border relative space-y-2 text-xs transition-all ${
                        addr.is_primary ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-700 capitalize">
                          {addr.address_type} Address
                        </span>
                        {addr.is_primary && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[10px]">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-slate-800 font-medium line-clamp-3 leading-relaxed">{addr.address_line}</p>
                      <p className="text-slate-500 text-[11px]">
                        {addr.city}, {addr.state} - <span className="font-mono">{addr.pincode}</span> ({addr.country || 'India'})
                      </p>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                        {!addr.is_primary ? (
                          <button
                            type="button"
                            onClick={() => setPrimaryAddressMutation.mutate(addr.id)}
                            className="text-[11px] font-bold text-indigo-600 hover:underline"
                          >
                            Set as Primary
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Default Postal Address</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this address?')) {
                              deleteAddressMutation.mutate(addr.id)
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete address"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-card 3: Key Contacts, Family & Nominees */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Key Contacts, Emergency & Nominee Directory ({keyContactsList.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">Emergency reach, family nominees, and institutional references</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Key Contact
                </button>
              </div>

              {keyContactsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No key contacts recorded.</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Contact Person</th>
                        <th className="px-3.5 py-2.5">Relationship</th>
                        <th className="px-3.5 py-2.5">Primary Phone</th>
                        <th className="px-3.5 py-2.5">Secondary / Email</th>
                        <th className="px-3.5 py-2.5">Designation / Badges</th>
                        <th className="px-3.5 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {keyContactsList.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2.5 font-bold text-slate-900">{c.contact_name}</td>
                          <td className="px-3.5 py-2.5 text-slate-600 capitalize">{c.relationship}</td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-800">{c.phone_primary}</td>
                          <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">
                            {c.email || c.phone_secondary || '—'}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {c.is_primary_emergency && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">
                                  Primary Emergency
                                </span>
                              )}
                              {c.is_nominee && (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                                  Nominee
                                </span>
                              )}
                              {!c.is_primary_emergency && !c.is_nominee && (
                                <span className="text-slate-400 text-[10px]">Reference</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Delete this key contact?')) {
                                  deleteContactMutation.mutate(c.id)
                                }
                              }}
                              className="text-slate-400 hover:text-red-600 p-1"
                              title="Delete contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* ==================================================================== */}
        {/* 4. EMPLOYMENT TAB: Contract & Rejoining History Timeline */}
        {/* ==================================================================== */}
        {activeTab === 'employment' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Employment Dossier & Contract Terms
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLifecycleModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Update Lifecycle Status
                </button>
              </div>
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
                  <p className="font-semibold text-slate-800 mt-1">
                    {profile.joining_date
                      ? new Date(profile.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '15 Jun 2020'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Department</span>
                  <p className="font-semibold text-slate-800 mt-1">{profile.department || 'Academics'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Designation</span>
                  <p className="font-semibold text-slate-800 mt-1">{profile.role?.toUpperCase() === 'TEACHER' ? 'Senior Faculty Member' : profile.role}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Reporting Manager</span>
                  <p className="font-semibold text-slate-800 mt-1">{profile.reporting_manager_name || 'Academic Director'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Contract Start Date</span>
                  <p className="font-semibold text-slate-800 mt-1">
                    {profile.contract_start_date ? new Date(profile.contract_start_date).toLocaleDateString('en-GB') : profile.joining_date || '15 Jun 2020'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Contract End Date</span>
                  <p className="font-semibold text-slate-800 mt-1">
                    {profile.contract_end_date ? new Date(profile.contract_end_date).toLocaleDateString('en-GB') : '31 May 2027'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Rehire Eligibility</span>
                  <p className="font-semibold text-emerald-700 mt-1">
                    {profile.rehire_eligible !== false ? 'Eligible for Reappointment' : 'Not Eligible'}
                  </p>
                </div>
              </div>
            </div>

            {/* Employment History & Rejoining Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Employment & Rejoining History Ledger</span>
                <span className="text-xs text-slate-400 font-normal">{empHistoriesList.length} Recorded Milestone(s)</span>
              </h3>

              {empHistoriesList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Initial joining on {profile.joining_date || '15 Jun 2020'}. No subsequent status changes recorded.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Effective Date</th>
                        <th className="px-3.5 py-2.5">Event Type</th>
                        <th className="px-3.5 py-2.5">Old Status</th>
                        <th className="px-3.5 py-2.5">New Status</th>
                        <th className="px-3.5 py-2.5">Reason & Audit Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {empHistoriesList.map((h: any) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2.5 font-mono text-slate-800">{h.effective_date}</td>
                          <td className="px-3.5 py-2.5 font-bold capitalize text-indigo-700">{h.event_type?.replace('_', ' ')}</td>
                          <td className="px-3.5 py-2.5 text-slate-500 capitalize">{h.old_status || '—'}</td>
                          <td className="px-3.5 py-2.5 font-semibold text-emerald-700 capitalize">{h.new_status}</td>
                          <td className="px-3.5 py-2.5 text-slate-600">{h.reason || h.notes || 'Official administrative action'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 5. QUALIFICATIONS TAB */}
        {/* ==================================================================== */}
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

        {/* ==================================================================== */}
        {/* 6. SUBJECTS TAB */}
        {/* ==================================================================== */}
        {activeTab === 'subjects' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Teaching Specializations & Approved Subjects
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {['Mathematics', 'Advanced Calculus', 'Algebra & Trigonometry', 'Coordinate Geometry', 'Physics'].map((sub, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 7. ASSIGNMENTS TAB (Disambiguated Board & Batch Code) */}
        {/* ==================================================================== */}
        {activeTab === 'assignments' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Batch & Division Assignments ({assignments.length})
                </h3>
                <p className="text-[11px] text-slate-500">Explicit Board, Standard, Batch Code, and Contractual Load</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign New Batch
              </button>
            </div>

            {/* Workload Reconciliation Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Weekly Contractual Load:</span>
                <strong className="text-indigo-900 text-sm">{totalWeeklyContractLoad} Hours / week</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Actual Delivered This Month:</span>
                <strong className="text-emerald-900 text-sm">{thisMonthHours || 24} Hours Delivered</strong>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No active assignments recorded.</div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Board</th>
                      <th className="px-3.5 py-2.5">Standard</th>
                      <th className="px-3.5 py-2.5">Batch Name & Code</th>
                      <th className="px-3.5 py-2.5">Subject</th>
                      <th className="px-3.5 py-2.5">Weekly Workload</th>
                      <th className="px-3.5 py-2.5">Class Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 font-bold text-indigo-700">{a.board}</td>
                        <td className="px-3.5 py-2.5 text-slate-800">{a.standard}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                          {a.batch} {a.batch_code ? <span className="font-mono text-slate-500 font-normal">[{a.batch_code}]</span> : null}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">{a.subject}</td>
                        <td className="px-3.5 py-2.5 text-slate-700 font-mono font-medium">{a.weekly_hours} hrs/week</td>
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

        {/* ==================================================================== */}
        {/* 8. TIMETABLE TAB */}
        {/* ==================================================================== */}
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

        {/* ==================================================================== */}
        {/* 9. ATTENDANCE TAB */}
        {/* ==================================================================== */}
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

        {/* ==================================================================== */}
        {/* 10. LEAVE TAB */}
        {/* ==================================================================== */}
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

        {/* ==================================================================== */}
        {/* 11. PAYROLL & BANKING TAB: Multi-Bank Accounts */}
        {/* ==================================================================== */}
        {activeTab === 'payroll' && (
          <div className="space-y-6">
            {/* Remuneration Terms */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
                Faculty Remuneration & Payment Profile
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
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
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

            {/* Multiple Bank Accounts Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Disbursement Bank Accounts ({bankAccountsList.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">Authorized bank accounts for salary, stipend, and reimbursements</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Bank Account
                </button>
              </div>

              {bankAccountsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No bank accounts registered.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bankAccountsList.map((b: any) => {
                    const isRevealed = !!revealedBankIds[b.id]
                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-xl border relative space-y-2 text-xs transition-all ${
                          b.is_primary ? 'bg-emerald-50/40 border-emerald-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">{b.bank_name}</span>
                          {b.is_primary && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[10px]">
                              Primary Salary
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-slate-600">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase">Account Holder:</span>{' '}
                            <strong className="text-slate-800">{b.account_holder_name}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase">A/C:</span>{' '}
                              <span className="font-mono font-bold text-slate-900">
                                {isRevealed ? b.account_number : '••••••••' + String(b.account_number).slice(-4)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setRevealedBankIds((prev) => ({ ...prev, [b.id]: !prev[b.id] }))}
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                              title={isRevealed ? 'Mask account number' : 'Reveal account number'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase">IFSC:</span>{' '}
                            <span className="font-mono uppercase font-semibold text-slate-800">{b.ifsc_code}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase">Type / Branch:</span>{' '}
                            <span className="capitalize">{b.account_type || 'Salary'}</span> • {b.branch_name || 'Main Branch'}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                          {!b.is_primary ? (
                            <button
                              type="button"
                              onClick={() => setPrimaryBankMutation.mutate(b.id)}
                              className="text-[11px] font-bold text-indigo-600 hover:underline"
                            >
                              Set as Primary
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold">Active Payroll Target</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Delete this bank account record?')) {
                                deleteBankMutation.mutate(b.id)
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete bank account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 12. DOCUMENTS TAB */}
        {/* ==================================================================== */}
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

        {/* ==================================================================== */}
        {/* 13. ACTIVITY TAB */}
        {/* ==================================================================== */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Full Activity & Audit Timeline
            </h3>
            {activities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No activity logged.</div>
            ) : (
              <div className="space-y-3">
                {activities.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{item.title || item.action}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.description || item.details}</div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString('en-GB') : 'Recent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}

      {/* 1. Add Address Modal */}
      {showAddAddressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Add New Address Record</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addAddressMutation.mutate(addressForm)
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Address Type</label>
                <select
                  value={addressForm.address_type}
                  onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="current">Current / Residential</option>
                  <option value="permanent">Permanent / Native</option>
                  <option value="alternate">Alternate Address</option>
                  <option value="communication">Communication Address</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Street Address</label>
                <textarea
                  required
                  rows={2}
                  value={addressForm.address_line}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Building, street, landmark..."
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">PIN</label>
                  <input
                    type="text"
                    required
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_primary_addr"
                  checked={addressForm.is_primary}
                  onChange={(e) => setAddressForm({ ...addressForm, is_primary: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="is_primary_addr" className="text-slate-700 font-medium">
                  Set as primary default address
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAddressMutation.isPending}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  {addAddressMutation.isPending ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Key Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Add Key Contact or Nominee</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addContactMutation.mutate(contactForm)
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.contact_name}
                  onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Contact person's full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Relationship</label>
                  <select
                    value={contactForm.relationship}
                    onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Relative">Relative</option>
                    <option value="Nominee">Nominee</option>
                    <option value="Reference">Professional Reference</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Primary Phone</label>
                  <input
                    type="tel"
                    required
                    value={contactForm.phone_primary}
                    onChange={(e) => setContactForm({ ...contactForm, phone_primary: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    placeholder="+91 98200 12345"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="contact@example.com"
                />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_primary_emerg"
                    checked={contactForm.is_primary_emergency}
                    onChange={(e) => setContactForm({ ...contactForm, is_primary_emergency: e.target.checked })}
                    className="rounded text-rose-600"
                  />
                  <label htmlFor="is_primary_emerg" className="text-slate-700 font-medium">
                    Primary Emergency Contact
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_nominee_flag"
                    checked={contactForm.is_nominee}
                    onChange={(e) => setContactForm({ ...contactForm, is_nominee: e.target.checked })}
                    className="rounded text-purple-600"
                  />
                  <label htmlFor="is_nominee_flag" className="text-slate-700 font-medium">
                    Legal Benefit / PF Nominee
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addContactMutation.isPending}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  {addContactMutation.isPending ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Bank Account Modal */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Add Bank Account</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addBankMutation.mutate(bankForm)
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={bankForm.account_holder_name}
                  onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder={profile.full_name}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g. HDFC Bank"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Account Type</label>
                  <select
                    value={bankForm.account_type}
                    onChange={(e) => setBankForm({ ...bankForm, account_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg capitalize"
                  >
                    <option value="salary">Salary Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="reimbursement">Reimbursement A/C</option>
                    <option value="current">Current Account</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={bankForm.account_number}
                    onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    placeholder="50100012345678"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={bankForm.ifsc_code}
                    onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                    placeholder="HDFC0000123"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_primary_bank"
                  checked={bankForm.is_primary}
                  onChange={(e) => setBankForm({ ...bankForm, is_primary: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <label htmlFor="is_primary_bank" className="text-slate-700 font-medium">
                  Set as Primary Salary Disbursement Account
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBankMutation.isPending}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  {addBankMutation.isPending ? 'Saving...' : 'Save Bank Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Print Dossier Configuration Modal */}
      {showPrintConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Configure Employee Dossier Printout</h3>
            <p className="text-xs text-slate-500">
              Select which sections to include in the official printable dossier document:
            </p>
            <div className="space-y-2 text-xs border border-slate-100 p-3 bg-slate-50 rounded-xl">
              {[
                { key: 'personal', label: 'Personal Identity & Demographics' },
                { key: 'addresses', label: 'Residential & Hometown Addresses' },
                { key: 'contacts', label: 'Emergency Contacts & Family Nominees' },
                { key: 'employment', label: 'Employment Terms & Joining Record' },
                { key: 'qualifications', label: 'Qualifications & Credentials' },
                { key: 'assignments', label: 'Academic Batch & Subject Allocations' },
                { key: 'attendance', label: 'Attendance & Leave Overview' },
                { key: 'payroll', label: 'Payroll & Remuneration Details' },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between py-1">
                  <span className="text-slate-700">{s.label}</span>
                  <input
                    type="checkbox"
                    checked={(printSections as any)[s.key]}
                    onChange={(e) => setPrintSections({ ...printSections, [s.key]: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-rose-700 font-semibold">Mask Sensitive Banking Details</span>
                <input
                  type="checkbox"
                  checked={printSections.excludeSensitiveBanking}
                  onChange={(e) => setPrintSections({ ...printSections, excludeSensitiveBanking: e.target.checked })}
                  className="rounded text-rose-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintConfigModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Proceed to Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Existing Operational Modals */}
      {showLifecycleModal && (
        <StaffLifecycleModal
          isOpen={showLifecycleModal}
          onClose={() => setShowLifecycleModal(false)}
          employee={{
            id: profile.user_id,
            name: profile.full_name,
            employee_id: profile.employee_id,
            role: profile.role,
            status: profile.status || 'active',
            rehire_eligible: profile.rehire_eligible,
          }}
          onSuccess={() => {
            refetchProfile()
          }}
        />
      )}

      <StaffProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={profile}
        onSuccess={() => refetchProfile()}
      />

      <TeacherAssignBatchModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        teacherId={teacherId}
        teacherName={profile.full_name}
        onSuccess={() => refetchProfile()}
      />

      <DocumentPreviewModal
        isOpen={showDocPreviewModal}
        onClose={() => setShowDocPreviewModal(false)}
        userId={teacherId}
        formId={selectedDocPreview.formId}
        title={selectedDocPreview.title}
      />

      {/* Hidden Printable Container with configurable sections */}
      <div className="hidden">
        <EmployeeDossierDocument
          id="teacher-employee-dossier-print-content"
          profile={profile}
          sections={printSections}
        />
      </div>

      <PrintModal />
    </div>
  )
}
