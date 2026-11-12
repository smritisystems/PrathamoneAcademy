/**
 * @file        FormsDocuments.tsx
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
 * @updated     2026-11-12
 *
 * @description Centralized Print Forms & KYC Document Studio comprising 8 dedicated workspaces, A4 template engine, direct URL synchronization, and Rule 010 View-First governance.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation, useInRouterContext, MemoryRouter } from 'react-router-dom'
import {
  Printer, Download, Search, Filter, ShieldCheck, CheckSquare, Square,
  Users, UserCheck, BookOpen, CreditCard, Briefcase, FileCheck, RefreshCw,
  Eye, Sliders, ChevronDown, ChevronRight, AlertCircle, FileText, ZoomIn, ZoomOut, Maximize2,
  Layers, Lock, LockOpen, Clock, Sparkles, CheckCircle2, X, AlertTriangle, ArrowRight
} from 'lucide-react'

import { formsApi, studentsApi, usersApi, divisionsApi, standardsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { EditModeBar, LockedButton, LockedIconButton, ContextualHelpButton } from '../components/common'
import type { FormCatalogItem, FormConfigSection, RenderedFormPayload, FormAuditLogItem } from '../types/forms'
import type { Student, UserListItem, Division, Standard } from '../types'
import FormTemplateEngine from '../components/forms/FormTemplateEngine'
import Modal from '../components/Modal'

export type FormsTab =
  | 'overview'
  | 'admissions'
  | 'id-cards'
  | 'financial'
  | 'academic'
  | 'certificates'
  | 'bulk-print'
  | 'audit-logs'

export interface TabInfo {
  id: FormsTab
  label: string
  route: string
  icon: React.ComponentType<{ className?: string }>
}

export const FORMS_TABS: TabInfo[] = [
  { id: 'overview', label: 'Overview', route: '/forms/overview', icon: Printer },
  { id: 'admissions', label: 'Admission Forms', route: '/forms/admissions', icon: UserCheck },
  { id: 'id-cards', label: 'Student & Staff IDs', route: '/forms/id-cards', icon: CreditCard },
  { id: 'financial', label: 'Receipts & Notices', route: '/forms/financial', icon: FileText },
  { id: 'academic', label: 'Hall Tickets & Transcripts', route: '/forms/academic', icon: BookOpen },
  { id: 'certificates', label: 'Leaving & Experience Certs', route: '/forms/certificates', icon: FileCheck },
  { id: 'bulk-print', label: 'Bulk Print Spooler', route: '/forms/bulk-print', icon: Layers },
  { id: 'audit-logs', label: 'Print Audit Trail', route: '/forms/audit-logs', icon: ShieldCheck },
]

function FormsDocumentsContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const isTrainingMode = useEnvironmentStore((s) => s.isTrainingMode)

  const editScope = 'academic:forms_documents'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  // Synchronize Tab with Route
  const getTabFromPath = (path: string): FormsTab => {
    if (path.includes('/forms/admissions')) return 'admissions'
    if (path.includes('/forms/id-cards')) return 'id-cards'
    if (path.includes('/forms/financial')) return 'financial'
    if (path.includes('/forms/academic')) return 'academic'
    if (path.includes('/forms/certificates')) return 'certificates'
    if (path.includes('/forms/bulk-print')) return 'bulk-print'
    if (path.includes('/forms/audit-logs')) return 'audit-logs'
    return 'overview'
  }

  const [activeTab, setActiveTab] = useState<FormsTab>(() => getTabFromPath(location.pathname))

  useEffect(() => {
    const tabFromPath = getTabFromPath(location.pathname)
    if (tabFromPath !== activeTab) {
      setActiveTab(tabFromPath)
    }
  }, [location.pathname])

  const handleTabChange = (tabId: FormsTab, targetRoute: string) => {
    setActiveTab(tabId)
    navigate(targetRoute)
  }

  // Catalogue & selection state
  const [catalogue, setCatalogue] = useState<FormCatalogItem[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string>('student_admission')
  const [mode, setMode] = useState<'prefilled' | 'blank'>('prefilled')
  const [scope, setScope] = useState<'single' | 'bulk'>('single')
  const [selectedRecordId, setSelectedRecordId] = useState<number | string>('')
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | string>('')
  const [selectedStandardId, setSelectedStandardId] = useState<number | string>('')

  // Filters & search
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Section configuration
  const [activeSections, setActiveSections] = useState<string[]>([])

  // Records data
  const [students, setStudents] = useState<Student[]>([])
  const [staffUsers, setStaffUsers] = useState<UserListItem[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [standards, setStandards] = useState<Standard[]>([])

  // Rendered preview state
  const [renderedForms, setRenderedForms] = useState<RenderedFormPayload[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRendering, setIsRendering] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Zoom & preview state
  const [zoomLevel, setZoomLevel] = useState<number>(100)

  // Audit logs modal & workspace
  const [auditLogs, setAuditLogs] = useState<FormAuditLogItem[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false)
  const [auditSearch, setAuditSearch] = useState<string>('')
  const [selectedAuditItem, setSelectedAuditItem] = useState<FormAuditLogItem | null>(null)

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4500)
  }

  // 1. Initial Data Fetch: Catalogue, Students, Staff, Divisions, Standards, Audit Logs
  useEffect(() => {
    async function initData() {
      setIsLoading(true)
      try {
        const [catRes, stuRes, usrRes, divRes, stdRes, audRes] = await Promise.all([
          formsApi.getCatalogue(),
          studentsApi.list({ page_size: 100 }),
          usersApi.list({ limit: 50 }),
          divisionsApi.list(),
          standardsApi.list(),
          formsApi.getAuditLogs({ limit: 50 }),
        ])

        const catForms = catRes.data.forms || []
        setCatalogue(catForms)
        const stuData = stuRes.data.data || []
        setStudents(stuData)
        setStaffUsers((usrRes.data.items || []).filter((u: UserListItem) => u.role !== 'student'))
        setDivisions(divRes.data || [])
        setStandards(stdRes.data || [])
        setAuditLogs(audRes.data.audit_logs || [])

        if (stuData.length > 0 && !selectedRecordId) {
          setSelectedRecordId(stuData[0].id)
        }

        const currentForm = catForms.find((f: FormCatalogItem) => f.id === selectedFormId) || catForms[0]
        if (currentForm) {
          setSelectedFormId(currentForm.id)
          setActiveSections(
            currentForm.configurable_sections.filter((s: FormConfigSection) => s.default).map((s: FormConfigSection) => s.key)
          )
        }
      } catch (err: any) {
        console.error('Failed to initialize Forms workspace:', err)
        setErrorMsg('Failed to load forms catalog. Please check backend connection.')
      } finally {
        setIsLoading(false)
      }
    }
    initData()
  }, [])

  // Helper to safely extract audit metadata
  const parseAuditMetadata = (log: FormAuditLogItem) => {
    try {
      const meta = typeof log.metadata === 'string' && log.metadata.startsWith('{')
        ? JSON.parse(log.metadata)
        : log.metadata
      return {
        form_id: meta?.form_id || meta?.template_code || log.action || 'student_admission',
        user_name: meta?.user_name || meta?.operator || 'Admin Desk',
        mode: meta?.mode || 'prefilled',
        scope: meta?.scope || 'single',
        sections_included: Array.isArray(meta?.sections) ? meta.sections : [],
      }
    } catch {
      return {
        form_id: log.action || 'student_admission',
        user_name: 'Admin Desk',
        mode: 'prefilled',
        scope: 'single',
        sections_included: [],
      }
    }
  }

  // Auto-switch selected form based on active submenu workspace
  useEffect(() => {
    if (catalogue.length === 0) return

    if (activeTab === 'admissions') {
      const form = catalogue.find((f) => f.id === 'student_admission') || catalogue[0]
      if (form) setSelectedFormId(form.id)
      setScope('single')
    } else if (activeTab === 'id-cards') {
      const form = catalogue.find((f) => f.id === 'student_id_card' || f.id.includes('id_card')) || catalogue[0]
      if (form) setSelectedFormId(form.id)
      setScope('single')
    } else if (activeTab === 'financial') {
      const form = catalogue.find((f) => f.id === 'fee_receipt' || f.id.includes('fee')) || catalogue[0]
      if (form) setSelectedFormId(form.id)
      setScope('single')
    } else if (activeTab === 'academic') {
      const form = catalogue.find((f) => f.id === 'exam_hall_ticket' || f.id.includes('exam')) || catalogue[0]
      if (form) setSelectedFormId(form.id)
      setScope('single')
    } else if (activeTab === 'certificates') {
      const form = catalogue.find((f) => f.id === 'leaving_certificate' || f.id.includes('certificate')) || catalogue[0]
      if (form) setSelectedFormId(form.id)
      setScope('single')
    } else if (activeTab === 'bulk-print') {
      setScope('bulk')
    }
  }, [activeTab, catalogue])

  // Currently selected form definition
  const currentFormDef = useMemo(() => {
    return catalogue.find((f) => f.id === selectedFormId) || catalogue[0]
  }, [catalogue, selectedFormId])

  // When selectedFormId changes, reset active sections to its defaults
  useEffect(() => {
    if (currentFormDef) {
      setActiveSections(
        currentFormDef.configurable_sections.filter((s) => s.default).map((s) => s.key)
      )
    }
  }, [selectedFormId, currentFormDef])

  // Filtered catalogue
  const filteredCatalogue = useMemo(() => {
    return catalogue.filter((form) => {
      if (entityFilter !== 'all' && form.entity.toLowerCase() !== entityFilter.toLowerCase()) {
        return false
      }
      if (categoryFilter !== 'all' && form.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesTitle = form.title.toLowerCase().includes(q)
        const matchesCode = form.code.toLowerCase().includes(q)
        const matchesDesc = form.description.toLowerCase().includes(q)
        if (!matchesTitle && !matchesCode && !matchesDesc) return false
      }
      return true
    })
  }, [catalogue, entityFilter, categoryFilter, searchTerm])

  // 2. Fetch Rendered Preview Form(s)
  const fetchFormPreview = async () => {
    if (!selectedFormId) return
    setIsRendering(true)
    setErrorMsg(null)

    try {
      if (scope === 'bulk') {
        const payload: any = {
          form_id: selectedFormId,
          mode,
          sections: activeSections,
        }
        if (selectedDivisionId) payload.division_id = Number(selectedDivisionId)
        if (selectedStandardId) payload.standard_id = Number(selectedStandardId)

        const res = await formsApi.bulkRender(payload)
        setRenderedForms(res.data.forms || [])
      } else {
        const params: any = {
          mode,
          sections: activeSections.join(','),
        }
        if (mode === 'prefilled' && selectedRecordId) {
          params.record_id = Number(selectedRecordId)
        }
        const res = await formsApi.renderForm(selectedFormId, params)
        setRenderedForms([res.data])
      }
    } catch (err: any) {
      console.error('Error rendering form preview:', err)
      setErrorMsg(err.response?.data?.detail || 'Failed to render form preview.')
    } finally {
      setIsRendering(false)
    }
  }

  // Trigger form preview on selection / parameter change
  useEffect(() => {
    if (!isLoading && catalogue.length > 0 && activeTab !== 'overview' && activeTab !== 'audit-logs') {
      fetchFormPreview()
    }
  }, [selectedFormId, mode, scope, selectedRecordId, selectedDivisionId, selectedStandardId, activeSections, activeTab])

  // Handle section checkbox toggle
  const toggleSection = (key: string) => {
    setActiveSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  // Native Print Handler with Rule 010 View-First lock check
  const handlePrint = () => {
    if (!isEditMode) {
      showNotification('error', 'Locked in View Mode: Please activate Edit Mode above to print or dispatch documents.')
      return
    }
    window.print()
  }

  // Filter audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (!auditSearch.trim()) return true
      const q = auditSearch.toLowerCase()
      const meta = parseAuditMetadata(log)
      return (
        log.action?.toLowerCase().includes(q) ||
        meta.form_id.toLowerCase().includes(q) ||
        meta.user_name.toLowerCase().includes(q) ||
        meta.mode.toLowerCase().includes(q) ||
        meta.scope.toLowerCase().includes(q)
      )
    })
  }, [auditLogs, auditSearch])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Printable Forms & Official Documents Studio" />

      {/* Training Mode Banner */}
      {isTrainingMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 no-print">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="font-bold tracking-wide">TRAINING MODE ACTIVE</span>
            <span>— Document print runs and PDF renders are generated with watermarked mock data for training simulation.</span>
          </div>
          <span className="text-[11px] font-mono bg-amber-200/80 text-amber-900 font-semibold px-2 py-0.5 rounded">Mock Print Spooler</span>
        </div>
      )}

      {/* Main Workspace Header & Submenu Navigation (Hidden during Print) */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 sticky top-0 z-20 shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  Print Forms Studio & KYC
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                  DPDP & CBSE Compliant
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Standardized A4 dossiers, ID badges, financial receipts, academic transcripts, and audit logs
              </p>
            </div>
          </div>

          {/* Submenu Tabs Navigation & Contextual Help */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto bg-slate-100 p-1 rounded-xl scrollbar-none">
              {FORMS_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id, tab.route)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
            <ContextualHelpButton moduleKey="forms" variant="pill" label="Forms Help" />
          </div>
        </div>
      </div>

      {/* Feedback Banner (Hidden during Print) */}
      {feedback && (
        <div
          className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium no-print ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <div className="flex-1">{feedback.message}</div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Workspace Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Loading Print Forms Studio Workspaces...</span>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* WORKSPACE 1: OVERVIEW & PRINT HUB                               */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Top KPI Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                      <span>Standard Templates</span>
                      <Printer className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mt-2 font-mono">
                      {catalogue.length || 12}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">A4 & ID badge presets</div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                      <span>DPDP 2023 Compliance</span>
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mt-2 font-mono">100%</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Aadhaar masking active</div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                      <span>Eligible Students</span>
                      <Users className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mt-2 font-mono">
                      {students.length}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Active student records</div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                      <span>Staff Directory</span>
                      <Briefcase className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mt-2 font-mono">
                      {staffUsers.length}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Faculty & staff badges</div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                      <span>Print Audited Runs</span>
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-bold text-amber-600 mt-2 font-mono">
                      {auditLogs.length}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Historical print logs</div>
                  </div>
                </div>

                {/* Submenu Quick Navigation Launchpad */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Print Forms Studio Dedicated Workspaces</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Select an official document workspace to configure sections, preview vector layouts, and execute print jobs</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTabChange('admissions', '/forms/admissions')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Admission Dossier</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        id: 'admissions',
                        title: 'Admission & KYC Forms',
                        desc: 'Official CBSE/State Board student registration dossiers, parent KYC forms, and demographic declaration sheets.',
                        route: '/forms/admissions',
                        icon: UserCheck,
                        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                      },
                      {
                        id: 'id-cards',
                        title: 'Student & Staff ID Badges',
                        desc: 'CR80 standard identity badges, multi-up printable A4 sheets, barcodes, and emergency medical contacts.',
                        route: '/forms/id-cards',
                        icon: CreditCard,
                        color: 'text-blue-600 bg-blue-50 border-blue-200',
                      },
                      {
                        id: 'financial',
                        title: 'Receipts & Dues Notices',
                        desc: 'Stamped tuition fee payment receipts, installment breakdowns, overdue demand letters, and defaulter summaries.',
                        route: '/forms/financial',
                        icon: FileText,
                        color: 'text-amber-600 bg-amber-50 border-amber-200',
                      },
                      {
                        id: 'academic',
                        title: 'Hall Tickets & Transcripts',
                        desc: 'Official examination admit cards with candidate photos, timetable tables, rules, and cumulative progress cards.',
                        route: '/forms/academic',
                        icon: BookOpen,
                        color: 'text-violet-600 bg-violet-50 border-violet-200',
                      },
                      {
                        id: 'certificates',
                        title: 'Leaving & Experience Certs',
                        desc: 'Institutional Transfer Certificates (TC), Student Character Certs, and Staff Experience & Relieving Letters.',
                        route: '/forms/certificates',
                        icon: FileCheck,
                        color: 'text-purple-600 bg-purple-50 border-purple-200',
                      },
                      {
                        id: 'bulk-print',
                        title: 'Bulk Print Spooler',
                        desc: 'High-volume division-wise batch generation for whole classrooms with automated collation and page numbering.',
                        route: '/forms/bulk-print',
                        icon: Layers,
                        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
                      },
                      {
                        id: 'audit-logs',
                        title: 'Print Audit Trail',
                        desc: 'DPDP Act 2023 compliance audit trail recording operator identity, document type, timestamps, and recipient.',
                        route: '/forms/audit-logs',
                        icon: ShieldCheck,
                        color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
                      },
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleTabChange(item.id as FormsTab, item.route)}
                          className="p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/20 cursor-pointer transition-all flex flex-col justify-between group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${item.color}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                {item.title}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                          </div>
                          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-emerald-600 font-semibold mt-3">
                            <span>Open Workspace</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Print Readiness Specifications */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">Standard Layout</span>
                    <h4 className="text-xs font-bold text-gray-900">A4 Portrait (210 x 297 mm)</h4>
                    <p className="text-[11px] text-gray-500">Zero-margin printable CSS with page-break controls</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">Identity Badges</span>
                    <h4 className="text-xs font-bold text-gray-900">CR80 PVC (85.6 x 54 mm)</h4>
                    <p className="text-[11px] text-gray-500">Single or 8-per-page grid with QR code</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">Thermal Receipts</span>
                    <h4 className="text-xs font-bold text-gray-900">80mm POS Roll Supported</h4>
                    <p className="text-[11px] text-gray-500">Fast cash-counter compact receipt layout</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">Data Privacy</span>
                    <h4 className="text-xs font-bold text-emerald-600">DPDP Act 2023 Certified</h4>
                    <p className="text-[11px] text-gray-500">Automatic Aadhaar masking & consent disclaimer</p>
                  </div>
                </div>

                {/* Recent Print Audit Logs Feed */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Recent Audited Print Dispatches ({auditLogs.slice(0, 5).length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleTabChange('audit-logs', '/forms/audit-logs')}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>View Full Audit Trail</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {auditLogs.slice(0, 5).map((log) => {
                      const meta = parseAuditMetadata(log)
                      return (
                        <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                              {meta.form_id}
                            </span>
                            <div>
                              <span className="font-semibold text-gray-900">{meta.user_name}</span>
                              <span className="text-gray-400 text-[11px] ml-2">
                                {meta.mode.toUpperCase()} • {meta.scope.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-gray-400 font-mono">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                              VERIFIED
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {auditLogs.length === 0 && (
                      <div className="py-6 text-center text-xs text-gray-400">
                        No print audit logs recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* WORKSPACES 2 TO 7: DOCUMENT WORKSPACES WITH LIVE A4 PREVIEW     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab !== 'overview' && activeTab !== 'audit-logs' && (
              <div className="space-y-4">
                {/* Top Action & Print Bar (No Print) */}
                <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      A4
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 leading-tight">
                        {currentFormDef?.title || 'Document Preview'}
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        {currentFormDef?.description || 'CBSE & DPDP Act 2023 compliant official print layout'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Zoom Controls */}
                    <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50 text-xs">
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(z - 15, 60))}
                        className="p-1 hover:bg-white rounded text-gray-600"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 font-mono text-[11px] font-semibold text-gray-700">{zoomLevel}%</span>
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(z + 15, 130))}
                        className="p-1 hover:bg-white rounded text-gray-600"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Print Button with Rule 010 View-First lock */}
                    <button
                      type="button"
                      disabled={!isEditMode || isRendering || renderedForms.length === 0}
                      onClick={handlePrint}
                      title={!isEditMode ? 'Locked in View Mode: Activate Edit Mode above to print documents' : ''}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors ${
                        !isEditMode
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                          : 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                      }`}
                    >
                      {!isEditMode ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                      <span>{!isEditMode ? 'Locked in View Mode' : `Print Document (${renderedForms.length})`}</span>
                    </button>

                    {/* Download PDF Button with Rule 010 lock */}
                    <button
                      type="button"
                      disabled={!isEditMode || isRendering || renderedForms.length === 0}
                      onClick={handlePrint}
                      title={!isEditMode ? 'Locked in View Mode: Activate Edit Mode above to download PDF' : ''}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors ${
                        !isEditMode
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF Export</span>
                    </button>
                  </div>
                </div>

                {/* Main Split Layout: Left Controls (4 cols) + Right Live Preview Canvas (8 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Controls Column (No Print): 4 cols */}
                  <div className="no-print lg:col-span-4 space-y-4">
                    {/* Form Variant & Target Selector Card */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2 flex items-center justify-between">
                        <span>Document Configuration</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          {currentFormDef?.code}
                        </span>
                      </h4>

                      {/* Mode Switch: Prefilled vs Blank */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Data Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setMode('prefilled')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                              mode === 'prefilled'
                                ? 'bg-white text-emerald-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Prefilled Data
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode('blank')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                              mode === 'blank'
                                ? 'bg-white text-emerald-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Blank Pen & Paper
                          </button>
                        </div>
                      </div>

                      {/* Scope Switch: Single vs Bulk */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Print Scope
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setScope('single')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                              scope === 'single'
                                ? 'bg-white text-emerald-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Single Record
                          </button>
                          <button
                            type="button"
                            onClick={() => setScope('bulk')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                              scope === 'bulk'
                                ? 'bg-white text-emerald-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Batch Print
                          </button>
                        </div>
                      </div>

                      {/* Single Mode: Record Selector */}
                      {mode === 'prefilled' && scope === 'single' && (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            {currentFormDef?.entity === 'staff' ? 'Select Staff Member' : 'Select Student Record'}
                          </label>
                          {currentFormDef?.entity === 'staff' ? (
                            <select
                              value={selectedRecordId}
                              onChange={(e) => setSelectedRecordId(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                            >
                              {staffUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.first_name} {u.last_name} ({u.role})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={selectedRecordId}
                              onChange={(e) => setSelectedRecordId(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                            >
                              {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.full_name || `${s.first_name} ${s.last_name}`} ({s.admission_number})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      {/* Bulk Mode: Standard & Division Selectors */}
                      {scope === 'bulk' && (
                        <div className="space-y-2 pt-1 border-t border-gray-100">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Standard / Class
                            </label>
                            <select
                              value={selectedStandardId}
                              onChange={(e) => setSelectedStandardId(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                            >
                              <option value="">All Standards</option>
                              {standards.map((st) => (
                                <option key={st.id} value={st.id}>{st.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Division / Section
                            </label>
                            <select
                              value={selectedDivisionId}
                              onChange={(e) => setSelectedDivisionId(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                            >
                              <option value="">All Divisions</option>
                              {divisions.map((div) => (
                                <option key={div.id} value={div.id}>{div.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section Configurator Checkboxes */}
                    {currentFormDef?.configurable_sections && currentFormDef.configurable_sections.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2 flex items-center justify-between">
                          <span>Included Sections</span>
                          <span className="text-[10px] text-gray-400 font-normal">Toggle layout elements</span>
                        </h4>
                        <div className="space-y-1.5">
                          {currentFormDef.configurable_sections.map((section) => {
                            const isChecked = activeSections.includes(section.key)
                            return (
                              <label
                                key={section.key}
                                className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 hover:text-gray-900 py-0.5"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSection(section.key)}
                                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className={isChecked ? 'font-semibold text-gray-900' : 'text-gray-500'}>
                                  {section.label}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Live Preview Canvas: 8 cols */}
                  <div className="lg:col-span-8 space-y-4">
                    {isRendering ? (
                      <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center gap-3 text-gray-500 shadow-2xs">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                        <span className="text-xs font-semibold">Generating high-fidelity document layout...</span>
                      </div>
                    ) : errorMsg ? (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800 space-y-2">
                        <AlertTriangle className="w-8 h-8 mx-auto text-rose-600" />
                        <div className="font-bold text-sm">Preview Generation Failed</div>
                        <p className="text-xs">{errorMsg}</p>
                      </div>
                    ) : renderedForms.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400 text-xs">
                        No rendered document forms available.
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div
                          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                          className="transition-transform duration-150 w-full flex flex-col items-center space-y-8 print:transform-none print:w-full print:space-y-0"
                        >
                          {renderedForms.map((formPayload, index) => (
                            <div
                              key={index}
                              className="w-full max-w-4xl bg-white shadow-lg border border-gray-300 p-8 rounded-sm print:shadow-none print:border-none print:p-0 print:m-0"
                            >
                              <FormTemplateEngine
                                form={formPayload}
                                showPageBreak={renderedForms.length > 1}
                                pageNumber={index + 1}
                                totalPages={renderedForms.length}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* WORKSPACE 8: DPDP 2023 COMPLIANCE AUDIT TRAIL                   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'audit-logs' && (
              <div className="space-y-5">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">
                          Digital Personal Data Protection (DPDP Act 2023) Audited Trail
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-10">
                        Immutable forensic log of all printed and exported official documents with user identities and timestamps.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={auditSearch}
                          onChange={(e) => setAuditSearch(e.target.value)}
                          placeholder="Search form, user, scope..."
                          className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Audit Logs Table */}
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs text-gray-600">
                      <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-700 font-semibold text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Date / Time</th>
                          <th className="py-3 px-4">Form Template</th>
                          <th className="py-3 px-4">Operator / User</th>
                          <th className="py-3 px-4">Mode</th>
                          <th className="py-3 px-4">Scope</th>
                          <th className="py-3 px-4">Sections</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredAuditLogs.map((log) => {
                          const meta = parseAuditMetadata(log)
                          return (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 font-bold text-gray-900 font-mono">
                                {meta.form_id}
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-800">
                                {meta.user_name}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    meta.mode === 'prefilled'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {meta.mode.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px]">
                                {meta.scope.toUpperCase()}
                              </td>
                              <td className="py-3 px-4 text-[11px] text-gray-500 max-w-xs truncate">
                                {meta.sections_included.join(', ') || 'All standard sections'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  COMPLIANT
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                        {filteredAuditLogs.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                              No audited print records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function FormsDocumentsPage() {
  const inRouter = useInRouterContext()
  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={['/forms']}>
        <FormsDocumentsContent />
      </MemoryRouter>
    )
  }
  return <FormsDocumentsContent />
}
