/**
 * @file        ReportCardModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-06
 * @updated     2026-11-13
 *
 * @description Official Printable Graphical Student Report Card modal with A4 transcript layout, progress bars, and analytics.
 */

import React, { useState, useEffect } from 'react'
import { PrintFooter, useUniversalPrint } from './printing'
import {
  X, Printer, Award, User, GraduationCap, CheckCircle2,
  XCircle, AlertCircle, TrendingUp, Calendar, Trophy, Download
} from 'lucide-react'
import { examinationsApi } from '../api/endpoints'
import type { StudentReportCardData } from '../types'
import toast from 'react-hot-toast'

interface ReportCardModalProps {
  isOpen: boolean
  onClose: () => void
  examId?: number | string
  studentId?: number | string
  scale?: string
  initialData?: StudentReportCardData | null
}

export default function ReportCardModal({
  isOpen,
  onClose,
  examId,
  studentId,
  scale,
  initialData,
}: ReportCardModalProps) {
  const { openPrint, PrintModal } = useUniversalPrint()
  const [loading, setLoading] = useState<boolean>(false)
  const [report, setReport] = useState<StudentReportCardData | null>(initialData || null)

  useEffect(() => {
    if (initialData) {
      setReport(initialData)
      return
    }
    if (isOpen && examId && studentId) {
      fetchReport()
    }
  }, [isOpen, examId, studentId, scale, initialData])

  const fetchReport = async () => {
    if (!examId || !studentId) return
    try {
      setLoading(true)
      const res = await examinationsApi.getReportCard(examId, studentId, scale)
      setReport(res.data)
    } catch (err: any) {
      console.error('Failed to load report card:', err)
      toast.error('Failed to load student report card.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const handlePrint = () => {
    openPrint({
      targetElementId: 'printable-report-card',
      documentType: 'report_card',
      documentTitle: `Academic Report Card - ${report?.student?.full_name || 'Student'}`,
      initialSettings: {
        paperSize: 'A4',
        orientation: 'portrait',
        confidentiality: 'Official Academic Transcript',
        documentId: `EXAM-${report?.student?.admission_number || report?.student?.id || studentId || '001'}`,
      },
    })
  }

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A+':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'A':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'B':
        return 'bg-primary-100 text-primary-800 border-blue-300'
      case 'C':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'D':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300'
    }
  }

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-600'
    if (pct >= 60) return 'bg-primary-600'
    if (pct >= 35) return 'bg-amber-500'
    return 'bg-rose-600'
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0"
    >
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-200 overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none">
        {/* Screen Controls Header (Hidden on Print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Student Academic Report Card</h2>
              <p className="text-xs text-white/70">
                {report ? `${report.student.full_name} (${report.student.roll_number}) • ${report.examination.name}` : 'Loading transcript…'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !report}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Print Transcript
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700" />
            <p className="text-sm font-medium text-gray-500">Generating transcript and calculating analytics…</p>
          </div>
        ) : !report ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold">Report card data not found</p>
            <p className="text-xs text-gray-400 mt-1">Please ensure examination marks have been entered for this candidate.</p>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6 text-gray-800 print:p-8 bg-white" id="printable-report-card">
            {/* Institute Transcript Banner */}
            <div className="border-b-2 border-primary-800 pb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-800 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-white ring-2 ring-primary-100 flex-shrink-0">
                  <GraduationCap className="w-9 h-9" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 uppercase">
                    {report.institution.name}
                  </h1>
                  <p className="text-xs font-medium text-primary-700 italic">
                    {report.institution.tagline || 'Excellence in Coaching & Mentorship'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {report.institution.address ? `${report.institution.address}, ` : ''}{report.institution.city || ''} {report.institution.phone ? `• Tel: ${report.institution.phone}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="inline-block px-3 py-1 bg-primary-50 text-primary-900 border border-primary-200 rounded-md text-xs font-bold tracking-wider uppercase">
                  Statement of Marks
                </span>
                <p className="text-xs font-semibold text-gray-600 mt-1">{report.examination.name}</p>
                <p className="text-[11px] text-gray-400">Type: {report.examination.exam_type}</p>
                {report.summary.grading_scale_name && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {report.summary.grading_scale_name}
                  </span>
                )}
              </div>
            </div>

            {/* Student Profile Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-gray-400 block font-medium uppercase text-[10px]">Student Name</span>
                <span className="font-bold text-gray-900 text-sm">{report.student.full_name}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium uppercase text-[10px]">Roll No / Admission No</span>
                <span className="font-semibold text-gray-800">{report.student.roll_number} / {report.student.admission_number}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium uppercase text-[10px]">Standard & Division</span>
                <span className="font-semibold text-gray-800">{report.student.standard_name} {report.student.division_name ? `(${report.student.division_name})` : ''}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium uppercase text-[10px]">Guardian / Contact</span>
                <span className="font-semibold text-gray-800">{report.student.guardian_name || 'Guardian'} {report.student.guardian_phone ? `(${report.student.guardian_phone})` : ''}</span>
              </div>
            </div>

            {/* Marks & Performance Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-gray-200 text-gray-600 uppercase text-[10px] tracking-wider text-left">
                    <th className="py-2.5 px-3 font-semibold">Subject / Paper</th>
                    <th className="py-2.5 px-2 text-center font-semibold">Max</th>
                    <th className="py-2.5 px-2 text-center font-semibold">Pass</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Obtained</th>
                    <th className="py-2.5 px-3 font-semibold w-40">Performance Meter</th>
                    <th className="py-2.5 px-2 text-center font-semibold">Grade</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.subjects.map((s) => (
                    <tr key={s.subject_id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium text-gray-900">
                        {s.subject_name}
                        {s.subject_code && (
                          <span className="ml-1.5 text-[10px] text-gray-400 uppercase font-mono">
                            [{s.subject_code}]
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-600 font-medium">{s.max_marks}</td>
                      <td className="py-2.5 px-2 text-center text-gray-500">{s.passing_marks}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-sm">
                        <span className={s.status === 'PASS' ? 'text-gray-900' : 'text-rose-600'}>
                          {s.marks_obtained}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(s.percentage)}`}
                              style={{ width: `${Math.min(s.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-600 w-8 text-right">
                            {s.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getGradeBadge(s.grade)}`}>
                          {s.grade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.status === 'PASS' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PASS
                          </span>
                        ) : s.status === 'ABSENT' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-300">
                            ABSENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> FAIL
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 italic text-[11px]">
                        {s.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Performance Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Marks</span>
                <span className="text-lg font-black text-gray-900">
                  {report.summary.total_obtained}{' '}
                  <span className="text-xs font-normal text-gray-400">/ {report.summary.total_max_marks}</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Overall Percentage</span>
                <span className="text-lg font-black text-primary-700">
                  {report.summary.percentage}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Overall Grade</span>
                <span className={`inline-block px-3 py-0.5 text-base font-black rounded-lg border ${getGradeBadge(report.summary.grade)}`}>
                  {report.summary.grade}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Class Rank</span>
                <span className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
                  <Trophy className="w-4 h-4 text-amber-500 inline" /> {report.summary.class_rank}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Final Result</span>
                <span
                  className={`inline-block px-3 py-1 text-xs font-black tracking-wider uppercase rounded-full ${
                    report.summary.result === 'PASS' || report.summary.result === 'PASSED'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-rose-600 text-white shadow-sm'
                  }`}
                >
                  {report.summary.result}
                </span>
                {report.summary.gpa !== undefined && report.summary.gpa > 0 && (
                  <span className="block text-[10px] text-gray-500 font-bold mt-1">
                    GPA: {report.summary.gpa}
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Grading Scale Legend */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
              <span className="font-semibold text-gray-700 uppercase">
                {report.summary.grading_scale_name || 'Grading Scale'}:
              </span>
              {report.summary.grading_scale_thresholds && report.summary.grading_scale_thresholds.length > 0 ? (
                report.summary.grading_scale_thresholds.map((t) => (
                  <span key={t.grade} className="inline-flex items-center gap-0.5">
                    <strong className="text-gray-800">{t.grade}</strong> ({t.min_pct}–{Math.round(t.max_pct)}%
                    {t.grade_point ? ` • ${t.grade_point} GP` : ''})
                  </span>
                ))
              ) : (
                <>
                  <span>A+ (≥90%)</span>
                  <span>A (80–89%)</span>
                  <span>B (70–79%)</span>
                  <span>C (60–69%)</span>
                  <span>D (35–59%)</span>
                  <span className="text-rose-600 font-semibold">F (&lt;35% Fail)</span>
                </>
              )}
              <span>AB (Absent)</span>
            </div>

            {/* Signature & Endorsement Block */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-xs border-t border-gray-200">
              <div className="text-center pt-8 border-t border-dashed border-gray-300">
                <p className="font-bold text-gray-800">Class Teacher / Mentor</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Signature & Comments</p>
              </div>
              <div className="text-center pt-8 border-t border-dashed border-gray-300">
                <p className="font-bold text-gray-800">Principal / Controller of Examinations</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Official Stamp & Endorsement</p>
              </div>
            </div>

            {/* Canonical Global Print Footer Standard */}
            <PrintFooter
              documentId={`EXAM-${report?.student?.admission_number || report?.student?.id || studentId || '001'}`}
              classification="Official Academic Transcript"
              className="mt-6"
            />
          </div>
        )}
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-card, #printable-report-card * {
            visibility: visible;
          }
          #printable-report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 12mm 15mm 20mm 15mm !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-report-card .pratham-print-footer-spacer {
            display: block !important;
            height: 16mm !important;
            width: 100% !important;
          }
          #printable-report-card .pratham-global-print-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            z-index: 9999 !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding-top: 4px !important;
            padding-bottom: 2mm !important;
            border-top: 1px solid #cbd5e1 !important;
            box-sizing: border-box !important;
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  )
}
