/**
 * @file        StudentDetail.tsx
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
 * @updated     2026-11-11
 *
 * @description Comprehensive student profile workspace with multi-tab master record editing for administrators.
 */

import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import StudentExitModal from '../components/StudentExitModal'
import StudentIDCardModal from '../components/StudentIDCardModal'
import OnlinePaymentModal from '../components/OnlinePaymentModal'
import StudentReactivateModal from '../components/StudentReactivateModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, CreditCard, User, BookOpen, Receipt, FileText,
  ClipboardCheck, Award, Activity, Upload, Trash2, Eye, QrCode,
  CheckCircle, PlusCircle, Calendar, Phone, Mail, MapPin, ExternalLink,
  Edit3, AlertTriangle, X, Check, Save, Shield, Users, Printer, Share2,
  UserMinus, UserCheck, History, GraduationCap, Percent, FileCheck, Filter, Clock
} from 'lucide-react'
import ShareModal from '../components/ShareModal'
import { studentsApi, standardsApi, divisionsApi, feesApi, homeworkApi } from '../api/endpoints'
import { useAuthStore, isUserAdmin } from '../store/authStore'
import toast from 'react-hot-toast'
import { StatusBadge } from '../components/Badge'
import type { StudentDocumentItem, AcademicActivityRegisterItem } from '../types'
import { EditModeBar, DeleteConfirmationModal, LockedButton, LockedIconButton, LockedLinkButton } from '../components/common'
import { useEditModeStore } from '../store/editModeStore'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const ADMIN_TABS = [
  'Overview',
  'Enrollment',
  'Classes',
  'Academic Register',
  'Attendance',
  'Tests',
  'Fees',
  'Documents',
  'Activity',
  'Lifecycle & History',
] as const

