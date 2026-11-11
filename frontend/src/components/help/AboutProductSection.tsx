/**
 * @file        AboutProductSection.tsx
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
 * @description Source component for Aboutproductsection in the src.components.help module.
 */

// /**
//  * @file        AboutProductSection.tsx
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
//  * @description Customer-facing About PrathamOne EduOS product identity, vision, philosophy, capabilities, modules, and deployment summary.
//  */

import {
  BookOpen,
  Building,
  CheckCircle2,
  Compass,
  Layers,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { HelpProductAndVersionResponse } from '../../types'

interface AboutProductSectionProps {
  data: HelpProductAndVersionResponse | null
}

export default function AboutProductSection({ data }: AboutProductSectionProps) {
  const navigate = useNavigate()
  const product = data?.about_product

  if (!product) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
        Loading PrathamOne EduOS product information...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
            {product.product_category}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
            {product.edition}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{product.product_name}</h1>
        <p className="mt-3 text-sm text-slate-200 leading-relaxed max-w-3xl">{product.introduction}</p>
      </div>

      {/* Vision, Mission & Product Philosophy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Vision & Mission</span>
            </h2>
            {product.vision_mission_status === 'baseline_pending_commercial_signoff' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Editable in Governance
              </span>
            )}
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1">Vision</div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{product.vision}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1">Mission</div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{product.mission}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Product Philosophy</span>
          </h2>
          <div className="space-y-2.5">
            {product.philosophy.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Core Capabilities */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Core Capabilities</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {product.core_capabilities.map((cap) => (
            <div
              key={cap}
              className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-xs sm:text-sm text-slate-700"
            >
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>{cap}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Available Modules Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Available Modules ({product.available_modules.length})</span>
          </h2>
          <span className="text-xs text-slate-500">Click any module to open its User Guide</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {product.available_modules.map((mod) => (
            <button
              key={mod.key}
              type="button"
              onClick={() => navigate(`/help/article/${mod.guide_slug}?from=/help/about-product`)}
              className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-between gap-2 group"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                  {mod.name}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Open User Guide</div>
              </div>
              <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Target Institutions, Deployment Models & Editions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            <span>Target Institutions</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-700 list-disc pl-4">
            {product.target_institutions.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            <span>Supported Deployment Models</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-700 list-disc pl-4">
            {product.supported_deployment_models.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Product Editions</h3>
          {product.editions.map((ed) => (
            <div key={ed.name} className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <div className="text-xs font-bold text-indigo-900">{ed.name}</div>
              <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">{ed.status}</div>
              <p className="text-xs text-slate-600 mt-1">{ed.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
