/**
 * @file        reportBookCatalog.ts
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
 * @description Report-book preset configurations that reference existing report definitions.
 */

import type { ReportBookChapter, ReportBookConfiguration, ReportBookReport } from './reportBookTypes'

export interface ReportBookPreset {
  id: string
  name: string
  description: string
  reportIds: string[]
}

export const REPORT_BOOK_PRESETS: ReportBookPreset[] = [
  { id: 'academic-performance', name: 'Academic Performance Book', description: 'Student roster, examination merit, and faculty load.', reportIds: ['student-master', 'exam-merit', 'faculty-load'] },
  { id: 'student-attendance', name: 'Student Attendance Book', description: 'Attendance compliance and homework register.', reportIds: ['student-attendance', 'homework-register'] },
  { id: 'examination-results', name: 'Examination & Results Book', description: 'Merit roster and exam analytics.', reportIds: ['exam-merit', 'exam-analytics'] },
  { id: 'homework-assignments', name: 'Homework & Assignment Book', description: 'Daily homework checking register.', reportIds: ['homework-register'] },
  { id: 'fees-collection', name: 'Fees Collection Book', description: 'Collection register, daily intake, and reconciliation.', reportIds: ['collection', 'daily-collection', 'fee-reconciliation'] },
  { id: 'outstanding-concession', name: 'Outstanding & Concession Book', description: 'Outstanding balances, fee defaulters, and governed concessions.', reportIds: ['outstanding', 'fee-defaulters', 'student-concession-statement'] },
  { id: 'admission-register', name: 'Student Admission Register', description: 'Student master directory, admissions pipeline, and exits.', reportIds: ['student-master', 'crm-enquiries', 'withdrawals'] },
  { id: 'teacher-performance', name: 'Teacher Performance Book', description: 'Faculty teaching load and teaching-hours report.', reportIds: ['faculty-load', 'payroll-teaching-hours'] },
  { id: 'staff-payroll', name: 'Staff & Payroll Book', description: 'Monthly payroll register and disbursement vouchers.', reportIds: ['payroll-monthly-register', 'payroll-vouchers'] },
  { id: 'annual-institution', name: 'Annual Institution Report', description: 'Academic, attendance, examination, and financial reports.', reportIds: ['academic-distribution', 'student-master', 'student-attendance', 'exam-merit', 'collection', 'faculty-load'] },
  { id: 'academic-year-closing', name: 'Complete Academic Year Closing Book', description: 'Year-end student, attendance, examination, fee, and payroll reports.', reportIds: ['student-master', 'student-attendance', 'exam-merit', 'collection', 'outstanding', 'fee-reconciliation', 'faculty-load', 'payroll-monthly-register'] },
]

const makeChapter = (title: string, reportIds: string[], order: number): ReportBookChapter => ({
  id: `chapter-${order}-${reportIds[0]}`,
  title,
  kind: 'reports',
  reportIds,
  included: true,
  orientation: 'auto',
})

export const createPresetConfiguration = (
  preset: ReportBookPreset,
  reports: ReportBookReport[],
  academicYearId?: number,
): ReportBookConfiguration => {
  const allowedIds = new Set(reports.map((report) => report.id))
  const reportIds = preset.reportIds.filter((id) => allowedIds.has(id))
  const grouped = new Map<string, string[]>()
  for (const id of reportIds) {
    const report = reports.find((item) => item.id === id)
    const title = report?.categoryLabel || 'Reports'
    grouped.set(title, [...(grouped.get(title) || []), id])
  }
  const chapters: ReportBookChapter[] = []
  for (const [chapterTitle, ids] of grouped) {
    const chapter = makeChapter(chapterTitle, [], chapters.length + 1)
    chapters.push(chapter)
    ids.forEach((id, index) => {
      const report = reports.find((item) => item.id === id)
      const subchapter = makeChapter(report?.name || id, [id], index + 1)
      subchapter.parentId = chapter.id
      chapters.push(subchapter)
    })
  }

  return {
    title: preset.name,
    academicYearId,
    pageSize: 'A4',
    marginMm: 15,
    chapters,
  }
}