type AdminTab = (typeof ADMIN_TABS)[number]

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<AdminTab>('Overview')

  const currentUser = useAuthStore((s) => s.user)
  const canEdit = isUserAdmin(currentUser)

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false)
  const [showIdCardModal, setShowIdCardModal] = useState(false)
  const [selectedOnlineInvoice, setSelectedOnlineInvoice] = useState<any | null>(null)

  // Student Lifecycle Modals State
  const [showExitModal, setShowExitModal] = useState(false)
  const [showReactivateModal, setShowReactivateModal] = useState(false)

  const { data: lifecycleHistory, refetch: refetchLifecycle } = useQuery({
    queryKey: ['student-lifecycle-history', studentId],
    queryFn: () => studentsApi.lifecycleHistory(studentId).then((r) => r.data),
    enabled: !!studentId,
  })

  const handleLifecycleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['student-admin-profile', studentId] })
    queryClient.invalidateQueries({ queryKey: ['student-lifecycle-history', studentId] })
    queryClient.invalidateQueries({ queryKey: ['students'] })
    refetchLifecycle()
  }

  // Global View-First & Scoped Edit Mode
  const editScope = `students:detail:${studentId}`
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const [docToDelete, setDocToDelete] = useState<{ id: number; title: string } | null>(null)

  // Full Profile Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTab, setEditTab] = useState<'personal' | 'contact' | 'guardians' | 'academic'>('personal')
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null)
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null)
  const [confirmBatchTransfer, setConfirmBatchTransfer] = useState(false)

  // Adjust Student Fees Modal State
  const [showAdjustFeesModal, setShowAdjustFeesModal] = useState(false)
  const [adjustFeesLoading, setAdjustFeesLoading] = useState(false)
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)
  const [adjustFeesError, setAdjustFeesError] = useState<string | null>(null)
  const [adjustFeesSuccess, setAdjustFeesSuccess] = useState<string | null>(null)
  const [feeDetails, setFeeDetails] = useState<{
    student_id: number
    student_name: string
    admission_number: string
    standard_name: string
    current_structure: {
      id: number
      name: string
      amount: number
      frequency: string
      installments_count: number
    } | null
    custom_package_amount: number | null
    concession_amount: number
    current_invoice: {
      id: number
      invoice_number: string
      total_amount: number
      discount_amount: number
      net_amount: number
      paid_amount: number
      outstanding_amount: number
      status: string
    } | null
    available_structures: Array<{
      id: number
      name: string
      amount: number
      frequency: string
      installments_count: number
    }>
  } | null>(null)

  const [adjustForm, setAdjustForm] = useState({
    fee_structure_id: 0,
    package_amount: '',
    concession_amount: '0',
    reason: '',
    remarks: '',
  })

  const handleOpenAdjustFees = async () => {
    setAdjustFeesError(null)
    setAdjustFeesSuccess(null)
    setAdjustFeesLoading(true)
    setShowAdjustFeesModal(true)
    try {
      const res = await feesApi.getStudentFeeDetails(studentId)
      const data = res.data
      setFeeDetails(data)
      const currentPkg =
        data.custom_package_amount !== null && data.custom_package_amount !== undefined
          ? String(data.custom_package_amount)
          : (data as any).custom_amount !== null && (data as any).custom_amount !== undefined
            ? String((data as any).custom_amount)
            : data.current_structure
              ? String(data.current_structure.amount)
              : (data as any).assigned_structure
                ? String((data as any).assigned_structure.base_amount)
                : '0'
      const currentConcession =
        data.concession_amount !== null && data.concession_amount !== undefined
          ? String(data.concession_amount)
          : '0'

      setAdjustForm({
        fee_structure_id: data.current_structure?.id || (data as any).assigned_structure?.id || (data.available_structures?.[0]?.id ?? 0),
        package_amount: currentPkg,
        concession_amount: currentConcession,
        reason: '',
        remarks: '',
      })
    } catch (err: any) {
      setAdjustFeesError(err?.response?.data?.detail || 'Failed to load student fee commitment.')
    } finally {
      setAdjustFeesLoading(false)
    }
  }

  const handleStructureChange = (newStructId: number) => {
    const selected = feeDetails?.available_structures?.find((s) => s.id === newStructId)
    setAdjustForm((prev) => ({
      ...prev,
      fee_structure_id: newStructId,
      package_amount: selected ? String(selected.amount) : prev.package_amount,
    }))
  }

  const handleSaveAdjustFees = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustForm.reason.trim()) {
      setAdjustFeesError('A mandatory reason is required to adjust student fees.')
      return
    }
    const pkg = parseFloat(adjustForm.package_amount)
    const conc = parseFloat(adjustForm.concession_amount) || 0
    if (isNaN(pkg) || pkg < 0) {
      setAdjustFeesError('Please enter a valid package amount.')
      return
    }
    if (conc < 0) {
      setAdjustFeesError('Concession amount cannot be negative.')
      return
    }
    if (conc > pkg) {
      setAdjustFeesError('Concession amount cannot exceed total package fee.')
      return
    }

    setAdjustSubmitting(true)
    setAdjustFeesError(null)
    try {
      const res = await feesApi.adjustStudentFees(studentId, {
        fee_structure_id: adjustForm.fee_structure_id || undefined,
        custom_amount: pkg,
        concession_amount: conc,
        reason: adjustForm.reason.trim(),
        remarks: adjustForm.remarks.trim() || undefined,
      })
      toast.success(res.data.message || 'Student fee adjustment applied successfully!')
      setAdjustFeesSuccess(res.data.message || 'Fee adjusted successfully.')
      queryClient.invalidateQueries({ queryKey: ['student-admin-profile', studentId] })
      queryClient.invalidateQueries({ queryKey: ['student-fees', studentId] })
      queryClient.invalidateQueries({ queryKey: ['student-invoices', studentId] })
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['student-lifecycle-history', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setTimeout(() => {
        setShowAdjustFeesModal(false)
        setAdjustFeesSuccess(null)
      }, 1000)
    } catch (err: any) {
      setAdjustFeesError(err?.response?.data?.detail || 'Failed to apply fee adjustment.')
    } finally {
      setAdjustSubmitting(false)
    }
  }

  // Edit Form State
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'male',
    date_of_birth: '',
    blood_group: '',
    nationality: 'Indian',
    religion: '',
    caste: '',
    aadhar_number: '',
    admission_date: '',
    is_active: true,

    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',

    guardians: [] as Array<{
      id?: number
      relation: string
      first_name: string
      last_name: string
      phone: string
      email: string
      occupation: string
      annual_income: number | string
      is_primary: boolean
    }>,

    standard_id: 0,
    division_id: 0,
    roll_number: '',
    enrollment_status: 'active',
    transfer_reason: '',
  })

  // Document upload modal state
  const [showDocModal, setShowDocModal] = useState(false)
  const [docForm, setDocForm] = useState({
    title: '',
    document_type: 'Aadhar Card',
    file_url: '',
    status: 'verified',
  })
  const [docSuccessMsg, setDocSuccessMsg] = useState<string | null>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student-admin-profile', studentId],
    queryFn: () => studentsApi.getProfile(studentId).then((r) => r.data),
    enabled: !!studentId,
  })

  // ── Unified Academic Activity Register Query ──
  const [registerFilter, setRegisterFilter] = useState<string>('all')
  const { data: activityRegisterData, isLoading: isLoadingRegister, refetch: refetchRegister } = useQuery({
    queryKey: ['student-academic-register', studentId, registerFilter],
    queryFn: () =>
      homeworkApi.getStudentActivityRegister(studentId, {
        activity_type: registerFilter !== 'all' ? registerFilter : undefined,
      }).then((r) => r.data),
    enabled: activeTab === 'Academic Register' && !!studentId,
  })
  const activityItems: AcademicActivityRegisterItem[] = activityRegisterData?.items || []

  // Standards and Divisions queries for editing
  const { data: standardsList } = useQuery({
    queryKey: ['standards'],
    queryFn: () => standardsApi.list().then((r) => r.data),
    enabled: showEditModal,
  })

  const { data: divisionsList } = useQuery({
    queryKey: ['divisions', profileForm.standard_id],
    queryFn: () =>
      divisionsApi.list(profileForm.standard_id ? { standard_id: profileForm.standard_id } : undefined).then((r) => r.data),
    enabled: showEditModal && !!profileForm.standard_id,
  })

  // Full Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => studentsApi.update(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-admin-profile', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setShowEditModal(false)
      setEditSuccessMsg('Student profile updated successfully!')
      setTimeout(() => setEditSuccessMsg(null), 4000)
    },
    onError: (err: any) => {
      setEditErrorMsg(err.response?.data?.detail || 'Failed to update student profile.')
    },
  })

  // Document add mutation
  const addDocMutation = useMutation({
    mutationFn: (data: typeof docForm) => studentsApi.addDocument(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-admin-profile', studentId] })
      setShowDocModal(false)
      setDocForm({ title: '', document_type: 'Aadhar Card', file_url: '', status: 'verified' })
      setDocSuccessMsg('Document uploaded successfully!')
      setTimeout(() => setDocSuccessMsg(null), 3000)
    },
  })

  // Document delete mutation
  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => studentsApi.deleteDocument(studentId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-admin-profile', studentId] })
    },
  })

  const openEditModal = () => {
    if (!profile) return
    const curEnr = profile.enrollment.find((e) => e.status === 'active') || profile.enrollment[0]
    setProfileForm({
      first_name: profile.overview.first_name || '',
      middle_name: profile.overview.middle_name || '',
      last_name: profile.overview.last_name || '',
      gender: profile.overview.gender || 'male',
      date_of_birth: profile.overview.date_of_birth || '',
      blood_group: profile.overview.blood_group || '',
      nationality: profile.overview.nationality || 'Indian',
      religion: profile.overview.religion || '',
      caste: profile.overview.caste || '',
      aadhar_number: profile.overview.aadhar_number || '',
      admission_date: profile.overview.admission_date || '',
      is_active: profile.overview.is_active ?? true,

      phone: profile.overview.phone || '',
      email: profile.overview.email || '',
      address: profile.overview.address || '',
      city: profile.overview.city || '',
      state: profile.overview.state || '',
      pincode: profile.overview.pincode || '',

      guardians: (profile.overview.guardians || []).map((g) => ({
        id: g.id,
        relation: g.relation,
        first_name: g.first_name,
        last_name: g.last_name,
        phone: g.phone || '',
        email: g.email || '',
        occupation: g.occupation || '',
        annual_income: g.annual_income || '',
        is_primary: g.is_primary,
      })),

      standard_id: curEnr?.standard_id || 0,
      division_id: curEnr?.division_id || 0,
      roll_number: curEnr?.roll_number !== 'N/A' ? curEnr?.roll_number || '' : '',
      enrollment_status: curEnr?.status || 'active',
      transfer_reason: '',
    })
    setConfirmBatchTransfer(false)
    setEditErrorMsg(null)
    setEditTab('personal')
    setShowEditModal(true)
  }

  const addGuardian = () => {
    setProfileForm({
      ...profileForm,
      guardians: [
        ...profileForm.guardians,
        {
          relation: 'Father',
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          occupation: '',
          annual_income: '',
          is_primary: profileForm.guardians.length === 0,
        },
      ],
    })
  }

  const removeGuardian = (index: number) => {
    setProfileForm({
      ...profileForm,
      guardians: profileForm.guardians.filter((_, i) => i !== index),
    })
  }

  const updateGuardian = (index: number, field: string, val: any) => {
    const updated = [...profileForm.guardians]
    updated[index] = { ...updated[index], [field]: val }
    if (field === 'is_primary' && val === true) {
      updated.forEach((g, i) => {
        if (i !== index) g.is_primary = false
      })
    }
    setProfileForm({ ...profileForm, guardians: updated })
  }

  const curEnr = profile?.enrollment.find((e) => e.status === 'active') || profile?.enrollment[0]
  const initialStandardId = curEnr?.standard_id || 0
  const initialDivisionId = curEnr?.division_id || 0
  const isBatchTransferAttempted =
    showEditModal &&
    ((profileForm.standard_id > 0 && profileForm.standard_id !== initialStandardId) ||
      (profileForm.division_id > 0 && profileForm.division_id !== initialDivisionId))

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setEditErrorMsg(null)

    if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
      setEditErrorMsg('First Name and Last Name are mandatory.')
      setEditTab('personal')
      return
    }

    if (isBatchTransferAttempted) {
      if (!profileForm.transfer_reason.trim()) {
        setEditErrorMsg('Please provide a reason for the batch transfer.')
        setEditTab('academic')
        return
      }
      if (!confirmBatchTransfer) {
        setEditErrorMsg('Please confirm the batch transfer agreement checkbox to proceed.')
        setEditTab('academic')
        return
      }
    }

    const payload: Record<string, unknown> = {
      first_name: profileForm.first_name.trim(),
      middle_name: profileForm.middle_name.trim() || null,
      last_name: profileForm.last_name.trim(),
      gender: profileForm.gender,
      date_of_birth: profileForm.date_of_birth || null,
      blood_group: profileForm.blood_group.trim() || null,
      nationality: profileForm.nationality.trim() || 'Indian',
      religion: profileForm.religion.trim() || null,
      caste: profileForm.caste.trim() || null,
      aadhar_number: profileForm.aadhar_number.trim() || null,
      admission_date: profileForm.admission_date || null,
      is_active: profileForm.is_active,

      phone: profileForm.phone.trim() || null,
      email: profileForm.email.trim() || null,
      address: profileForm.address.trim() || null,
      city: profileForm.city.trim() || null,
      state: profileForm.state.trim() || null,
      pincode: profileForm.pincode.trim() || null,

      guardians: profileForm.guardians.map((g) => ({
        id: g.id || null,
        relation: g.relation,
        first_name: g.first_name.trim(),
        last_name: g.last_name.trim(),
        phone: g.phone.trim() || null,
        email: g.email.trim() || null,
        occupation: g.occupation.trim() || null,
        annual_income: g.annual_income ? Number(g.annual_income) : null,
        is_primary: g.is_primary,
      })),

      enrollment: {
        standard_id: profileForm.standard_id ? Number(profileForm.standard_id) : null,
        division_id: profileForm.division_id ? Number(profileForm.division_id) : null,
        roll_number: profileForm.roll_number.trim() || null,
        status: profileForm.enrollment_status,
      },
      transfer_reason: isBatchTransferAttempted ? profileForm.transfer_reason.trim() : null,
    }

    updateProfileMutation.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
      </div>
    )
  }

  if (!profile) {
    return <div className="card text-center text-gray-400 py-20">Student profile not found.</div>
  }

  const { overview, enrollment, classes, attendance, tests, fees, documents, activity, communications, linked_lead } = profile
  const totalFees = overview.fee_summary?.total_fees ?? 0
  const totalPaid = overview.fee_summary?.total_paid ?? 0
  const outstanding = overview.fee_summary?.outstanding ?? 0
  const collectionPct = overview.fee_summary?.collection_rate ?? 0

  return (
    <div className="space-y-5">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar
        scope={editScope}
        title={`Student Dossier — ${overview.full_name}`}
        isDirty={showEditModal}
      />

      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/students" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{overview.full_name}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary-100 text-primary-800">
                {overview.active_batch}
              </span>
              {overview.is_active ? (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800" title={`Withdrawn: ${overview.exit_date || ''}`}>
                  Withdrawn
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Admission No: <span className="font-mono text-primary-700 font-bold">{overview.admission_number}</span> &bull; {overview.active_board} &bull; {overview.active_standard}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowIdCardModal(true)}
            className="px-3.5 py-2 rounded-lg border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 text-sm font-semibold flex items-center gap-1.5 shadow-sm transition"
            title="Generate and print official CR80 Student ID Card with QR Code"
          >
            <CreditCard className="w-4 h-4" /> Student ID Card
          </button>
          <Link
            to={`/forms?formId=student_kyc&recordId=${studentId}&mode=prefilled`}
            className="px-3.5 py-2 rounded-lg border border-indigo-300 text-primary-700 bg-primary-50 hover:bg-primary-100 text-sm font-semibold flex items-center gap-1.5 shadow-sm transition"
            title="Print Student KYC, Admission & KYC Dossier"
          >
            <Printer className="w-4 h-4" /> Print Form / KYC
          </Link>
          <button
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-2 rounded-lg border border-primary-600 bg-white text-primary-700 hover:bg-primary-50 text-sm font-semibold flex items-center gap-1.5 shadow-sm transition"
            title="Share student profile via WhatsApp, Email, SMS or Secure Link"
          >
            <Share2 className="w-4 h-4" /> Share Profile
          </button>
          {canEdit && (
            <>
              {overview.is_active ? (
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => setShowExitModal(true)}
                  className={`px-3.5 py-2 rounded-lg border text-sm font-semibold flex items-center gap-1.5 shadow-sm transition ${isEditMode
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  title={isEditMode ? "Withdraw / Exit student from institute" : "Locked in View Mode: Enable Edit Mode to withdraw student"}
                >
                  <UserMinus className="w-4 h-4" /> Exit / Withdraw
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => setShowReactivateModal(true)}
                  className={`px-3.5 py-2 rounded-lg border text-sm font-semibold flex items-center gap-1.5 shadow-sm transition ${isEditMode
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  title={isEditMode ? "Reactivate student into active batch" : "Locked in View Mode: Enable Edit Mode to reactivate student"}
                >
                  <UserCheck className="w-4 h-4" /> Reactivate Student
                </button>
              )}
            </>
          )}
          {canEdit && (
            <button
              onClick={() => {
                if (!isEditMode) {
                  toast.error('Locked in View Mode: Please enable Edit Mode above before editing student records.')
                  return
                }
                openEditModal()
              }}
              className={`px-3.5 py-2 rounded-lg border text-sm font-semibold flex items-center gap-1.5 shadow-sm transition ${isEditMode
                ? 'border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              title={isEditMode ? "Edit student profile, guardians, and batch assignment" : "Locked in View Mode: Enable Edit Mode above to modify records"}
            >
              <Edit3 className="w-4 h-4" /> {isEditMode ? 'Edit Profile' : 'Edit Locked'}
            </button>
          )}
          <Link
            to={`/student/dashboard?student_id=${studentId}`}
            className="px-3.5 py-2 rounded-lg border border-primary-300 text-primary-700 hover:bg-primary-50 text-sm font-medium flex items-center gap-1.5"
            title="Preview student's portal view"
          >
            <ExternalLink className="w-4 h-4" /> Student Portal View
          </Link>
          <Link to={`/fees?tab=collect&studentId=${studentId}`} className="btn-primary flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Collect Fee
          </Link>
        </div>
      </div>

      {/* Success Notification Banner */}
      {editSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{editSuccessMsg}</span>
          </div>
          <button onClick={() => setEditSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Inactive / Withdrawn Alert Banner */}
      {!overview.is_active && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>Student Inactive / Withdrawn</span>
              {overview.exit_date && <span className="text-xs font-mono font-normal bg-red-200/60 px-2 py-0.5 rounded">Exit Date: {overview.exit_date}</span>}
            </div>
            <p className="text-xs text-red-800 mt-1">
              Reason: <span className="font-semibold">{overview.exit_reason || 'Administrative Exit'}</span>
              {overview.exit_notes ? ` — ${overview.exit_notes}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Total Fee Obligation</p>
          <p className="text-xl font-bold text-gray-800">{fmt(totalFees)}</p>
          {overview.fee_summary?.total_concessions && overview.fee_summary.total_concessions > 0 ? (
            <p className="text-[10px] font-semibold text-emerald-700 mt-1">
              Gross {fmt(overview.fee_summary.gross_fees || (totalFees + overview.fee_summary.total_concessions))} • -{fmt(overview.fee_summary.total_concessions)} Concession
            </p>
          ) : null}
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Total Paid Amount</p>
          <p className="text-xl font-bold text-green-600">{fmt(totalPaid)}</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(collectionPct, 100)}%` }} />
          </div>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Outstanding Balance</p>
          <p className={`text-xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(outstanding)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Attendance Rate</p>
          <p className="text-xl font-bold text-primary-700">{attendance.summary.attendance_percentage}%</p>
          <p className="text-[11px] text-gray-400 mt-1">{attendance.summary.present_days} / {attendance.summary.total_days} Days</p>
        </div>
      </div>

      {/* 8 Profile Tabs */}
      <div className="card p-0 overflow-hidden shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 flex overflow-x-auto scrollbar-none bg-gray-50">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab
                ? 'text-primary-700 border-b-2 border-primary-700 bg-white font-bold'
                : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              {/* Core Admission Info */}
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-3">Admission & Identity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                  <div className="flex gap-2 py-1 border-b border-gray-50">
                    <span className="text-sm text-gray-500 w-40 flex-shrink-0">Admission Number</span>
                    <span className="text-sm font-bold text-primary-700 font-mono">{overview.admission_number}</span>
                  </div>
                  <div className="flex gap-2 py-1 border-b border-gray-50">
                    <span className="text-sm text-gray-500 w-40 flex-shrink-0">Admission Date</span>
                    <span className="text-sm font-medium text-gray-800">{overview.admission_date}</span>
                  </div>
                  <div className="flex gap-2 py-1 border-b border-gray-50">
                    <span className="text-sm text-gray-500 w-40 flex-shrink-0">Gender</span>
                    <span className="text-sm font-medium text-gray-800 capitalize">{overview.gender}</span>
                  </div>
                  <div className="flex gap-2 py-1 border-b border-gray-50">
                    <span className="text-sm text-gray-500 w-40 flex-shrink-0">Date of Birth</span>
                    <span className="text-sm font-medium text-gray-800">{overview.date_of_birth}</span>
                  </div>
                  <div className="flex gap-2 py-1 border-b border-gray-50">
                    <span className="text-sm text-gray-500 w-40 flex-shrink-0">Enrolled Batch</span>
                    <span className="text-sm font-semibold text-gray-900">{overview.active_batch}</span>
                  </div>
                  <div className="flex gap-2 py-1 border-b border-gray-50">
                    <span className="text-sm text-gray-500 w-40 flex-shrink-0">Course / Board</span>
                    <span className="text-sm font-semibold text-gray-900">{overview.active_board} ({overview.active_standard})</span>
                  </div>
                </div>
              </div>

              {/* Optional Contact & Demographics (only shown when data exists) */}
              {(overview.phone || overview.email || overview.address || overview.city || overview.blood_group || overview.aadhar_number) && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm mb-3">Contact & Demographics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                    {overview.phone && (
                      <div className="flex gap-2 py-1 border-b border-gray-50">
                        <span className="text-sm text-gray-500 w-40 flex-shrink-0">Phone</span>
                        <span className="text-sm font-medium text-gray-800">{overview.phone}</span>
                      </div>
                    )}
                    {overview.email && (
                      <div className="flex gap-2 py-1 border-b border-gray-50">
                        <span className="text-sm text-gray-500 w-40 flex-shrink-0">Email</span>
                        <span className="text-sm font-medium text-gray-800">{overview.email}</span>
                      </div>
                    )}
                    {overview.blood_group && (
                      <div className="flex gap-2 py-1 border-b border-gray-50">
                        <span className="text-sm text-gray-500 w-40 flex-shrink-0">Blood Group</span>
                        <span className="text-sm font-medium text-gray-800">{overview.blood_group}</span>
                      </div>
                    )}
                    {overview.aadhar_number && (
                      <div className="flex gap-2 py-1 border-b border-gray-50">
                        <span className="text-sm text-gray-500 w-40 flex-shrink-0">Aadhar Number</span>
                        <span className="text-sm font-mono font-medium text-gray-800">{overview.aadhar_number}</span>
                      </div>
                    )}
                    {(overview.city || overview.state) && (
                      <div className="flex gap-2 py-1 border-b border-gray-50">
                        <span className="text-sm text-gray-500 w-40 flex-shrink-0">City / State</span>
                        <span className="text-sm font-medium text-gray-800">{[overview.city, overview.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {overview.address && (
                      <div className="flex gap-2 py-1 border-b border-gray-50 md:col-span-2">
                        <span className="text-sm text-gray-500 w-40 flex-shrink-0">Address</span>
                        <span className="text-sm font-medium text-gray-800">{overview.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Primary Guardians */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Parent / Guardian Contacts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overview.guardians && overview.guardians.length > 0 ? (
                    overview.guardians.map((g) => (
                      <div key={g.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{g.first_name} {g.last_name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-white text-gray-600 border border-gray-200">{g.relation}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Phone: {g.phone || '—'} &bull; Email: {g.email || '—'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500">
                      No secondary guardians registered. Primary student records are maintained under admission #{overview.admission_number}.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENROLLMENT */}
          {activeTab === 'Enrollment' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Academic Enrollment History</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {enrollment.map((e) => (
                  <div key={e.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{e.standard_name} &bull; {e.division_name}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary-50 text-primary-700">
                          {e.board_name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Academic Year: <span className="font-medium text-gray-700">{e.academic_year}</span> &bull; Roll No: <span className="font-mono">{e.roll_number}</span> &bull; Enrolled on {e.enrollment_date}
                      </p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CLASSES */}
          {activeTab === 'Classes' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900">Active Curriculum Subjects</h3>
                <p className="text-xs text-gray-500">Subjects assigned for {overview.active_standard} ({overview.active_batch})</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {classes.subjects.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <p className="font-bold text-gray-900">{sub.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Code: {sub.code || 'N/A'}</p>
                    <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                      <span>Max Marks: {sub.max_marks}</span>
                      <span>Pass Marks: {sub.pass_marks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: UNIFIED ACADEMIC ACTIVITY REGISTER */}
          {activeTab === 'Academic Register' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Unified Academic Activity Register</h3>
                  <p className="text-xs text-gray-500">
                    Single chronological timeline uniting Teaching Sessions, Homework Assignments, Exam Records, and Attendance.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetchRegister()}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-2xs"
                  >
                    <History className="w-3.5 h-3.5" /> Refresh Timeline
                  </button>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All Activities' },
                  { id: 'teaching_session', label: 'Teaching Sessions' },
                  { id: 'homework', label: 'Homework & Assignments' },
                  { id: 'exam', label: 'Exams & Tests' },
                  { id: 'attendance', label: 'Attendance Roll Calls' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRegisterFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${registerFilter === f.id
                      ? 'bg-primary-700 text-white shadow-2xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Activity Timeline List */}
              {isLoadingRegister ? (
                <div className="card text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700 mx-auto" />
                  <p className="mt-3 text-xs text-gray-500">Loading academic activity records...</p>
                </div>
              ) : activityItems.length === 0 ? (
                <div className="card text-center py-12">
                  <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-800">No Academic Activities Recorded</p>
                  <p className="text-xs text-gray-500 mt-1">
                    No teaching sessions, homework records, tests, or attendance logs found matching the filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityItems.map((item, idx) => {
                    const isSession = item.activity_type === 'teaching_session'
                    const isHomework = item.activity_type === 'homework'
                    const isExam = item.activity_type === 'exam'
                    const isAttendance = item.activity_type === 'attendance'

                    const borderAccent = isSession
                      ? 'border-l-blue-500'
                      : isHomework
                        ? 'border-l-indigo-500'
                        : isExam
                          ? 'border-l-purple-500'
                          : 'border-l-emerald-500'

                    const badgeStyle = isSession
                      ? 'bg-blue-100 text-blue-800'
                      : isHomework
                        ? 'bg-indigo-100 text-indigo-800'
                        : isExam
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'

                    return (
                      <div
                        key={item.id || idx}
                        className={`card border-l-4 ${borderAccent} p-4 hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`p-2 rounded-xl mt-0.5 ${badgeStyle}`}>
                            {isSession && <BookOpen className="w-4 h-4" />}
                            {isHomework && <FileCheck className="w-4 h-4" />}
                            {isExam && <Award className="w-4 h-4" />}
                            {isAttendance && <ClipboardCheck className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                {item.activity_type.replace('_', ' ')}
                              </span>
                              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                {item.subject_name}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {item.date} {item.time && `• ${item.time}`}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm mt-1">{item.title}</h4>
                            {item.teacher_name && (
                              <p className="text-xs text-gray-500 mt-0.5">Faculty: <span className="font-medium text-gray-700">{item.teacher_name}</span></p>
                            )}
                            {item.remarks && (
                              <p className="text-xs text-gray-600 italic mt-1 bg-gray-50 p-1.5 rounded border border-gray-100">
                                &ldquo;{item.remarks}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${item.status === 'checked' || item.status === 'completed' || item.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'absent' || item.status === 'not_done'
                                ? 'bg-rose-100 text-rose-800'
                                : item.status === 'incomplete' || item.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                          {item.score && (
                            <span className="font-bold text-xs text-primary-700 font-mono">
                              Score: {item.score}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ATTENDANCE */}
          {activeTab === 'Attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Dated Attendance Records (Recent 30 Days)</h3>
                <span className="text-xs font-bold text-primary-700">{attendance.summary.attendance_percentage}% Overall Attendance</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendance.records.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-900">{r.date}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${r.status === 'present' ? 'bg-green-100 text-green-800' :
                            r.status === 'absent' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500">{r.remarks || 'Regular Attendance'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: TESTS */}
          {activeTab === 'Tests' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Examination Results & Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                      <th className="py-2.5 px-3">Examination</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Marks Obtained</th>
                      <th className="py-2.5 px-3">Max Marks</th>
                      <th className="py-2.5 px-3">Percentage</th>
                      <th className="py-2.5 px-3">Grade</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tests.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-900">{t.exam_name}</td>
                        <td className="py-2 px-3 text-gray-700 font-semibold">{t.subject_name}</td>
                        <td className="py-2 px-3 font-mono font-bold text-gray-900">{t.marks_obtained}</td>
                        <td className="py-2 px-3 font-mono text-gray-500">{t.max_marks}</td>
                        <td className="py-2 px-3 text-emerald-600 font-semibold">{t.percentage}%</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary-100 text-primary-800">
                            {t.grade}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500">{t.remarks || 'Pass'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: FEES */}
          {activeTab === 'Fees' && (
            <div className="space-y-6">
              {/* Fee Commitment Action Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                    <span>Student Fee Commitment & Ledger</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Manage agreed student package amount, scholarships/discounts, active fee structure, and invoices.
                  </p>
                </div>
                {canEdit && (
                  <LockedButton
                    isEditMode={isEditMode}
                    onClick={handleOpenAdjustFees}
                    icon={Edit3}
                    size="sm"
                  >
                    Adjust Student Fees
                  </LockedButton>
                )}
              </div>

              {/* Invoices */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Invoices</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                        <th className="py-2 px-3">Invoice No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Gross Fee</th>
                        <th className="py-2 px-3">Concession</th>
                        <th className="py-2 px-3">Total Net</th>
                        <th className="py-2 px-3">Paid</th>
                        <th className="py-2 px-3">Outstanding</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Online Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fees.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono font-semibold text-primary-700">{inv.invoice_number}</td>
                          <td className="py-2 px-3 text-gray-600">{inv.issue_date}</td>
                          <td className="py-2 px-3 text-gray-700 font-medium">{fmt(inv.total_amount ?? inv.net_amount)}</td>
                          <td className="py-2 px-3 text-emerald-600 font-semibold">
                            {inv.discount_amount && inv.discount_amount > 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200/80">
                                -{fmt(inv.discount_amount)}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-gray-900">{fmt(inv.net_amount)}</td>
                          <td className="py-2 px-3 text-green-600 font-semibold">{fmt(inv.paid_amount)}</td>
                          <td className="py-2 px-3 text-red-600 font-semibold">{fmt(inv.outstanding_amount)}</td>
                          <td className="py-2 px-3">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="py-2 px-3 text-right">
                            {inv.outstanding_amount > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedOnlineInvoice(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                                title="Pay invoice online with UPI QR Code or Razorpay"
                              >
                                <QrCode className="w-3.5 h-3.5" /> Pay UPI
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Applied Concessions & Scholarships */}
              {fees.concessions && fees.concessions.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      <span>Applied Concessions & Scholarships</span>
                    </h4>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Total Waived: {fmt(fees.summary?.total_concessions || 0)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                          <th className="py-2 px-3">Application No</th>
                          <th className="py-2 px-3">Scheme / Title</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Waived Amount</th>
                          <th className="py-2 px-3">Funding Source</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Resolution Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {fees.concessions.map((c: any) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono font-semibold text-primary-700">{c.application_number}</td>
                            <td className="py-2 px-3 font-medium text-gray-900">{c.concession_name}</td>
                            <td className="py-2 px-3 capitalize text-gray-600">{c.category}</td>
                            <td className="py-2 px-3 font-bold text-emerald-700">{fmt(c.applied_amount || c.approved_amount)}</td>
                            <td className="py-2 px-3 capitalize text-gray-600">{c.funding_source}</td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                {c.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs text-gray-500">{c.approval_remarks || 'Approved'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payments */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="font-bold text-gray-900 text-sm">Payments & Receipts</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                        <th className="py-2 px-3">Receipt No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3">Reference</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fees.payments.map((pmt) => (
                        <tr key={pmt.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono font-semibold text-primary-700">{pmt.receipt_number}</td>
                          <td className="py-2 px-3 text-gray-600">{pmt.payment_date}</td>
                          <td className="py-2 px-3 uppercase text-xs font-medium text-gray-700">{pmt.payment_method}</td>
                          <td className="py-2 px-3 font-mono text-xs text-gray-500">{pmt.transaction_reference}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">{fmt(pmt.amount)}</td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <Link
                              to={`/receipts/${pmt.receipt_number}`}
                              className="text-xs text-primary-600 hover:text-primary-800 font-medium inline-flex items-center gap-1 mr-2"
                            >
                              <Receipt className="w-3.5 h-3.5" /> View
                            </Link>
                            {canEdit && (
                              <Link
                                to={`/payments?search=${pmt.receipt_number}`}
                                className="text-xs text-amber-600 hover:text-amber-800 font-semibold inline-flex items-center gap-1"
                                title="Edit payment details in Payments register"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </Link>
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

          {/* TAB 7: DOCUMENTS */}
          {activeTab === 'Documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900">Student Identity & Official Documents</h3>
                  <p className="text-xs text-gray-500">Official documents verified by administration</p>
                </div>
                <LockedButton
                  isEditMode={isEditMode}
                  onClick={() => setShowDocModal(true)}
                  icon={Upload}
                  size="xs"
                >
                  Upload Document
                </LockedButton>
              </div>

              {docSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{docSuccessMsg}</span>
                </div>
              )}

              {documents.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No documents uploaded for this student yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <div key={doc.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 text-primary-700 rounded-lg">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{doc.title}</p>
                          <p className="text-xs text-gray-500">
                            Type: <span className="font-medium text-gray-700">{doc.document_type}</span> &bull; Uploaded on {doc.uploaded_at}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {doc.status}
                        </span>
                        <button
                          onClick={() => {
                            if (!isEditMode) {
                              toast.error('Locked in View Mode: Please enable Edit Mode above before deleting documents.')
                              return
                            }
                            setDocToDelete({ id: doc.id, title: doc.title })
                          }}
                          className={`p-1 rounded transition-colors ${isEditMode ? 'text-red-500 hover:bg-red-50' : 'text-slate-300 cursor-not-allowed'
                            }`}
                          title={isEditMode ? "Delete Document" : "Locked in View Mode: Enable Edit Mode to delete"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Document Modal */}
              {showDocModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <h4 className="font-bold text-gray-900">Upload Student Document</h4>
                      <button onClick={() => setShowDocModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        addDocMutation.mutate(docForm)
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="text-xs font-medium text-gray-700">Document Title</label>
                        <input
                          type="text"
                          required
                          value={docForm.title}
                          onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                          placeholder="e.g. 10th Standard Marksheet"
                          className="form-input text-sm mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Document Type</label>
                        <select
                          value={docForm.document_type}
                          onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
                          className="form-input text-sm mt-1"
                        >
                          <option value="Aadhar Card">Aadhar Card</option>
                          <option value="Birth Certificate">Birth Certificate</option>
                          <option value="Previous Marksheet">Previous Marksheet</option>
                          <option value="Transfer Certificate">Transfer Certificate</option>
                          <option value="Address Proof">Address Proof</option>
                          <option value="Medical Certificate">Medical Certificate</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">File URL / Storage Path</label>
                        <input
                          type="text"
                          required
                          value={docForm.file_url}
                          onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })}
                          placeholder="/uploads/student_doc.pdf"
                          className="form-input text-sm mt-1"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setShowDocModal(false)}
                          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addDocMutation.isPending}
                          className="btn-primary text-sm"
                        >
                          {addDocMutation.isPending ? 'Saving...' : 'Add Document'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: ACTIVITY */}
          {activeTab === 'Activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Student System Timeline & Communication Activity</h3>
                  <p className="text-xs text-gray-500">Universal audit logs, payments, and canonical communication ledger trail</p>
                </div>
                {linked_lead && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    Enquiry Lead: {linked_lead.lead_number}
                  </span>
                )}
              </div>

              {linked_lead && (
                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700 mt-0.5">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-900">Converted from CRM Lead #{linked_lead.lead_number}</p>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Enquiry registered via {linked_lead.source || 'Walk-in'}. All pre-admission counselling, trial sessions, and communication logs are linked seamlessly from the single source of truth ledger.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {activity.map((act) => (
                  <div key={act.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg mt-0.5 ${act.type === 'communication'
                      ? 'bg-primary-100 text-primary-700'
                      : act.type === 'payment'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-primary-100 text-primary-700'
                      }`}>
                      {act.type === 'communication' ? (
                        <Mail className="w-4 h-4" />
                      ) : act.type === 'payment' ? (
                        <CreditCard className="w-4 h-4" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{act.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Timestamp: {act.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Lifecycle & History' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Student Lifecycle & Audit Timeline</h3>
                  <p className="text-xs text-gray-500">Chronological history of enrollment, withdrawals, reactivations, and refunds</p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    {overview.is_active ? (
                      <button
                        onClick={() => setShowExitModal(true)}
                        className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <UserMinus className="w-4 h-4" /> Exit / Withdraw Student
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowReactivateModal(true)}
                        className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <UserCheck className="w-4 h-4" /> Reactivate Student
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card text-center p-4">
                  <p className="text-xs text-gray-500 mb-1">Current Lifecycle Status</p>
                  <p className="text-lg font-bold">
                    {overview.is_active ? (
                      <span className="text-emerald-700">Active Student</span>
                    ) : overview.exit_date ? (
                      <span className="text-red-700">Withdrawn on {overview.exit_date}</span>
                    ) : (
                      <span className="text-gray-700">Inactive</span>
                    )}
                  </p>
                  {overview.exit_reason && (
                    <p className="text-xs text-gray-500 mt-1">Reason: {overview.exit_reason}</p>
                  )}
                </div>

                <div className="card text-center p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Enrollments</p>
                  <p className="text-lg font-bold text-primary-700">
                    {lifecycleHistory?.enrollments?.length ?? enrollment.length} Records
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Active: {overview.is_active ? 1 : 0} &bull; Withdrawn: {lifecycleHistory?.enrollments?.filter((e) => e.status === 'withdrawn').length ?? 0}
                  </p>
                </div>

                <div className="card text-center p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Refunds Issued</p>
                  <p className="text-lg font-bold text-amber-700">
                    {fmt(lifecycleHistory?.refunds?.reduce((acc, r) => acc + (r.amount || 0), 0) ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {lifecycleHistory?.refunds?.length ?? 0} refund transaction(s)
                  </p>
                </div>
              </div>

              {/* Section 1: Lifecycle Audit Logs */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-primary-600" /> Lifecycle Transitions & Audit History
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                      <tr>
                        <th className="p-3">Action</th>
                        <th className="p-3">Effective Date</th>
                        <th className="p-3">From &rarr; To Status</th>
                        <th className="p-3">Reason / Justification</th>
                        <th className="p-3">Notes</th>
                        <th className="p-3">Logged By</th>
                        <th className="p-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(!lifecycleHistory?.logs || lifecycleHistory.logs.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-400">
                            No lifecycle transition events recorded yet.
                          </td>
                        </tr>
                      ) : (
                        lifecycleHistory.logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-semibold capitalize text-primary-800">{log.action}</td>
                            <td className="p-3 font-mono">{log.effective_date}</td>
                            <td className="p-3">
                              <span className="font-mono text-gray-600">{log.from_status || '—'}</span>
                              {' '}&rarr;{' '}
                              <span className="font-semibold text-gray-900">{log.to_status || '—'}</span>
                            </td>
                            <td className="p-3 text-gray-800">{log.reason || '—'}</td>
                            <td className="p-3 text-gray-600 max-w-xs truncate" title={log.notes || ''}>
                              {log.notes || '—'}
                            </td>
                            <td className="p-3 text-gray-700">{log.performed_by_name || 'System'}</td>
                            <td className="p-3 font-mono text-gray-500">{log.created_at ? log.created_at.slice(0, 19).replace('T', ' ') : '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Enrollment History */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary-600" /> Enrollment Records & Historical Classes
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                      <tr>
                        <th className="p-3">Academic Year</th>
                        <th className="p-3">Standard / Class</th>
                        <th className="p-3">Batch / Division</th>
                        <th className="p-3">Roll No.</th>
                        <th className="p-3">Enrollment Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Exit Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(lifecycleHistory?.enrollments || []).map((enr) => (
                        <tr key={enr.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-semibold text-gray-900">{enr.academic_year}</td>
                          <td className="p-3 text-gray-800">{enr.standard_name}</td>
                          <td className="p-3 text-gray-700">{enr.division_name || '—'}</td>
                          <td className="p-3 font-mono text-gray-600">{enr.roll_number || '—'}</td>
                          <td className="p-3 font-mono">{enr.enrollment_date}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${enr.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : enr.status === 'withdrawn'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                              {enr.status}
                            </span>
                          </td>
                          <td className="p-3 text-gray-600">
                            {enr.exit_date ? (
                              <div>
                                <span className="font-medium text-red-700">{enr.exit_date}</span>
                                {enr.exit_reason && <span className="block text-gray-500 text-[11px]">{enr.exit_reason}</span>}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Refunds Issued */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-600" /> Processed Student Refunds
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                      <tr>
                        <th className="p-3">Refund Date</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Reference #</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Processed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(!lifecycleHistory?.refunds || lifecycleHistory.refunds.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-400">
                            No refunds recorded for this student.
                          </td>
                        </tr>
                      ) : (
                        lifecycleHistory.refunds.map((ref) => (
                          <tr key={ref.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono font-medium">{ref.refund_date}</td>
                            <td className="p-3 font-mono font-bold text-amber-700">{fmt(ref.amount)}</td>
                            <td className="p-3 uppercase text-gray-700">{ref.refund_method}</td>
                            <td className="p-3 font-mono text-gray-600">{ref.reference_number || '—'}</td>
                            <td className="p-3 text-gray-800">{ref.reason}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                {ref.status}
                              </span>
                            </td>
                            <td className="p-3 text-gray-700">{ref.processed_by_name || 'Admin'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULL STUDENT PROFILE EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-100 text-primary-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">Edit Student Profile & Master Records</h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary-100 text-primary-800 font-bold">
                      {overview.admission_number}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Administrator editing enabled. All modifications are tracked in the system audit log.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-100/70 px-6 gap-2 flex-shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setEditTab('personal')}
                className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${editTab === 'personal'
                  ? 'border-primary-700 text-primary-700 bg-white rounded-t-lg font-bold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <User className="w-4 h-4" /> Personal & Identity
              </button>
              <button
                type="button"
                onClick={() => setEditTab('contact')}
                className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${editTab === 'contact'
                  ? 'border-primary-700 text-primary-700 bg-white rounded-t-lg font-bold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Phone className="w-4 h-4" /> Contact & Address
              </button>
              <button
                type="button"
                onClick={() => setEditTab('guardians')}
                className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${editTab === 'guardians'
                  ? 'border-primary-700 text-primary-700 bg-white rounded-t-lg font-bold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Shield className="w-4 h-4" /> Parents & Guardians ({profileForm.guardians.length})
              </button>
              <button
                type="button"
                onClick={() => setEditTab('academic')}
                className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${editTab === 'academic'
                  ? 'border-primary-700 text-primary-700 bg-white rounded-t-lg font-bold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <BookOpen className="w-4 h-4" /> Academic & Batch Assignment
                {isBatchTransferAttempted && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: PERSONAL & IDENTITY */}
              {editTab === 'personal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="First Name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Middle Name</label>
                      <input
                        type="text"
                        value={profileForm.middle_name}
                        onChange={(e) => setProfileForm({ ...profileForm, middle_name: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="Middle Name (Optional)"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="Last Name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Gender <span className="text-red-500">*</span></label>
                      <select
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                        className="form-input text-sm mt-1 capitalize"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Date of Birth</label>
                      <input
                        type="date"
                        value={profileForm.date_of_birth}
                        onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                        className="form-input text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Blood Group</label>
                      <select
                        value={profileForm.blood_group}
                        onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })}
                        className="form-input text-sm mt-1"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Aadhar Number (12 Digits)</label>
                      <input
                        type="text"
                        maxLength={12}
                        value={profileForm.aadhar_number}
                        onChange={(e) => setProfileForm({ ...profileForm, aadhar_number: e.target.value.replace(/\D/g, '') })}
                        className="form-input text-sm mt-1 font-mono"
                        placeholder="123456789012"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Nationality</label>
                      <input
                        type="text"
                        value={profileForm.nationality}
                        onChange={(e) => setProfileForm({ ...profileForm, nationality: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="Indian"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Admission Date</label>
                      <input
                        type="date"
                        value={profileForm.admission_date}
                        onChange={(e) => setProfileForm({ ...profileForm, admission_date: e.target.value })}
                        className="form-input text-sm mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Religion</label>
                      <input
                        type="text"
                        value={profileForm.religion}
                        onChange={(e) => setProfileForm({ ...profileForm, religion: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="e.g. Hindu, Muslim, Sikh"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Caste / Category</label>
                      <input
                        type="text"
                        value={profileForm.caste}
                        onChange={(e) => setProfileForm({ ...profileForm, caste: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="e.g. General, OBC, SC, ST"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Student System Status</label>
                      <select
                        value={profileForm.is_active ? 'active' : 'inactive'}
                        onChange={(e) => setProfileForm({ ...profileForm, is_active: e.target.value === 'active' })}
                        className="form-input text-sm mt-1"
                      >
                        <option value="active">Active (Currently Enrolled)</option>
                        <option value="inactive">Inactive / Suspended</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACT & ADDRESS */}
              {editTab === 'contact' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Primary Phone Number</label>
                      <input
                        type="tel"
                        maxLength={15}
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Email Address</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="student@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700">Residential Address</label>
                    <textarea
                      rows={3}
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="form-input text-sm mt-1"
                      placeholder="Flat / Building, Street, Area..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="Pune"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">State</label>
                      <input
                        type="text"
                        value={profileForm.state}
                        onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                        className="form-input text-sm mt-1"
                        placeholder="Maharashtra"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Pincode</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={profileForm.pincode}
                        onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value.replace(/\D/g, '') })}
                        className="form-input text-sm mt-1 font-mono"
                        placeholder="411001"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PARENTS & GUARDIANS */}
              {editTab === 'guardians' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Parent / Guardian Contacts</h4>
                      <p className="text-xs text-gray-500">Manage primary and secondary contacts for communication and emergencies</p>
                    </div>
                    <button
                      type="button"
                      onClick={addGuardian}
                      className="px-3 py-1.5 rounded-lg border border-primary-600 text-primary-700 hover:bg-primary-50 text-xs font-semibold flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Guardian
                    </button>
                  </div>

                  {profileForm.guardians.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                      <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700">No Guardians Registered</p>
                      <p className="text-xs text-gray-500 mt-1">Click the button above to add parents or guardians.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profileForm.guardians.map((g, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary-800 uppercase tracking-wide">
                              Guardian #{idx + 1} {g.is_primary && '— Primary Contact'}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeGuardian(idx)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 text-xs flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-medium text-gray-700">Relationship</label>
                              <select
                                value={g.relation}
                                onChange={(e) => updateGuardian(idx, 'relation', e.target.value)}
                                className="form-input text-xs mt-1"
                              >
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Guardian">Legal Guardian</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-gray-700">First Name</label>
                              <input
                                type="text"
                                required
                                value={g.first_name}
                                onChange={(e) => updateGuardian(idx, 'first_name', e.target.value)}
                                className="form-input text-xs mt-1"
                                placeholder="First Name"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-gray-700">Last Name</label>
                              <input
                                type="text"
                                required
                                value={g.last_name}
                                onChange={(e) => updateGuardian(idx, 'last_name', e.target.value)}
                                className="form-input text-xs mt-1"
                                placeholder="Last Name"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-medium text-gray-700">Phone</label>
                              <input
                                type="tel"
                                value={g.phone}
                                onChange={(e) => updateGuardian(idx, 'phone', e.target.value)}
                                className="form-input text-xs mt-1"
                                placeholder="Phone number"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-gray-700">Email</label>
                              <input
                                type="email"
                                value={g.email}
                                onChange={(e) => updateGuardian(idx, 'email', e.target.value)}
                                className="form-input text-xs mt-1"
                                placeholder="Email address"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-gray-700">Occupation</label>
                              <input
                                type="text"
                                value={g.occupation}
                                onChange={(e) => updateGuardian(idx, 'occupation', e.target.value)}
                                className="form-input text-xs mt-1"
                                placeholder="e.g. Architect, Teacher"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-medium text-gray-700">Annual Income (₹):</label>
                              <input
                                type="number"
                                value={g.annual_income}
                                onChange={(e) => updateGuardian(idx, 'annual_income', e.target.value)}
                                className="form-input text-xs w-36 py-1"
                                placeholder="e.g. 800000"
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                              <input
                                type="checkbox"
                                checked={g.is_primary}
                                onChange={(e) => updateGuardian(idx, 'is_primary', e.target.checked)}
                                className="rounded text-primary-600 focus:ring-primary-500"
                              />
                              Primary Contact
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ACADEMIC & BATCH ASSIGNMENT */}
              {editTab === 'academic' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Current Academic & Batch Assignment</h4>
                    <p className="text-xs text-gray-500">Configure standard level, batch/division, and roll number</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Standard / Level <span className="text-red-500">*</span></label>
                      <select
                        value={profileForm.standard_id}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            standard_id: Number(e.target.value),
                            division_id: 0, // reset batch when standard changes
                          })
                        }
                        className="form-input text-sm mt-1"
                      >
                        <option value={0}>Select Standard</option>
                        {(standardsList || []).map((std) => (
                          <option key={std.id} value={std.id}>
                            {std.name} (Level {std.level})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700">Batch / Division <span className="text-red-500">*</span></label>
                      <select
                        value={profileForm.division_id}
                        onChange={(e) => setProfileForm({ ...profileForm, division_id: Number(e.target.value) })}
                        className="form-input text-sm mt-1"
                        disabled={!profileForm.standard_id}
                      >
                        <option value={0}>Select Batch</option>
                        {(divisionsList || []).map((div) => (
                          <option key={div.id} value={div.id}>
                            {div.name} (Capacity: {div.capacity})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Roll Number</label>
                      <input
                        type="text"
                        value={profileForm.roll_number}
                        onChange={(e) => setProfileForm({ ...profileForm, roll_number: e.target.value })}
                        className="form-input text-sm mt-1 font-mono"
                        placeholder="e.g. 10-01"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Enrollment Status</label>
                      <select
                        value={profileForm.enrollment_status}
                        onChange={(e) => setProfileForm({ ...profileForm, enrollment_status: e.target.value })}
                        className="form-input text-sm mt-1"
                      >
                        <option value="active">Active</option>
                        <option value="transferred">Transferred</option>
                        <option value="completed">Completed / Graduated</option>
                        <option value="inactive">Inactive / On Leave</option>
                      </select>
                    </div>
                  </div>

                  {/* CONSEQUENTIAL CHANGE WARNING & CONFIRMATION */}
                  {isBatchTransferAttempted && (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 space-y-3 animate-fade-in">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-900">
                            Batch Transfer Notice (Consequential Change)
                          </p>
                          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                            You are transferring this student to another standard or batch. The student's enrolled curriculum, subjects, and timetable will update to reflect the new batch.
                          </p>
                          <div className="mt-2 p-2 rounded bg-amber-100/70 border border-amber-200 text-[11px] text-amber-950 flex items-center gap-1.5 font-medium">
                            <CheckCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                            <span>
                              <strong>Financial & Historical Records Preserved:</strong> Fee obligations ({fmt(totalFees)}), payment receipts, and attendance history will remain completely untouched.
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-amber-900">
                          Transfer Reason / Administrative Remarks <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={profileForm.transfer_reason}
                          onChange={(e) => setProfileForm({ ...profileForm, transfer_reason: e.target.value })}
                          placeholder="e.g. Transferred to Morning Batch / Upgraded after mid-term assessment"
                          className="form-input text-xs mt-1 bg-white border-amber-300 focus:border-amber-500"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs font-semibold text-amber-950">
                        <input
                          type="checkbox"
                          checked={confirmBatchTransfer}
                          onChange={(e) => setConfirmBatchTransfer(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span>I confirm this batch transfer and authorize updating the student's active enrollment.</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display inside Modal */}
              {editErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 flex-shrink-0">
                <span className="text-[11px] text-gray-400">
                  Author: <span className="font-semibold text-gray-600">{currentUser?.username}</span> &bull; Audit logged
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending || (isBatchTransferAttempted && (!confirmBatchTransfer || !profileForm.transfer_reason.trim()))}
                    className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {updateProfileMutation.isPending ? 'Saving Profile...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentType="STUDENT_PROFILE"
          recordId={studentId}
          title={`Student Profile - ${overview.full_name}`}
          recipientName={overview.full_name}
          recipientPhone={overview.phone || (overview.guardians && overview.guardians[0]?.phone) || ''}
          recipientEmail={overview.email || (overview.guardians && overview.guardians[0]?.email) || ''}
          defaultMessage={`Dear Parent/Student,\n\nPlease find the student academic profile and enrollment summary for ${overview.full_name} (${overview.admission_number}) at Prashant Academy (PrathamOne EduOS).`}
        />
      )}
      {/* Student Exit Modal */}
      {showExitModal && (
        <StudentExitModal
          isOpen={showExitModal}
          onClose={() => setShowExitModal(false)}
          student={{
            id: overview.id,
            admission_number: overview.admission_number,
            full_name: overview.full_name,
            first_name: overview.first_name,
            last_name: overview.last_name,
          }}
          onSuccess={handleLifecycleSuccess}
        />
      )}

      {showIdCardModal && (
        <StudentIDCardModal
          isOpen={showIdCardModal}
          onClose={() => setShowIdCardModal(false)}
          studentId={overview.id}
        />
      )}

      {selectedOnlineInvoice && (
        <OnlinePaymentModal
          isOpen={!!selectedOnlineInvoice}
          onClose={() => setSelectedOnlineInvoice(null)}
          invoiceId={selectedOnlineInvoice.id}
          invoiceNumber={selectedOnlineInvoice.invoice_number}
          studentId={overview.id}
          studentName={overview.full_name}
          outstandingAmount={Number(selectedOnlineInvoice.outstanding_amount)}
          onPaymentSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['student-fees', studentId] })
            queryClient.invalidateQueries({ queryKey: ['student-admin-profile', studentId] })
          }}
        />
      )}

      {/* Student Reactivate Modal */}
      {showReactivateModal && (
        <StudentReactivateModal
          isOpen={showReactivateModal}
          onClose={() => setShowReactivateModal(false)}
          student={{
            id: overview.id,
            admission_number: overview.admission_number,
            full_name: overview.full_name,
            first_name: overview.first_name,
            last_name: overview.last_name,
          }}
          onSuccess={handleLifecycleSuccess}
        />
      )}

      {/* Adjust Student Fees Modal */}
      {showAdjustFeesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-sm">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Adjust Student Fee Obligation</h3>
                  <p className="text-xs text-gray-600">
                    {overview.full_name} ({overview.admission_number})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustFeesModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {adjustFeesLoading ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2" />
                  Loading current fee commitment...
                </div>
              ) : (
                <form onSubmit={handleSaveAdjustFees} id="adjust-fee-form" className="space-y-4">
                  {adjustFeesError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{adjustFeesError}</span>
                    </div>
                  )}
                  {adjustFeesSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{adjustFeesSuccess}</span>
                    </div>
                  )}

                  {/* Account Snapshot */}
                  {(() => {
                    const invSnap = feeDetails?.current_invoice || (feeDetails as any)?.invoice
                    if (!invSnap) return null
                    return (
                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="block text-[10px] font-semibold text-slate-500 uppercase">Current Net Fee</span>
                          <span className="text-xs font-bold text-slate-900">{fmt(invSnap.net_amount)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-semibold text-slate-500 uppercase">Paid So Far</span>
                          <span className="text-xs font-bold text-emerald-700">{fmt(invSnap.paid_amount)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-semibold text-slate-500 uppercase">Outstanding</span>
                          <span className="text-xs font-bold text-rose-700">{fmt(invSnap.outstanding_amount)}</span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Fee Plan Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Assigned Fee Structure Plan
                    </label>
                    <select
                      value={adjustForm.fee_structure_id}
                      onChange={(e) => handleStructureChange(Number(e.target.value))}
                      className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {feeDetails?.available_structures?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {fmt(s.amount)} ({s.frequency}, {s.installments_count} installment{s.installments_count > 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Selecting a new structure updates the base plan template.
                    </p>
                  </div>

                  {/* Two columns: Package Amount & Concession */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Agreed Package Amount (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={adjustForm.package_amount}
                        onChange={(e) => setAdjustForm((p) => ({ ...p, package_amount: e.target.value }))}
                        className="w-full text-xs font-bold border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-[10px] text-gray-500">Agreed gross fee for academic year</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Concession / Discount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={adjustForm.concession_amount}
                        onChange={(e) => setAdjustForm((p) => ({ ...p, concession_amount: e.target.value }))}
                        className="w-full text-xs font-bold border border-gray-300 rounded-xl px-3 py-2 text-emerald-700 focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-[10px] text-gray-500">Management / sibling concession</span>
                    </div>
                  </div>

                  {/* Live Calculation Preview Banner */}
                  {(() => {
                    const pkg = parseFloat(adjustForm.package_amount) || 0
                    const conc = parseFloat(adjustForm.concession_amount) || 0
                    const net = Math.max(0, pkg - conc)
                    const paid = feeDetails?.current_invoice?.paid_amount || (feeDetails as any)?.invoice?.paid_amount || 0
                    const newBal = Math.max(0, net - paid)

                    return (
                      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-3 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-600 font-medium">New Net Fee:</span>
                          <span className="font-extrabold text-primary-900 text-sm">
                            {fmt(net)}
                            <span className="text-[11px] font-normal text-gray-500 ml-1.5">
                              (₹{pkg} - ₹{conc})
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-blue-100">
                          <span className="text-gray-500">New Outstanding Balance:</span>
                          <span className="font-bold text-rose-700">
                            {fmt(newBal)}
                            <span className="text-gray-400 font-normal ml-1">(after ₹{paid} paid)</span>
                          </span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Mandatory Reason */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Mandatory Reason for Adjustment <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))}
                      placeholder="e.g. Sibling discount approved by Director, or standard fee correction..."
                      className="w-full text-xs border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-[10px] text-gray-500">
                      This explanation is permanently logged in the compliance audit trail.
                    </span>
                  </div>

                  {/* Optional Remarks */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Internal Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={adjustForm.remarks}
                      onChange={(e) => setAdjustForm((p) => ({ ...p, remarks: e.target.value }))}
                      placeholder="Optional reference, approval letter, or note..."
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowAdjustFeesModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="adjust-fee-form"
                disabled={adjustSubmitting || adjustFeesLoading || !adjustForm.reason.trim()}
                className="px-5 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 disabled:opacity-50 transition shadow-sm inline-flex items-center gap-1.5"
              >
                {adjustSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Apply Adjustment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Standardized Delete Protection Modal */}
      <DeleteConfirmationModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        scope={editScope}
        entityType="Student Document"
        entityName={docToDelete?.title || ''}
        entityId={docToDelete?.id}
        isLoading={deleteDocMutation.isPending}
        onConfirm={() => {
          if (docToDelete) {
            deleteDocMutation.mutate(docToDelete.id, {
              onSuccess: () => setDocToDelete(null),
              onError: (err: any) => {
                toast.error(err?.response?.data?.detail || 'Failed to delete document')
              },
            })
          }
        }}
      />
    </div>
  )
}
