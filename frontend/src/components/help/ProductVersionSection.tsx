/**
 * @file        ProductVersionSection.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.src.components.help
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
 * @description Dynamically populated Product & Version Information view showing edition, build, release date, license posture, available modules, and customer-safe release notes.
 */

import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Cpu,
  KeyRound,
  Layers,
  PackageCheck,
  Server,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { HelpProductAndVersionResponse } from '../../types'
import { StructuredMarkdownContent } from './HelpArticleView'

interface ProductVersionSectionProps {
  data: HelpProductAndVersionResponse | null
}

export default function ProductVersionSection({ data }: ProductVersionSectionProps) {
  const navigate = useNavigate()
  const v = data?.version_info

  if (!v) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
        Loading live product and version configuration...
      </div>
    )
  }

  const formattedReleaseDate = v.release_date
    ? new Date(v.release_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Not specified'

  return (
    <div className="space-y-6">
      {/* Live Version Summary Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Product &amp; Version Information</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live application configuration and release metadata sourced directly from system state.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>v{v.version_number}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Product Name</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{v.product_name}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Product Edition</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{v.product_edition}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Version &amp; Build Number
            </div>
            <div className="text-sm font-bold text-indigo-700 mt-1">v{v.version_number}</div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5 break-all">{v.build_number}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Release Date</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{formattedReleaseDate}</div>
            <div className="text-[11px] text-slate-500 capitalize mt-0.5">
              Channel: {v.release_channel} ({v.release_status})
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              <span>License Status</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{v.license_status}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              License Validity
            </div>
            {v.license_validity ? (
              <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{v.license_validity}</span>
              </div>
            ) : (
              <div className="text-xs font-semibold text-amber-700 mt-1 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Not Configured (Requires Management Registration)</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Server className="w-3 h-3" />
              <span>Deployment Type</span>
            </div>
            <div className="text-xs font-semibold text-slate-800 mt-1 leading-snug">{v.deployment_type}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>Available Modules</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {v.available_modules_count} Active Modules
            </div>
          </div>
        </div>
      </div>

      {/* Latest Update Information */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Latest Update Information</h2>
            <p className="text-xs text-slate-500">{v.latest_update.title}</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
            Version {v.latest_update.version}
          </span>
        </div>
        <StructuredMarkdownContent markdown={v.latest_update.notes_markdown} />
      </div>

      {/* Included Modules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Available Modules Included in Current Edition</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {v.available_modules.map((mod) => (
            <button
              key={mod.key}
              type="button"
              onClick={() => navigate(`/help/article/${mod.guide_slug}?from=/help/version`)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-colors"
            >
              <span className="text-xs font-semibold text-slate-800">{mod.name}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Guide</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
