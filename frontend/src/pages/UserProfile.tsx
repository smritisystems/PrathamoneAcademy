/**
 * @file        UserProfile.tsx
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
 * @updated     2026-11-06
 *
 * @description Dedicated user profile management workspace for inspecting activity logs, scopes, and passwords.
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Users, UserCheck, UserX, Mail, Phone, Calendar, Clock,
  Shield, ShieldCheck, KeyRound, Edit3, Send, CheckCircle2, AlertCircle,
  RefreshCw, GraduationCap, Briefcase, CreditCard, Award, ClipboardCheck,
  Activity, Layers, Check, Copy, AlertTriangle, ExternalLink, Hash, MapPin,
  FileText, DollarSign, BookOpen, User as UserIcon
} from 'lucide-react'
import { usersApi, standardsApi, divisionsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Modal from '../components/Modal'
import type {
  UserProfileWorkspaceData, Standard, Division,
  UserUpdatePayload
} from '../types'
import toast from 'react-hot-toast'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const ROLES = [
  { value: 'sysadmin', label: 'System Administrator' },
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Administrator' },
  { value: 'principal', label: 'Principal' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'counselor', label: 'Admission Counselor' },
  { value: 'coordinator', label: 'Academic Coordinator' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Support Staff' },
  { value: 'student', label: 'Student' },
]

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()

  // ── States ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState<UserProfileWorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('overview')

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState<UserUpdatePayload>({})

  // Reset password states
  const [customPassword, setCustomPassword] = useState('')
  const [useAutoGenerate, setUseAutoGenerate] = useState(true)
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [resetSubmitting, setResetSubmitting] = useState(false)

  // Scope selection helpers
  const [standards, setStandards] = useState<Standard[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])

  // ── Load User Profile ───────────────────────────────────────────────────────
  const fetchProfile = async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await usersApi.getProfile(id)
      setData(res.data)
      // Set active tab to overview or first permitted tab
      if (res.data.permitted_tabs && res.data.permitted_tabs.length > 0) {
        if (!res.data.permitted_tabs.includes(activeTab)) {
          setActiveTab(res.data.permitted_tabs[0])
        }
      }
    } catch (err: any) {
      toast.error('Failed to load user profile: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const loadDropdowns = async () => {
    try {
      const [stdRes, divRes] = await Promise.all([
        standardsApi.list().catch(() => ({ data: [] })),
        divisionsApi.list().catch(() => ({ data: [] })),
      ])
      setStandards(stdRes.data || [])
      setDivisions(divRes.data || [])
    } catch {
      // Non-blocking
    }
  }

  useEffect(() => {
    fetchProfile()
    loadDropdowns()
  }, [id])

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleOpenEdit = () => {
    if (!data) return
    setEditForm({
      first_name: data.user.first_name,
      last_name: data.user.last_name,
      email: data.user.email,
      phone: data.user.phone || '',
      role: data.user.role,
      staff_code: data.user.staff_code || '',
      designation: data.user.designation || '',
      scope_type: data.user.scope_type || 'institute',
      scope_id: data.user.scope_id || undefined,
      is_active: data.user.is_active,
    })
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      const res = await usersApi.update(id, editForm)
      toast.success(res.data.message || 'User profile updated successfully')
      setEditModalOpen(false)
      fetchProfile()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update user profile')
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      setResetSubmitting(true)
      const payload = useAutoGenerate ? {} : { new_password: customPassword }
      const res = await usersApi.resetPassword(id, payload)
      if (res.data.temporary_password) {
        setGeneratedTempPassword(res.data.temporary_password)
        setCopiedPassword(false)
        toast.success('Password reset! Copy the temporary password below.')
      } else {
        toast.success(res.data.message || 'Password reset successfully')
        setResetModalOpen(false)
        setCustomPassword('')
      }
      fetchProfile()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reset password')
    } finally {
      setResetSubmitting(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!id || !data) return
    try {
      const res = await usersApi.toggleStatus(id)
      toast.success(res.data.message)
      setStatusConfirmOpen(false)
      fetchProfile()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to change user status')
    }
  }

  const handleResendInvitation = async () => {
    if (!id) return
    try {
      const res = await usersApi.resendInvitation(id)
      toast.success(res.data.message)
      fetchProfile()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to resend invitation')
    }
  }

  const handleCopyPassword = () => {
    if (!generatedTempPassword) return
    navigator.clipboard.writeText(generatedTempPassword)
    setCopiedPassword(true)
    toast.success('Password copied to clipboard!')
    setTimeout(() => setCopiedPassword(false), 3000)
  }

  // ── Role Styling ────────────────────────────────────────────────────────────
  const getRoleBadgeClass = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'sysadmin':
      case 'superadmin':
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300'
      case 'principal':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300'
      case 'teacher':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
      case 'accountant':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
      case 'counselor':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300'
      case 'student':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
    }
  }

  const getRoleGradient = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'sysadmin':
      case 'superadmin':
      case 'super_admin':
        return 'from-purple-600 to-indigo-600'
      case 'admin':
        return 'from-blue-600 to-indigo-600'
      case 'principal':
        return 'from-indigo-600 to-violet-700'
      case 'teacher':
        return 'from-emerald-600 to-teal-600'
      case 'accountant':
        return 'from-amber-600 to-orange-600'
      case 'student':
        return 'from-cyan-600 to-blue-600'
      default:
        return 'from-slate-600 to-slate-800'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Loading user profile workspace...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto my-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">User Account Not Found</h2>
        <p className="text-sm text-slate-500">The user account could not be found or you may lack permissions to view it.</p>
        <Link to="/users" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Users Directory
        </Link>
      </div>
    )
  }

  const { user, permissions, linked_student, academic, attendance, examinations, fees, activity_logs, permitted_tabs } = data
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'

  // Tab definitions with dynamic icons
  const TAB_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
    overview: { label: 'Overview', icon: <UserIcon className="w-4 h-4" /> },
    profile: { label: 'Profile Details', icon: <Edit3 className="w-4 h-4" /> },
    access: { label: 'Access & Roles', icon: <ShieldCheck className="w-4 h-4" /> },
    academic: {
      label: user.role === 'student' ? 'Academic & Enrollments' : 'Assigned Batches',
      icon: <GraduationCap className="w-4 h-4" />,
    },
    attendance: { label: 'Attendance', icon: <ClipboardCheck className="w-4 h-4" /> },
    examinations: { label: 'Examinations', icon: <Award className="w-4 h-4" /> },
    fees: { label: 'Fees & Ledger', icon: <CreditCard className="w-4 h-4" /> },
    activity: { label: 'Activity Log', icon: <Activity className="w-4 h-4" /> },
  }

  const tabsToRender = permitted_tabs.filter((t) => TAB_CONFIG[t])

  return (
    <div className="space-y-6 pb-20">
      {/* ── Breadcrumb & Navigation ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to User Accounts Directory
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Account ID:</span>
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">#{user.id}</span>
        </div>
      </div>

      {/* ── Profile Header Card ─────────────────────────────────────────────── */}
      <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Avatar and Basic Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr ${getRoleGradient(
                user.role
              )} text-white font-extrabold text-2xl flex items-center justify-center shadow-lg flex-shrink-0 ring-4 ring-slate-100 dark:ring-slate-800`}
            >
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {user.full_name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeClass(
                    user.role
                  )} capitalize`}
                >
                  {user.role}
                </span>

                {/* Status Badge */}
                {user.is_active ? (
                  user.invitation_status === 'pending' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                      <Clock className="w-3 h-3" />
                      Pending Invite
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300">
                    Inactive
                  </span>
                )}
              </div>

              <p className="text-xs font-mono text-slate-500">@{user.username}</p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user.email}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {user.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  {user.scope_label}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Edit User Button */}
            <button
              onClick={handleOpenEdit}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Account
            </button>

            {/* Reset Password Button */}
            <button
              onClick={() => {
                setGeneratedTempPassword(null)
                setCustomPassword('')
                setUseAutoGenerate(true)
                setResetModalOpen(true)
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Reset Password
            </button>

            {/* Resend Invite if Pending */}
            {user.invitation_status === 'pending' && (
              <button
                onClick={handleResendInvitation}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Resend Invite
              </button>
            )}

            {/* Toggle Status (Activate / Deactivate) */}
            <button
              onClick={() => setStatusConfirmOpen(true)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                user.is_active
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
              }`}
            >
              {user.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {user.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>

        {/* Linked Person Indicator Sub-strip */}
        {(linked_student || user.staff_code || user.designation) && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Linked Identity:</span>
              {linked_student ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Student Admission: {linked_student.admission_number}
                  </span>
                  <Link
                    to={`/students/${linked_student.id}`}
                    className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 transition"
                  >
                    View Student Profile
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <Briefcase className="w-3.5 h-3.5" />
                    Staff Code: {user.staff_code || 'Assigned'}
                  </span>
                  {user.designation && (
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      • {user.designation}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span>
                Last Login:{' '}
                {user.last_login ? (
                  <strong className="text-slate-700 dark:text-slate-300">
                    {new Date(user.last_login).toLocaleString()}
                  </strong>
                ) : (
                  'Never'
                )}
              </span>
              <span>
                Joined:{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
          {tabsToRender.map((tabKey) => {
            const conf = TAB_CONFIG[tabKey]
            const isActive = activeTab === tabKey
            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:border-slate-300'
                }`}
              >
                {conf.icon}
                {conf.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── TAB 1: OVERVIEW ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Identity Card */}
            <div className="card p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Account Role</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white capitalize truncate">{user.role}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.role_description}</p>
              </div>
            </div>

            {/* Scope Card */}
            <div className="card p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Access Scope</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.scope_label}</p>
                <p className="text-[11px] text-slate-500 capitalize">{user.scope_type} level</p>
              </div>
            </div>

            {/* Status & Invitation */}
            <div className="card p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  user.is_active
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {user.is_active ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Account Status</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {user.is_active ? 'Active Account' : 'Deactivated'}
                </p>
                <p className="text-[11px] text-slate-500 capitalize">Invite: {user.invitation_status}</p>
              </div>
            </div>

            {/* Dynamic Context Metric */}
            <div className="card p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
              {user.role === 'student' ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Attendance Rate</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      {attendance.summary ? `${attendance.summary.rate_percentage}%` : 'N/A'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {attendance.summary?.present_days ?? 0} of {attendance.summary?.total_days ?? 0} days
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Assigned Batches</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      {academic.assigned_batches.length} Batches
                    </p>
                    <p className="text-[11px] text-slate-500">Class teacher role</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Linked Person & Account Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Linked Person Card */}
              {linked_student ? (
                <div className="card p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Linked Student Record</h3>
                    </div>
                    <Link
                      to={`/students/${linked_student.id}`}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      Open Full Student Profile
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                      <span className="text-slate-400 font-medium">Admission Number</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-white">
                        {linked_student.admission_number}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                      <span className="text-slate-400 font-medium">Current Enrollment</span>
                      <p className="font-semibold text-slate-800 dark:text-white">
                        {linked_student.current_enrollment
                          ? `${linked_student.current_enrollment.standard_name} • ${linked_student.current_enrollment.batch_name}`
                          : 'No active enrollment'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                      <span className="text-slate-400 font-medium">Gender & Blood Group</span>
                      <p className="font-semibold text-slate-800 dark:text-white capitalize">
                        {linked_student.gender || '—'} {linked_student.blood_group ? `• ${linked_student.blood_group}` : ''}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                      <span className="text-slate-400 font-medium">Date of Birth</span>
                      <p className="font-semibold text-slate-800 dark:text-white">
                        {linked_student.date_of_birth || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Staff / Faculty Credentials</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                      <span className="text-slate-400 font-medium">Staff Code</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-white">
                        {user.staff_code || 'Not Assigned'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 sm:col-span-2">
                      <span className="text-slate-400 font-medium">Designation / Role Title</span>
                      <p className="font-semibold text-slate-800 dark:text-white">
                        {user.designation || 'Faculty Member'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Security & Lifecycle Overview */}
              <div className="card p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Account Security & Access Summary
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500">Username</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">@{user.username}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500">Email Address</span>
                    <span className="font-medium text-slate-800 dark:text-white">{user.email}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500">Phone Number</span>
                    <span className="font-medium text-slate-800 dark:text-white">{user.phone || '—'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500">Account Created</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500">Last Profile Update</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {user.updated_at ? new Date(user.updated_at).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500">Effective Permissions Count</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {permissions.length} actions authorized
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Recent Activity Timeline & Quick Actions */}
            <div className="space-y-6">
              {/* Quick Actions Card */}
              <div className="card p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleOpenEdit}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-500" />
                      Edit Profile Details
                    </span>
                    <span className="text-slate-400">→</span>
                  </button>

                  <button
                    onClick={() => {
                      setGeneratedTempPassword(null)
                      setCustomPassword('')
                      setUseAutoGenerate(true)
                      setResetModalOpen(true)
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-indigo-500" />
                      Reset Account Password
                    </span>
                    <span className="text-slate-400">→</span>
                  </button>

                  {user.student_id && (
                    <Link
                      to={`/students/${user.student_id}`}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <span className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-cyan-500" />
                        Go to Student Profile
                      </span>
                      <span className="text-slate-400">→</span>
                    </Link>
                  )}

                  <button
                    onClick={() => setActiveTab('access')}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      View Access Permissions
                    </span>
                    <span className="text-slate-400">→</span>
                  </button>
                </div>
              </div>

              {/* Recent Activity Mini-stream */}
              <div className="card p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Recent Activity
                  </h3>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View All
                  </button>
                </div>

                {activity_logs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No recent activity logged for this account.</p>
                ) : (
                  <div className="space-y-3">
                    {activity_logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="text-xs border-l-2 border-blue-500 pl-3 py-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {log.created_at ? new Date(log.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {log.new_data || log.old_data || `Resource: ${log.resource_type}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PROFILE DETAILS ──────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="card p-6 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Personal & Contact Profile</h2>
              <p className="text-xs text-slate-500">
                Primary user profile master records stored in the authentication service.
              </p>
            </div>
            <button
              onClick={handleOpenEdit}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 font-medium block mb-1">First Name</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.first_name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Last Name</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.last_name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Username</span>
                <p className="text-sm font-mono font-bold text-slate-800 dark:text-white">@{user.username}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">System Role</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeClass(
                    user.role
                  )} capitalize`}
                >
                  {user.role}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Email Address</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.email}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Phone Number</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.phone || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Staff Identifier Code</span>
                <p className="text-sm font-mono font-semibold text-slate-800 dark:text-white">
                  {user.staff_code || '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Designation / Title</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.designation || '—'}</p>
              </div>
            </div>
          </div>

          {/* Separation of Concerns Note */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
            <div>
              <p className="font-semibold mb-0.5">Strict Identity & Audit Separation</p>
              <p className="text-[11px] leading-relaxed text-blue-700 dark:text-blue-400">
                User credentials and login authentication remain strictly decoupled from student and faculty master records.
                Editing these profile details updates the user account directly, preserving all historic batch enrollments,
                attendance records, and fee ledgers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ACCESS & ROLES ───────────────────────────────────────────── */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          {/* Role & Scope Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                Role-Based Access Control (RBAC)
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Assigned Role</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-semibold border ${getRoleBadgeClass(
                      user.role
                    )} capitalize`}
                  >
                    {user.role}
                  </span>
                </div>
                <div className="py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block mb-1">Role Description</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{user.role_description}</p>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Invitation Lifecycle</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {user.invitation_status}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-5 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Access Scope Boundary
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Scope Type</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                    {user.scope_type || 'Institute-wide'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Target Level</span>
                  <span className="font-medium text-slate-800 dark:text-white">{user.scope_label}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Scope ID</span>
                  <span className="font-mono text-slate-500">{user.scope_id ?? 'None (Global)'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Effective System Permissions</h3>
                <p className="text-xs text-slate-500">
                  Actions authorized for this account across academic, student, examination, fee, and administrative modules.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {permissions.length} Authorized
              </span>
            </div>

            {permissions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No explicit granular permissions assigned. Role default policies apply.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {permissions.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                        {p.resource.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono">resource: {p.resource}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 capitalize">
                      {p.action}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: ACADEMIC & BATCHES ───────────────────────────────────────── */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          {user.role === 'student' ? (
            /* Student Enrollments Table */
            <div className="card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Academic Enrollments & Batches</h3>
                <p className="text-xs text-slate-500">Current and historical class and batch enrollments for this student.</p>
              </div>

              {academic.enrollments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  No academic enrollment records found for this student.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Academic Year</th>
                        <th className="px-4 py-3">Board</th>
                        <th className="px-4 py-3">Class / Standard</th>
                        <th className="px-4 py-3">Batch / Division</th>
                        <th className="px-4 py-3">Roll Number</th>
                        <th className="px-4 py-3">Enrollment Date</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {academic.enrollments.map((enr) => (
                        <tr key={enr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                            {enr.academic_year}
                          </td>
                          <td className="px-4 py-3">{enr.board_name}</td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                            {enr.standard_name}
                          </td>
                          <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                            {enr.batch_name}
                          </td>
                          <td className="px-4 py-3 font-mono">{enr.roll_number || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{enr.enrollment_date || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                                enr.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {enr.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Staff / Faculty Assigned Batches */
            <div className="card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Assigned Classes & Batches</h3>
                <p className="text-xs text-slate-500">
                  Batches where this user serves as the designated Class Teacher or Academic Mentor.
                </p>
              </div>

              {academic.assigned_batches.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  No batches currently assigned to this faculty member.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {academic.assigned_batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{batch.batch_name}</h4>
                        {batch.batch_code && (
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {batch.batch_code}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Class / Standard</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {batch.standard_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Board</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {batch.board_name || 'Standard'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Room Number</span>
                          <span>{batch.room_number || 'Room 1'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Schedule Timing</span>
                          <span>{batch.schedule_timing || 'Mon - Fri'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: ATTENDANCE ───────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card p-4 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] font-medium text-slate-400 uppercase">Rate %</span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {attendance.summary ? `${attendance.summary.rate_percentage}%` : 'N/A'}
              </p>
            </div>
            <div className="card p-4 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] font-medium text-slate-400 uppercase">Total Days</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {attendance.summary?.total_days ?? 0}
              </p>
            </div>
            <div className="card p-4 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] font-medium text-slate-400 uppercase">Present</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {attendance.summary?.present_days ?? 0}
              </p>
            </div>
            <div className="card p-4 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] font-medium text-slate-400 uppercase">Absent</span>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {attendance.summary?.absent_days ?? 0}
              </p>
            </div>
            <div className="card p-4 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] font-medium text-slate-400 uppercase">Late</span>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {attendance.summary?.late_days ?? 0}
              </p>
            </div>
          </div>

          {/* Attendance Records Table */}
          <div className="card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Attendance Logs</h3>

            {attendance.records.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No dated attendance records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Day</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attendance.records.map((rec) => {
                      const d = new Date(rec.date)
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{rec.date}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                                rec.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : rec.status === 'absent'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{rec.remarks || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: EXAMINATIONS ─────────────────────────────────────────────── */}
      {activeTab === 'examinations' && (
        <div className="card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Examination & Test Results</h3>
            <p className="text-xs text-slate-500">Official marks, scores, and grade assessments recorded for this student.</p>
          </div>

          {examinations.results.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
              No examination records found for this student.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Examination Name</th>
                    <th className="px-4 py-3">Marks Obtained</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {examinations.results.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{res.exam_name}</td>
                      <td className="px-4 py-3 font-mono font-medium">
                        {res.marks_obtained} / {res.max_marks}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-white">{res.percentage}%</span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                res.percentage >= 75
                                  ? 'bg-emerald-500'
                                  : res.percentage >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(res.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          {res.grade || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{res.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 7: FEES & LEDGER ────────────────────────────────────────────── */}
      {activeTab === 'fees' && fees && (
        <div className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Obligation</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{fmt(fees.total_fees)}</p>
            </div>
            <div className="card p-4 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Paid</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmt(fees.total_paid)}</p>
            </div>
            <div className="card p-4 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Outstanding Balance</span>
              <p
                className={`text-xl font-bold mt-1 ${
                  fees.outstanding_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {fmt(fees.outstanding_balance)}
              </p>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Fee Invoices</h3>

            {fees.invoices.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No invoices issued for this student.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Invoice Number</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Paid Amount</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fees.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {inv.invoice_number}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {fmt(inv.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                          {fmt(inv.paid_amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{inv.due_date || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : inv.status === 'partial'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Receipts Table */}
          <div className="card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Payment Transactions & Receipts</h3>

            {fees.payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No payment transactions recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Payment Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3">Reference #</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fees.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{p.payment_date}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 capitalize">{p.payment_method}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{p.transaction_reference || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              p.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                            }`}
                          >
                            {p.status}
                          </span>
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

      {/* ── TAB 8: ACTIVITY LOG ─────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="card p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Audit Trail & Activity Log</h3>
            <p className="text-xs text-slate-500">
              Complete chronological audit trail of all profile updates, security events, and role modifications.
            </p>
          </div>

          {activity_logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
              No audit logs found for this user account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Details / Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activity_logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[11px] border border-blue-200 dark:border-blue-900">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">
                        {log.resource_type} #{log.resource_id ?? ''}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-md truncate">
                        {log.new_data || log.old_data || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: EDIT USER DETAILS ────────────────────────────────────────── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User Profile"
        size="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editForm.first_name || ''}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editForm.last_name || ''}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                System Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={editForm.role || 'staff'}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Staff Identifier Code
              </label>
              <input
                type="text"
                placeholder="e.g. TCH-005, ADM-002"
                value={editForm.staff_code || ''}
                onChange={(e) => setEditForm({ ...editForm, staff_code: e.target.value })}
                className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Designation / Role Title
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Faculty - Physics, Academic Coordinator"
              value={editForm.designation || ''}
              onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
              className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {/* Access Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Access Scope Type
              </label>
              <select
                value={editForm.scope_type || 'institute'}
                onChange={(e) => setEditForm({ ...editForm, scope_type: e.target.value, scope_id: undefined })}
                className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="institute">Institute-Wide (Global)</option>
                <option value="standard">Specific Class / Standard</option>
                <option value="batch">Specific Batch</option>
              </select>
            </div>

            {editForm.scope_type === 'standard' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Class
                </label>
                <select
                  value={editForm.scope_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, scope_id: Number(e.target.value) })}
                  className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Select Class...</option>
                  {standards.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editForm.scope_type === 'batch' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Batch
                </label>
                <select
                  value={editForm.scope_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, scope_id: Number(e.target.value) })}
                  className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Select Batch...</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="user_active_toggle"
              checked={editForm.is_active ?? true}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="user_active_toggle" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Account is Active and allowed to authenticate
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: RESET PASSWORD ───────────────────────────────────────────── */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Account Password"
        size="md"
      >
        {generatedTempPassword ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                Password Successfully Reset!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Share this secure temporary password with the user:
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="font-mono text-base font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white select-all">
                  {generatedTempPassword}
                </span>
                <button
                  onClick={handleCopyPassword}
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 text-xs font-semibold shadow-sm"
                >
                  {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedPassword ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="text-right pt-2">
              <button
                onClick={() => setResetModalOpen(false)}
                className="btn-primary text-xs w-full"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <p className="text-xs text-slate-500">
              Reset the authentication credentials for <strong className="text-slate-800 dark:text-slate-200">@{user.username}</strong>.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="opt_auto"
                  name="reset_type"
                  checked={useAutoGenerate}
                  onChange={() => setUseAutoGenerate(true)}
                  className="text-blue-600"
                />
                <label htmlFor="opt_auto" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Auto-generate a secure temporary password (recommended)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="opt_manual"
                  name="reset_type"
                  checked={!useAutoGenerate}
                  onChange={() => setUseAutoGenerate(false)}
                  className="text-blue-600"
                />
                <label htmlFor="opt_manual" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Specify a custom password
                </label>
              </div>
            </div>

            {!useAutoGenerate && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full input text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetSubmitting}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                {resetSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Reset Password
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MODAL: STATUS CONFIRMATION ──────────────────────────────────────── */}
      <Modal
        isOpen={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        title={user.is_active ? 'Deactivate User Account' : 'Reactivate User Account'}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`w-6 h-6 flex-shrink-0 ${user.is_active ? 'text-rose-500' : 'text-emerald-500'}`}
            />
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-white">
                {user.is_active
                  ? `Are you sure you want to deactivate ${user.full_name}?`
                  : `Are you sure you want to reactivate ${user.full_name}?`}
              </p>
              <p className="text-slate-500">
                {user.is_active
                  ? 'The user will immediately be blocked from logging into the portal. All historical student, attendance, exam, and fee records remain preserved.'
                  : 'The user account will be re-enabled and permitted to log in with their current credentials.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setStatusConfirmOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleToggleStatus}
              className={`text-xs font-semibold px-4 py-2 rounded-xl text-white transition ${
                user.is_active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {user.is_active ? 'Yes, Deactivate' : 'Yes, Reactivate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

