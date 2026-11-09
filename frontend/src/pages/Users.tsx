/**
 * @file        Users.tsx
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
 * @updated     2026-11-10
 *
 * @description User management dashboard listing system accounts, roles, access scopes, and invitation workflows.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Users, UserCheck, UserX, Mail, Search, Filter, Plus,
  MoreVertical, KeyRound, Send, Edit3, Trash2, Eye, Shield,
  GraduationCap, Briefcase, Calendar, ChevronRight, ChevronLeft,
  X, CheckCircle2, AlertCircle, RefreshCw, Lock, Copy, Check,
  Layers, Clock, AlertTriangle, ShieldCheck, Printer
} from 'lucide-react'
import { usersApi, standardsApi, divisionsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, SortableHeader, TableSortSelect, TableSortOption } from '../components/common'
import Modal from '../components/Modal'
import type {
  UserManagementStats, UserListItem, Standard, Division,
  UserCreatePayload, UserUpdatePayload
} from '../types'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'all', label: 'All Roles' },
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

export default function UsersPage() {
  const navigate = useNavigate()
  const { user: currentUser, selectedInstitutionId } = useAuthStore()
  const editScope = 'admin:users'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  // ── States ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<UserManagementStats | null>(null)
  const [users, setUsers] = useState<UserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedStandardId, setSelectedStandardId] = useState<number | undefined>(undefined)
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | undefined>(undefined)
  const [sortBy, setSortBy] = useState<'name' | 'username' | 'email' | 'role' | 'last_login' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const USER_SORT_OPTIONS: TableSortOption[] = [
    { key: 'name', label: 'User Name' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'last_login', label: 'Last Login', type: 'date', defaultDirection: 'desc' },
    { key: 'created_at', label: 'Date Created', type: 'date', defaultDirection: 'desc' },
  ]

  const handleSortRequest = (key: string) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key as any)
      setSortDir('asc')
    }
    setPage(1)
  }

  // Filter dropdown data
  const [standards, setStandards] = useState<Standard[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalUser, setEditModalUser] = useState<UserListItem | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<UserListItem | null>(null)
  const [deleteModalUser, setDeleteModalUser] = useState<UserListItem | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  // Reset password feedback
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  // Create form
  const [createForm, setCreateForm] = useState<UserCreatePayload>({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    role: 'staff',
    password: '',
    staff_code: '',
    designation: '',
    scope_type: 'institute',
    send_invitation: false,
  })

  // Edit form
  const [editForm, setEditForm] = useState<UserUpdatePayload>({})
  const [isPermanentDelete, setIsPermanentDelete] = useState(false)

  // ── Initial Data Load ───────────────────────────────────────────────────────
  useEffect(() => {
    loadFilterData()
    fetchStats()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [page, limit, search, selectedRole, selectedStatus, selectedStandardId, selectedDivisionId, sortBy, sortDir])

  const loadFilterData = async () => {
    try {
      const [stdRes, divRes] = await Promise.all([
        standardsApi.list().catch(() => ({ data: [] })),
        divisionsApi.list().catch(() => ({ data: [] })),
      ])
      setStandards(stdRes.data || [])
      setDivisions(divRes.data || [])
    } catch (err) {
      console.error('Failed to load filter reference data:', err)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await usersApi.getStats()
      setStats(res.data)
    } catch (err) {
      console.error('Failed to load user stats:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await usersApi.list({
        search: search.trim() || undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        standard_id: selectedStandardId,
        division_id: selectedDivisionId,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        limit,
      })
      setUsers(res.data.items || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch (err: any) {
      toast.error('Failed to load users: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleClearFilters = () => {
    setSearch('')
    setSelectedRole('all')
    setSelectedStatus('all')
    setSelectedStandardId(undefined)
    setSelectedDivisionId(undefined)
    setSortBy('created_at')
    setSortDir('desc')
    setPage(1)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.first_name || !createForm.username || !createForm.email) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      await usersApi.create({
        ...createForm,
        institution_id: selectedInstitutionId || 1,
      })
      toast.success(`Account for ${createForm.username} created successfully!`)
      setCreateModalOpen(false)
      setCreateForm({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        phone: '',
        role: 'staff',
        password: '',
        staff_code: '',
        designation: '',
        scope_type: 'institute',
        send_invitation: false,
      })
      fetchStats()
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create user')
    }
  }

  const handleEditOpen = (u: UserListItem) => {
    setEditModalUser(u)
    setEditForm({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      staff_code: u.staff_code || '',
      designation: u.designation || '',
      scope_type: u.scope_type,
      scope_id: u.scope_id,
      is_active: u.is_active,
    })
    setActiveMenuId(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModalUser) return
    try {
      await usersApi.update(editModalUser.id, editForm)
      toast.success('User updated successfully')
      setEditModalUser(null)
      fetchStats()
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update user')
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPasswordUser) return
    try {
      const res = await usersApi.resetPassword(resetPasswordUser.id)
      if (res.data.temporary_password) {
        setGeneratedTempPassword(res.data.temporary_password)
      } else {
        toast.success(res.data.message || 'Password reset successfully')
        setResetPasswordUser(null)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reset password')
    }
  }

  const handleToggleStatus = async (u: UserListItem) => {
    try {
      const res = await usersApi.toggleStatus(u.id)
      toast.success(res.data.message)
      setActiveMenuId(null)
      fetchStats()
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to toggle status')
    }
  }

  const handleResendInvitation = async (u: UserListItem) => {
    try {
      const res = await usersApi.resendInvitation(u.id)
      toast.success(res.data.message)
      setActiveMenuId(null)
      fetchStats()
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to resend invitation')
    }
  }

  const handleDeleteSubmit = async () => {
    if (!deleteModalUser) return
    try {
      const res = await usersApi.delete(deleteModalUser.id, isPermanentDelete)
      toast.success(res.data.message)
      setDeleteModalUser(null)
      setIsPermanentDelete(false)
      fetchStats()
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete user')
    }
  }

  // ── Role Color Helper ───────────────────────────────────────────────────────
  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'sysadmin':
      case 'superadmin':
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300'
      case 'admin':
        return 'bg-primary-100 text-primary-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300'
      case 'principal':
        return 'bg-primary-100 text-primary-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300'
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

  return (
    <div className="space-y-6 pb-16">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="User Management & System Access" isDirty={createModalOpen || Boolean(editModalUser)} />

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-600/30 border border-primary-500/40 rounded-xl text-blue-400">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  User Management & System Access
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/20 text-blue-300 border border-primary-500/30">
                    Live Directory
                  </span>
                </h1>
                <p className="text-slate-300 text-sm">
                  Role-based access control, account credentials, scope authorization, and linked student/staff records.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditMode ? (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                Add User Account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to create new user accounts.')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold cursor-not-allowed shadow-2xs"
                title="Locked in View Mode: Enable Edit Mode above to create user accounts"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Add User Account (Locked)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Total Accounts */}
        <div className="card p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-blue-950/40 text-primary-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Accounts</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats ? stats.total_accounts : '—'}
            </p>
            <p className="text-[11px] text-slate-400">Registered users</p>
          </div>
        </div>

        {/* Card 2: Active Accounts */}
        <div className="card p-4 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-4 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active Accounts</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {stats ? stats.active_accounts : '—'}
            </p>
            <p className="text-[11px] text-emerald-600/70">
              {stats && stats.total_accounts > 0
                ? `${Math.round((stats.active_accounts / stats.total_accounts) * 100)}% enabled`
                : '100%'}
            </p>
          </div>
        </div>

        {/* Card 3: Inactive Accounts */}
        <div className="card p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center flex-shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Inactive Accounts</p>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              {stats ? stats.inactive_accounts : '—'}
            </p>
            <p className="text-[11px] text-slate-400">Suspended or locked</p>
          </div>
        </div>

        {/* Card 4: Pending Invitations */}
        <div className="card p-4 border border-amber-200 dark:border-amber-800/40 flex items-center gap-4 bg-amber-50/20 dark:bg-amber-950/10">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending Invitations</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {stats ? stats.pending_invitations : '—'}
            </p>
            <p className="text-[11px] text-amber-600/70">Awaiting activation</p>
          </div>
        </div>
      </div>

      {/* ── Search & Cascading Filter Controls ───────────────────────────────── */}
      <div className="card p-4 space-y-3 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, username, email, staff code, or student admission no..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={e => {
                setSelectedRole(e.target.value)
                setPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium outline-none"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={e => {
                setSelectedStatus(e.target.value)
                setPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="pending">Pending Invitations</option>
            </select>

            {/* Class Filter */}
            <select
              value={selectedStandardId || ''}
              onChange={e => {
                setSelectedStandardId(e.target.value ? Number(e.target.value) : undefined)
                setPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium outline-none max-w-[140px]"
            >
              <option value="">All Classes</option>
              {standards.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Batch Filter */}
            <select
              value={selectedDivisionId || ''}
              onChange={e => {
                setSelectedDivisionId(e.target.value ? Number(e.target.value) : undefined)
                setPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-medium outline-none max-w-[150px]"
            >
              <option value="">All Batches</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
                </option>
              ))}
            </select>

            {/* Sort Controls */}
            <TableSortSelect
              options={USER_SORT_OPTIONS}
              currentSortKey={sortBy}
              currentDirection={sortDir}
              onSortChange={(key, dir) => {
                setSortBy(key as any)
                setSortDir(dir)
                setPage(1)
              }}
              onClear={() => {
                setSortBy('created_at')
                setSortDir('desc')
                setPage(1)
              }}
              placeholder="Sort Users..."
            />

            {/* Clear Filters Button */}
            {(search || selectedRole !== 'all' || selectedStatus !== 'all' || selectedStandardId || selectedDivisionId) && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2 text-xs font-semibold text-primary-600 dark:text-blue-400 hover:bg-primary-50 dark:hover:bg-blue-950/30 rounded-xl transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Users Data Table ────────────────────────────────────────────────── */}
      <div className="card overflow-x-auto border border-slate-200 dark:border-slate-800 shadow-sm">
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
            <p className="text-xs text-slate-500">Loading system accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No user accounts found</p>
            <p className="text-xs text-slate-500">Try adjusting your search terms or filters.</p>
            <button onClick={handleClearFilters} className="btn-secondary text-xs">
              Clear All Filters
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <SortableHeader
                  columnKey="name"
                  label="User"
                  currentSortKey={sortBy}
                  currentDirection={sortDir}
                  onSort={handleSortRequest}
                />
                <SortableHeader
                  columnKey="email"
                  label="Email & Phone"
                  currentSortKey={sortBy}
                  currentDirection={sortDir}
                  onSort={handleSortRequest}
                />
                <SortableHeader
                  columnKey="role"
                  label="Role"
                  currentSortKey={sortBy}
                  currentDirection={sortDir}
                  onSort={handleSortRequest}
                />
                <th className="px-4 py-3">Linked Person</th>
                <th className="px-4 py-3">Access Scope</th>
                <SortableHeader
                  columnKey="last_login"
                  label="Last Login"
                  currentSortKey={sortBy}
                  currentDirection={sortDir}
                  onSort={handleSortRequest}
                  sortType="date"
                />
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(u => {
                const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || 'U'
                const isMenuOpen = activeMenuId === u.id

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* User Name & Avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/users/${u.id}`}
                          className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition"
                        >
                          {initials}
                        </Link>
                        <div>
                          <Link
                            to={`/users/${u.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-blue-400 transition"
                          >
                            {u.full_name}
                          </Link>
                          <p className="text-[11px] text-slate-400 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <p className="truncate max-w-[190px]">{u.email}</p>
                      {u.phone && <p className="text-[11px] text-slate-400">{u.phone}</p>}
                    </td>

                    {/* Role Badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleBadgeClass(
                          u.role
                        )} capitalize`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Linked Person */}
                    <td className="px-4 py-3">
                      {u.linked_person ? (
                        u.linked_person.type === 'student' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-blue-400">
                              <GraduationCap className="w-3.5 h-3.5" />
                              Student
                            </span>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                              {u.linked_person.name} ({u.linked_person.identifier})
                            </p>
                            {u.linked_person.class_name && (
                              <p className="text-[10px] text-slate-400">
                                {u.linked_person.class_name} • {u.linked_person.batch_name || 'No Batch'}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <Briefcase className="w-3.5 h-3.5" />
                              Staff / Faculty
                            </span>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                              {u.linked_person.identifier}
                            </p>
                            {u.linked_person.designation && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                                {u.linked_person.designation}
                              </p>
                            )}
                          </div>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Direct User</span>
                      )}
                    </td>

                    {/* Access Scope */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                        <Shield className="w-3 h-3 text-primary-500" />
                        {u.scope_label}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {u.last_login ? (
                        <span title={new Date(u.last_login).toLocaleString()}>
                          {new Date(u.last_login).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Never</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {u.is_active ? (
                        u.invitation_status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="px-4 py-3 text-right relative">
                      <div className="inline-block text-left">
                        <button
                          onClick={() => setActiveMenuId(isMenuOpen ? null : u.id)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
                          title="Actions Menu"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div className="origin-top-right absolute right-4 mt-1 w-48 rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 z-50 py-1 text-xs">
                            <button
                              onClick={() => {
                                navigate(`/users/${u.id}`)
                                setActiveMenuId(null)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary-500" />
                              View Profile Workspace
                            </button>

                            <button
                              onClick={() => {
                                navigate(`/forms?formId=user_role_permissions&recordId=${u.id}&mode=prefilled`)
                                setActiveMenuId(null)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                            >
                              <Printer className="w-3.5 h-3.5 text-primary-500" />
                              Print Role & Access
                            </button>

                            <button
                              onClick={() => handleEditOpen(u)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-primary-500" />
                              Edit User Details
                            </button>

                            <button
                              onClick={() => {
                                setResetPasswordUser(u)
                                setGeneratedTempPassword(null)
                                setActiveMenuId(null)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                              Reset Password
                            </button>

                            {u.invitation_status === 'pending' && (
                              <button
                                onClick={() => handleResendInvitation(u)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                              >
                                <Send className="w-3.5 h-3.5 text-teal-500" />
                                Resend Invitation
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={currentUser?.id === u.id}
                              className={`w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 ${
                                u.is_active ? 'text-amber-600' : 'text-emerald-600'
                              } disabled:opacity-40`}
                            >
                              {u.is_active ? (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-amber-500" />
                                  Deactivate Account
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  Activate Account
                                </>
                              )}
                            </button>

                            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                            <button
                              onClick={() => {
                                setDeleteModalUser(u)
                                setIsPermanentDelete(false)
                                setActiveMenuId(null)
                              }}
                              disabled={currentUser?.id === u.id}
                              className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 font-semibold disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              Delete Account...
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* ── Pagination Bar ─────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={limit}
              onChange={e => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2 py-1 outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>accounts per page • Total {total} users</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal 1: Create New User Account ─────────────────────────────────── */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New System User Account"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                value={createForm.first_name}
                onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                value={createForm.last_name}
                onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
              <input
                type="text"
                value={createForm.username}
                onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                className="input font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">System Role *</label>
              <select
                value={createForm.role}
                onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                className="input capitalize"
              >
                {ROLES.filter(r => r.value !== 'all').map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={createForm.phone || ''}
                onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                className="input"
                placeholder="10-digit mobile"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Code</label>
              <input
                type="text"
                value={createForm.staff_code || ''}
                onChange={e => setCreateForm({ ...createForm, staff_code: e.target.value })}
                className="input uppercase font-mono"
                placeholder="e.g. TCH-010"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
              <input
                type="text"
                value={createForm.designation || ''}
                onChange={e => setCreateForm({ ...createForm, designation: e.target.value })}
                className="input"
                placeholder="e.g. Senior Faculty"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Access Scope</label>
              <select
                value={createForm.scope_type}
                onChange={e => setCreateForm({ ...createForm, scope_type: e.target.value, scope_id: undefined })}
                className="input"
              >
                <option value="institute">Global Institute</option>
                <option value="standard">Specific Class / Standard</option>
                <option value="batch">Specific Batch</option>
              </select>
            </div>

            {createForm.scope_type === 'standard' && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Class</label>
                <select
                  value={createForm.scope_id || ''}
                  onChange={e => setCreateForm({ ...createForm, scope_id: Number(e.target.value) })}
                  className="input"
                >
                  <option value="">Select Class</option>
                  {standards.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {createForm.scope_type === 'batch' && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Batch</label>
                <select
                  value={createForm.scope_id || ''}
                  onChange={e => setCreateForm({ ...createForm, scope_id: Number(e.target.value) })}
                  className="input"
                >
                  <option value="">Select Batch</option>
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password (leave empty to auto-generate)
            </label>
            <input
              type="password"
              value={createForm.password || ''}
              onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
              className="input"
              placeholder="Minimum 8 characters"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={createForm.send_invitation}
              onChange={e => setCreateForm({ ...createForm, send_invitation: e.target.checked })}
              className="rounded text-primary-600"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Send activation email invitation immediately
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal 2: Edit User ──────────────────────────────────────────────── */}
      {editModalUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditModalUser(null)}
          title={`Edit User Account: @${editModalUser.username}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
                <input
                  type="text"
                  value={editForm.first_name || ''}
                  onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={editForm.last_name || ''}
                  onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="input"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone || ''}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">System Role *</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  className="input capitalize"
                >
                  {ROLES.filter(r => r.value !== 'all').map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Code</label>
                <input
                  type="text"
                  value={editForm.staff_code || ''}
                  onChange={e => setEditForm({ ...editForm, staff_code: e.target.value })}
                  className="input uppercase font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                <input
                  type="text"
                  value={editForm.designation || ''}
                  onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Access Scope</label>
                <select
                  value={editForm.scope_type || 'institute'}
                  onChange={e => setEditForm({ ...editForm, scope_type: e.target.value, scope_id: undefined })}
                  className="input"
                >
                  <option value="institute">Global Institute</option>
                  <option value="standard">Specific Class / Standard</option>
                  <option value="batch">Specific Batch</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_active ?? true}
                  onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded text-primary-600"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Account is Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setEditModalUser(null)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal 3: Reset Password ─────────────────────────────────────────── */}
      {resetPasswordUser && (
        <Modal
          isOpen={true}
          onClose={() => {
            setResetPasswordUser(null)
            setGeneratedTempPassword(null)
          }}
          title={`Reset Password: @${resetPasswordUser.username}`}
        >
          <div className="space-y-4 text-xs">
            {generatedTempPassword ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Temporary Password Generated!
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Provide this one-time credential to the user securely. They will be prompted to change it upon signing in.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 font-mono text-sm font-bold text-slate-800 dark:text-white select-all">
                    {generatedTempPassword}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedTempPassword)
                      setCopiedPassword(true)
                      setTimeout(() => setCopiedPassword(false), 2000)
                    }}
                    className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                    title="Copy Password"
                  >
                    {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setResetPasswordUser(null)
                      setGeneratedTempPassword(null)
                    }}
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                <p className="text-slate-600 dark:text-slate-400">
                  Are you sure you want to reset the password for <strong>{resetPasswordUser.full_name}</strong> (
                  {resetPasswordUser.email})? A secure 12-character password will be generated automatically and logged in the audit trail.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setResetPasswordUser(null)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Generate Temporary Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal 4: Delete User Confirmation ───────────────────────────────── */}
      {deleteModalUser && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteModalUser(null)}
          title={`Confirm Account Deletion: @${deleteModalUser.username}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-rose-900 dark:text-rose-200">
                <p className="font-bold">Permanent vs Soft Deactivation</p>
                <p>
                  By default, deleting an account deactivates it, preserving student enrollment, audit history, and transaction logs. Permanent deletion completely removes the user credential record.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                checked={isPermanentDelete}
                onChange={e => setIsPermanentDelete(e.target.checked)}
                className="rounded text-rose-600"
              />
              <span className="font-semibold text-rose-700 dark:text-rose-400">
                Permanently delete account record (cannot be undone)
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setDeleteModalUser(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-sm"
              >
                {isPermanentDelete ? 'Permanently Delete' : 'Deactivate Account'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
