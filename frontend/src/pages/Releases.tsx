/**
 * @file        Releases.tsx
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
 * @created     2026-11-05
 * @updated     2026-11-08
 *
 * @description Enterprise Release & Change Management workspace governing change tracking, automated release notes, pre-flight validations, approvals, and deployment lifecycles.
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GitBranch, GitCommit, Tag, Shield, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Play, Check, Rocket, RotateCcw, FileText, Layers,
  ChevronRight, Calendar, UserCheck, Eye, Edit3, Lock, Server,
  Sparkles, History, Filter, ArrowUpRight, Database
} from 'lucide-react'
import toast from 'react-hot-toast'
import { releasesApi } from '../api/endpoints'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import { useBranding } from '../config/branding'
import type {
  SystemReleaseListItem,
  SystemReleaseDetail,
  PendingChangesResponse,
  ReleaseAuditLogItem
} from '../types'

export default function Releases() {
  const { user } = useAuthStore()
  const editScope = 'system:releases'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const branding = useBranding()
  const queryClient = useQueryClient()
  const isSysAdmin = isUserSysAdmin(user) || user?.role === 'admin'

  // Navigation tab: 'lifecycle' | 'history' | 'current' | 'audit'
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'history' | 'current' | 'audit'>('lifecycle')

  // History filtering & inspection
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedReleaseId, setSelectedReleaseId] = useState<number | null>(null)
  const [inspectModalOpen, setInspectModalOpen] = useState(false)

  // Draft Generation Modal
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [draftForm, setDraftForm] = useState({
    version: '',
    title: '',
    environment: 'production',
    bump_type: 'patch',
    is_critical_security: false,
    migration_plan: 'Automatic backward-compatible Alembic migration with zero downtime.',
  })

  // Edit Notes Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    releaseId: 0,
    title: '',
    markdown: '',
  })

  // Rollback Modal
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false)
  const [rollbackForm, setRollbackForm] = useState({
    releaseId: 0,
    version: '',
    reason: '',
    targetVersion: '',
  })

  // ─── Queries ───────────────────────────────────────────────────────────────

  // 1. Current Active Release
  const { data: currentRelease, isLoading: isCurrentLoading, refetch: refetchCurrent } = useQuery({
    queryKey: ['releases-current'],
    queryFn: () => releasesApi.getCurrent().then((r) => r.data),
  })

  // 2. Pending Changes & Unreleased Commits
  const { data: pendingChanges, isLoading: isPendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['releases-pending-changes'],
    queryFn: () => releasesApi.getPendingChanges().then((r) => r.data),
  })

  // 3. Release History List
  const { data: historyData, isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['releases-list', statusFilter],
    queryFn: () => releasesApi.list({ status: statusFilter || undefined, limit: 30 }).then((r) => r.data),
  })

  // 4. Inspected Release Details
  const { data: inspectDetails, isLoading: isInspectLoading } = useQuery({
    queryKey: ['releases-detail', selectedReleaseId],
    queryFn: () => (selectedReleaseId ? releasesApi.get(selectedReleaseId).then((r) => r.data) : null),
    enabled: !!selectedReleaseId,
  })

  // 5. Release Audit Logs
  const { data: auditLogs, isLoading: isAuditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['releases-audit', selectedReleaseId],
    queryFn: () => (selectedReleaseId ? releasesApi.getAudit(selectedReleaseId).then((r) => r.data) : []),
    enabled: activeTab === 'audit' && !!selectedReleaseId,
  })

  // ─── Mutations ─────────────────────────────────────────────────────────────

  // Generate Draft
  const generateDraftMutation = useMutation({
    mutationFn: (data: typeof draftForm) => releasesApi.generateDraft(data),
    onSuccess: (res) => {
      toast.success(res.data.message)
      setDraftModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['releases-list'] })
      queryClient.invalidateQueries({ queryKey: ['releases-pending-changes'] })
      setSelectedReleaseId(res.data.release_id)
      setActiveTab('lifecycle')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to generate release draft')
    },
  })

  // Update Notes
  const updateNotesMutation = useMutation({
    mutationFn: (data: { id: number; title: string; markdown: string }) =>
      releasesApi.update(data.id, { title: data.title, release_notes_markdown: data.markdown }),
    onSuccess: (res) => {
      toast.success(res.data.message)
      setEditModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['releases-detail'] })
      queryClient.invalidateQueries({ queryKey: ['releases-list'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update release notes')
    },
  })

  // Run Validations
  const validateMutation = useMutation({
    mutationFn: (id: number) => releasesApi.validate(id),
    onSuccess: (res) => {
      if (res.data.validation_status === 'passed') {
        toast.success(`Pre-flight validations passed for v${res.data.version}!`)
      } else {
        toast.error(`Validations failed for v${res.data.version}. Inspect checks.`)
      }
      queryClient.invalidateQueries({ queryKey: ['releases-detail'] })
      queryClient.invalidateQueries({ queryKey: ['releases-list'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Validation run failed')
    },
  })

  // Promote to Release Candidate
  const promoteRcMutation = useMutation({
    mutationFn: (id: number) => releasesApi.promoteRc(id),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['releases-detail'] })
      queryClient.invalidateQueries({ queryKey: ['releases-list'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to promote to Release Candidate')
    },
  })

  // Approve Release
  const approveMutation = useMutation({
    mutationFn: (id: number) => releasesApi.approve(id),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['releases-detail'] })
      queryClient.invalidateQueries({ queryKey: ['releases-list'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Approval failed')
    },
  })

  // Publish / Deploy Release
  const publishMutation = useMutation({
    mutationFn: (id: number) => releasesApi.publish(id),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['releases-current'] })
      queryClient.invalidateQueries({ queryKey: ['releases-detail'] })
      queryClient.invalidateQueries({ queryKey: ['releases-list'] })
      queryClient.invalidateQueries({ queryKey: ['releases-pending-changes'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Publishing failed')
    },
  })

  // Rollback Release
  const rollbackMutation = useMutation({
    mutationFn: (data: typeof rollbackForm) =>
      releasesApi.rollback(data.releaseId, { reason: data.reason, target_version: data.targetVersion }),
    onSuccess: (res) => {
      toast.success(res.data.message)
      setRollbackModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['releases-current'] })
      queryClient.invalidateQueries({ queryKey: ['releases-detail'] })
      queryClient.invalidateQueries({ queryKey: ['releases-list'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Rollback execution failed')
    },
  })

  // Find candidate active release for the lifecycle view:
  // Prefer the first unreleased item (draft, validating, release_candidate, approved)
  const activeCandidate = historyData?.items?.find((r) =>
    ['draft', 'validating', 'release_candidate', 'approved'].includes(r.status)
  )

  // Ensure selectedReleaseId defaults to active candidate or first history item
  React.useEffect(() => {
    if (!selectedReleaseId) {
      if (activeCandidate) {
        setSelectedReleaseId(activeCandidate.id)
      } else if (historyData?.items?.[0]) {
        setSelectedReleaseId(historyData.items[0].id)
      }
    }
  }, [activeCandidate, historyData, selectedReleaseId])

  // Prepopulate draft form when pending changes load
  React.useEffect(() => {
    if (pendingChanges) {
      setDraftForm((prev) => ({
        ...prev,
        version: pendingChanges.next_version,
        bump_type: pendingChanges.recommended_bump,
        title: `Release v${pendingChanges.next_version} — Platform Operational & Governance Enhancements`,
      }))
    }
  }, [pendingChanges])

  const refreshAll = () => {
    refetchCurrent()
    refetchPending()
    refetchHistory()
    if (selectedReleaseId) queryClient.invalidateQueries({ queryKey: ['releases-detail', selectedReleaseId] })
    toast.success('Release & change metrics refreshed')
  }

  // Helper status badge renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Published / GA
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-blue-200">
            <UserCheck className="w-3.5 h-3.5 text-primary-600" />
            Approved
          </span>
        )
      case 'release_candidate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Tag className="w-3.5 h-3.5 text-purple-600" />
            Release Candidate
          </span>
        )
      case 'validating':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            Validating
          </span>
        )
      case 'rolled_back':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            Rolled Back
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            Draft
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Release Management & Deployment History" isDirty={draftModalOpen || editModalOpen} />

      {/* ─── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-primary-500/20 text-blue-300 border border-blue-400/30 rounded-md text-xs font-mono font-semibold uppercase tracking-wider">
                Enterprise Release Management
              </span>
              <span className="text-slate-400 text-xs select-none">·</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Deployment Ready
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <GitBranch className="w-7 h-7 text-indigo-400" />
              PrathamOne Release & Change Governance
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Automated Git change tracking, pre-flight CI/CD quality gates, semver versioning, and auditable production release approval for {branding.academyName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl px-4 py-2.5 text-right">
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Active Version</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xl font-mono font-bold text-white">
                  v{currentRelease?.version || branding.version}
                </span>
                <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded font-mono">
                  PROD
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[160px]">
                {currentRelease?.build_number || branding.buildNumber}
              </p>
            </div>

            <button
              onClick={refreshAll}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition shadow-sm"
              title="Refresh release metrics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Unreleased Pending Changes Card ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Pending Repository Changes & Release Candidate Pipeline
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Discovered <span className="font-semibold text-slate-800">{pendingChanges?.total_commits ?? 0} unreleased commits</span> and{' '}
              <span className="font-semibold text-slate-800">{pendingChanges?.changed_files_count ?? 0} modified files</span> since v{pendingChanges?.last_published_version || currentRelease?.version}.
            </p>

            {/* Affected System Modules */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-slate-500 font-medium mr-1">Affected Modules:</span>
              {(pendingChanges?.affected_modules || ['core_platform']).map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-mono font-medium"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500">Proposed Version Bump</p>
              <p className="text-sm font-bold text-primary-700 font-mono">
                v{pendingChanges?.next_version || '6.99.2'} ({pendingChanges?.recommended_bump?.toUpperCase() || 'PATCH'})
              </p>
            </div>

            <button
              onClick={() => setDraftModalOpen(true)}
              disabled={!isSysAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Rocket className="w-4 h-4" />
              Generate Release Candidate
            </button>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'lifecycle'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          Active Release & Quality Gates
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'history'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Release History ({historyData?.total ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'current'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Current Release Notes (GA)
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'audit'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          Approval & Audit Stream
        </button>
      </div>

      {/* ─── TAB 1: Active Lifecycle & Quality Gates ────────────────────────── */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-6">
          {inspectDetails ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Release Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold font-mono text-slate-900">
                      v{inspectDetails.version}
                    </span>
                    {renderStatusBadge(inspectDetails.status)}
                    <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      Build: {inspectDetails.build_number}
                    </span>
                    <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded border border-indigo-200 uppercase font-mono">
                      {inspectDetails.environment}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">{inspectDetails.title}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setEditForm({
                        releaseId: inspectDetails.id,
                        title: inspectDetails.title,
                        markdown: inspectDetails.release_notes_markdown,
                      })
                      setEditModalOpen(true)
                    }}
                    disabled={!isSysAdmin || ['approved', 'published', 'rolled_back'].includes(inspectDetails.status)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Notes
                  </button>

                  {/* Pre-Flight Validation Button */}
                  <button
                    onClick={() => validateMutation.mutate(inspectDetails.id)}
                    disabled={validateMutation.isPending || ['approved', 'published', 'rolled_back'].includes(inspectDetails.status)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${validateMutation.isPending ? 'animate-spin' : ''}`} />
                    Run Pre-Flight Validations
                  </button>

                  {/* Promote to RC Button */}
                  {inspectDetails.status === 'draft' && (
                    <button
                      onClick={() => promoteRcMutation.mutate(inspectDetails.id)}
                      disabled={promoteRcMutation.isPending || inspectDetails.validation_status !== 'passed'}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                      title={inspectDetails.validation_status !== 'passed' ? 'Validations must pass first' : 'Promote to Release Candidate'}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Promote to Release Candidate
                    </button>
                  )}

                  {/* Production Approval Button */}
                  {inspectDetails.status === 'release_candidate' && (
                    <button
                      onClick={() => approveMutation.mutate(inspectDetails.id)}
                      disabled={approveMutation.isPending || !isSysAdmin}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Approve Production Release
                    </button>
                  )}

                  {/* Deploy / Publish Button */}
                  {inspectDetails.status === 'approved' && (
                    <button
                      onClick={() => publishMutation.mutate(inspectDetails.id)}
                      disabled={publishMutation.isPending || !isSysAdmin}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      Publish & Deploy Release
                    </button>
                  )}
                </div>
              </div>

              {/* Lifecycle Step Progression */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Release Lifecycle Gateways
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { step: '1. Draft', status: 'draft', active: true },
                    { step: '2. Validating', status: 'validating', active: inspectDetails.validation_status !== 'pending' },
                    { step: '3. Release Candidate', status: 'release_candidate', active: ['release_candidate', 'approved', 'published'].includes(inspectDetails.status) },
                    { step: '4. Approved', status: 'approved', active: ['approved', 'published'].includes(inspectDetails.status) },
                    { step: '5. Published', status: 'published', active: inspectDetails.status === 'published' },
                  ].map((s, idx) => (
                    <div
                      key={s.step}
                      className={`p-3 rounded-lg border text-center text-xs font-semibold transition ${
                        inspectDetails.status === s.status
                          ? 'bg-primary-600 text-white border-primary-600 shadow-md ring-2 ring-blue-300'
                          : s.active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      <p className="text-[11px] font-bold">{s.step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pre-Flight Quality Gates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary-600" />
                    Automated Quality Gates & Pre-Flight Checks
                  </h4>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    inspectDetails.validation_status === 'passed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inspectDetails.validation_status === 'failed'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    Overall: {inspectDetails.validation_status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      name: 'Source Code Attribution & Headers',
                      key: 'header_attribution',
                      defaultMsg: 'All source files satisfy enterprise header attribution.',
                    },
                    {
                      name: 'Secret & Credential Scan',
                      key: 'secret_scan',
                      defaultMsg: 'Zero credentials, API tokens, or secrets found.',
                    },
                    {
                      name: 'Database Schema & Migrations',
                      key: 'database_migrations',
                      defaultMsg: 'Verified Alembic migration revisions. Aligned.',
                    },
                    {
                      name: 'SemVer Manifest Consistency',
                      key: 'semver_format',
                      defaultMsg: `Version ${inspectDetails.version} is valid SemVer.`,
                    },
                    {
                      name: 'Build & Container Readiness',
                      key: 'build_readiness',
                      defaultMsg: `Container config ${inspectDetails.build_number} verified.`,
                    },
                  ].map((gate) => {
                    const checkResult = inspectDetails.validation_results?.[gate.key]
                    const isPassed = checkResult?.status === 'passed'
                    const isFailed = checkResult?.status === 'failed'
                    return (
                      <div
                        key={gate.name}
                        className={`p-3.5 rounded-xl border transition ${
                          isPassed
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : isFailed
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800">{gate.name}</p>
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : isFailed ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 mt-1 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {checkResult?.message || gate.defaultMsg}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Release Notes Preview */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-600" />
                    Generated Release Notes
                  </h4>
                  <button
                    onClick={() => setInspectModalOpen(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    View Complete Document ➔
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs max-h-60 overflow-y-auto custom-scrollbar border border-slate-800">
                  <pre className="whitespace-pre-wrap">{inspectDetails.release_notes_markdown}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">All Releases Published</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                No active release candidates or drafts in progress. The live production release is{' '}
                <span className="font-mono font-bold text-slate-800">v{currentRelease?.version}</span>.
              </p>
              <button
                onClick={() => setDraftModalOpen(true)}
                disabled={!isSysAdmin}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold hover:bg-primary-700 transition"
              >
                <Rocket className="w-4 h-4" />
                Prepare New Release Draft
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: Release History & Deployments ───────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="published">Published / GA</option>
                <option value="approved">Approved</option>
                <option value="release_candidate">Release Candidate</option>
                <option value="draft">Draft</option>
                <option value="rolled_back">Rolled Back</option>
              </select>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Showing {historyData?.items?.length ?? 0} of {historyData?.total ?? 0} release manifests
            </p>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Version & Build</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Environment</th>
                  <th className="py-3 px-4">Published Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyData?.items?.map((rel) => (
                  <tr key={rel.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          v{rel.version}
                        </span>
                        {rel.is_critical_security && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                            SEC
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{rel.build_number}</p>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                      {rel.title}
                    </td>

                    <td className="py-3 px-4">{renderStatusBadge(rel.status)}</td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono uppercase font-semibold">
                        {rel.environment}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {rel.published_at ? new Date(rel.published_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReleaseId(rel.id)
                          setInspectModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>

                      {rel.status === 'published' && isSysAdmin && (
                        <button
                          onClick={() => {
                            setRollbackForm({
                              releaseId: rel.id,
                              version: rel.version,
                              reason: '',
                              targetVersion: '1.0.0',
                            })
                            setRollbackModalOpen(true)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Current Release Notes ──────────────────────────────────── */}
      {activeTab === 'current' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono font-bold text-primary-600 uppercase">
                Active Production Baseline
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                v{currentRelease?.version || branding.version} — Official Release Notes
              </h2>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold">
              Build {currentRelease?.build_number || branding.buildNumber}
            </span>
          </div>

          <div className="prose prose-slate max-w-none text-sm bg-slate-50 p-6 rounded-xl border border-slate-200 font-mono whitespace-pre-wrap">
            {currentRelease?.release_notes_markdown}
          </div>
        </div>
      )}

      {/* ─── TAB 4: Release Audit Log ──────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" />
              Chronological Release Governance Audit Stream
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Release ID #{selectedReleaseId || 1}
            </span>
          </div>

          <div className="space-y-3">
            {auditLogs && auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <span className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    log.severity === 'critical'
                      ? 'bg-rose-100 text-rose-700'
                      : log.severity === 'warning'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-primary-100 text-primary-700'
                  }`}>
                    <Shield className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold font-mono text-slate-900 uppercase">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">{log.details}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Author: <span className="font-semibold text-slate-700">{log.user_name}</span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                Select a release or run lifecycle actions to stream audit records.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: Generate Release Draft ─────────────────────────────────── */}
      {draftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary-600" />
                Generate Release Candidate Draft
              </h3>
              <button
                onClick={() => setDraftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Version (SemVer)</label>
                <input
                  type="text"
                  value={draftForm.version}
                  onChange={(e) => setDraftForm({ ...draftForm, version: e.target.value })}
                  placeholder="e.g. 6.99.2 or 7.0.0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Release Title</label>
                <input
                  type="text"
                  value={draftForm.title}
                  onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bump Recommendation</label>
                  <select
                    value={draftForm.bump_type}
                    onChange={(e) => setDraftForm({ ...draftForm, bump_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  >
                    <option value="patch">Patch (Fixes & Patches)</option>
                    <option value="minor">Minor (Features & Additions)</option>
                    <option value="major">Major (Breaking Architecture)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Environment</label>
                  <select
                    value={draftForm.environment}
                    onChange={(e) => setDraftForm({ ...draftForm, environment: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Database Migration Strategy</label>
                <input
                  type="text"
                  value={draftForm.migration_plan}
                  onChange={(e) => setDraftForm({ ...draftForm, migration_plan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="criticalSec"
                  checked={draftForm.is_critical_security}
                  onChange={(e) => setDraftForm({ ...draftForm, is_critical_security: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="criticalSec" className="text-slate-700 font-medium select-none">
                  Tag as Critical Security / Integrity Update
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDraftModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => generateDraftMutation.mutate(draftForm)}
                disabled={generateDraftMutation.isPending || !draftForm.version}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Generate Draft Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Inspect Release Notes ──────────────────────────────────── */}
      {inspectModalOpen && inspectDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-slate-900">v{inspectDetails.version}</span>
                {renderStatusBadge(inspectDetails.status)}
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">{inspectDetails.title}</p>
                <p className="text-slate-500 font-mono">Build Tag: {inspectDetails.build_number}</p>
                <p className="text-slate-500">
                  Target Environment: <span className="font-semibold text-slate-700">{inspectDetails.environment}</span>
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">Complete Markdown Release Notes</h4>
                <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap">
                  {inspectDetails.release_notes_markdown}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Edit Release Notes ─────────────────────────────────────── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary-600" />
                Review & Edit Release Notes
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1 custom-scrollbar">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Release Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Release Notes Markdown</label>
                <textarea
                  rows={14}
                  value={editForm.markdown}
                  onChange={(e) => setEditForm({ ...editForm, markdown: e.target.value })}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateNotesMutation.mutate({
                    id: editForm.releaseId,
                    title: editForm.title,
                    markdown: editForm.markdown,
                  })
                }
                disabled={updateNotesMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Production Rollback Confirmation ───────────────────────── */}
      {rollbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Authorize Release Rollback</h3>
                <p className="text-xs text-rose-600 font-semibold">Target Version: v{rollbackForm.version}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Rolling back a published production release is an auditable emergency action. Provide a documented justification.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Fallback Version</label>
                <input
                  type="text"
                  value={rollbackForm.targetVersion}
                  onChange={(e) => setRollbackForm({ ...rollbackForm, targetVersion: e.target.value })}
                  placeholder="e.g. 1.0.0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rollback Justification (Min. 10 chars)</label>
                <textarea
                  rows={3}
                  value={rollbackForm.reason}
                  onChange={(e) => setRollbackForm({ ...rollbackForm, reason: e.target.value })}
                  placeholder="Detail the failure reason or emergency rollback requirement..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRollbackModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => rollbackMutation.mutate(rollbackForm)}
                disabled={rollbackMutation.isPending || rollbackForm.reason.length < 10}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
