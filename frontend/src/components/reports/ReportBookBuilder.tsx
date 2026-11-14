/**
 * @file        ReportBookBuilder.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.reports
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-14
 * @updated     2026-11-14
 *
 * @description View-first report-book editor that publishes existing report data as an auditable PDF.
 */

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Download, FilePlus2, LockKeyhole, Printer, Save, ShieldCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  academicYearsApi,
  divisionsApi,
  examinationsApi,
  reportsApi,
  standardsApi,
  type ReportBookTemplateRecord,
} from '../../api/endpoints'
import { useBranding } from '../../config/branding'
import type { ReportBookChapter, ReportBookConfiguration, ReportBookData, ReportBookReport } from './reportBookTypes'
import { REPORT_BOOK_PRESETS, createPresetConfiguration } from './reportBookCatalog'
import { loadReportBookData } from './reportBookSources'

interface ReportBookBuilderProps {
  reports: ReportBookReport[]
  institutionId?: number
  selectedAcademicYearId?: number
  userRole?: string
  onBack: () => void
}

const initialConfiguration = (academicYearId?: number): ReportBookConfiguration => ({
  title: 'PrathamOne EduOS Report Book',
  academicYearId,
  pageSize: 'A4',
  marginMm: 15,
  chapters: [],
})

const toConfiguration = (value: unknown): ReportBookConfiguration | null => {
  if (!value || typeof value !== 'object') return null
  const config = value as Partial<ReportBookConfiguration>
  if (!Array.isArray(config.chapters) || typeof config.title !== 'string') return null
  if (!['A4', 'A5', 'Letter', 'Custom'].includes(config.pageSize || '')) return null
  if (!config.chapters.every((chapter) =>
    chapter && typeof chapter.id === 'string' && typeof chapter.title === 'string' &&
    Array.isArray(chapter.reportIds) &&
    (chapter.excludedReportIds === undefined ||
      (Array.isArray(chapter.excludedReportIds) &&
        chapter.excludedReportIds.every((id) => chapter.reportIds?.includes(id)))) &&
    ['reports', 'title', 'divider', 'note', 'appendix'].includes(chapter.kind)
  )) return null
  return {
    ...config,
    title: config.title,
    pageSize: config.pageSize,
    marginMm: typeof config.marginMm === 'number' ? config.marginMm : 15,
    chapters: config.chapters,
  } as ReportBookConfiguration
}

