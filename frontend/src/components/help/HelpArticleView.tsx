/**
 * @file        HelpArticleView.tsx
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
 * @description Source component for Helparticleview in the src.components.help module.
 */

// /**
//  * @file        HelpArticleView.tsx
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
//  * @description Clean structured reader for Help Guides, Tutorials, FAQs, and Legal Compliance documents with breadcrumbs, permission tags, and clear back navigation.
//  */

import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileText,
  Shield,
  Tag,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { HelpArticleDetail } from '../../types'
import { getApprovalBadgeMeta, SECTION_LABELS } from './helpNavigation'

interface HelpArticleViewProps {
  article: HelpArticleDetail
  fromRoute?: string | null
  onSelectSlug: (slug: string) => void
  onBackToList: () => void
}

function renderInlineFormatting(text: string): ReactNode[] {
  // Safe React tokenization for **bold** and `code` spans (zero innerHTML usage)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={idx}>{part}</span>
  })
}

export function StructuredMarkdownContent({ markdown }: { markdown: string }) {
  const lines = (markdown || '').split(/\r?\n/)
  const elements: ReactNode[] = []
  let bulletBuffer: string[] = []
  let orderedBuffer: string[] = []
  let keyIdx = 0

  const flushLists = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${keyIdx++}`} className="my-3 space-y-1.5 pl-5 list-disc text-slate-700 text-sm leading-relaxed">
          {bulletBuffer.map((item, i) => (
            <li key={i}>{renderInlineFormatting(item)}</li>
          ))}
        </ul>,
      )
      bulletBuffer = []
    }
    if (orderedBuffer.length > 0) {
      elements.push(
        <ol key={`ol-${keyIdx++}`} className="my-3 space-y-1.5 pl-5 list-decimal text-slate-700 text-sm leading-relaxed">
          {orderedBuffer.map((item, i) => (
            <li key={i}>{renderInlineFormatting(item)}</li>
          ))}
        </ol>,
      )
      orderedBuffer = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      flushLists()
      continue
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (orderedBuffer.length > 0) flushLists()
      bulletBuffer.push(trimmed.slice(2))
      continue
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      if (bulletBuffer.length > 0) flushLists()
      orderedBuffer.push(orderedMatch[1])
      continue
    }

    flushLists()

    if (trimmed.startsWith('# ')) {
      // Top-level heading already shown in article header unless distinct
      continue
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${keyIdx++}`}
          className="mt-6 mb-2.5 pb-1.5 border-b border-slate-100 text-base font-bold text-slate-900 flex items-center gap-2"
        >
          <span className="w-1.5 h-4 rounded-full bg-indigo-600 inline-block" />
          <span>{trimmed.slice(3)}</span>
        </h2>,
      )
      continue
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${keyIdx++}`} className="mt-4 mb-1.5 text-sm font-bold text-slate-800">
          {trimmed.slice(4)}
        </h3>,
      )
      continue
    }
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq-${keyIdx++}`}
          className="my-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm leading-relaxed"
        >
          {renderInlineFormatting(trimmed.slice(2))}
        </blockquote>,
      )
      continue
    }

    elements.push(
      <p key={`p-${keyIdx++}`} className="my-2.5 text-sm text-slate-700 leading-relaxed">
        {renderInlineFormatting(trimmed)}
      </p>,
    )
  }
  flushLists()

  return <div className="max-w-none">{elements}</div>
}

export default function HelpArticleView({
  article,
  fromRoute,
  onSelectSlug,
  onBackToList,
}: HelpArticleViewProps) {
  const navigate = useNavigate()
  const sectionLabel = SECTION_LABELS[article.section] || 'Help & Documentation'
  const badgeMeta = getApprovalBadgeMeta(article.approval_status, article.status)
  const isLegalPending = article.section === 'legal' && article.approval_status === 'pending_approval'

  return (
    <div className="space-y-5">
      {/* Breadcrumbs & Back Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => navigate('/help')}
            className="hover:text-indigo-600 font-medium transition-colors"
          >
            Help & About Centre
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            type="button"
            onClick={onBackToList}
            className="hover:text-indigo-600 font-medium transition-colors"
          >
            {sectionLabel}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md">{article.title}</span>
        </nav>

        <div className="flex items-center gap-2">
          {fromRoute && (
            <button
              type="button"
              onClick={() => navigate(fromRoute)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Module</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {sectionLabel}</span>
          </button>
        </div>
      </div>

      {/* Article Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <BookOpen className="w-3 h-3" />
                  <span>{sectionLabel}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                  Doc v{article.doc_version}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    badgeMeta.tone === 'amber'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : badgeMeta.tone === 'emerald'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {badgeMeta.label}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{article.title}</h1>
              {article.summary && (
                <p className="text-sm text-slate-600 leading-relaxed">{article.summary}</p>
              )}
            </div>

            {article.related_routes && article.related_routes.length > 0 && article.related_routes[0] !== '/help' && (
              <button
                type="button"
                onClick={() => navigate(article.related_routes[0])}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors shrink-0"
              >
                <span>Open Screen</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isLegalPending && (
            <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong className="font-semibold">Requires Management Approval:</strong> Formal legal text for this policy has not yet been authorized for binding publication. Administrators can review, approve, and publish verified legal copy under Content Governance.
              </div>
            </div>
          )}
        </div>

        {/* Body & Metadata Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-8 p-6 border-b lg:border-b-0 lg:border-r border-slate-100">
            <StructuredMarkdownContent markdown={article.content_markdown} />
          </div>

          <aside className="lg:col-span-4 p-6 bg-slate-50/50 space-y-6">
            {article.required_permissions && article.required_permissions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Required Permissions</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {article.required_permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {article.tags && article.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <span>Topics</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {article.related_articles && article.related_articles.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Related Articles</span>
                </h4>
                <div className="space-y-2">
                  {article.related_articles.map((rel) => (
                    <button
                      key={rel.slug}
                      type="button"
                      onClick={() => onSelectSlug(rel.slug)}
                      className="w-full text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group"
                    >
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">
                        {rel.title}
                      </div>
                      {rel.summary && (
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{rel.summary}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
