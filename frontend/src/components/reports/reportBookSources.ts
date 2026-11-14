/**
 * @file        reportBookSources.ts
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
 * @description Loads report-book sections from the established reports APIs without duplicating report logic.
 */

import {
  academicReportsApi,
  communicationApi,
  eduboardApi,
  examinationsApi,
  feesApi,
  homeworkApi,
  importExportApi,
  leadsApi,
  reportsApi,
  teacherPayrollApi,
} from '../../api/endpoints'
import type { ReportBookConfiguration, ReportBookData, ReportBookReport } from './reportBookTypes'

type Filters = Pick<ReportBookConfiguration, 'academicYearId' | 'examinationId' | 'startDate' | 'endDate' | 'standardId' | 'divisionId'>

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const extractRows = (payload: unknown, reportId: string): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) return payload.map(record)
  const source = record(payload)
  const preferredKeys: Record<string, string> = {
    'withdrawal-analytics': 'by_reason',
    'fee-reconciliation': 'batch_breakdown',
    'exam-analytics': 'subject_analytics',
    'eduboard-summary': 'recent_boards',
  }
  const preferred = preferredKeys[reportId]
  if (preferred && Array.isArray(source[preferred])) return (source[preferred] as unknown[]).map(record)
  for (const key of ['rows', 'items', 'results', 'records', 'data', 'reports']) {
    const value = source[key]
    if (Array.isArray(value)) return value.map(record)
    if (value && typeof value === 'object') {
      const nested = extractRows(value, reportId)
      if (nested.length > 0) return nested
    }
  }
  return []
}

const extractSummary = (payload: unknown, reportId: string): Array<{ label: string; value: string }> => {
  const source = record(payload)
  const summary = record(source.summary || source.totals || source.kpis)
  const summaryValues = Object.entries(summary)
    .filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value))
    .map(([label, value]) => ({ label: label.replace(/_/g, ' '), value: displayValue(value) }))
  if (summaryValues.length > 0) return summaryValues
  if (reportId === 'exam-analytics') {
    return ['exam_name', 'appeared_candidates', 'class_average', 'pass_percentage', 'highest_score', 'lowest_score']
      .filter((key) => source[key] !== undefined)
      .map((key) => ({ label: key.replace(/_/g, ' '), value: displayValue(source[key]) }))
  }
  return []
}

const chartFromRows = (
  title: string,
  values: unknown,
  labelKey: string,
  valueKey: string,
  valueLabel: string,
) => {
  if (!Array.isArray(values)) return undefined
  const rows = values.map(record).filter((row) => typeof row[valueKey] === 'number' && Number.isFinite(row[valueKey]))
  if (rows.length === 0) return undefined
  return {
    title,
    labels: rows.map((row) => String(row[labelKey] ?? '')),
    values: rows.map((row) => Number(row[valueKey])),
    valueLabel,
  }
}

const extractCharts = (payload: unknown, reportId: string) => {
  const source = record(payload)
  const candidates: Record<string, Array<ReturnType<typeof chartFromRows>>> = {
    'withdrawal-analytics': [
      chartFromRows('Withdrawals by reason', source.by_reason, 'reason', 'count', 'Students'),
      chartFromRows('Monthly withdrawal trend', source.trends_monthly, 'month', 'count', 'Students'),
    ],
    'fee-reconciliation': [
      chartFromRows('Fee collection by batch', source.batch_breakdown, 'batch_name', 'collected', 'Amount'),
      chartFromRows('Monthly fee collection trend', source.monthly_trends, 'month_label', 'collected', 'Amount'),
    ],
    'exam-analytics': [
      chartFromRows('Average marks by subject', source.subject_analytics, 'subject_name', 'average_marks', 'Marks'),
    ],
    'academic-distribution': [
      chartFromRows('Student distribution by board', Array.isArray(payload) ? payload : source.rows, 'board_name', 'student_count', 'Students'),
    ],
    'batch-capacity': [
      chartFromRows('Batch occupancy', Array.isArray(payload) ? payload : source.rows, 'batch_name', 'active_students', 'Students'),
    ],
  }
  return (candidates[reportId] || []).filter((chart): chart is NonNullable<typeof chart> => Boolean(chart))
}

const APPLIED_FILTERS: Record<string, Array<keyof Filters>> = {
  'student-master': ['academicYearId', 'standardId', 'divisionId'],
  'student-attendance': ['academicYearId', 'standardId', 'divisionId', 'startDate', 'endDate'],
  withdrawals: ['academicYearId', 'standardId', 'divisionId'],
  'withdrawal-analytics': ['academicYearId'],
  'batch-capacity': ['standardId'],
  'curriculum-matrix': ['standardId'],
  'timetable-utilization': ['divisionId'],
  'homework-register': ['standardId', 'divisionId'],
  'eduboard-summary': ['academicYearId'],
  collection: ['academicYearId'],
  outstanding: ['academicYearId'],
  'fee-defaulters': ['academicYearId', 'standardId', 'divisionId'],
  'daily-collection': ['startDate', 'endDate'],
  summary: ['academicYearId'],
  'fee-reconciliation': ['academicYearId'],
  'exam-merit': ['academicYearId', 'examinationId'],
  'exam-analytics': ['examinationId'],
  'audit-logs': ['startDate', 'endDate'],
}