const newChapter = (title: string, kind: ReportBookChapter['kind'], parentId?: string): ReportBookChapter => ({
  id: globalThis.crypto?.randomUUID?.() || `section-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title,
  kind,
  reportIds: [],
  included: true,
  orientation: 'auto',
  parentId,
})

const MANAGER_ROLES = ['superadmin', 'super_admin', 'sysadmin', 'admin', 'principal']
const FINANCIAL_ROLES = ['superadmin', 'super_admin', 'sysadmin', 'admin', 'accountant', 'principal']
const SYSTEM_ROLES = ['superadmin', 'super_admin', 'sysadmin', 'admin', 'principal']

export default function ReportBookBuilder({
  reports,
  institutionId,
  selectedAcademicYearId,
  userRole = '',
  onBack,
}: ReportBookBuilderProps) {
  const branding = useBranding()
  const queryClient = useQueryClient()
  const role = userRole.toLowerCase()
  const [editMode, setEditMode] = useState(false)
  const [configuration, setConfiguration] = useState(() => initialConfiguration(selectedAcademicYearId))
  const [selectedReportId, setSelectedReportId] = useState('')
  const [targetChapterId, setTargetChapterId] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const availableReports = useMemo(() => reports.filter((report) => {
    if (report.requiresSysAdminRole && !SYSTEM_ROLES.includes(role)) return false
    if (report.requiresFinancialRole && !FINANCIAL_ROLES.includes(role)) return false
    return true
  }), [reports, role])

  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useQuery({
    queryKey: ['report-book-templates', institutionId],
    queryFn: () => reportsApi.listBookTemplates(institutionId).then((response) => response.data),
    enabled: Boolean(institutionId),
  })
  const { data: academicYears = [] } = useQuery({
    queryKey: ['report-book-academic-years', institutionId],
    queryFn: () => academicYearsApi.list().then((response) => response.data),
  })
  const { data: standards = [] } = useQuery({
    queryKey: ['report-book-standards', institutionId],
    queryFn: () => standardsApi.list().then((response) => response.data),
  })
  const { data: divisions = [] } = useQuery({
    queryKey: ['report-book-divisions', configuration.standardId],
    queryFn: () => divisionsApi.list(configuration.standardId).then((response) => response.data),
    enabled: Boolean(configuration.standardId),
  })
  const { data: examinations = [] } = useQuery({
    queryKey: ['report-book-examinations', configuration.academicYearId],
    queryFn: () => examinationsApi.list({ academic_year_id: configuration.academicYearId }).then((response) => response.data),
  })

  const saveTemplateMutation = useMutation({
    mutationFn: () => reportsApi.saveBookTemplate(templateName.trim(), configuration, institutionId),
    onSuccess: async () => {
      toast.success('Book template saved.')
      setTemplateName('')
      await queryClient.invalidateQueries({ queryKey: ['report-book-templates', institutionId] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to save the book template.'),
  })

  const loadedTemplate: ReportBookTemplateRecord | undefined = templates.find((item) => String(item.id) === selectedTemplateId)
  const chaptersForParent = configuration.chapters.filter((chapter) => chapter.kind === 'reports' && !chapter.parentId)
  const includedReportIds = useMemo(() => new Set(
    configuration.chapters.flatMap((chapter) => chapter.reportIds),
  ), [configuration.chapters])
  const reportOptions = availableReports.filter((report) => !includedReportIds.has(report.id))
  const selectedExamId = configuration.examinationId

  const updateChapter = (chapterId: string, update: Partial<ReportBookChapter>) => {
    setConfiguration((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) => chapter.id === chapterId ? { ...chapter, ...update } : chapter),
    }))
  }

  const loadPreset = (presetId: string) => {
    if (!editMode) return
    const preset = REPORT_BOOK_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    const next = createPresetConfiguration(preset, availableReports, configuration.academicYearId)
    const unavailable = preset.reportIds.filter((id) => !availableReports.some((report) => report.id === id))
    if (unavailable.length > 0) toast.error(`Some template reports are unavailable for your role (${unavailable.length} omitted).`)
    setConfiguration(next)
  }

  const loadSavedTemplate = () => {
    if (!editMode || !loadedTemplate) return
    const next = toConfiguration(loadedTemplate.configuration)
    if (!next) {
      toast.error('The saved template has an invalid configuration.')
      return
    }
    setConfiguration(next)
  }

  const addReport = () => {
    if (!editMode || !selectedReportId) return
    const report = availableReports.find((item) => item.id === selectedReportId)
    if (!report) return
    const target = configuration.chapters.find((chapter) => chapter.id === targetChapterId && chapter.kind === 'reports')
    if (target) {
      updateChapter(target.id, { reportIds: [...target.reportIds, report.id] })
    } else {
      setConfiguration((current) => ({
        ...current,
        chapters: [...current.chapters, { ...newChapter(report.categoryLabel, 'reports'), reportIds: [report.id] }],
      }))
    }
    setSelectedReportId('')
  }

  const addSection = (kind: ReportBookChapter['kind'], parentId?: string) => {
    if (!editMode) return
    const title = kind === 'title' ? 'Title Page' : kind === 'divider' ? 'Section Divider' : kind === 'note' ? 'Notes' : kind === 'appendix' ? 'Appendix' : 'New Chapter'
    setConfiguration((current) => ({ ...current, chapters: [...current.chapters, newChapter(title, kind, parentId)] }))
  }

  const removeChapter = (chapterId: string) => {
    setConfiguration((current) => ({
      ...current,
      chapters: current.chapters.filter((chapter) => chapter.id !== chapterId && chapter.parentId !== chapterId),
    }))
  }

  const moveChapter = (index: number, direction: -1 | 1) => {
    const moving = configuration.chapters[index]
    if (!moving) return
    setConfiguration((current) => {
      const siblings = current.chapters.filter((chapter) => chapter.parentId === moving.parentId)
      const siblingIndex = siblings.findIndex((chapter) => chapter.id === moving.id)
      const nextSiblingIndex = siblingIndex + direction
      if (siblingIndex < 0 || nextSiblingIndex < 0 || nextSiblingIndex >= siblings.length) return current
      ;[siblings[siblingIndex], siblings[nextSiblingIndex]] = [siblings[nextSiblingIndex], siblings[siblingIndex]]
      const roots = moving.parentId
        ? current.chapters.filter((chapter) => !chapter.parentId)
        : siblings
      const chapters = roots.flatMap((root) => [
        root,
        ...(moving.parentId === root.id
          ? siblings
          : current.chapters.filter((chapter) => chapter.parentId === root.id)),
      ])
      return { ...current, chapters }
    })
  }

  const canMoveChapter = (chapter: ReportBookChapter, direction: -1 | 1) => {
    const siblings = configuration.chapters.filter((item) => item.parentId === chapter.parentId)
    const index = siblings.findIndex((item) => item.id === chapter.id)
    return index + direction >= 0 && index + direction < siblings.length
  }

  const moveReport = (chapterId: string, reportId: string, direction: -1 | 1) => {
    setConfiguration((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) => {
        if (chapter.id !== chapterId) return chapter
        const index = chapter.reportIds.indexOf(reportId)
        const target = index + direction
        if (index < 0 || target < 0 || target >= chapter.reportIds.length) return chapter
        const reportIds = [...chapter.reportIds]
        ;[reportIds[index], reportIds[target]] = [reportIds[target], reportIds[index]]
        return { ...chapter, reportIds }
      }),
    }))
  }

  const includeReport = (chapter: ReportBookChapter, reportId: string, included: boolean) => {
    const excludedReportIds = new Set(chapter.excludedReportIds || [])
    if (included) excludedReportIds.delete(reportId)
    else excludedReportIds.add(reportId)
    updateChapter(chapter.id, { excludedReportIds: [...excludedReportIds] })
  }

  const generate = async (mode: 'download' | 'print', chapterId?: string, onlyReportId?: string) => {
    if (!editMode) {
      toast.error('Activate Edit Mode before generating a book.')
      return
    }
    const selectedChapters = configuration.chapters
      .filter((chapter) => chapter.included && (!chapterId || chapter.id === chapterId))
      .map((chapter) => ({
        ...chapter,
        excludedReportIds: [],
        reportIds: chapter.reportIds.filter((id) =>
          !chapter.excludedReportIds?.includes(id) && (!onlyReportId || id === onlyReportId)),
      }))
    const reportIds = [...new Set(selectedChapters.flatMap((chapter) => chapter.reportIds))]
    if (selectedChapters.length === 0 || (selectedChapters.every((chapter) => chapter.kind === 'reports') && reportIds.length === 0)) {
      toast.error('Include at least one chapter or report before generating.')
      return
    }
    setIsGenerating(true)
    try {
      const reportData: ReportBookData[] = []
      for (const id of reportIds) {
        const report = availableReports.find((item) => item.id === id)
        if (!report) throw new Error(`Report "${id}" is not available for your role.`)
        reportData.push(await loadReportBookData(report, configuration, selectedExamId))
      }
      const generatedAt = new Date().toISOString()
      const documentId = globalThis.crypto?.randomUUID?.()
      if (!documentId) throw new Error('This browser does not support secure document IDs. Use a current browser over HTTPS.')
      const { createReportBookPdf } = await import('./reportBookPdf')
      const academicYear = academicYears.find((year: { id: number }) => year.id === configuration.academicYearId)
      const standard = standards.find((item: { id: number }) => item.id === configuration.standardId)
      const division = divisions.find((item: { id: number }) => item.id === configuration.divisionId)
      const examination = examinations.find((item: { id: number }) => item.id === configuration.examinationId)
      const academicYearLabel = academicYear?.name
      const filterScope = [
        academicYearLabel || 'All academic years',
        examination?.name ? `Examination: ${examination.name}` : undefined,
        configuration.startDate || configuration.endDate ? `${configuration.startDate || 'Start'} to ${configuration.endDate || 'Current'}` : 'All dates',
        standard?.name || 'All standards',
        division?.name || 'All batches',
      ].filter(Boolean).join(' · ')
      const generationTitle = onlyReportId
        ? availableReports.find((item) => item.id === onlyReportId)?.name || configuration.title
        : chapterId
          ? selectedChapters[0]?.title || configuration.title
          : configuration.title
      const snapshot = {
        documentId,
        title: generationTitle,
        generatedAt,
        academicYearId: configuration.academicYearId,
        academicYearLabel,
        examinationId: configuration.examinationId,
        examinationLabel: examination?.name,
        startDate: configuration.startDate,
        endDate: configuration.endDate,
        standardId: configuration.standardId,
        standardLabel: standard?.name,
        divisionId: configuration.divisionId,
        divisionLabel: division?.name,
        filterScope,
        reportIds,
        reportRowCounts: Object.fromEntries(reportData.map((item) => [item.reportId, item.rows.length])),
        pageSize: configuration.pageSize,
      }
      const generatedConfiguration = { ...configuration, title: generationTitle, chapters: selectedChapters }
      const bytes = await createReportBookPdf(
        generatedConfiguration,
        selectedChapters,
        reportData,
        {
          institutionName: branding.academyName,
          logoUrl: branding.assets.academyLogoPngUrl,
          softwareLogoUrl: branding.assets.softwareLogoSvgUrl,
          primaryColor: branding.colors.primary,
        },
        snapshot,
      )
      await reportsApi.recordBookGeneration({
        document_id: documentId,
        title: generationTitle,
        academic_year_id: configuration.academicYearId,
        academic_year_label: academicYearLabel,
        examination_id: configuration.examinationId,
        examination_label: examination?.name,
        start_date: configuration.startDate,
        end_date: configuration.endDate,
        standard_id: configuration.standardId,
        standard_label: standard?.name,
        division_id: configuration.divisionId,
        division_label: division?.name,
        filter_scope: filterScope,
        report_ids: reportIds,
        report_row_counts: snapshot.reportRowCounts,
        page_size: configuration.pageSize,
        book_configuration: generatedConfiguration,
      }, institutionId)
      const action = mode === 'download' ? 'DOWNLOAD' : 'PRINT'
      await reportsApi.recordBookEvent(documentId, action, institutionId)
      const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      if (mode === 'download') {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${generationTitle.replace(/[^a-z0-9-_]+/gi, '_')}_${generatedAt.slice(0, 10)}.pdf`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } else {
        const printWindow = window.open(url, '_blank')
        if (!printWindow) throw new Error('The browser blocked the print preview. Allow pop-ups and try again.')
        printWindow.addEventListener('load', () => printWindow.print(), { once: true })
      }
      await queryClient.invalidateQueries({ queryKey: ['report-book-generations', institutionId] })
      toast.success(mode === 'download' ? 'PDF report book generated.' : 'Print preview opened.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Report book generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  const addReportToChapter = (chapter: ReportBookChapter) => {
    if (!editMode || !selectedReportId) return
    const report = availableReports.find((item) => item.id === selectedReportId)
    if (!report) return
    updateChapter(chapter.id, { reportIds: [...chapter.reportIds, report.id] })
    setSelectedReportId('')
  }

  const setFilter = (key: keyof ReportBookConfiguration, value: string) => {
    const numberKeys = ['academicYearId', 'examinationId', 'standardId', 'divisionId']
    const nextValue = value ? (numberKeys.includes(key) ? Number(value) : value) : undefined
    setConfiguration((current) => ({ ...current, [key]: nextValue }))
    if (key === 'standardId') setConfiguration((current) => ({ ...current, divisionId: undefined }))
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button type="button" onClick={onBack} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Back to reports">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">PrathamOne EduOS · Reports</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><BookOpen className="h-6 w-6" /> Report Book Builder</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">Compose print-ready books from authorized live reports. Source calculations remain in their existing report APIs.</p>
          </div>
        </div>
        <button type="button" onClick={() => setEditMode((current) => !current)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${editMode ? 'bg-amber-100 text-amber-900' : 'bg-slate-900 text-white'}`}>
          {editMode ? <ShieldCheck className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
          {editMode ? 'Edit Mode Active' : 'Activate Edit Mode'}
        </button>
      </header>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        View Mode is active by default. Enable scoped Edit Mode to change configuration, save templates, or generate/print a book. Source report permissions and institution scope are rechecked by their original APIs.
      </div>

      {templatesError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Saved templates could not be loaded.</p>}

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Book title
          <input disabled={!editMode} value={configuration.title} onChange={(event) => setConfiguration((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={200} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700">Load predefined template
            <select disabled={!editMode} defaultValue="" onChange={(event) => loadPreset(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Select template</option>
              {REPORT_BOOK_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Load saved template
            <div className="mt-1 flex gap-2">
              <select disabled={!editMode || templatesLoading} value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2">
                <option value="">{templatesLoading ? 'Loading…' : 'Select saved'}</option>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
              <button type="button" disabled={!editMode || !loadedTemplate} onClick={loadSavedTemplate} className="rounded-lg border border-slate-300 px-3 text-sm disabled:opacity-50">Open</button>
            </div>
          </label>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">Academic year
          <select disabled={!editMode} value={configuration.academicYearId || ''} onChange={(event) => setFilter('academicYearId', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">All available years</option>
            {academicYears.map((year: { id: number; name?: string; start_year?: number; end_year?: number }) => <option key={year.id} value={year.id}>{year.name || `${year.start_year || ''}-${year.end_year || ''}`}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Examination
          <select disabled={!editMode} value={configuration.examinationId || ''} onChange={(event) => setFilter('examinationId', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">All examinations</option>
            {examinations.map((exam: { id: number; name: string }) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Standard
          <select disabled={!editMode} value={configuration.standardId || ''} onChange={(event) => setFilter('standardId', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">All standards</option>
            {standards.map((standard: { id: number; name: string }) => <option key={standard.id} value={standard.id}>{standard.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Batch / division
          <select disabled={!editMode || !configuration.standardId} value={configuration.divisionId || ''} onChange={(event) => setFilter('divisionId', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">All batches</option>
            {divisions.map((division: { id: number; name: string }) => <option key={division.id} value={division.id}>{division.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Start date
          <input disabled={!editMode} type="date" value={configuration.startDate || ''} onChange={(event) => setFilter('startDate', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">End date
          <input disabled={!editMode} type="date" value={configuration.endDate || ''} onChange={(event) => setFilter('endDate', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700">Page size
            <select disabled={!editMode} value={configuration.pageSize} onChange={(event) => setConfiguration((current) => ({ ...current, pageSize: event.target.value as ReportBookConfiguration['pageSize'] }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              {['A4', 'A5', 'Letter', 'Custom'].map((size) => <option key={size}>{size}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Margins (mm)
            <input disabled={!editMode} type="number" min={5} max={30} value={configuration.marginMm} onChange={(event) => setConfiguration((current) => ({ ...current, marginMm: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>
        {configuration.pageSize === 'Custom' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-slate-700">Width (mm)<input disabled={!editMode} type="number" min={100} max={1000} value={configuration.customWidthMm || 210} onChange={(event) => setConfiguration((current) => ({ ...current, customWidthMm: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Height (mm)<input disabled={!editMode} type="number" min={100} max={1000} value={configuration.customHeightMm || 297} onChange={(event) => setConfiguration((current) => ({ ...current, customHeightMm: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-sm font-medium text-slate-700">Add existing report
            <select aria-label="Add existing report" disabled={!editMode} value={selectedReportId} onChange={(event) => setSelectedReportId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Select report</option>
              {reportOptions.map((report) => <option key={report.id} value={report.id}>{report.categoryLabel} · {report.name}</option>)}
            </select>
          </label>
          <label className="min-w-48 text-sm font-medium text-slate-700">Add to chapter
            <select disabled={!editMode || chaptersForParent.length === 0} value={targetChapterId} onChange={(event) => setTargetChapterId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Create new chapter</option>
              {chaptersForParent.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
            </select>
          </label>
          <button type="button" disabled={!editMode || !selectedReportId} onClick={addReport} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><FilePlus2 className="h-4 w-4" /> Add report</button>
          <button type="button" disabled={!editMode} onClick={() => addSection('divider')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Add divider</button>
          <button type="button" disabled={!editMode} onClick={() => addSection('title')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Add title page</button>
          <button type="button" disabled={!editMode} onClick={() => addSection('note')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Add notes</button>
          <button type="button" disabled={!editMode} onClick={() => addSection('appendix')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Add appendix</button>
        </div>

        <div className="space-y-3">
          {configuration.chapters.map((chapter, index) => {
            const parent = configuration.chapters.find((item) => item.id === chapter.parentId)
            const chapterReports = chapter.reportIds.map((reportId) => availableReports.find((report) => report.id === reportId)).filter(Boolean)
            return (
              <article key={chapter.id} className={`rounded-lg border p-3 ${chapter.included ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-70'} ${chapter.parentId ? 'ml-6 border-l-4 border-l-blue-200' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <input aria-label={`Include ${chapter.title}`} type="checkbox" checked={chapter.included} disabled={!editMode} onChange={(event) => updateChapter(chapter.id, { included: event.target.checked })} />
                  <input aria-label="Section title" disabled={!editMode} value={chapter.title} onChange={(event) => updateChapter(chapter.id, { title: event.target.value })} className="min-w-48 flex-1 rounded-md border border-slate-300 px-2 py-1.5 font-semibold" />
                  <span className="text-xs text-slate-500">{parent ? `Subchapter of ${parent.title}` : chapter.kind}</span>
                  {chapter.kind === 'reports' && (
                    <select aria-label="Section orientation" disabled={!editMode} value={chapter.orientation} onChange={(event) => updateChapter(chapter.id, { orientation: event.target.value as ReportBookChapter['orientation'] })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                      <option value="auto">Auto orientation</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option>
                    </select>
                  )}
                  {!chapter.parentId && chapter.kind === 'reports' && <button type="button" disabled={!editMode} onClick={() => addSection('reports', chapter.id)} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:opacity-50">Add subchapter</button>}
                  <button type="button" disabled={!editMode || !canMoveChapter(chapter, -1)} onClick={() => moveChapter(index, -1)} className="rounded-md p-1.5 text-slate-600 disabled:opacity-40" aria-label="Move section up"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" disabled={!editMode || !canMoveChapter(chapter, 1)} onClick={() => moveChapter(index, 1)} className="rounded-md p-1.5 text-slate-600 disabled:opacity-40" aria-label="Move section down"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" disabled={!editMode} onClick={() => removeChapter(chapter.id)} className="rounded-md p-1.5 text-rose-700 disabled:opacity-40" aria-label="Remove section"><Trash2 className="h-4 w-4" /></button>
                  <button type="button" disabled={!editMode || !chapter.included || chapterReports.length !== 1} onClick={() => generate('download', chapter.id, chapter.reportIds[0])} className="rounded-md border border-blue-200 px-2 py-1.5 text-xs text-blue-800 disabled:opacity-40">Report PDF</button>
                </div>
                {chapter.kind === 'reports' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {chapterReports.map((report, reportIndex) => report && (
                      <span key={report.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${chapter.excludedReportIds?.includes(report.id) ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-900'}`}>
                        <input
                          type="checkbox"
                          aria-label={`Include ${report.name}`}
                          checked={!chapter.excludedReportIds?.includes(report.id)}
                          disabled={!editMode}
                          onChange={(event) => includeReport(chapter, report.id, event.target.checked)}
                        />
                        {report.name}
                        <button type="button" disabled={!editMode || reportIndex === 0} onClick={() => moveReport(chapter.id, report.id, -1)} className="font-bold disabled:opacity-40" aria-label={`Move ${report.name} up`}>↑</button>
                        <button type="button" disabled={!editMode || reportIndex === chapterReports.length - 1} onClick={() => moveReport(chapter.id, report.id, 1)} className="font-bold disabled:opacity-40" aria-label={`Move ${report.name} down`}>↓</button>
                        <button type="button" disabled={!editMode} onClick={() => updateChapter(chapter.id, {
                          reportIds: chapter.reportIds.filter((id) => id !== report.id),
                          excludedReportIds: chapter.excludedReportIds?.filter((id) => id !== report.id),
                        })} className="font-bold disabled:opacity-40" aria-label={`Remove ${report.name}`}>×</button>
                      </span>
                    ))}
                    {chapterReports.length === 0 && <span className="text-xs text-slate-500">No reports included in this section.</span>}
                    <button type="button" disabled={!editMode || reportOptions.length === 0} onClick={() => { setTargetChapterId(chapter.id); document.querySelector<HTMLSelectElement>('select[aria-label="Add existing report"]')?.focus() }} className="text-xs font-semibold text-blue-700">Select report above to add</button>
                    {targetChapterId === chapter.id && selectedReportId && <button type="button" disabled={!editMode} onClick={() => addReportToChapter(chapter)} className="text-xs font-semibold text-blue-700">Add selected report here</button>}
                  </div>
                )}
                {(chapter.kind === 'note' || chapter.kind === 'appendix') && <textarea disabled={!editMode} aria-label={`${chapter.title} text`} value={chapter.notes || ''} onChange={(event) => updateChapter(chapter.id, { notes: event.target.value })} maxLength={10000} rows={3} className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm" placeholder="Enter text to publish in this section." />}
                {chapter.kind === 'divider' && <p className="mt-2 text-xs text-slate-500">A full-page section divider will be included in the contents.</p>}
              </article>
            )
          })}
          {configuration.chapters.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Choose a predefined book or activate Edit Mode and add report chapters.</p>}
        </div>
      </section>

      <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-slate-700">Template name
            <input disabled={!editMode || !MANAGER_ROLES.includes(role)} value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={160} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. Annual 2026 book" />
          </label>
          <button type="button" disabled={!editMode || !MANAGER_ROLES.includes(role) || !templateName.trim() || configuration.chapters.length === 0 || saveTemplateMutation.isPending} onClick={() => saveTemplateMutation.mutate()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"><Save className="h-4 w-4" /> Save template</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!editMode || isGenerating} onClick={() => generate('download')} className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" /> {isGenerating ? 'Generating…' : 'Download selected PDF'}</button>
          <button type="button" disabled={!editMode || isGenerating} onClick={() => generate('print')} className="inline-flex items-center gap-2 rounded-lg border border-blue-800 px-4 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50"><Printer className="h-4 w-4" /> Print preview</button>
        </div>
      </section>
    </div>
  )
}
