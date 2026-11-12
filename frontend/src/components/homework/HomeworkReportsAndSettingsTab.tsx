/**
 * @file        HomeworkReportsAndSettingsTab.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.homework
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Reports, Batch Completion Breakdown, Institute Homework Analytics (Subject/Teacher/Batch), Notification Center & Reminders, Excel/CSV Exports via write-excel-file, and Admin Policy Settings.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Printer, Download, BarChart3, Bell, Settings, CheckCircle2, Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import { homeworkApi } from '../../api/endpoints'
import { executeReportExport } from '../../utils/reportExport'
import type {
  DailyHomeworkRegisterReport,
  HomeworkAssignmentItem,
  HomeworkSettingsConfig,
} from '../../types'

interface HomeworkReportsAndSettingsTabProps {
  isEditMode: boolean
  isAdminRole: boolean
  assignments: HomeworkAssignmentItem[]
  divisions: any[]
  reportDate: string
  onReportDateChange: (d: string) => void
  selectedDivisionId: string
  onSelectedDivisionIdChange: (id: string) => void
  dailyReport: DailyHomeworkRegisterReport
  settings?: HomeworkSettingsConfig
}

export default function HomeworkReportsAndSettingsTab({
  isEditMode,
  isAdminRole,
  assignments,
  divisions,
  reportDate,
  onReportDateChange,
  selectedDivisionId,
  onSelectedDivisionIdChange,
  dailyReport,
  settings,
}: HomeworkReportsAndSettingsTabProps) {
  const queryClient = useQueryClient()
  const [subView, setSubView] = useState<'batch' | 'daily' | 'analytics' | 'notifications' | 'settings'>('batch')
  const [selectedBatchAssignmentId, setSelectedBatchAssignmentId] = useState<number>(assignments[0]?.id || 0)

  useEffect(() => {
    if (!selectedBatchAssignmentId && assignments.length > 0) {
      setSelectedBatchAssignmentId(assignments[0].id)
    }
  }, [assignments, selectedBatchAssignmentId])

  const { data: batchReport, isLoading: isBatchLoading } = useQuery({
    queryKey: ['hw-batch-report', selectedBatchAssignmentId],
    queryFn: () => homeworkApi.getBatchReport(selectedBatchAssignmentId).then((r) => r.data),
    enabled: subView === 'batch' && selectedBatchAssignmentId > 0,
  })

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['hw-institute-analytics', selectedDivisionId],
    queryFn: () =>
      homeworkApi.getInstituteAnalytics({
        division_id: selectedDivisionId ? Number(selectedDivisionId) : undefined,
      }).then((r) => r.data),
    enabled: subView === 'analytics',
  })

  const { data: notifData, refetch: refetchNotifs } = useQuery({
    queryKey: ['hw-my-notifications'],
    queryFn: () => homeworkApi.getMyNotifications().then((r) => r.data),
    enabled: subView === 'notifications',
  })

  const runRemindersMutation = useMutation({
    mutationFn: () => homeworkApi.runReminders(),
    onSuccess: (res) => {
      toast.success(
        `Reminders dispatched: ${res.data.student_reminders_sent} student alert(s), ${res.data.teacher_reminders_sent} teacher alert(s).`
      )
      refetchNotifs()
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to run reminder sweep.'),
  })

  // Editable settings form state
  const [allowedExtText, setAllowedExtText] = useState((settings?.allowed_extensions || []).join(', '))
  const [maxFileMb, setMaxFileMb] = useState<number>(settings?.max_file_size_mb || 10)
  const [customTypesText, setCustomTypesText] = useState((settings?.custom_assignment_types || []).join(', '))
  const [defaultPolicy, setDefaultPolicy] = useState<'manual' | 'auto_include' | 'exclude'>(
    settings?.default_late_joiner_policy || 'manual'
  )
  const [reminderHours, setReminderHours] = useState<number>(settings?.reminder_hours_before_due || 24)
  const [allowParentView, setAllowParentView] = useState<boolean>(settings?.allow_parent_portal_view ?? true)

  useEffect(() => {
    if (!settings) return
    setAllowedExtText((settings.allowed_extensions || []).join(', '))
    setMaxFileMb(settings.max_file_size_mb || 10)
    setCustomTypesText((settings.custom_assignment_types || []).join(', '))
    setDefaultPolicy(settings.default_late_joiner_policy || 'manual')
    setReminderHours(settings.reminder_hours_before_due || 24)
    setAllowParentView(settings.allow_parent_portal_view ?? true)
  }, [settings])

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      homeworkApi.updateSettings({
        allowed_extensions: allowedExtText.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
        max_file_size_mb: maxFileMb,
        custom_assignment_types: customTypesText.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
        default_late_joiner_policy: defaultPolicy,
        reminder_hours_before_due: reminderHours,
        allow_parent_portal_view: allowParentView,
      }),
    onSuccess: () => {
      toast.success('Homework module policies updated.')
      queryClient.invalidateQueries({ queryKey: ['hw-settings'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to save homework settings.'),
  })

  const handleExportBatchReport = (format: 'xlsx' | 'csv') => {
    if (!batchReport || batchReport.rows.length === 0) {
      toast.error('No student rows to export.')
      return
    }
    executeReportExport({
      filename: `homework_batch_report_${batchReport.assignment_code}`,
      title: `Batch Report — ${batchReport.title}`,
      sheetName: 'Batch Report',
      format,
      columns: [
        { id: 'student_name', header: 'Student Name', accessorKey: 'student_name' },
        { id: 'admission_number', header: 'Admission No', accessorKey: 'admission_number' },
        { id: 'assignment_status', header: 'Assignment Status', accessorKey: 'assignment_status' },
        { id: 'submission_status', header: 'Submission Status', accessorKey: 'submission_status' },
        { id: 'submission_date', header: 'Submission Timestamp', accessorKey: 'submission_date' },
        { id: 'marks_obtained', header: 'Marks Obtained', accessorKey: 'marks_obtained', type: 'number' },
        { id: 'max_marks', header: 'Max Marks', accessorKey: 'max_marks', type: 'number' },
        { id: 'feedback', header: 'Teacher Feedback', accessorKey: 'feedback' },
      ],
      data: batchReport.rows,
    })
  }

  return (
    <div className="space-y-5">
      {/* Sub-navigation pills */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'batch', label: 'Batch Assignment Report' },
            { id: 'daily', label: 'Daily Register' },
            { id: 'analytics', label: 'Institute Analytics' },
            { id: 'notifications', label: 'Notification Center & Reminders' },
            ...(isAdminRole ? [{ id: 'settings', label: 'Policy & Settings' }] : []),
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setSubView(btn.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                subView === btn.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDivisionId}
            onChange={(e) => onSelectedDivisionIdChange(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
          >
            <option value="">All Batches</option>
            {divisions.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Homework Register</span>
          </button>
        </div>
      </div>

      {/* 1. BATCH ASSIGNMENT REPORT */}
      {subView === 'batch' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={selectedBatchAssignmentId || ''}
              onChange={(e) => setSelectedBatchAssignmentId(Number(e.target.value))}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white min-w-[280px]"
            >
              <option value="">Select Assignment...</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.assignment_code}] {a.title} ({a.division_name})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportBatchReport('xlsx')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel
              </button>
              <button
                type="button"
                onClick={() => handleExportBatchReport('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {isBatchLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading batch report...</div>
          ) : !batchReport ? (
            <div className="py-10 text-center text-xs text-slate-400">Select an assignment to generate its Batch Report.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span><strong>Published Snapshot:</strong> {batchReport.original_recipient_count} student(s)</span>
                <span><strong>Current Total Recipients:</strong> {batchReport.summary.total_recipients}</span>
                <span><strong>Completed:</strong> {batchReport.summary.completed_count}</span>
                <span><strong>Completion Rate:</strong> {batchReport.summary.completion_percentage}%</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3">Assignment Status</th>
                      <th className="py-2.5 px-3">Submission Date</th>
                      <th className="py-2.5 px-3">Marks</th>
                      <th className="py-2.5 px-3">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchReport.rows.map((r) => (
                      <tr key={r.record_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {r.student_name}
                          {r.is_late_addition && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                              Late Joiner
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{r.admission_number}</td>
                        <td className="py-2.5 px-3 uppercase font-bold text-[11px]">{r.assignment_status}</td>
                        <td className="py-2.5 px-3 font-mono">
                          {r.submission_date ? new Date(r.submission_date).toLocaleString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {r.marks_obtained !== null && r.marks_obtained !== undefined
                            ? `${r.marks_obtained}${r.max_marks ? ` / ${r.max_marks}` : ''}`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{r.feedback || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. DAILY REGISTER REPORT */}
      {subView === 'daily' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-slate-700">Date:</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => onReportDateChange(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl font-medium"
            />
            <label className="text-xs font-bold text-slate-700 ml-2">Batch:</label>
            <select
              value={selectedDivisionId}
              onChange={(e) => onSelectedDivisionIdChange(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl font-medium bg-white"
            >
              <option value="">All Batches</option>
              {divisions.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Daily Homework Register — {dailyReport.date} ({dailyReport.total_assignments} assignment(s))
            </h2>
            {dailyReport.items.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">No homework issued on this date.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Standard / Batch</th>
                      <th className="py-2 px-3">Subject</th>
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-3">Due</th>
                      <th className="py-2 px-3 text-center">Done / Total</th>
                      <th className="py-2 px-3 text-center">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyReport.items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-primary-700">{row.assignment_code}</td>
                        <td className="py-2 px-3">{row.standard} — {row.batch}</td>
                        <td className="py-2 px-3 font-semibold">{row.subject}</td>
                        <td className="py-2 px-3">{row.title}</td>
                        <td className="py-2 px-3 font-mono">{row.due_date}</td>
                        <td className="py-2 px-3 text-center font-mono">{row.completed} / {row.total_students}</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700">{row.completion_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. INSTITUTE ANALYTICS */}
      {subView === 'analytics' && (
        <div className="space-y-4">
          {isAnalyticsLoading || !analytics ? (
            <div className="py-10 text-center text-xs text-slate-400">Computing live database metrics...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Student Submission Rate</div>
                  <div className="text-2xl font-black text-primary-700 mt-1">{analytics.student_submission_rate_pct}%</div>
                  <div className="text-[11px] text-slate-400">{analytics.total_records} recipient record(s)</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Late Submission Rate</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">{analytics.late_submission_rate_pct}%</div>
                  <div className="text-[11px] text-slate-400">Submitted past deadline</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Evaluation Completion</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{analytics.evaluation_completion_rate_pct}%</div>
                  <div className="text-[11px] text-slate-400">Across {analytics.total_assignments} assignment(s)</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Avg Eval Turnaround</div>
                  <div className="text-2xl font-black text-indigo-700 mt-1">{analytics.avg_evaluation_turnaround_hours} hrs</div>
                  <div className="text-[11px] text-slate-400">From submission to evaluation</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-primary-600" /> Subject-Wise Summary
                  </h3>
                  {analytics.subject_wise.map((s) => (
                    <div key={s.subject_id} className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                      <span className="font-semibold text-slate-800">{s.subject_name}</span>
                      <span className="font-mono text-slate-600">{s.assignments} hw • {s.submission_rate_pct}%</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h3 className="text-xs font-bold uppercase text-slate-700">Teacher-Wise Summary</h3>
                  {analytics.teacher_wise.map((t) => (
                    <div key={t.teacher_user_id} className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                      <span className="font-semibold text-slate-800">{t.teacher_name}</span>
                      <span className="font-mono text-slate-600">{t.assignments} hw • {t.pending_evaluations} pending</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h3 className="text-xs font-bold uppercase text-slate-700">Batch-Wise Completion</h3>
                  {analytics.batch_wise.map((b, i) => (
                    <div key={i} className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                      <span className="font-semibold text-slate-800">{b.division_name}</span>
                      <span className="font-mono text-emerald-700 font-bold">{b.completion_rate_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. NOTIFICATION CENTER & REMINDERS */}
      {subView === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary-600" />
                <span>Homework Alerts &amp; Reminder Engine</span>
              </h3>
              <p className="text-xs text-slate-500">
                Unread: <strong>{notifData?.unread_count || 0}</strong> (Deduplicated via CommunicationLog)
              </p>
            </div>
            <button
              type="button"
              disabled={!isEditMode || runRemindersMutation.isPending}
              onClick={() => runRemindersMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Run Deadline &amp; Pending Eval Reminders</span>
            </button>
          </div>

          <div className="space-y-2">
            {(notifData?.items || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No homework notifications yet.</div>
            ) : (
              (notifData?.items || []).map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    n.is_read ? 'bg-slate-50 border-slate-200' : 'bg-primary-50/50 border-primary-200'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900">{n.subject}</div>
                    <div className="text-slate-600 mt-0.5">{n.message}</div>
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={async () => {
                        await homeworkApi.markNotificationRead(n.id)
                        refetchNotifs()
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold hover:bg-slate-100 shrink-0"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. ADMIN POLICY & SETTINGS */}
      {subView === 'settings' && isAdminRole && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary-600" />
            <span>Institutional Homework Governance &amp; Policies</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Approved File Extensions (comma-separated)</label>
              <input
                type="text"
                disabled={!isEditMode}
                value={allowedExtText}
                onChange={(e) => setAllowedExtText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Max Upload Size (MB)</label>
              <input
                type="number"
                min={1}
                max={100}
                disabled={!isEditMode}
                value={maxFileMb}
                onChange={(e) => setMaxFileMb(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Custom Assignment Types</label>
              <input
                type="text"
                disabled={!isEditMode}
                value={customTypesText}
                onChange={(e) => setCustomTypesText(e.target.value)}
                placeholder="e.g. lab_journal, viva_prep"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Late-Joiner Policy</label>
              <select
                disabled={!isEditMode}
                value={defaultPolicy}
                onChange={(e) => setDefaultPolicy(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="manual">Manual Sync Only</option>
                <option value="auto_include">Auto-Include New Joiners</option>
                <option value="exclude">Exclude New Joiners</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reminder Lead Time (Hours)</label>
              <input
                type="number"
                min={1}
                max={168}
                disabled={!isEditMode}
                value={reminderHours}
                onChange={(e) => setReminderHours(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  disabled={!isEditMode}
                  checked={allowParentView}
                  onChange={(e) => setAllowParentView(e.target.checked)}
                />
                <span>Allow Parent/Guardian Portal Read Access</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={!isEditMode || saveSettingsMutation.isPending}
            onClick={() => saveSettingsMutation.mutate()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Governance Policies</span>
          </button>
        </div>
      )}
    </div>
  )
}
