/**
 * @file        SysAdminWorkspace.tsx
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
 * @description Dedicated System Administrator governance workspace with protected security audits, universal records editor, and system controls.
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, Terminal, Lock, KeyRound, AlertTriangle, CheckCircle2,
  Database, Server, RefreshCw, Search, Filter, Edit3, Save,
  Eye, FileText, Activity, Users, CreditCard, Layers, XCircle, GitBranch
} from 'lucide-react'
import { sysadminApi } from '../api/endpoints'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'
import type { SecurityAuditLogItem, UniversalEditPayload } from '../types'
import OrganizationBranding from '../components/OrganizationBranding'
import { useBranding } from '../config/branding'

const MODEL_ALLOWLISTS: Record<string, string[]> = {
  student: [
    'first_name', 'last_name', 'middle_name', 'date_of_birth', 'gender',
    'blood_group', 'nationality', 'religion', 'caste', 'aadhar_number',
    'photo_url', 'address', 'city', 'state', 'pincode', 'phone', 'email',
    'is_active', 'exit_date', 'exit_reason', 'exit_notes'
  ],
  staff: [
    'first_name', 'last_name', 'designation', 'department', 'qualification',
    'experience_years', 'phone', 'email', 'address', 'status', 'joining_date',
    'specialization'
  ],
  user: [
    'first_name', 'last_name', 'email', 'phone', 'role', 'is_active'
  ],
  fee_structure: [
    'name', 'description', 'total_amount', 'is_active'
  ],
  division: [
    'name', 'code', 'room_number', 'capacity', 'schedule_timing', 'status',
    'is_active', 'class_teacher_id'
  ],
  batch: [
    'name', 'code', 'room_number', 'capacity', 'schedule_timing', 'status',
    'is_active', 'class_teacher_id'
  ],
  standard: [
    'name', 'level', 'description', 'is_active'
  ],
  institution: [
    'name', 'tagline', 'address', 'city', 'state', 'pincode', 'phone',
    'email', 'website', 'logo_url', 'favicon_url', 'primary_color',
    'secondary_color', 'accent_color', 'description', 'is_active'
  ],
}


export default function SysAdminWorkspace() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isSysAdmin = isUserSysAdmin(user)
  const branding = useBranding()

  // Active Tab: 'overview' | 'audits' | 'universal-edit' | 'settings'
  const [activeTab, setActiveTab] = useState<'overview' | 'audits' | 'universal-edit' | 'settings'>('overview')

  // Security Audit Log Filters
  const [auditSearch, setAuditSearch] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('')
  const [selectedResourceType, setSelectedResourceType] = useState('')
  const [auditPage, setAuditPage] = useState(1)
  const [inspectAuditLog, setInspectAuditLog] = useState<SecurityAuditLogItem | null>(null)

  // Universal Edit State
  const [editPayload, setEditPayload] = useState<UniversalEditPayload>({
    model_name: 'student',
    record_id: 114,
    fields: { is_active: true },
    reason: 'SysAdmin administrative validation and status synchronization',
  })
  const [fieldKey, setFieldKey] = useState('phone')
  const [fieldVal, setFieldVal] = useState('+91 98200 99999')

  // System Settings State
  const [settingsForm, setSettingsForm] = useState({
    site_name: 'Prashant Academy',
    contact_email: 'admin@prashantacademy.edu.in',
    contact_phone: '+91 98765 43210',
    session_timeout_minutes: 60,
    maintenance_mode: false,
    enable_mfa_requirement: false,
  })

  // ─── Queries ───────────────────────────────────────────────────────────────

  // 1. SysAdmin Overview Query
  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['sysadmin-overview'],
    queryFn: () => sysadminApi.getOverview().then((r) => r.data),
  })

  // 2. Protected Security Audit Logs Query
  const { data: auditsData, isLoading: isAuditsLoading, refetch: refetchAudits } = useQuery({
    queryKey: ['sysadmin-security-audits', auditSearch, selectedSeverity, selectedResourceType, auditPage],
    queryFn: () =>
      sysadminApi
        .getSecurityAuditLogs({
          search: auditSearch || undefined,
          severity: selectedSeverity || undefined,
          resource_type: selectedResourceType || undefined,
          page: auditPage,
          limit: 25,
        })
        .then((r) => r.data),
    enabled: activeTab === 'audits',
  })

  // 3. System Settings Query
  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ['sysadmin-system-settings'],
    queryFn: () => sysadminApi.getSystemSettings().then((r) => r.data),
    enabled: activeTab === 'settings',
  })

  React.useEffect(() => {
    if (settingsData) {
      setSettingsForm({
        site_name: settingsData.institution_name,
        contact_email: settingsData.contact_email,
        contact_phone: settingsData.contact_phone,
        session_timeout_minutes: settingsData.session_timeout_minutes,
        maintenance_mode: settingsData.maintenance_mode,
        enable_mfa_requirement: settingsData.enable_mfa_requirement,
      })
    }
  }, [settingsData])

  // ─── Mutations ─────────────────────────────────────────────────────────────

  // Universal Edit Mutation
  const universalEditMutation = useMutation({
    mutationFn: (payload: UniversalEditPayload) => sysadminApi.executeUniversalEdit(payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['sysadmin-overview'] })
      queryClient.invalidateQueries({ queryKey: ['sysadmin-security-audits'] })
      alert(`Universal Edit Success: ${res.data.message}. Security audit entry #${res.data.audit_id} generated.`)
    },
    onError: (err: any) => {
      alert(`Universal Edit Rejected: ${err.response?.data?.detail || err.message}`)
    },
  })

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) => sysadminApi.updateSystemSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sysadmin-system-settings'] })
      alert('System and security configurations saved successfully!')
    },
    onError: (err: any) => {
      alert(`Failed to save settings: ${err.response?.data?.detail || err.message}`)
    },
  })

  if (!isSysAdmin) {
    return (
      <div className="p-12 bg-white rounded-2xl border border-rose-200 text-center max-w-lg mx-auto my-12 space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Restricted Security Area</h2>
        <p className="text-sm text-slate-600">
          The System Administrator Governance Center is strictly restricted to authenticated accounts possessing the <code>sysadmin</code> or <code>superadmin</code> role.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Superuser Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Terminal className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">System Administrator Governance</h1>
              <span className="px-2.5 py-0.5 bg-indigo-500 text-white rounded-full text-xs font-mono font-bold tracking-wider">
                SUPERUSER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Universal records management, security audit isolation, system parameters, and high-privilege operations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SysAdmin Active: {user?.username}</span>
          </div>
          <button
            onClick={() => {
              refetchOverview()
              refetchAudits()
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            title="Refresh System Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs overflow-x-auto">
        {[
          { key: 'overview', label: 'System Overview', icon: Activity },
          { key: 'audits', label: 'Security Audit Log', icon: Shield, badge: overview?.security_audit_summary?.security_audits },
          { key: 'universal-edit', label: 'Universal Data Editor', icon: Edit3 },
          { key: 'settings', label: 'System Configuration', icon: Server },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── TAB 1: SYSTEM OVERVIEW ─────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Total User Accounts</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {overview?.users_summary?.total_accounts ?? 0}
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-2">
                {overview?.users_summary?.active_accounts ?? 0} Active • {overview?.users_summary?.active_sysadmins ?? 1} SysAdmin(s)
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Active Students</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {overview?.academic_summary?.active_students ?? 39}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Distributed across {overview?.academic_summary?.active_batches ?? 5} Coaching Batches
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Total Fee Volume</span>
                <CreditCard className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ₹{(overview?.financial_summary?.total_collected ?? 1819500).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-2">
                Out of ₹{(overview?.financial_summary?.total_invoiced ?? 2000000).toLocaleString('en-IN')} Invoiced
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Security Audit Volume</span>
                <Shield className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {overview?.security_audit_summary?.security_audits ?? 0}
              </div>
              <div className="text-xs text-amber-600 font-medium mt-2">
                {overview?.security_audit_summary?.critical_events ?? 0} Critical / Warning Logged
              </div>
            </div>
          </div>

          {/* Enterprise Release & Change Governance Quick Link */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-blue-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-300" />
                <h3 className="text-sm font-bold text-white">Enterprise Release & Change Governance</h3>
                <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded text-[11px] font-mono">
                  {branding.versionDisplay}
                </span>
              </div>
              <p className="text-xs text-blue-100 max-w-xl">
                Track pending repository changes, execute automated pre-flight quality gates, manage semantic versioning, and approve production deployments.
              </p>
            </div>
            <Link
              to="/releases"
              className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 shrink-0"
            >
              Open Releases Workspace ➔
            </Link>
          </div>

          {/* Roles Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">RBAC System Roles Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {Object.entries(overview?.users_summary?.roles_breakdown || {}).map(([roleName, count]) => (
                <div key={roleName} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{roleName}</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{count}</div>
                </div>
              ))}
            </div>
          </div>
          {/* AITDL Organization Branding & Product Ecosystem */}
          <OrganizationBranding variant="card" />
        </div>
      )}

      {/* ─── TAB 2: PROTECTED SECURITY AUDIT LOGS ───────────────────────────── */}
      {activeTab === 'audits' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search security audits by action, details, actor..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>

              <select
                value={selectedResourceType}
                onChange={(e) => setSelectedResourceType(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
              >
                <option value="">All Resources</option>
                <option value="user">User</option>
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="fee">Fee Structure</option>
                <option value="system">System</option>
              </select>

              <button
                onClick={() => refetchAudits()}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Severity</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Action & Resource</th>
                  <th className="px-6 py-3.5">Details</th>
                  <th className="px-6 py-3.5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {isAuditsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-sans">
                      Loading isolated security audit records...
                    </td>
                  </tr>
                ) : auditsData?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-sans">
                      No security audit events recorded.
                    </td>
                  </tr>
                ) : (
                  auditsData?.items?.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-sans">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 font-sans">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          log.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : log.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-sans">
                        <div className="font-semibold text-slate-900">{log.actor_name || log.actor_username || 'System'}</div>
                        <div className="text-[11px] text-slate-400">{log.actor_role}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-indigo-700">{log.action}</div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          {log.resource_type} (ID: #{log.resource_id})
                        </div>
                      </td>
                      <td className="px-6 py-4 font-sans text-slate-700 max-w-xs truncate">
                        {log.details || log.new_data}
                      </td>
                      <td className="px-6 py-4 text-right font-sans">
                        <button
                          onClick={() => setInspectAuditLog(log)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                        >
                          View Diff
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: UNIVERSAL ADMINISTRATIVE DATA EDITOR ───────────────────── */}
      {activeTab === 'universal-edit' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Superuser Warning: </span>
              Universal Edit allows SysAdmin to directly update fields across application entities. Every modification is recorded in the protected security audit log with actor ID, IP address, and before/after values. Foreign keys and database constraints remain enforced.
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 max-w-3xl">
            <h3 className="font-bold text-slate-900 text-base">Universal Record Modification</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Model Entity *</label>
                <select
                  value={editPayload.model_name}
                  onChange={(e) => setEditPayload({ ...editPayload, model_name: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="student">Student Profile</option>
                  <option value="staff">Staff Profile</option>
                  <option value="user">User Account</option>
                  <option value="fee_structure">Fee Structure</option>
                  <option value="division">Division / Class Section</option>
                  <option value="batch">Academic Batch</option>
                  <option value="standard">Standard / Class</option>
                  <option value="institution">Institution Profile</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Record ID (Primary Key) *</label>
                <input
                  type="number"
                  value={editPayload.record_id}
                  onChange={(e) => setEditPayload({ ...editPayload, record_id: Number(e.target.value) })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. 114"
                />
              </div>
            </div>

            {/* Field-Value Pair Builder */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Field to Update</div>
                <div className="text-[11px] text-slate-500">Click an allowed field to prefill</div>
              </div>
              {MODEL_ALLOWLISTS[editPayload.model_name] && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {MODEL_ALLOWLISTS[editPayload.model_name].map((allowedField) => (
                    <button
                      key={allowedField}
                      type="button"
                      onClick={() => setFieldKey(allowedField)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                        fieldKey === allowedField
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {allowedField}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Field Name (Attribute)</label>
                  <input
                    type="text"
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white font-mono text-indigo-700 outline-none"
                    placeholder="e.g. phone, address, status"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">New Value</label>
                  <input
                    type="text"
                    value={fieldVal}
                    onChange={(e) => setFieldVal(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none"
                    placeholder="New value to commit"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Administrative Justification / Reason *</label>
              <textarea
                rows={2}
                value={editPayload.reason}
                onChange={(e) => setEditPayload({ ...editPayload, reason: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="State the audit reason for this direct superuser record change..."
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  const finalPayload = {
                    ...editPayload,
                    fields: { [fieldKey]: fieldVal },
                  }
                  if (confirm(`Execute universal edit on ${editPayload.model_name} #${editPayload.record_id}?`)) {
                    universalEditMutation.mutate(finalPayload)
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Execute Universal Edit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: SYSTEM CONFIGURATION ───────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs max-w-2xl space-y-6">
          <h3 className="font-bold text-slate-900 text-base">Global Academy & Security Settings</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Institution Display Name</label>
              <input
                type="text"
                value={settingsForm.site_name}
                onChange={(e) => setSettingsForm({ ...settingsForm, site_name: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Administrative Contact Email</label>
                <input
                  type="email"
                  value={settingsForm.contact_email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, contact_email: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Administrative Helpline Phone</label>
                <input
                  type="text"
                  value={settingsForm.contact_phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, contact_phone: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Security Session Timeout (Minutes)</label>
              <input
                type="number"
                value={settingsForm.session_timeout_minutes}
                onChange={(e) => setSettingsForm({ ...settingsForm, session_timeout_minutes: Number(e.target.value) })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => updateSettingsMutation.mutate(settingsForm)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: AUDIT LOG DIFF INSPECTOR ───────────────────────────────── */}
      {inspectAuditLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Security Audit Event #{inspectAuditLog.id}</h3>
              <button onClick={() => setInspectAuditLog(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3 font-mono">
              <div>
                <span className="text-slate-500">Action:</span> <strong className="text-indigo-600">{inspectAuditLog.action}</strong>
              </div>
              <div>
                <span className="text-slate-500">Resource:</span> {inspectAuditLog.resource_type} (ID: #{inspectAuditLog.resource_id})
              </div>
              <div>
                <span className="text-slate-500">Client IP / Agent:</span> {inspectAuditLog.ip_address || 'unknown'}
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="font-bold text-slate-700">Before:</div>
                <pre className="text-[11px] text-slate-600 overflow-x-auto">{inspectAuditLog.old_data || 'None'}</pre>
                <div className="font-bold text-slate-700 pt-2 border-t border-slate-200">After:</div>
                <pre className="text-[11px] text-emerald-700 overflow-x-auto">{inspectAuditLog.new_data || 'None'}</pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectAuditLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
