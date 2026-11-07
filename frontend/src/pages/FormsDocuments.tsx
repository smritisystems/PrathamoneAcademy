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
 * @updated     2026-11-08
 *
 * @description Centralized Print Forms & KYC workspace supporting prefilled & blank A4 templates, bulk exports, and DPDP audit logs.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Printer, Download, Search, Filter, ShieldCheck, CheckSquare, Square,
  Users, UserCheck, BookOpen, CreditCard, Briefcase, FileCheck, RefreshCw,
  Eye, Sliders, ChevronDown, ChevronRight, AlertCircle, FileText, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react'

import { formsApi, studentsApi, usersApi, divisionsApi, standardsApi } from '../api/endpoints'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import type { FormCatalogItem, FormConfigSection, RenderedFormPayload, FormAuditLogItem } from '../types/forms'
import type { Student, UserListItem, Division, Standard } from '../types'
import FormTemplateEngine from '../components/forms/FormTemplateEngine'
import Modal from '../components/Modal'

export default function FormsDocuments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const editScope = 'academic:forms_documents'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  // Catalogue & selection state
  const [catalogue, setCatalogue] = useState<FormCatalogItem[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string>(
    searchParams.get('formId') || 'student_admission'
  )
  const [mode, setMode] = useState<'prefilled' | 'blank'>(
    (searchParams.get('mode') as 'prefilled' | 'blank') || 'prefilled'
  )
  const [scope, setScope] = useState<'single' | 'bulk'>('single')
  const [selectedRecordId, setSelectedRecordId] = useState<number | string>(
    searchParams.get('recordId') || ''
  )
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
  const [zoomLevel, setZoomLevel] = useState<number>(100) // 75, 100, 125

  // Audit logs modal
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false)
  const [auditLogs, setAuditLogs] = useState<FormAuditLogItem[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false)

  // 1. Initial Data Fetch: Catalogue, Students, Staff, Divisions
  useEffect(() => {
    async function initData() {
      setIsLoading(true)
      try {
        const [catRes, stuRes, usrRes, divRes, stdRes] = await Promise.all([
          formsApi.getCatalogue(),
          studentsApi.list({ page_size: 100 }),
          usersApi.list({ limit: 50 }),
          divisionsApi.list(),
          standardsApi.list(),
        ])

        const catForms = catRes.data.forms || []
        setCatalogue(catForms)
        setStudents(stuRes.data.data || [])
        setStaffUsers((usrRes.data.items || []).filter((u: UserListItem) => u.role !== 'student'))
        setDivisions(divRes.data || [])
        setStandards(stdRes.data || [])

        // If no recordId in URL, default to first student ID
        const initialStudents = stuRes.data.data || []
        if (!selectedRecordId && initialStudents.length > 0) {
          setSelectedRecordId(initialStudents[0].id)
        }

        // Set default active sections for initially selected form
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
      setErrorMsg(err.response?.data?.detail || 'Failed to render form. Please check permissions.')
    } finally {
      setIsRendering(false)
    }
  }

  // Trigger form preview on selection / parameter change
  useEffect(() => {
    if (!isLoading && catalogue.length > 0) {
      fetchFormPreview()
    }
  }, [selectedFormId, mode, scope, selectedRecordId, selectedDivisionId, selectedStandardId, activeSections])

  // Handle section checkbox toggle
  const toggleSection = (key: string) => {
    setActiveSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  // Native Print Handler
  const handlePrint = () => {
    window.print()
  }

  // Open Audit Logs Modal
  const handleOpenAudit = async () => {
    setShowAuditModal(true)
    setIsLoadingAudit(true)
    try {
      const res = await formsApi.getAuditLogs({ limit: 50 })
      setAuditLogs(res.data.audit_logs || [])
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setIsLoadingAudit(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Printable Forms & Official Documents Engine" />

      {/* ── Page Header & Quick Bar (Hidden during Print) ── */}
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Home</span>
            <span>&rsaquo;</span>
            <span>Operations</span>
            <span>&rsaquo;</span>
            <span className="text-slate-900 font-semibold">Print Forms & KYC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2.5">
            <Printer className="w-6 h-6 text-primary-700" />
            Centralized Printable Forms & KYC Workspace
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            CBSE & DPDP Act 2023 compliant prefilled student/staff dossiers and blank pen-and-paper forms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAudit}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            DPDP Audit Trail
          </button>
          <button
            onClick={handlePrint}
            disabled={isRendering || renderedForms.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-700 rounded-lg hover:bg-primary-800 shadow-sm transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print Form(s)
          </button>
          <button
            onClick={handlePrint}
            disabled={isRendering || renderedForms.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-primary-700 bg-primary-50 border border-indigo-200 rounded-lg hover:bg-primary-100 shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Main Layout: Controls Panel + Live A4 Preview Canvas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Form Catalogue & Settings (No Print) ── */}
        <div className="no-print lg:col-span-4 space-y-4">
          {/* Card 1: Mode & Scope Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
              <span>Form Generation Mode</span>
              <span className="text-[10px] text-primary-700 font-semibold bg-primary-50 px-2 py-0.5 rounded">
                A4 Portrait
              </span>
            </h3>

            {/* Prefilled vs. Blank Selector */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('prefilled')}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  mode === 'prefilled'
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Prefilled Record
              </button>
              <button
                type="button"
                onClick={() => setMode('blank')}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  mode === 'blank'
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Blank Form
              </button>
            </div>

            {/* Single vs. Bulk Selector */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setScope('single')}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  scope === 'single'
                    ? 'bg-white text-primary-900 shadow-sm'
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
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulk Batch Print
              </button>
            </div>

            {/* Target Selectors based on Scope & Entity */}
            {mode === 'prefilled' && scope === 'single' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {currentFormDef?.entity === 'staff' || currentFormDef?.entity === 'user'
                    ? 'Select Staff / Faculty Member'
                    : 'Select Student Particulars'}
                </label>
                {currentFormDef?.entity === 'staff' || currentFormDef?.entity === 'user' ? (
                  <select
                    value={selectedRecordId}
                    onChange={(e) => setSelectedRecordId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white font-medium"
                  >
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.designation || u.role}) - {u.staff_code || u.username}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedRecordId}
                    onChange={(e) => setSelectedRecordId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white font-medium"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.admission_number})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {scope === 'bulk' && (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Class / Standard
                  </label>
                  <select
                    value={selectedStandardId}
                    onChange={(e) => {
                      setSelectedStandardId(e.target.value)
                      setSelectedDivisionId('')
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                  >
                    <option value="">All Standards</option>
                    {standards.map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Batch / Division
                  </label>
                  <select
                    value={selectedDivisionId}
                    onChange={(e) => setSelectedDivisionId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                  >
                    <option value="">All Batches</option>
                    {divisions.map((div) => (
                      <option key={div.id} value={div.id}>
                        {div.name} ({div.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Form Catalogue Directory */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Form Catalogue ({filteredCatalogue.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">Select to preview</span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search forms by title or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50/50"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 text-[10px]">
              {['all', 'student', 'staff', 'parent', 'user', 'operations'].map((ent) => (
                <button
                  key={ent}
                  onClick={() => setEntityFilter(ent)}
                  className={`px-2 py-0.5 rounded-full capitalize font-semibold transition-colors ${
                    entityFilter === ent
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ent === 'all' ? 'All Entities' : ent}
                </button>
              ))}
            </div>

            {/* Forms Scroll List */}
            <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 text-xs">
              {filteredCatalogue.map((form) => {
                const isSelected = form.id === selectedFormId
                return (
                  <div
                    key={form.id}
                    onClick={() => setSelectedFormId(form.id)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-950 text-xs leading-tight">
                        {form.title}
                      </span>
                      <span className="font-mono text-[9px] font-bold text-primary-700 bg-primary-100/70 px-1.5 py-0.2 rounded">
                        {form.code}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 leading-snug">
                      {form.description}
                    </p>
                    <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5">
                      <span className="capitalize font-medium text-slate-600">{form.entity}</span>
                      <span>&bull;</span>
                      <span className="font-medium text-slate-600">{form.category}</span>
                      {form.dpdp_sensitive && (
                        <>
                          <span>&bull;</span>
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5 inline" /> DPDP
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              {filteredCatalogue.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  No forms match your search criteria.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Section Inclusion Configurator */}
          {currentFormDef?.configurable_sections && currentFormDef.configurable_sections.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
                <span>Custom Sections Inclusion</span>
                <span className="text-[10px] font-normal text-slate-500">Toggle on/off</span>
              </h3>
              <div className="space-y-1.5 text-xs">
                {currentFormDef.configurable_sections.map((sec) => (
                  <label
                    key={sec.key}
                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-950 select-none text-[11px]"
                  >
                    <input
                      type="checkbox"
                      checked={activeSections.includes(sec.key)}
                      onChange={() => toggleSection(sec.key)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: A4 Document Preview Canvas (Prints this) ── */}
        <div className="lg:col-span-8 space-y-3">
          {/* Zoom & Page Counter Bar (Hidden during Print) */}
          <div className="no-print bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Zoom Canvas:</span>
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-slate-900 w-12 text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="px-2 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Reset 100%
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-mono text-[11px]">
                Showing {renderedForms.length} page(s)
              </span>
              <button
                onClick={fetchFormPreview}
                className="p-1 text-slate-500 hover:text-slate-800 transition-colors"
                title="Refresh Preview"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRendering ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="no-print bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Canvas Scroll Container */}
          <div className="preview-canvas-viewport bg-slate-100 p-4 md:p-8 rounded-2xl border border-slate-300 min-h-[900px] overflow-auto flex flex-col items-center print:bg-white print:p-0 print:border-none">
            {isRendering ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                <span className="text-xs text-slate-500 font-medium">
                  Rendering authoritative A4 printable form...
                </span>
              </div>
            ) : renderedForms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-2 text-slate-400">
                <FileText className="w-10 h-10 stroke-1" />
                <span className="text-xs font-medium">No form rendered. Please check selection.</span>
              </div>
            ) : (
              <div
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="w-full flex flex-col gap-8 print:transform-none"
              >
                {renderedForms.map((formPayload, idx) => (
                  <div key={idx} className="relative">
                    {/* Visual Page Divider in Screen Mode */}
                    {idx > 0 && (
                      <div className="no-print my-4 border-t-2 border-dashed border-slate-400 flex items-center justify-center">
                        <span className="bg-slate-200 text-slate-600 px-3 py-0.5 rounded-full text-[10px] font-mono -mt-2.5">
                          Page Break &bull; Record {idx + 1}
                        </span>
                      </div>
                    )}
                    <FormTemplateEngine
                      form={formPayload}
                      showPageBreak={idx < renderedForms.length - 1}
                      pageNumber={idx + 1}
                      totalPages={renderedForms.length}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DPDP Audit Logs Modal ── */}
      {showAuditModal && (
        <Modal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
          title="Digital Personal Data Protection (DPDP) Audit Trail"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 text-[11px]">
              Logs of sensitive forms generated or exported in compliance with India DPDP Act 2023 Section 9 and CBSE recordkeeping mandates.
            </p>

            {isLoadingAudit ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic">
                No recent form generation audit events recorded.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto space-y-2">
                {auditLogs.map((log) => {
                  let meta: any = {}
                  try {
                    meta = JSON.parse(log.metadata)
                  } catch (e) {
                    meta = { raw: log.metadata }
                  }
                  return (
                    <div key={log.id} className="border border-slate-200 p-2.5 rounded-lg bg-slate-50/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{meta.form_title || log.action}</span>
                        <span className="font-mono text-[10px] text-slate-500">{log.created_at}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-600">
                        <span>Form ID: <strong className="font-mono">{meta.form_id || '-'}</strong></span>
                        <span>Mode: <strong className="capitalize">{meta.mode || '-'}</strong></span>
                        <span>Count: <strong>{meta.records_count || 1}</strong></span>
                        {log.ip_address && <span>IP: <strong className="font-mono">{log.ip_address}</strong></span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-800 transition-colors"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
