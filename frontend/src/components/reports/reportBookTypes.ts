/**
 * @file        reportBookTypes.ts
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
 * @description Shared contracts for report-book templates, source reports, and generation snapshots.
 */

export interface ReportBookReport {
  id: string
  name: string
  category: string
  categoryLabel: string
  description: string
  requiresFinancialRole?: boolean
  requiresSysAdminRole?: boolean
}

export type ReportBookSectionKind = 'reports' | 'title' | 'divider' | 'note' | 'appendix'
export type ReportBookOrientation = 'auto' | 'portrait' | 'landscape'

export interface ReportBookChapter {
  id: string
  title: string
  kind: ReportBookSectionKind
  reportIds: string[]
  excludedReportIds?: string[]
  notes?: string
  included: boolean
  orientation: ReportBookOrientation
  parentId?: string
}

export interface ReportBookConfiguration {
  title: string
  academicYearId?: number
  examinationId?: number
  startDate?: string
  endDate?: string
  standardId?: number
  divisionId?: number
  pageSize: 'A4' | 'A5' | 'Letter' | 'Custom'
  customWidthMm?: number
  customHeightMm?: number
  marginMm: number
  chapters: ReportBookChapter[]
}

export interface ReportBookData {
  reportId: string
  title: string
  description: string
  columns: Array<{ key: string; label: string }>
  rows: Array<Record<string, unknown>>
  summary: Array<{ label: string; value: string }>
  charts: Array<{ title: string; labels: string[]; values: number[]; valueLabel: string }>
  filterNote?: string
  orientation: Exclude<ReportBookOrientation, 'auto'>
}

export interface ReportBookGenerationSnapshot {
  documentId: string
  title: string
  generatedAt: string
  academicYearId?: number
  academicYearLabel?: string
  examinationId?: number
  examinationLabel?: string
  startDate?: string
  endDate?: string
  standardId?: number
  standardLabel?: string
  divisionId?: number
  divisionLabel?: string
  filterScope?: string
  reportIds: string[]
  reportRowCounts: Record<string, number>
  pageSize: ReportBookConfiguration['pageSize']
}
