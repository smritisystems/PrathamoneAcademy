/**
 * @file        Housekeeping.tsx
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
 * @created     2026-11-11
 * @updated     2026-11-11
 *
 * @description Housekeeping Workspace for automated & on-demand PostgreSQL database backup, SHA-256 verification, GFS pruning, sandbox restore drills, guarded production restoration, VACUUM maintenance, SSOT ledger parity, and scheduler policies.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  FileCheck2,
  HardDrive,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { housekeepingApi } from '../api/endpoints'
import { EditModeBar, LockedButton } from '../components/common'
import { useEditModeStore } from '../store/editModeStore'
import { useAuthStore, isUserSysAdmin, hasPermission } from '../store/authStore'
import type {
  HousekeepingBackupItem,
  HousekeepingCreateBackupResponse,
  HousekeepingDrillResponse,
  HousekeepingHistoryEvent,
  HousekeepingOverview,
  HousekeepingPolicy,
  HousekeepingReconciliationResult,
  HousekeepingRestoreResponse,
  HousekeepingVacuumResponse,
  HousekeepingVerifyResponse,
} from '../types'

type HousekeepingTab = 'overview' | 'backups' | 'restore' | 'maintenance' | 'schedules'

const TAB_CONFIG: Array<{
  id: HousekeepingTab
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: 'overview', label: 'Overview & Health', path: '/housekeeping', icon: Activity },
  { id: 'backups', label: 'Database Backups', path: '/housekeeping/backups', icon: Database },
  { id: 'restore', label: 'Restore & Drill', path: '/housekeeping/restore', icon: RotateCcw },
  { id: 'maintenance', label: 'Maintenance & Integrity', path: '/housekeeping/maintenance', icon: Wrench },
  { id: 'schedules', label: 'Schedules & CLI', path: '/housekeeping/schedules', icon: Calendar },
]

const RESTORE_CONFIRMATION_PHRASE = 'RESTORE PRASHANT_ACADEMY'

function resolveTab(routeTab?: string, queryTab?: string | null): HousekeepingTab {
  const candidate = (routeTab || queryTab || 'overview').toLowerCase()
  if (candidate === 'backups') return 'backups'
  if (candidate === 'restore') return 'restore'
  if (candidate === 'maintenance') return 'maintenance'
  if (candidate === 'schedules') return 'schedules'
  return 'overview'
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function getApiError(err: any, fallback: string): string {
  return err?.response?.data?.detail || err?.message || fallback
}

export default function Housekeeping() {
  const { tab: routeTab } = useParams<{ tab?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const activeTab = useMemo(
    () => resolveTab(routeTab, searchParams.get('tab')),
    [routeTab, searchParams]
  )

  const { user } = useAuthStore()
  const isEditMode = useEditModeStore((s) => !!s.scopes['system:housekeeping'])
  const isHousekeepingRole = ['superadmin', 'super_admin', 'sysadmin', 'admin'].includes(
    (user?.role || '').toLowerCase()
  )
  const canManage = isHousekeepingRole || isUserSysAdmin(user) || hasPermission(user, 'system:housekeeping')

  // Core state
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<HousekeepingOverview | null>(null)
  const [backups, setBackups] = useState<HousekeepingBackupItem[]>([])
  const [history, setHistory] = useState<HousekeepingHistoryEvent[]>([])

  // Create Backup form state
  const [backupLabel, setBackupLabel] = useState('manual')
  const [backupFormat, setBackupFormat] = useState<'custom' | 'plain_sql'>('custom')
  const [backupNotes, setBackupNotes] = useState('')
  const [mirrorDirOverride, setMirrorDirOverride] = useState('')
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [lastCreatedBackup, setLastCreatedBackup] = useState<HousekeepingCreateBackupResponse | null>(null)
  const [lastVerification, setLastVerification] = useState<HousekeepingVerifyResponse | null>(null)

  // Upload & Prune state
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pruning, setPruning] = useState(false)
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null)

  // Restore & Drill state
  const [selectedArchiveKey, setSelectedArchiveKey] = useState<string>('')
  const [runningDrill, setRunningDrill] = useState(false)
  const [drillResult, setDrillResult] = useState<HousekeepingDrillResponse | null>(null)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [restoreReason, setRestoreReason] = useState('')
  const [executingRestore, setExecutingRestore] = useState(false)
  const [restoreResult, setRestoreResult] = useState<HousekeepingRestoreResponse | null>(null)

  // Maintenance & Reconciliation state
  const [selectedVacuumTable, setSelectedVacuumTable] = useState<string>('')
  const [runningVacuum, setRunningVacuum] = useState(false)
  const [vacuumResult, setVacuumResult] = useState<HousekeepingVacuumResponse | null>(null)
  const [runningReconcile, setRunningReconcile] = useState(false)
  const [reconcileResult, setReconcileResult] = useState<HousekeepingReconciliationResult | null>(null)

  // Policy / Schedule state
  const [policyForm, setPolicyForm] = useState<HousekeepingPolicy>({
    backup_frequency: 'daily',
    backup_time: '02:00',
    backup_format: 'custom',
    backup_destination: 'Local & Mirror',
    offsite_mirror_path: '',
    retain_daily: 7,
    retain_weekly: 4,
    retain_monthly: 6,
    auto_vacuum_enabled: true,
    log_retention_days: 90,
  })
  const [policyReason, setPolicyReason] = useState('')
  const [savingPolicy, setSavingPolicy] = useState(false)

  const loadWorkspaceData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [ovRes, bkRes, histRes] = await Promise.all([
        housekeepingApi.getOverview(),
        housekeepingApi.listBackups(),
        housekeepingApi.getHistory(40),
      ])
      setOverview(ovRes.data)
      const list = bkRes.data.backups || []
      setBackups(list)
      setHistory(histRes.data.events || [])
      if (ovRes.data.policy) {
        setPolicyForm((prev) => ({ ...prev, ...ovRes.data.policy }))
        setMirrorDirOverride((curr) => curr || ovRes.data.policy.offsite_mirror_path || '')
      }
      setSelectedArchiveKey((curr) => {
        if (curr && list.some((b) => `${b.source}::${b.filename}` === curr)) return curr
        return list.length > 0 ? `${list[0].source}::${list[0].filename}` : ''
      })
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to load Housekeeping telemetry'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkspaceData()
  }, [loadWorkspaceData])

  const selectedArchive = useMemo(() => {
    if (!selectedArchiveKey) return backups[0] || null
    const [src, fname] = selectedArchiveKey.split('::')
    return backups.find((b) => b.source === src && b.filename === fname) || backups[0] || null
  }, [backups, selectedArchiveKey])

  const handleTabChange = (tabId: HousekeepingTab) => {
    const target = TAB_CONFIG.find((t) => t.id === tabId)
    if (target) navigate(target.path)
  }

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard`)
    } catch {
      toast.error('Clipboard copy unavailable in this browser context')
    }
  }

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode || !canManage) return
    setCreatingBackup(true)
    try {
      const res = await housekeepingApi.createBackup({
        label: backupLabel.trim() || 'manual',
        backup_format: backupFormat,
        notes: backupNotes.trim() || undefined,
        mirror_dir: mirrorDirOverride.trim() || undefined,
      })
      setLastCreatedBackup(res.data)
      setBackupNotes('')
      toast.success(`Backup created & verified: ${res.data.filename}`)
      await loadWorkspaceData(true)
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to create database backup'))
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleVerifyBackup = async (item: HousekeepingBackupItem) => {
    if (!isEditMode || !canManage) return
    const key = `${item.source}::${item.filename}`
    setVerifyingKey(key)
    try {
      const res = await housekeepingApi.verifyBackup(item.filename, item.source)
      setLastVerification(res.data)
      if (res.data.verified) {
        toast.success(`Verified ${item.filename}: ${res.data.detail}`)
      } else {
        toast.error(`Verification warning on ${item.filename}: ${res.data.detail}`)
      }
      await loadWorkspaceData(true)
    } catch (err: any) {
      toast.error(getApiError(err, 'Backup verification failed'))
    } finally {
      setVerifyingKey(null)
    }
  }

  const handleDownloadBackup = async (item: HousekeepingBackupItem) => {
    try {
      const res = await housekeepingApi.downloadBackup(item.filename, item.source)
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Downloading ${item.filename}`)
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to download backup archive'))
    }
  }

  const handleUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await housekeepingApi.uploadBackup(file)
      setLastVerification(res.data)
      toast.success(`Uploaded & verified archive: ${res.data.filename}`)
      await loadWorkspaceData(true)
    } catch (err: any) {
      toast.error(getApiError(err, 'Backup archive upload failed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePruneBackups = async () => {
    if (!isEditMode || !canManage) return
    setPruning(true)
    try {
      const res = await housekeepingApi.pruneBackups({
        retain_daily: Number(policyForm.retain_daily) || 7,
        retain_weekly: Number(policyForm.retain_weekly) || 4,
        retain_monthly: Number(policyForm.retain_monthly) || 6,
      })
      if (res.data.deleted.length === 0) {
        toast.success(`GFS check complete: all ${res.data.kept_count} backup(s) retained within policy`)
      } else {
        toast.success(`Pruned ${res.data.deleted.length} expired archive(s), kept ${res.data.kept_count}`)
      }
      await loadWorkspaceData(true)
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to prune expired backups'))
    } finally {
      setPruning(false)
    }
  }

  const handleRunRestoreDrill = async () => {
    if (!isEditMode || !canManage || !selectedArchive) return
    setRunningDrill(true)
    try {
      const res = await housekeepingApi.runRestoreDrill({
        filename: selectedArchive.filename,
        source: selectedArchive.source,
      })
      setDrillResult(res.data)
      toast.success(`Sandbox drill passed on ${res.data.sandbox_db} (${res.data.tables_restored} tables verified)`)
      await loadWorkspaceData(true)
    } catch (err: any) {
      toast.error(getApiError(err, 'Sandbox restore drill failed'))
    } finally {
      setRunningDrill(false)
    }
  }

  const handleExecuteLiveRestore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode || !canManage || !selectedArchive) return
    if (confirmPhrase.trim() !== RESTORE_CONFIRMATION_PHRASE) {
      toast.error(`Type exact confirmation phrase: ${RESTORE_CONFIRMATION_PHRASE}`)
      return
    }
    if (restoreReason.trim().length < 10) {
      toast.error('Provide an audit reason of at least 10 characters')
      return
    }
    setExecutingRestore(true)
    try {
      const res = await housekeepingApi.executeLiveRestore({
        filename: selectedArchive.filename,
        source: selectedArchive.source,
        confirmation_phrase: confirmPhrase.trim(),
        reason: restoreReason.trim(),
      })
      setRestoreResult(res.data)
      setRestoreModalOpen(false)
      setConfirmPhrase('')
      setRestoreReason('')
      toast.success(`Database restored cleanly. Safety snapshot: ${res.data.safety_snapshot}`)
      await loadWorkspaceData(true)
    } catch (err: any) {
      toast.error(getApiError(err, 'Live database restoration failed'))
    } finally {
      setExecutingRestore(false)
    }
  }

  const handleRunVacuum = async () => {
    if (!isEditMode || !canManage) return
    setRunningVacuum(true)
    try {
      const tables = selectedVacuumTable ? [selectedVacuumTable] : undefined
      const res = await housekeepingApi.runVacuum(tables)
      setVacuumResult(res.data)
      toast.success(`Completed ${res.data.command}`)
      await loadWorkspaceData(true)
    } catch (err: any) {
      toast.error(getApiError(err, 'VACUUM ANALYZE failed'))
    } finally {
      setRunningVacuum(false)
    }
  }

  const handleRunReconcile = async () => {
    setRunningReconcile(true)
    try {
      const res = await housekeepingApi.runReconcile({ is_demo: false })
      setReconcileResult(res.data)
      if (res.data.is_reconciled) {
        toast.success('SSOT Financial Ledger Parity: PASS (₹0.00 variance)')
      } else {
        toast.error(`Ledger discrepancy detected: variance ${res.data.ledger_audit.variance}`)
      }
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to run financial ledger reconciliation'))
    } finally {
      setRunningReconcile(false)
    }
  }

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode || !canManage) return
    setSavingPolicy(true)
    try {
      const updated = await housekeepingApi.updatePolicy({
        backup_frequency: policyForm.backup_frequency,
        backup_time: policyForm.backup_time,
        backup_format: policyForm.backup_format,
        backup_destination: policyForm.backup_destination,
        offsite_mirror_path: policyForm.offsite_mirror_path,
        retain_daily: Number(policyForm.retain_daily),
        retain_weekly: Number(policyForm.retain_weekly),
        retain_monthly: Number(policyForm.retain_monthly),
        auto_vacuum_enabled: policyForm.auto_vacuum_enabled,
        log_retention_days: Number(policyForm.log_retention_days),
        reason: policyReason.trim() || 'Updated from Housekeeping Policy Workspace',
      })
      setPolicyForm((prev) => ({ ...prev, ...updated.data }))
      setPolicyReason('')
      toast.success('Housekeeping retention & schedule policy saved')
      await loadWorkspaceData(true)
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to save housekeeping policy'))
    } finally {
      setSavingPolicy(false)
    }
  }

  if (!canManage) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <Lock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-amber-900">Housekeeping Access Restricted</h2>
            <p className="text-sm text-amber-800 mt-1">
              Database backup, restore drills, and system maintenance require Admin/SysAdmin privileges or the{' '}
              <code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">system:housekeeping</code>{' '}
              permission.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">Housekeeping & Database Governance</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                PostgreSQL 16
              </span>
              {overview && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    overview.backups_summary.backup_status === 'Verified Healthy'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {overview.backups_summary.backup_status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage compressed PostgreSQL backups, SHA-256 verification, GFS retention pruning, non-destructive sandbox
              drills, guarded restoration, and ledger parity audits.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadWorkspaceData()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors self-start lg:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Rule 010 Global View-First EditModeBar */}
      <EditModeBar
        scope="system:housekeeping"
        title="Housekeeping & Database Operations"
        requiredPermission={isHousekeepingRole ? undefined : 'system:housekeeping'}
      />

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-2xs flex flex-wrap gap-1">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {loading && !overview ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-500">
          Loading PostgreSQL telemetry and backup catalog...
        </div>
      ) : null}

      {/* ─── TAB 1: OVERVIEW & HEALTH ───────────────────────────────────────── */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Live Database Footprint</span>
                <Server className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{overview.database.size_pretty}</div>
              <div className="mt-1 text-[11px] text-slate-500 font-mono">
                {overview.database.name} @ {overview.database.host}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Verified Backup Archives</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {overview.backups_summary.verified_count} / {overview.backups_summary.total_count}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Total Archive Storage: {overview.backups_summary.total_size_human}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Connections & Tuple Bloat</span>
                <Activity className="w-4 h-4 text-sky-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {overview.database.active_connections} / {overview.database.total_connections}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Dead tuples (Top 15 tables): {overview.database.dead_tuples_top15.toLocaleString()}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Active GFS Schedule</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 capitalize">
                {overview.policy.backup_frequency} @ {overview.policy.backup_time}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Retention: {overview.policy.retain_daily}D / {overview.policy.retain_weekly}W /{' '}
                {overview.policy.retain_monthly}M
              </div>
            </div>
          </div>

          {/* Latest Backup Health Strip */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latest Recorded Snapshot</div>
              <div className="text-sm font-bold text-slate-900 font-mono">
                {overview.backups_summary.last_backup_file || 'No snapshot taken yet'}
              </div>
              <div className="text-xs text-slate-500">
                Captured: {formatDateTime(overview.backups_summary.last_backup_date)} · Last VACUUM:{' '}
                {formatDateTime(overview.policy.last_vacuum_at)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleTabChange('backups')}
                className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Manage Backups</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('restore')}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sandbox Restore Drill</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('maintenance')}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ledger & VACUUM</span>
              </button>
            </div>
          </div>

          {/* Top 15 Tables Telemetry */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Top 15 Database Relations by Storage Footprint</h2>
              <span className="text-[11px] text-slate-500">Live PostgreSQL pg_stat_user_tables</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="px-4 py-2.5">Table Name</th>
                    <th className="px-4 py-2.5 text-right">Size</th>
                    <th className="px-4 py-2.5 text-right">Live Rows</th>
                    <th className="px-4 py-2.5 text-right">Dead Tuples</th>
                    <th className="px-4 py-2.5">Last Vacuum</th>
                    <th className="px-4 py-2.5">Last Analyze</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.top_tables.map((t) => (
                    <tr key={t.table_name} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono font-semibold text-slate-800">{t.table_name}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-700">{t.size_pretty}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-700">{t.live_rows.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        <span className={t.dead_tuples > 500 ? 'text-amber-700 font-semibold' : 'text-slate-600'}>
                          {t.dead_tuples.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{formatDateTime(t.last_vacuum)}</td>
                      <td className="px-4 py-2 text-slate-500">{formatDateTime(t.last_analyze)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: DATABASE BACKUPS ────────────────────────────────────────── */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Create Backup Form */}
            <form
              onSubmit={handleCreateBackup}
              className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary-600" />
                    <span>Create On-Demand Verified Backup</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Runs PostgreSQL <code className="font-mono">pg_dump</code>, writes SHA-256 checksum & metadata, and
                    verifies TOC integrity immediately.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Snapshot Label</label>
                  <input
                    type="text"
                    value={backupLabel}
                    onChange={(e) => setBackupLabel(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="e.g. manual, pre_upgrade"
                    maxLength={40}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Archive Format</label>
                  <select
                    value={backupFormat}
                    onChange={(e) => setBackupFormat(e.target.value as 'custom' | 'plain_sql')}
                    disabled={!isEditMode}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="custom">Compressed PostgreSQL Custom (.dump · -Fc -Z 6)</option>
                    <option value="plain_sql">Portable Plain SQL (.sql · -Fp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional Offsite / Mirror Path
                  </label>
                  <input
                    type="text"
                    value={mirrorDirOverride}
                    onChange={(e) => setMirrorDirOverride(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="Optional container/mounted mirror path"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Operator Notes</label>
                  <input
                    type="text"
                    value={backupNotes}
                    onChange={(e) => setBackupNotes(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="Reason or milestone tag"
                    maxLength={250}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-500">
                  Saved to <code className="font-mono">backups/</code> alongside <code className="font-mono">.sha256</code>{' '}
                  & <code className="font-mono">.meta.json</code>.
                </span>
                <LockedButton
                  isEditMode={isEditMode}
                  isAuthorized={canManage}
                  disabled={creatingBackup}
                  type="submit"
                  onClick={() => undefined}
                  icon={Database}
                  variant="primary"
                  size="sm"
                >
                  {creatingBackup ? 'Creating & Verifying...' : 'Create Verified Backup'}
                </LockedButton>
              </div>
            </form>

            {/* Upload & GFS Prune Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Import & Retention Control</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Upload an external <code className="font-mono">.dump</code> or <code className="font-mono">.sql</code>{' '}
                  archive (auto-verified before acceptance), or run GFS retention pruning.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".dump,.sql"
                  onChange={handleUploadFileChange}
                  className="hidden"
                />
                <LockedButton
                  isEditMode={isEditMode}
                  isAuthorized={canManage}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  icon={Upload}
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center"
                >
                  {uploading ? 'Validating Upload...' : 'Upload .dump / .sql Backup'}
                </LockedButton>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  GFS Policy: {policyForm.retain_daily} Daily · {policyForm.retain_weekly} Weekly ·{' '}
                  {policyForm.retain_monthly} Monthly
                </div>
                <p className="text-[11px] text-slate-500">
                  Newest archive, legacy snapshots, and 48h pre-restore safety snapshots are always preserved.
                </p>
                <LockedButton
                  isEditMode={isEditMode}
                  isAuthorized={canManage}
                  disabled={pruning}
                  onClick={handlePruneBackups}
                  icon={Trash2}
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                >
                  {pruning ? 'Pruning Expired...' : 'Prune Expired Backups'}
                </LockedButton>
              </div>
            </div>
          </div>

          {lastCreatedBackup && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Created <strong className="font-mono">{lastCreatedBackup.filename}</strong> (
                  {(lastCreatedBackup.size_bytes / 1024).toFixed(1)} KB, {lastCreatedBackup.toc_entries} TOC entries, SHA-256{' '}
                  <code className="font-mono">{lastCreatedBackup.sha256.slice(0, 16)}...</code>)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLastCreatedBackup(null)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {lastVerification && (
            <div
              className={`border rounded-2xl p-4 text-xs flex flex-wrap items-center justify-between gap-3 ${
                lastVerification.verified
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>
                  Verification of <strong className="font-mono">{lastVerification.filename}</strong>:{' '}
                  {lastVerification.detail} (Checksum match: {lastVerification.checksum_match ? 'YES' : 'NO'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLastVerification(null)}
                className="font-semibold underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Backups Catalog Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Available Backup Archives ({backups.length})</h2>
              <span className="text-[11px] text-slate-500">Includes managed backups/ and legacy data/backups/</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="px-4 py-2.5">Archive Filename</th>
                    <th className="px-4 py-2.5">Source / Format</th>
                    <th className="px-4 py-2.5 text-right">Size</th>
                    <th className="px-4 py-2.5">Created</th>
                    <th className="px-4 py-2.5">SHA-256 & Verification</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No backup archives found yet. Switch on Edit Mode above and create your first verified backup.
                      </td>
                    </tr>
                  ) : (
                    backups.map((b) => {
                      const key = `${b.source}::${b.filename}`
                      const isVerifying = verifyingKey === key
                      return (
                        <tr key={key} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <div className="font-mono font-semibold text-slate-900">{b.filename}</div>
                            <div className="text-[11px] text-slate-500">
                              Label: <span className="font-medium text-slate-700">{b.label}</span>
                              {b.notes ? ` · ${b.notes}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 space-y-1">
                            <div>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  b.source === 'backups'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {b.source === 'backups' ? 'Managed backups/' : 'Legacy data/backups/'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {b.format === 'custom_dump' ? 'PostgreSQL Custom (-Fc)' : 'Plain SQL (-Fp)'}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-700">{b.size_human}</td>
                          <td className="px-4 py-2.5">
                            <div className="text-slate-800">{formatDateTime(b.created_at)}</div>
                            <div className="text-[11px] text-slate-500">by {b.created_by}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {b.verified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  Unverified
                                </span>
                              )}
                            </div>
                            {b.sha256 ? (
                              <button
                                type="button"
                                onClick={() => copyText(b.sha256!, 'SHA-256')}
                                className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 hover:text-slate-800"
                                title="Copy full SHA-256 digest"
                              >
                                <span>{b.sha256.slice(0, 14)}...</span>
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <div className="mt-1 text-[10px] text-slate-400">No digest yet</div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <LockedButton
                                isEditMode={isEditMode}
                                isAuthorized={canManage}
                                disabled={isVerifying}
                                onClick={() => handleVerifyBackup(b)}
                                icon={ShieldCheck}
                                variant="secondary"
                                size="xs"
                              >
                                {isVerifying ? 'Checking...' : 'Verify'}
                              </LockedButton>
                              <button
                                type="button"
                                onClick={() => handleDownloadBackup(b)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedArchiveKey(key)
                                  handleTabChange('restore')
                                }}
                                className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Drill / Restore</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: RESTORE & SANDBOX DRILL ─────────────────────────────────── */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          {/* Archive Selection Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Select Target Archive for Drill or Restoration
            </label>
            <select
              value={selectedArchiveKey}
              onChange={(e) => setSelectedArchiveKey(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {backups.length === 0 && <option value="">No backups available</option>}
              {backups.map((b) => {
                const k = `${b.source}::${b.filename}`
                return (
                  <option key={k} value={k}>
                    [{b.source}] {b.filename} ({b.size_human}) {b.verified ? '✓ Verified' : '· Unverified'}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Step 1: Non-Destructive Sandbox Restore Drill */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SAFE · NON-DESTRUCTIVE</span>
                </div>
                <h2 className="text-base font-bold text-slate-900">1. Sandbox Restore Verification Drill</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Restores the selected archive into an isolated sandbox database (
                  <code className="font-mono">prashant_academy_test</code>), runs{' '}
                  <code className="font-mono">alembic upgrade head</code>, verifies table & student counts, and runs the
                  SSOT financial ledger reconciliation audit — without modifying production data.
                </p>
              </div>

              {drillResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1 text-emerald-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Drill Passed on {drillResult.sandbox_db}</span>
                  </div>
                  <div>
                    Restored Tables: <strong>{drillResult.tables_restored}</strong> · Students:{' '}
                    <strong>{drillResult.students_restored}</strong>
                  </div>
                  <div>
                    Ledger Reconciled: <strong>{drillResult.is_reconciled ? 'PASS' : 'CHECK'}</strong> (Variance:{' '}
                    {drillResult.variance})
                  </div>
                  <div className="text-[11px] text-emerald-700">Verified: {formatDateTime(drillResult.verified_at)}</div>
                </div>
              )}

              <LockedButton
                isEditMode={isEditMode}
                isAuthorized={canManage}
                disabled={runningDrill || !selectedArchive}
                onClick={handleRunRestoreDrill}
                icon={Play}
                variant="primary"
                size="sm"
              >
                {runningDrill ? 'Running Sandbox Drill...' : 'Run Non-Destructive Sandbox Drill'}
              </LockedButton>
            </div>

            {/* Step 2: Guarded Live Restore */}
            <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>DESTRUCTIVE · GUARDED PRODUCTION OVERWRITE</span>
                </div>
                <h2 className="text-base font-bold text-slate-900">2. Guarded Production Database Restore</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Replaces the active live PostgreSQL database with the selected archive. Before restoring, PrathamOne{' '}
                  <strong>automatically captures a compressed pre-restore safety snapshot</strong>, runs schema
                  migrations (<code className="font-mono">alembic upgrade head</code>), logs a security{' '}
                  <code className="font-mono">AuditLog</code>, and runs financial reconciliation.
                </p>
              </div>

              {restoreResult && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs space-y-1 text-indigo-900">
                  <div className="font-bold">Live Database Restored Successfully</div>
                  <div>
                    From: <code className="font-mono">{restoreResult.restored_from}</code> ({restoreResult.source})
                  </div>
                  <div>
                    Pre-Restore Safety Snapshot: <code className="font-mono">{restoreResult.safety_snapshot}</code>
                  </div>
                  <div>
                    Reconciled: <strong>{restoreResult.is_reconciled ? 'PASS' : 'CHECK'}</strong> (Variance:{' '}
                    {restoreResult.variance}, Broken Invoices: {restoreResult.broken_invoices})
                  </div>
                </div>
              )}

              <LockedButton
                isEditMode={isEditMode}
                isAuthorized={canManage}
                disabled={!selectedArchive}
                onClick={() => setRestoreModalOpen(true)}
                icon={RotateCcw}
                variant="danger"
                size="sm"
              >
                Execute Guarded Live Restore...
              </LockedButton>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: MAINTENANCE & INTEGRITY ─────────────────────────────────── */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* PostgreSQL VACUUM ANALYZE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>PostgreSQL VACUUM (ANALYZE)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Reclaims dead tuple space and updates planner statistics cleanly without locking application reads.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Scope</label>
                <select
                  value={selectedVacuumTable}
                  onChange={(e) => setSelectedVacuumTable(e.target.value)}
                  disabled={!isEditMode}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                >
                  <option value="">All Database Tables (Full VACUUM ANALYZE)</option>
                  {overview?.top_tables.map((t) => (
                    <option key={t.table_name} value={t.table_name}>
                      {t.table_name} ({t.dead_tuples} dead tuples · {t.size_pretty})
                    </option>
                  ))}
                </select>
              </div>

              {vacuumResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                  Executed <code className="font-mono font-bold">{vacuumResult.command}</code> at{' '}
                  {formatDateTime(vacuumResult.executed_at)}.
                </div>
              )}

              <LockedButton
                isEditMode={isEditMode}
                isAuthorized={canManage}
                disabled={runningVacuum}
                onClick={handleRunVacuum}
                icon={Wrench}
                variant="secondary"
                size="sm"
              >
                {runningVacuum ? 'Running VACUUM (ANALYZE)...' : 'Run VACUUM (ANALYZE)'}
              </LockedButton>
            </div>

            {/* SSOT Financial Ledger Parity Check */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>SSOT Financial Ledger Parity Check</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Executes <code className="font-mono">FinancialGovernanceService.reconcile_financial_ledgers</code>{' '}
                    against live tables to confirm zero discrepancy across fee assessments, concessions, payments &
                    invoices.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunReconcile}
                disabled={runningReconcile}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningReconcile ? 'animate-spin' : ''}`} />
                <span>{runningReconcile ? 'Auditing Ledgers...' : 'Run Ledger Parity Audit'}</span>
              </button>

              {reconcileResult && (
                <div
                  className={`rounded-xl border p-4 text-xs space-y-2 ${
                    reconcileResult.is_reconciled
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Parity Status: {reconcileResult.is_reconciled ? 'PASS — ZERO VARIANCE' : 'DISCREPANCY DETECTED'}</span>
                    <span className="font-mono">Variance: {reconcileResult.ledger_audit.variance}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div>
                      <div className="text-[10px] opacity-75">Gross Assessed</div>
                      <div className="font-mono font-bold">
                        {reconcileResult.currency.symbol}
                        {reconcileResult.ledger_audit.gross_assessed.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] opacity-75">Net Invoiced</div>
                      <div className="font-mono font-bold">
                        {reconcileResult.currency.symbol}
                        {reconcileResult.ledger_audit.net_invoiced.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] opacity-75">Total Collected</div>
                      <div className="font-mono font-bold">
                        {reconcileResult.currency.symbol}
                        {reconcileResult.ledger_audit.total_collected.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] opacity-75">Outstanding</div>
                      <div className="font-mono font-bold">
                        {reconcileResult.currency.symbol}
                        {reconcileResult.ledger_audit.total_outstanding.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] opacity-85">
                    Broken Invoices: {reconcileResult.broken_invoices.length} · Payment/Invoice Variance:{' '}
                    {reconcileResult.ledger_audit.payment_vs_invoice_variance}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Housekeeping Operation History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Housekeeping Operations & Audit Log</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Actor</th>
                    <th className="px-4 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No housekeeping operations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((ev, idx) => (
                      <tr key={`${ev.timestamp}-${idx}`} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-slate-500">{formatDateTime(ev.timestamp)}</td>
                        <td className="px-4 py-2 font-mono font-semibold text-slate-900">{ev.action}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              ev.status === 'success'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-700">{ev.actor || 'system'}</td>
                        <td className="px-4 py-2 text-slate-600 font-mono text-[11px]">
                          {ev.details || ev.filename || ev.reason || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: SCHEDULES & CLI AUTOMATION ──────────────────────────────── */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSavePolicy}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-600" />
                <span>Automated Backup Schedule & GFS Retention Policy</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Persisted in <code className="font-mono">InstitutionSetting</code> (category{' '}
                <code className="font-mono">housekeeping</code>) with full <code className="font-mono">SettingAuditLog</code>{' '}
                traceability.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Backup Frequency</label>
                <select
                  value={policyForm.backup_frequency}
                  onChange={(e) => setPolicyForm({ ...policyForm, backup_frequency: e.target.value })}
                  disabled={!isEditMode}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Time (24h)</label>
                <input
                  type="text"
                  value={policyForm.backup_time}
                  onChange={(e) => setPolicyForm({ ...policyForm, backup_time: e.target.value })}
                  disabled={!isEditMode}
                  placeholder="02:00"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Format</label>
                <select
                  value={policyForm.backup_format}
                  onChange={(e) => setPolicyForm({ ...policyForm, backup_format: e.target.value })}
                  disabled={!isEditMode}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                >
                  <option value="custom">Custom Compressed (.dump)</option>
                  <option value="plain_sql">Plain SQL (.sql)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Retain Daily (count)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={policyForm.retain_daily}
                  onChange={(e) => setPolicyForm({ ...policyForm, retain_daily: Number(e.target.value) })}
                  disabled={!isEditMode}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Retain Weekly (count)</label>
                <input
                  type="number"
                  min={0}
                  max={52}
                  value={policyForm.retain_weekly}
                  onChange={(e) => setPolicyForm({ ...policyForm, retain_weekly: Number(e.target.value) })}
                  disabled={!isEditMode}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Retain Monthly (count)</label>
                <input
                  type="number"
                  min={0}
                  max={36}
                  value={policyForm.retain_monthly}
                  onChange={(e) => setPolicyForm({ ...policyForm, retain_monthly: Number(e.target.value) })}
                  disabled={!isEditMode}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Label</label>
                <input
                  type="text"
                  value={policyForm.backup_destination}
                  onChange={(e) => setPolicyForm({ ...policyForm, backup_destination: e.target.value })}
                  disabled={!isEditMode}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Offsite / NAS Mirror Path</label>
                <input
                  type="text"
                  value={policyForm.offsite_mirror_path}
                  onChange={(e) => setPolicyForm({ ...policyForm, offsite_mirror_path: e.target.value })}
                  disabled={!isEditMode}
                  placeholder="Optional offsite directory path"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Log Retention (days)</label>
                <input
                  type="number"
                  min={7}
                  max={3650}
                  value={policyForm.log_retention_days}
                  onChange={(e) => setPolicyForm({ ...policyForm, log_retention_days: Number(e.target.value) })}
                  disabled={!isEditMode}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={policyForm.auto_vacuum_enabled}
                  onChange={(e) => setPolicyForm({ ...policyForm, auto_vacuum_enabled: e.target.checked })}
                  disabled={!isEditMode}
                  className="rounded border-slate-300 text-primary-600"
                />
                <span>Enable scheduled VACUUM ANALYZE recommendation tracking</span>
              </label>

              <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
                <input
                  type="text"
                  value={policyReason}
                  onChange={(e) => setPolicyReason(e.target.value)}
                  disabled={!isEditMode}
                  placeholder="Optional change audit note"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white disabled:bg-slate-50"
                />
                <LockedButton
                  isEditMode={isEditMode}
                  isAuthorized={canManage}
                  disabled={savingPolicy}
                  type="submit"
                  onClick={() => undefined}
                  icon={Save}
                  variant="primary"
                  size="sm"
                >
                  {savingPolicy ? 'Saving...' : 'Save Policy'}
                </LockedButton>
              </div>
            </div>
          </form>

          {/* OS Scheduler & CLI Commands */}
          {overview && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Automated CLI & OS Task Scheduler Commands</span>
              </div>
              <p className="text-xs text-slate-300">
                Both the UI and CLI share the exact <code className="text-emerald-300">backups/</code> catalog and{' '}
                <code className="text-emerald-300">.sha256</code> verification format via{' '}
                <code className="text-emerald-300">scripts/db_backup.py</code>.
              </p>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="font-semibold">Windows Task Scheduler (Run in Elevated PowerShell)</span>
                    <button
                      type="button"
                      onClick={() => copyText(overview.scheduler_commands.windows_task_scheduler, 'Windows command')}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <code className="block font-mono text-emerald-300 break-all">
                    {overview.scheduler_commands.windows_task_scheduler}
                  </code>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="font-semibold">Linux / Server Crontab</span>
                    <button
                      type="button"
                      onClick={() => copyText(overview.scheduler_commands.linux_cron, 'Cron expression')}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <code className="block font-mono text-sky-300 break-all">
                    {overview.scheduler_commands.linux_cron}
                  </code>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-400 font-semibold mb-1.5">Common Host CLI Operations</div>
                  <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                    {`python scripts/db_backup.py backup --label nightly --prune\npython scripts/db_backup.py verify --file <archive.dump>\npython scripts/db_backup.py drill --file <archive.dump>\npython scripts/db_backup.py restore --file <archive.dump> --yes`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── GUARDED LIVE RESTORE CONFIRMATION MODAL ─────────────────────────── */}
      {restoreModalOpen && selectedArchive && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Guarded Database Restore"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-rose-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="text-base font-bold">Confirm Guarded Live Database Restore</h3>
                  <p className="text-xs text-slate-500">
                    Automatic pre-restore safety snapshot will be created before overwriting production data.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <div>
                Selected Archive: <strong className="font-mono">{selectedArchive.filename}</strong>
              </div>
              <div>
                Source: <code className="font-mono">{selectedArchive.source}</code> · Format:{' '}
                <code className="font-mono">{selectedArchive.format}</code>
              </div>
            </div>

            <form onSubmit={handleExecuteLiveRestore} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type exact confirmation phrase: <code className="text-rose-700">{RESTORE_CONFIRMATION_PHRASE}</code>
                </label>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder={RESTORE_CONFIRMATION_PHRASE}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Reason (min 10 characters)
                </label>
                <textarea
                  rows={2}
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  placeholder="Describe why live restoration is being executed..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    executingRestore ||
                    confirmPhrase.trim() !== RESTORE_CONFIRMATION_PHRASE ||
                    restoreReason.trim().length < 10
                  }
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{executingRestore ? 'Restoring Live DB...' : 'Confirm & Restore Production DB'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
