/**
 * @file        HelpGovernanceSection.tsx
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
 * @description Admin-only Content Management & Governance console adhering strictly to Rule 010 View-First Edit Mode for articles, FAQs, categories, legal approvals, revision history, and product metadata.
 */

import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Edit3,
  FolderPlus,
  History,
  Lock,
  Plus,
  Save,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { helpApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'
import { EditModeBar, LockedButton } from '../common'
import Modal from '../Modal'
import type {
  HelpArticleRevision,
  HelpArticleSummary,
  HelpCategory,
  HelpProductAndVersionResponse,
  HelpSectionKey,
} from '../../types'
import { getApprovalBadgeMeta, isHelpAdminRole, SECTION_LABELS } from './helpNavigation'

interface HelpGovernanceSectionProps {
  categories: HelpCategory[]
  productInfo: HelpProductAndVersionResponse | null
  onRefreshAll: () => Promise<void>
}

export default function HelpGovernanceSection({
  categories,
  productInfo,
  onRefreshAll,
}: HelpGovernanceSectionProps) {
  const { user } = useAuthStore()
  const isAdmin = isHelpAdminRole(user?.role)
  const isSysAdmin = ['superadmin', 'sysadmin', 'super_admin'].includes(
    (user?.role || '').trim().toLowerCase(),
  )
  const { isEditMode } = useEditModeStore()
  const editable = isEditMode('admin:help_centre')

  const [subTab, setSubTab] = useState<'articles' | 'categories' | 'product_meta'>('articles')
  const [articles, setArticles] = useState<HelpArticleSummary[]>([])
  const [sectionFilter, setSectionFilter] = useState<string>('')
  const [searchFilter, setSearchFilter] = useState('')
  const [loading, setLoading] = useState(false)

  // Article Editor Modal
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null)
  const [artSlug, setArtSlug] = useState('')
  const [artTitle, setArtTitle] = useState('')
  const [artSection, setArtSection] = useState<HelpSectionKey>('faq')
  const [artCategorySlug, setArtCategorySlug] = useState('faq-troubleshooting')
  const [artModuleKey, setArtModuleKey] = useState('')
  const [artSummary, setArtSummary] = useState('')
  const [artMarkdown, setArtMarkdown] = useState('')
  const [artTags, setArtTags] = useState('')
  const [artPermissions, setArtPermissions] = useState('')
  const [artRelatedRoutes, setArtRelatedRoutes] = useState('')
  const [artRelatedSlugs, setArtRelatedSlugs] = useState('')
  const [artDocVersion, setArtDocVersion] = useState('1.0')
  const [artStatus, setArtStatus] = useState<'draft' | 'pending_approval' | 'published' | 'unpublished'>('published')
  const [artApprovalStatus, setArtApprovalStatus] = useState<'approved' | 'pending_approval'>('approved')
  const [artChangeNote, setArtChangeNote] = useState('')
  const [savingArticle, setSavingArticle] = useState(false)

  // Revision History Modal
  const [revModalOpen, setRevModalOpen] = useState(false)
  const [revTitle, setRevTitle] = useState('')
  const [revisions, setRevisions] = useState<HelpArticleRevision[]>([])

  // Category Form
  const [catSlug, setCatSlug] = useState('')
  const [catName, setCatName] = useState('')
  const [catSection, setCatSection] = useState<HelpSectionKey>('faq')
  const [catDesc, setCatDesc] = useState('')
  const [catIsActive, setCatIsActive] = useState(true)
  const [savingCat, setSavingCat] = useState(false)

  // Product / Company / License Metadata
  const emptyMeta = {
    product_introduction: '',
    product_vision: '',
    product_mission: '',
    vision_mission_status: 'baseline_pending_commercial_signoff',
    smriti_introduction: '',
    smriti_tech_profile: '',
    smriti_website: '',
    smriti_office: '',
    smriti_leadership: '',
    smriti_verification_status: 'pending_management_verification',
    license_status: '',
    license_validity: '',
    deployment_type: '',
    change_note: '',
  }
  const [metaForm, setMetaForm] = useState(emptyMeta)
  const [initialMetaForm, setInitialMetaForm] = useState(emptyMeta)
  const [savingMeta, setSavingMeta] = useState(false)

  const loadGovernedArticles = async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const res = await helpApi.getArticles({
        section: sectionFilter || undefined,
        include_unpublished: true,
      })
      setArticles(res.data.items || [])
    } catch {
      toast.error('Unable to load governed Help articles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGovernedArticles()
  }, [isAdmin, sectionFilter])

  useEffect(() => {
    if (!productInfo) return
    const nextMeta = {
      product_introduction: productInfo.about_product.introduction || '',
      product_vision: productInfo.about_product.vision || '',
      product_mission: productInfo.about_product.mission || '',
      vision_mission_status:
        productInfo.about_product.vision_mission_status || 'baseline_pending_commercial_signoff',
      smriti_introduction: productInfo.about_company.smriti_systems.introduction || '',
      smriti_tech_profile: productInfo.about_company.smriti_systems.technology_profile || '',
      smriti_website: productInfo.about_company.smriti_systems.official_website || '',
      smriti_office: productInfo.about_company.smriti_systems.registered_office || '',
      smriti_leadership: productInfo.about_company.smriti_systems.leadership_note || '',
      smriti_verification_status:
        productInfo.about_company.smriti_systems.verification_status || 'pending_management_verification',
      license_status: productInfo.version_info.license_status || '',
      license_validity: productInfo.version_info.license_validity || '',
      deployment_type: productInfo.version_info.deployment_type || '',
      change_note: '',
    }
    setMetaForm(nextMeta)
    setInitialMetaForm(nextMeta)
  }, [productInfo])

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-2">
        <Lock className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Content Governance Restricted</h2>
        <p className="text-xs text-slate-600">
          Only authorized Administrators, Principals, and System Administrators can edit Help articles, FAQs, categories, or approved legal compliance records.
        </p>
      </div>
    )
  }

  const splitCsv = (val: string) =>
    val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const openNewArticleModal = () => {
    setEditingArticleId(null)
    setArtSlug('')
    setArtTitle('')
    setArtSection('faq')
    setArtCategorySlug('faq-troubleshooting')
    setArtModuleKey('')
    setArtSummary('')
    setArtMarkdown('# Title\n\nWrite verified, customer-safe instructions here...')
    setArtTags('faq')
    setArtPermissions('')
    setArtRelatedRoutes('')
    setArtRelatedSlugs('')
    setArtDocVersion('1.0')
    setArtStatus('draft')
    setArtApprovalStatus('approved')
    setArtChangeNote('New help article created.')
    setEditorOpen(true)
  }

  const openEditArticleModal = async (summary: HelpArticleSummary) => {
    try {
      const res = await helpApi.getArticle(summary.slug, true)
      const art = res.data
      setEditingArticleId(art.id)
      setArtSlug(art.slug)
      setArtTitle(art.title)
      setArtSection(art.section)
      setArtCategorySlug(art.category_slug || 'faq-troubleshooting')
      setArtModuleKey(art.module_key || '')
      setArtSummary(art.summary || '')
      setArtMarkdown(art.content_markdown)
      setArtTags((art.tags || []).join(', '))
      setArtPermissions((art.required_permissions || []).join(', '))
      setArtRelatedRoutes((art.related_routes || []).join(', '))
      setArtRelatedSlugs((art.related_slugs || []).join(', '))
      setArtDocVersion(art.doc_version)
      setArtStatus(art.status)
      setArtApprovalStatus(art.approval_status)
      setArtChangeNote('')
      setEditorOpen(true)
    } catch {
      toast.error('Failed to load article details.')
    }
  }

  const handleSaveArticle = async () => {
    if (!editable) {
      toast.error('Enable Edit Mode above before saving changes.')
      return
    }
    setSavingArticle(true)
    try {
      const tags = splitCsv(artTags)
      const requiredPermissions = splitCsv(artPermissions)
      const relatedRoutes = splitCsv(artRelatedRoutes)
      const relatedSlugs = splitCsv(artRelatedSlugs)
      const normalizedModuleKey = artModuleKey.trim() || null
      if (editingArticleId) {
        await helpApi.updateArticle(editingArticleId, {
          title: artTitle,
          summary: artSummary,
          category_slug: artCategorySlug,
          module_key: normalizedModuleKey,
          content_markdown: artMarkdown,
          tags,
          required_permissions: requiredPermissions,
          related_routes: relatedRoutes,
          related_slugs: relatedSlugs,
          doc_version: artDocVersion,
          status: artStatus,
          approval_status: artApprovalStatus,
          change_note: artChangeNote || 'Updated article content.',
        })
        toast.success('Help article updated and revision archived.')
      } else {
        await helpApi.createArticle({
          slug: artSlug,
          title: artTitle,
          section: artSection,
          category_slug: artCategorySlug,
          module_key: normalizedModuleKey,
          summary: artSummary,
          content_markdown: artMarkdown,
          tags,
          required_permissions: requiredPermissions,
          related_routes: relatedRoutes,
          related_slugs: relatedSlugs,
          doc_version: artDocVersion,
          status: artStatus,
          approval_status: artApprovalStatus,
          change_note: artChangeNote || 'Created article.',
        })
        toast.success('Help article created.')
      }
      setEditorOpen(false)
      await loadGovernedArticles()
      await onRefreshAll()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save article.')
    } finally {
      setSavingArticle(false)
    }
  }

  const handleTogglePublish = async (art: HelpArticleSummary, nextPublish: boolean) => {
    try {
      await helpApi.publishArticle(
        art.id,
        nextPublish,
        art.section === 'legal' && nextPublish ? true : undefined,
      )
      toast.success(nextPublish ? `Published '${art.title}'.` : `Unpublished '${art.title}'.`)
      await loadGovernedArticles()
      await onRefreshAll()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update publication status.')
    }
  }

  const handleOpenRevisions = async (art: HelpArticleSummary) => {
    try {
      const res = await helpApi.getRevisions(art.id)
      setRevTitle(art.title)
      setRevisions(res.data.items || [])
      setRevModalOpen(true)
    } catch {
      toast.error('Unable to load revision history.')
    }
  }

  const SYSTEM_ONLY_META_KEYS = new Set([
    'smriti_introduction',
    'smriti_tech_profile',
    'smriti_website',
    'smriti_office',
    'smriti_leadership',
    'smriti_verification_status',
    'license_status',
    'license_validity',
    'deployment_type',
  ])

  const handleSaveCategory = async () => {
    if (!catSlug.trim() || !catName.trim()) {
      toast.error('Category slug and name are required.')
      return
    }
    setSavingCat(true)
    try {
      await helpApi.upsertCategory({
        slug: catSlug.trim(),
        name: catName.trim(),
        section: catSection,
        description: catDesc.trim() || null,
        is_active: catIsActive,
      })
      toast.success('Category saved cleanly.')
      setCatSlug('')
      setCatName('')
      setCatDesc('')
      setCatIsActive(true)
      await onRefreshAll()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save category.')
    } finally {
      setSavingCat(false)
    }
  }

  const handleSaveProductMetadata = async () => {
    const diffPayload: Record<string, string | null | undefined> = {}
    const editableKeys = Object.keys(metaForm) as Array<keyof typeof metaForm>
    for (const key of editableKeys) {
      if (key === 'change_note') continue
      if (SYSTEM_ONLY_META_KEYS.has(key) && !isSysAdmin) continue
      const currentVal = (metaForm[key] || '').trim()
      const baselineVal = (initialMetaForm[key] || '').trim()
      if (currentVal !== baselineVal) {
        diffPayload[key] = currentVal
      }
    }
    if (Object.keys(diffPayload).length === 0) {
      toast('No metadata changes to save.')
      return
    }
    if (metaForm.change_note.trim()) {
      diffPayload.change_note = metaForm.change_note.trim()
    }
    setSavingMeta(true)
    try {
      await helpApi.updateProductInfo(diffPayload)
      toast.success('Product, company, and license metadata saved.')
      await onRefreshAll()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save metadata.')
    } finally {
      setSavingMeta(false)
    }
  }

  const filteredArticles = articles.filter((a) => {
    if (!searchFilter.trim()) return true
    const q = searchFilter.toLowerCase()
    return a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">
      <EditModeBar
        scope="admin:help_centre"
        title="Help & About Content Governance"
      />

      {/* Governance Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'articles', label: 'Articles, FAQs & Legal Docs' },
            { id: 'categories', label: 'Help Categories' },
            { id: 'product_meta', label: 'Product, SMRITI Systems & License' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                subTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {subTab === 'articles' && (
          <LockedButton
            isEditMode={editable}
            onClick={openNewArticleModal}
            icon={Plus}
            variant="primary"
          >
            New Help / FAQ Article
          </LockedButton>
        )}
      </div>

      {/* Articles & Legal Management Table */}
      {subTab === 'articles' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter managed articles by title or slug..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
            />
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="">All Sections</option>
              <option value="getting_started">Getting Started</option>
              <option value="module_guide">Module Guides</option>
              <option value="tutorial">Tutorials &amp; Workflows</option>
              <option value="faq">FAQ &amp; Troubleshooting</option>
              <option value="legal">Legal &amp; Compliance</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Title &amp; Slug</th>
                  <th className="py-3 px-4 font-semibold">Section</th>
                  <th className="py-3 px-4 font-semibold">Version</th>
                  <th className="py-3 px-4 font-semibold">Governance Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      Loading articles...
                    </td>
                  </tr>
                ) : (
                  filteredArticles.map((art) => {
                    const badge = getApprovalBadgeMeta(art.approval_status, art.status)
                    const isPublished = art.status === 'published'
                    return (
                      <tr key={art.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{art.title}</div>
                          <div className="text-[11px] font-mono text-slate-500">{art.slug}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {SECTION_LABELS[art.section] || art.section}
                        </td>
                        <td className="py-3 px-4 font-mono">v{art.doc_version}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              badge.tone === 'amber'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : badge.tone === 'emerald'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenRevisions(art)}
                              title="View Version History"
                              className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1"
                            >
                              <History className="w-3 h-3" />
                              <span>History</span>
                            </button>
                            <LockedButton
                              isEditMode={editable}
                              onClick={() => openEditArticleModal(art)}
                              icon={Edit3}
                              variant="secondary"
                              className="py-1 px-2 text-xs"
                            >
                              Edit
                            </LockedButton>
                            <LockedButton
                              isEditMode={editable}
                              onClick={() => handleTogglePublish(art, !isPublished)}
                              icon={ShieldCheck}
                              variant={isPublished ? 'secondary' : 'primary'}
                              className="py-1 px-2 text-xs"
                            >
                              {isPublished
                                ? 'Unpublish'
                                : art.section === 'legal'
                                  ? 'Approve & Publish'
                                  : 'Publish'}
                            </LockedButton>
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
      )}

      {/* Categories Governance */}
      {subTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <span>Create / Update Category</span>
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
              <input
                type="text"
                disabled={!editable}
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                placeholder="e.g., exam-policies"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
              <input
                type="text"
                disabled={!editable}
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Category display label"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
              <select
                disabled={!editable}
                value={catSection}
                onChange={(e) => setCatSection(e.target.value as HelpSectionKey)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white disabled:bg-slate-100"
              >
                <option value="getting_started">Getting Started</option>
                <option value="module_guide">Module Guides</option>
                <option value="tutorial">Tutorials &amp; Workflows</option>
                <option value="faq">FAQ &amp; Troubleshooting</option>
                <option value="legal">Legal &amp; Compliance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                disabled={!editable}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 select-none">
              <input
                type="checkbox"
                disabled={!editable}
                checked={catIsActive}
                onChange={(e) => setCatIsActive(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Active category (visible in customer Help directory)</span>
            </label>
            <LockedButton
              isEditMode={editable}
              disabled={savingCat}
              onClick={handleSaveCategory}
              icon={Save}
              variant="primary"
              className="w-full justify-center"
            >
              {savingCat ? 'Saving...' : 'Save Help Category'}
            </LockedButton>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900">Help Categories</h3>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>{cat.name}</span>
                    <span className="font-mono text-slate-400 font-normal">({cat.slug})</span>
                    {!cat.is_active && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">{cat.description}</div>
                </div>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => {
                    setCatSlug(cat.slug)
                    setCatName(cat.name)
                    setCatSection(cat.section)
                    setCatDesc(cat.description || '')
                    setCatIsActive(cat.is_active ?? true)
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold disabled:opacity-50"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product, SMRITI Systems & Commercial License Metadata */}
      {subTab === 'product_meta' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Product, SMRITI Systems &amp; License Metadata
              </h3>
              <p className="text-xs text-slate-500">
                Update verified product overview, SMRITI Systems corporate profile, deployment model, and license posture.
              </p>
            </div>
            <LockedButton
              isEditMode={editable}
              disabled={savingMeta}
              onClick={handleSaveProductMetadata}
              icon={Save}
              variant="primary"
            >
              {savingMeta ? 'Saving...' : 'Save Approved Metadata'}
            </LockedButton>
          </div>

          {!isSysAdmin && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              SMRITI Systems corporate profile, deployment model, and commercial license fields are managed by System Administration (SysAdmin / SuperAdmin).
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Product Introduction</label>
              <textarea
                rows={2}
                disabled={!editable}
                value={metaForm.product_introduction}
                onChange={(e) => setMetaForm({ ...metaForm, product_introduction: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Vision</label>
              <textarea
                rows={3}
                disabled={!editable}
                value={metaForm.product_vision}
                onChange={(e) => setMetaForm({ ...metaForm, product_vision: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Mission</label>
              <textarea
                rows={3}
                disabled={!editable}
                value={metaForm.product_mission}
                onChange={(e) => setMetaForm({ ...metaForm, product_mission: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vision &amp; Mission Approval Status</label>
              <select
                disabled={!editable}
                value={metaForm.vision_mission_status}
                onChange={(e) => setMetaForm({ ...metaForm, vision_mission_status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100"
              >
                <option value="baseline_pending_commercial_signoff">Baseline Pending Commercial Sign-off</option>
                <option value="approved">Approved Commercial Statement</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deployment Type (SysAdmin only)</label>
              <input
                type="text"
                disabled={!editable || !isSysAdmin}
                value={metaForm.deployment_type}
                onChange={(e) => setMetaForm({ ...metaForm, deployment_type: e.target.value })}
                placeholder="e.g., Institutional Dedicated Deployment"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SMRITI Systems Introduction (SysAdmin only)</label>
              <textarea
                rows={2}
                disabled={!editable || !isSysAdmin}
                value={metaForm.smriti_introduction}
                onChange={(e) => setMetaForm({ ...metaForm, smriti_introduction: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SMRITI Technology Profile (SysAdmin only)</label>
              <textarea
                rows={2}
                disabled={!editable || !isSysAdmin}
                value={metaForm.smriti_tech_profile}
                onChange={(e) => setMetaForm({ ...metaForm, smriti_tech_profile: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SMRITI Systems Official Website (SysAdmin only)
              </label>
              <input
                type="text"
                disabled={!editable || !isSysAdmin}
                value={metaForm.smriti_website}
                onChange={(e) => setMetaForm({ ...metaForm, smriti_website: e.target.value })}
                placeholder="Verified HTTPS URL when approved"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SMRITI Systems Leadership Info (SysAdmin only)
              </label>
              <input
                type="text"
                disabled={!editable || !isSysAdmin}
                value={metaForm.smriti_leadership}
                onChange={(e) => setMetaForm({ ...metaForm, smriti_leadership: e.target.value })}
                placeholder="Verified founder / leadership note"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SMRITI Systems Registered Office (SysAdmin only)
              </label>
              <input
                type="text"
                disabled={!editable || !isSysAdmin}
                value={metaForm.smriti_office}
                onChange={(e) => setMetaForm({ ...metaForm, smriti_office: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SMRITI Corporate Verification Status (SysAdmin only)
              </label>
              <select
                disabled={!editable || !isSysAdmin}
                value={metaForm.smriti_verification_status}
                onChange={(e) => setMetaForm({ ...metaForm, smriti_verification_status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100"
              >
                <option value="pending_management_verification">Pending Management Verification</option>
                <option value="verified">Verified Corporate Profile</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Commercial License Status (SysAdmin only)</label>
              <input
                type="text"
                disabled={!editable || !isSysAdmin}
                value={metaForm.license_status}
                onChange={(e) => setMetaForm({ ...metaForm, license_status: e.target.value })}
                placeholder="e.g., Active Institutional License"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">License Validity Date (SysAdmin only)</label>
              <input
                type="text"
                disabled={!editable || !isSysAdmin}
                value={metaForm.license_validity}
                onChange={(e) => setMetaForm({ ...metaForm, license_validity: e.target.value })}
                placeholder="e.g., Valid through 31 Mar 2027"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Governance Change Note</label>
              <input
                type="text"
                disabled={!editable}
                value={metaForm.change_note}
                onChange={(e) => setMetaForm({ ...metaForm, change_note: e.target.value })}
                placeholder="Optional audit note describing metadata updates"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Article Editor Modal */}
      <Modal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingArticleId ? 'Edit Help / Legal Document' : 'Create Help / FAQ Article'}
        size="2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Article Title</label>
              <input
                type="text"
                value={artTitle}
                onChange={(e) => setArtTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">URL Slug</label>
              <input
                type="text"
                disabled={editingArticleId !== null}
                value={artSlug}
                onChange={(e) => setArtSlug(e.target.value)}
                placeholder="e.g., fee-waiver-guide"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Section</label>
              <select
                disabled={editingArticleId !== null}
                value={artSection}
                onChange={(e) => setArtSection(e.target.value as HelpSectionKey)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100"
              >
                <option value="getting_started">Getting Started</option>
                <option value="module_guide">Module User Guide</option>
                <option value="tutorial">Tutorial &amp; Workflow</option>
                <option value="faq">FAQ &amp; Troubleshooting</option>
                <option value="legal">Legal &amp; Compliance</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Doc Version</label>
              <input
                type="text"
                value={artDocVersion}
                onChange={(e) => setArtDocVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Approval &amp; Publish State</label>
              <select
                value={`${artApprovalStatus}:${artStatus}`}
                onChange={(e) => {
                  const [app, st] = e.target.value.split(':')
                  setArtApprovalStatus(app as any)
                  setArtStatus(st as any)
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="approved:published">Approved &amp; Published</option>
                <option value="approved:draft">Draft (Unlisted)</option>
                <option value="approved:unpublished">Unpublished</option>
                <option value="pending_approval:pending_approval">Pending Management Approval</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Summary</label>
            <input
              type="text"
              value={artSummary}
              onChange={(e) => setArtSummary(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Customer Documentation Content (Markdown — customer-safe operational wording only)
            </label>
            <textarea
              rows={10}
              value={artMarkdown}
              onChange={(e) => setArtMarkdown(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={artTags}
                onChange={(e) => setArtTags(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Module Key (optional)</label>
              <input
                type="text"
                value={artModuleKey}
                onChange={(e) => setArtModuleKey(e.target.value)}
                placeholder="e.g., fees, courses, homework"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Required Permissions (comma-separated)
              </label>
              <input
                type="text"
                value={artPermissions}
                onChange={(e) => setArtPermissions(e.target.value)}
                placeholder="e.g., fees:collect, students:view"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Related App Routes (comma-separated)
              </label>
              <input
                type="text"
                value={artRelatedRoutes}
                onChange={(e) => setArtRelatedRoutes(e.target.value)}
                placeholder="e.g., /courses, /homework"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Related Article Slugs (comma-separated)
              </label>
              <input
                type="text"
                value={artRelatedSlugs}
                onChange={(e) => setArtRelatedSlugs(e.target.value)}
                placeholder="e.g., guide-fees, tutorial-fee-collection"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Revision Change Note</label>
              <input
                type="text"
                value={artChangeNote}
                onChange={(e) => setArtChangeNote(e.target.value)}
                placeholder="Reason for update or legal sign-off"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!editable || savingArticle}
              onClick={handleSaveArticle}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{savingArticle ? 'Saving...' : 'Save Document & Archive Revision'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Revision History Modal */}
      <Modal
        isOpen={revModalOpen}
        onClose={() => setRevModalOpen(false)}
        title={`Revision History — ${revTitle}`}
        size="xl"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto text-xs">
          {revisions.length === 0 ? (
            <div className="text-slate-500">No revisions logged yet.</div>
          ) : (
            revisions.map((rev) => (
              <div key={rev.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>
                    v{rev.doc_version} — {rev.title}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {rev.created_at ? new Date(rev.created_at).toLocaleString() : ''}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Status: <strong>{rev.status}</strong> ({rev.approval_status}) • Author:{' '}
                  {rev.changed_by_name || 'System'}
                </div>
                {rev.change_note && <div className="text-slate-700 italic">{rev.change_note}</div>}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
