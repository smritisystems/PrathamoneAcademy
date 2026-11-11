/**
 * @file        SystemInfoSection.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      src.components.help
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-11
 * @updated     2026-11-12
 *
 * @description Source component for Systeminfosection in the src.components.help module.
 */

// /**
//  * @file        SystemInfoSection.tsx
//  * @project     PrathamOne EduOS Coaching Institute Management System
//  * @module      frontend.src.components.help
//  *
//  * @author      Jawahar R. Mallah
//  * @organization AITDL (AI Technology & Development Lab)
//  * @client      Prashant Academy Coaching Institute
//  * @copyright   Copyright (c) 2026 AITDL
//  * @license     Proprietary
//  *
//  * @version     1.0.0
//  * @created     2026-11-11
//  * @updated     2026-11-11
//  *
//  * @description Administrator-only System Information view presenting health, database connectivity, module status, integrations, backup posture, and sanitized update/deployment status.
//  */

import { useEffect, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  Database,
  HardDrive,
  Layers,
  Lock,
  Plug,
  RefreshCw,
  Server,
  ShieldAlert,
} from 'lucide-react'
import { helpApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import type { HelpSystemInfoResponse } from '../../types'
import { StructuredMarkdownContent } from './HelpArticleView'
import { isHelpAdminRole } from './helpNavigation'

export default function SystemInfoSection() {
  const { user } = useAuthStore()
  const isAdmin = isHelpAdminRole(user?.role)

  const [info, setInfo] = useState<HelpSystemInfoResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchInfo = async () => {
    if (!isAdmin) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await helpApi.getSystemInfo()
      setInfo(res.data)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Unable to load system information.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInfo()
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Administrator Authorization Required</h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          System Information contains operational health, database connectivity, backup status, and integration telemetry restricted exclusively to authorized Institute Administrators.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">System Information (Administrator View)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live non-sensitive operational diagnostics. Passwords, API keys, credentials, and private infrastructure endpoints are strictly redacted.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchInfo}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Checks</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {info && (
        <>
          {/* Health, Database, Backup & Deployment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Application Health
                </span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-bold text-emerald-700">{info.application_health.status}</div>
              <div className="text-xs text-slate-600">{info.application_health.api_service}</div>
              <div className="text-[11px] text-slate-500">{info.application_health.security_governance}</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Database Connectivity
                </span>
                <Database className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-lg font-bold text-slate-900">{info.database_connectivity.status}</div>
              <div className="text-xs text-slate-600">Engine: {info.database_connectivity.engine}</div>
              <div className="text-[11px] text-slate-500">
                Ping Latency:{' '}
                {info.database_connectivity.latency_ms != null
                  ? `${info.database_connectivity.latency_ms} ms`
                  : 'N/A'}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Last Successful Backup
                </span>
                <HardDrive className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-sm font-bold text-slate-900">{info.last_successful_backup.status}</div>
              <div className="text-xs text-slate-600">
                {info.last_successful_backup.last_backup_at
                  ? new Date(info.last_successful_backup.last_backup_at).toLocaleString()
                  : 'No timestamp recorded yet'}
              </div>
              <div className="text-[11px] text-slate-500">
                Policy: {info.last_successful_backup.frequency} • Snapshots:{' '}
                {info.last_successful_backup.total_snapshots}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Deployment Information
                </span>
                <Server className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-sm font-bold text-slate-900">
                {info.deployment_information.product_name} v{info.deployment_information.version}
              </div>
              <div className="text-xs text-slate-600">{info.deployment_information.edition}</div>
              <div className="text-[11px] text-slate-500">
                Channel: {info.deployment_information.release_channel}
              </div>
            </div>
          </div>

          {/* Integration Status & Module Availability */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plug className="w-4 h-4 text-indigo-600" />
                <span>Integration Status</span>
              </h2>
              <div className="divide-y divide-slate-100">
                {info.integration_status.map((item) => (
                  <div key={item.name} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{item.name}</div>
                      <div className="text-[11px] text-slate-500">{item.provider}</div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.status.startsWith('Enabled') || item.status.startsWith('Configured')
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Module Availability ({info.module_availability.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {info.module_availability.map((m) => (
                  <div
                    key={m.module_key}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <span className="font-semibold text-slate-800">{m.name}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{m.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Latest Update Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Latest Update Information — {info.latest_update_information.title}
            </h2>
            <StructuredMarkdownContent markdown={info.latest_update_information.notes_markdown} />
          </div>
        </>
      )}
    </div>
  )
}
