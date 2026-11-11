/**
 * @file        AboutCompanySection.tsx
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
 * @description Source component for Aboutcompanysection in the src.components.help module.
 */

// /**
//  * @file        AboutCompanySection.tsx
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
//  * @description About SMRITI Systems & AITDL profile keeping subscribing institution identity strictly separated from software developer identity.
//  */

import {
  AlertTriangle,
  Building2,
  Copyright,
  ExternalLink,
  Globe,
  Headphones,
  Layers,
  Mail,
  Phone,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { useBranding } from '../../config/branding'
import type { HelpProductAndVersionResponse } from '../../types'

interface AboutCompanySectionProps {
  data: HelpProductAndVersionResponse | null
}

export default function AboutCompanySection({ data }: AboutCompanySectionProps) {
  const branding = useBranding()
  const company = data?.about_company

  if (!company) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
        Loading software developer and company profile...
      </div>
    )
  }

  const { smriti_systems: smriti, aitdl, subscribing_institution: inst } = company
  const smritiPending = smriti.verification_status !== 'verified'

  return (
    <div className="space-y-6">
      {/* Identity Separation Notice */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-indigo-950 leading-relaxed">
          <div className="font-bold">
            Active Institution Workspace: {branding.academyName || inst.name}
            {branding.academyCode || inst.code ? ` (${branding.academyCode || inst.code})` : ''}
          </div>
          <p className="mt-0.5 text-indigo-900">{inst.identity_separation_notice}</p>
        </div>
      </div>

      {/* SMRITI Systems Primary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{smriti.company_name}</h1>
              <p className="text-xs text-slate-500">
                Developer &amp; Product Owner — {company.developer_owner_label}
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              smritiPending
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {smritiPending ? 'Corporate Details Pending Management Verification' : 'Verified Corporate Profile'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Company Introduction</h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{smriti.introduction}</p>
            <h2 className="text-sm font-bold text-slate-900 pt-2">
              Technology &amp; Software Development Profile
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {smriti.technology_profile}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Official Corporate &amp; Leadership Records
            </div>
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-slate-600">Founder &amp; Leadership Information: </span>
                <span className="text-slate-800">
                  {smriti.leadership_note || `${aitdl.product_architect} (Verified AITDL Product Architect); additional SMRITI Systems executive officers pending management verification.`}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-600">Official SMRITI Systems Website: </span>
                {smriti.official_website ? (
                  <a
                    href={smriti.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    {smriti.official_website}
                  </a>
                ) : (
                  <span className="text-amber-700 font-medium">Pending Management Verification</span>
                )}
              </div>
              <div>
                <span className="font-semibold text-slate-600">Registered Office Address: </span>
                <span className={smriti.registered_office ? 'text-slate-800' : 'text-amber-700 font-medium'}>
                  {smriti.registered_office || 'Pending Management Verification'}
                </span>
              </div>
            </div>
            {smritiPending && (
              <div className="pt-2 border-t border-slate-200 flex items-start gap-2 text-[11px] text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Unverified corporate registry details are intentionally omitted until approved via Content Governance.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AITDL Engineering & Verified Product Ecosystem */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>{aitdl.company_name} &amp; Product Portfolio</span>
            </h2>
            <a
              href={aitdl.official_website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>aitdl.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{aitdl.introduction}</p>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>
              <strong>Product Architect:</strong> {aitdl.product_architect}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {aitdl.product_portfolio.map((prod) => (
              <a
                key={prod.name}
                href={prod.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all block"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900">{prod.name}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[11px] font-medium text-indigo-600 mt-0.5">{prod.tagline}</div>
                <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">{prod.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Verified Support Contacts & Copyright */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Headphones className="w-4 h-4 text-indigo-600" />
              <span>Official Contact &amp; Customer Support</span>
            </h2>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-700">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <div className="text-[11px] text-slate-500">Customer Support Helpline</div>
                  <div className="font-semibold">{aitdl.support_phones.join(' | ')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <div className="text-[11px] text-slate-500">Technical Support Email</div>
                  <div className="font-semibold">{aitdl.support_email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <div className="text-[11px] text-slate-500">General Inquiries</div>
                  <div className="font-semibold">{aitdl.general_email}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs flex items-start gap-2.5">
            <Copyright className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">Copyright &amp; Ownership</div>
              <div className="mt-0.5 leading-relaxed">{aitdl.copyright_notice}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