const requestedFilterLabels: Array<[keyof Filters, string]> = [
  ['academicYearId', 'Academic year'],
  ['examinationId', 'Examination'],
  ['startDate', 'Start date'],
  ['endDate', 'End date'],
  ['standardId', 'Standard'],
  ['divisionId', 'Batch'],
]

const rowsToReport = (report: ReportBookReport, payload: unknown): ReportBookData => {
  const source = record(payload)
  const rows = extractRows(payload, report.id)
  const declaredColumns = Array.isArray(source.columns)
    ? source.columns.map((column) => {
      if (typeof column === 'string') return { key: column, label: column }
      const item = record(column)
      const key = String(item.accessorKey || item.key || item.id || item.name || '')
      return {
        key,
        label: String(item.header || item.label || item.name || key),
      }
    }).filter((column) => column.key && column.label)
    : []
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const columns = declaredColumns.length > 0
    ? declaredColumns
    : keys.map((key) => ({ key, label: key.replace(/_/g, ' ') }))
  const orientation = columns.length > 7 ? 'landscape' : 'portrait'
  return {
    reportId: report.id,
    title: report.name,
    description: report.description,
    columns,
    rows,
    summary: extractSummary(payload, report.id),
    charts: extractCharts(payload, report.id),
    orientation,
    filterNote: '',
  }
}

export async function loadReportBookData(
  report: ReportBookReport,
  filters: Filters,
  examId?: number,
): Promise<ReportBookData> {
  const params = {
    academic_year_id: filters.academicYearId,
    start_date: filters.startDate,
    end_date: filters.endDate,
    standard_id: filters.standardId,
    division_id: filters.divisionId,
  }
  const supportedFilters = report.category === 'concessions'
    ? new Set<keyof Filters>(['academicYearId', 'startDate', 'endDate', 'standardId', 'divisionId'])
    : report.id.startsWith('payroll-')
      ? new Set<keyof Filters>(['startDate', 'endDate'])
      : new Set<keyof Filters>(APPLIED_FILTERS[report.id] || [])
  const unappliedFilters = requestedFilterLabels
    .filter(([key]) => filters[key] !== undefined && filters[key] !== '' && !supportedFilters.has(key))
    .map(([, label]) => label)
  let payload: unknown

  if (report.category === 'concessions') {
    payload = (await reportsApi.concessionReport(report.id, params)).data
  } else if (report.id.startsWith('payroll-')) {
    payload = (await teacherPayrollApi.getReport(report.id.replace('payroll-', ''), params)).data
  } else {
    switch (report.id) {
      case 'student-master':
        payload = (await reportsApi.studentMasterDirectory(params)).data
        break
      case 'student-attendance':
        payload = (await reportsApi.attendanceSummary(params)).data
        break
      case 'withdrawals':
        payload = (await reportsApi.withdrawals(params)).data
        break
      case 'withdrawal-analytics':
        payload = (await reportsApi.withdrawalAnalytics({ academic_year_id: filters.academicYearId })).data
        break
      case 'crm-enquiries':
        payload = (await leadsApi.getReportsAnalytics()).data
        break
      case 'batch-capacity':
        payload = (await academicReportsApi.getBatchCapacity(params)).data
        break
      case 'academic-distribution':
        payload = (await academicReportsApi.getDistribution()).data
        break
      case 'curriculum-matrix':
        payload = (await reportsApi.curriculumMatrix(params)).data
        break
      case 'timetable-utilization':
        payload = (await reportsApi.timetableUtilization(params)).data
        break
      case 'homework-register':
        payload = (await homeworkApi.getDailyRegisterReport(params)).data
        break
      case 'eduboard-summary':
        payload = (await eduboardApi.getReportsSummary(filters.academicYearId)).data
        break
      case 'collection':
        payload = (await reportsApi.feeCollection({ ...params, institution_id: undefined })).data
        break
      case 'outstanding':
        payload = (await reportsApi.outstanding({ ...params, institution_id: undefined })).data
        break
      case 'fee-defaulters':
        payload = (await reportsApi.feeDefaulters(params)).data
        break
      case 'daily-collection':
        payload = (await reportsApi.dailyCollection({ start_date: filters.startDate, end_date: filters.endDate })).data
        break
      case 'summary':
        payload = (await reportsApi.paymentsSummary({ academic_year_id: filters.academicYearId })).data
        break
      case 'fee-reconciliation':
        payload = (await feesApi.getOverview({ academic_year_id: filters.academicYearId })).data
        break
      case 'faculty-load':
        payload = (await academicReportsApi.getFacultyLoad()).data
        break
      case 'exam-merit':
        payload = (await reportsApi.examMeritRegister({ exam_id: examId, academic_year_id: filters.academicYearId })).data
        break
      case 'exam-analytics':
        if (!examId) throw new Error('Select an examination before adding the exam analytics report.')
        payload = (await examinationsApi.getAnalytics(examId)).data
        break
      case 'audit-logs':
        payload = (await reportsApi.systemAuditSummary({ start_date: filters.startDate, end_date: filters.endDate, limit: 200 })).data
        break
      case 'comm-logs':
        payload = (await communicationApi.getLogs()).data
        break
      case 'import-history':
        payload = (await importExportApi.getHistory()).data
        break
      default:
        throw new Error(`The "${report.name}" report has no report-book source adapter yet.`)
    }
  }

  const result = rowsToReport(report, payload)
  result.filterNote = unappliedFilters.length > 0
    ? `Source report does not apply selected filters: ${unappliedFilters.join(', ')}.`
    : 'Selected filters are applied by the source report.'
  return result
}
