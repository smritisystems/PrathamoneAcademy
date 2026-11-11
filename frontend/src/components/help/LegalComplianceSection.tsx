/**
 * @file        LegalComplianceSection.tsx
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
 * @description Source component for Legalcompliancesection in the src.components.help module.
 */

// /**
//  * @file        LegalComplianceSection.tsx
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
//  * @description Dedicated Legal & Compliance viewer covering Terms, Privacy, Data Protection, Software License Agreement, Copyright Notice, and Acceptable Use Policy with management-approval governance badges.
//  */

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileCheck2, Scale } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { helpApi } from '../../api/endpoints'
import type { HelpArticleDetail, HelpArticleSummary } from '../../types'
import { StructuredMarkdownContent } from './HelpArticleView'

interface LegalComplianceSectionProps {
  legalArticles: HelpArticleSummary[]
  selectedSlug?: string
}

export default function LegalComplianceSection({
  legalArticles,
  selectedSlug,
}: LegalComplianceSectionProps) {
  const navigate = useNavigate()
  const activeSlug = selectedSlug || legalArticles[0]?.slug || 'terms-and-conditions'
  const [detail, setDetail] = useState<HelpArticleDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (!activeSlug) return
    setLoading(true)
    helpApi
      .getArticle(activeSlug)
      .then((res) => {
        if (active) setDetail(res.data)
      })
      .catch(() => {
        if (active) setDetail(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeSlug])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Legal Policy Navigation List */}
      <aside className="lg:col-span-4 space-y-2.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Scale className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Legal &amp; Compliance Documents</h2>
          </div>

          {legalArticles.map((doc) => {
            const isSelected = doc.slug === activeSlug
            const isApproved = doc.approval_status === 'approved' && doc.status === 'published'
            return (
              <button
                key={doc.slug}
                type="button"
                onClick={() => navigate(`/help/legal/${doc.slug}`)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{doc.title}</span>
                  {isApproved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Doc v{doc.doc_version}</span>
                  <span className={isApproved ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                    {isApproved ? 'Approved' : 'Approval Pending'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Selected Legal Policy Document */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {loading ? (
          <div className="text-sm text-slate-500 py-8 text-center">Loading legal document...</div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{detail.title}</h1>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                    Version {detail.doc_version}
                  </span>
                  {detail.approved_at && (
                    <span>Approved on {new Date(detail.approved_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  detail.approval_status === 'approved' && detail.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {detail.approval_status === 'approved' && detail.status === 'published'
                  ? 'Authorized & Published'
                  : 'Requires Management Approval'}
              </span>
            </div>

            {detail.approval_status !== 'approved' && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Management Approval Pending:</strong> Authorized legal wording has not yet been formally ratified for this document. PrathamOne EduOS never publishes fabricated legal agreements; administrators can enter and approve authorized legal policies under <strong>Content Governance</strong>.
                </div>
              </div>
            )}

            <StructuredMarkdownContent markdown={detail.content_markdown} />
          </div>
        ) : (
          <div className="text-sm text-slate-500 py-8 text-center">
            Select a Legal &amp; Compliance document from the list to inspect its governance status.
          </div>
        )}
      </div>
    </div>
  )
}
