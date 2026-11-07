/**
 * @file        Attendance.tsx
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
 * @created     2026-11-03
 * @updated     2026-11-07
 *
 * @description Attendance management page for daily batch roll call, attendance registers, and absenteeism tracking.
 */

import { useState, useEffect, useRef } from 'react'
import { QrCode, CheckCircle2, AlertCircle, RefreshCw, Volume2, Clock, Check, Sparkles, X, User, Lock } from 'lucide-react'
import type { ScanCheckinResult } from '../types'
import { useQuery, useMutation } from '@tanstack/react-query'
import { standardsApi, divisionsApi, studentsApi, attendanceApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import toast from 'react-hot-toast'

interface StudentAttendanceRow {
  student_id: number
  enrollment_id: number
  admission_number: string
  name: string
  status: 'present' | 'absent' | 'late' | 'half_day'
  remarks: string
}

export default function Attendance() {
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()
  const editScope = 'academic:attendance'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const [selectedStandardId, setSelectedStandardId] = useState<number | ''>('')
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | ''>('')
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [rows, setRows] = useState<StudentAttendanceRow[]>([])

  // ─── QR Attendance Terminal State ─────────────────────────────────────────
  const [showTerminalModal, setShowTerminalModal] = useState<boolean>(false)
  const [scanInput, setScanInput] = useState<string>('')
  const [scanStatus, setScanStatus] = useState<'present' | 'late'>('present')
  const [scanLoading, setScanLoading] = useState<boolean>(false)
  const [terminalLogs, setTerminalLogs] = useState<Array<{
    id: number
    name: string
    admission_number: string
    photo_url?: string | null
    status: string
    time: string
    message: string
    type: 'success' | 'already_marked' | 'error'
  }>>([])
  const scanInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus scanner input when terminal is open
  useEffect(() => {
    if (showTerminalModal) {
      setTimeout(() => scanInputRef.current?.focus(), 150)
    }
  }, [showTerminalModal])

  // Play synthesized audio feedback beep
  const playAudioFeedback = (type: 'success' | 'warning' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime) // High A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)
        osc.start()
        osc.stop(ctx.currentTime + 0.18)
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, ctx.currentTime) // A4
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime) // Low A3
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      }
    } catch {
      // AudioContext not supported or blocked
    }
  }

  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to scan attendance.')
      return
    }
    const trimmed = scanInput.trim()
    if (!trimmed) return

    try {
      setScanLoading(true)
      const res = await attendanceApi.scanCheckin({
        identifier: trimmed,
        date: attendanceDate,
        status: scanStatus,
        remarks: 'QR Attendance Terminal Scan',
      })

      const isSuccess = res.data.status === 'success'
      playAudioFeedback(isSuccess ? 'success' : 'warning')

      // Prepend to terminal session log
      setTerminalLogs((prev) => [
        {
          id: res.data.student.id,
          name: res.data.student.name,
          admission_number: res.data.student.admission_number,
          photo_url: res.data.student.photo_url,
          status: res.data.student.status,
          time: res.data.student.checkin_time,
          message: res.data.message,
          type: isSuccess ? 'success' : 'already_marked',
        },
        ...prev.slice(0, 19),
      ])

      // If student exists in currently loaded rows, mark them
      setRows((prev) =>
        prev.map((r) =>
          r.admission_number === res.data.student.admission_number
            ? { ...r, status: scanStatus }
            : r
        )
      )

      toast.success(res.data.message)
      setScanInput('')
    } catch (err: any) {
      playAudioFeedback('error')
      const errorMsg = err?.response?.data?.detail || 'Scan check-in failed.'
      toast.error(errorMsg)
      setTerminalLogs((prev) => [
        {
          id: Date.now(),
          name: trimmed,
          admission_number: trimmed,
          status: 'error',
          time: new Date().toLocaleTimeString(),
          message: errorMsg,
          type: 'error',
        },
        ...prev.slice(0, 19),
      ])
      setScanInput('')
    } finally {
      setScanLoading(false)
      scanInputRef.current?.focus()
    }
  }

  // Standards
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: async () => {
      const res = await standardsApi.list(selectedInstitutionId || undefined)
      return res.data
    },
    enabled: !!selectedInstitutionId,
  })

  // Divisions for selected Standard
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', selectedStandardId],
    queryFn: async () => {
      if (!selectedStandardId) return []
      const res = await divisionsApi.list(selectedStandardId)
      return res.data
    },
    enabled: !!selectedStandardId,
  })

  // Students in selected standard/division
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: [
      'students-attendance',
      selectedStandardId,
      selectedDivisionId,
      selectedAcademicYearId,
    ],
    queryFn: async () => {
      if (!selectedStandardId) return null
      const res = await studentsApi.list({
        standard_id: selectedStandardId,
        division_id: selectedDivisionId || undefined,
        academic_year_id: selectedAcademicYearId || undefined,
        page_size: 100,
      })
      return res.data
    },
    enabled: !!selectedStandardId,
  })

  useEffect(() => {
    if (studentsData?.data) {
      setRows(
        studentsData.data.map((s) => {
          const enrollment = s.enrollments?.[0]
          return {
            student_id: s.id,
            enrollment_id: enrollment?.id || s.id,
            admission_number: s.admission_number,
            name: `${s.first_name} ${s.last_name}`,
            status: 'present',
            remarks: '',
          }
        })
      )
    } else {
      setRows([])
    }
  }, [studentsData])

  const markMutation = useMutation({
    mutationFn: (data: {
      date: string
      entries: { student_id: number; enrollment_id: number; status: string; remarks?: string }[]
    }) => attendanceApi.markBulk(data),
    onSuccess: () => {
      toast.success('Attendance recorded and notifications queued')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to submit attendance')
    },
  })

  const setAllStatus = (status: 'present' | 'absent') => {
    setRows((prev) => prev.map((r) => ({ ...r, status })))
  }

  const updateRowStatus = (studentId: number, status: 'present' | 'absent' | 'late' | 'half_day') => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    )
  }

  const updateRowRemarks = (studentId: number, remarks: string) => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, remarks } : r))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to save attendance.')
      return
    }
    if (rows.length === 0) {
      toast.error('No students loaded to mark attendance')
      return
    }
    markMutation.mutate({
      date: attendanceDate,
      entries: rows.map((r) => ({
        student_id: r.student_id,
        enrollment_id: r.enrollment_id,
        status: r.status,
        remarks: r.remarks || undefined,
      })),
    })
  }

  const presentCount = rows.filter((r) => r.status === 'present').length
  const absentCount = rows.filter((r) => r.status === 'absent').length
  const lateCount = rows.filter((r) => r.status === 'late').length

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Student Attendance Register & Scanner" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-sm text-gray-500">
            Daily class attendance register, bulk marking, and high-speed QR check-in
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTerminalModal(!showTerminalModal)}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
            showTerminalModal
              ? 'bg-purple-700 text-white'
              : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>{showTerminalModal ? 'Close QR Terminal' : 'Open QR Attendance Terminal'}</span>
        </button>
      </div>


      {/* ──────────────── QR CODE ATTENDANCE TERMINAL ──────────────── */}
      {showTerminalModal && (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>High-Speed QR Attendance Terminal</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                    LIVE SCANNER READY
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Ready for USB/Bluetooth barcode guns, student ID cards, or instant admission check-in
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-white/10 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setScanStatus('present')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    scanStatus === 'present'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  ✓ Mark Present
                </button>
                <button
                  type="button"
                  onClick={() => setScanStatus('late')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    scanStatus === 'late'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  ⏱ Mark Late
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowTerminalModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Scanner Input Card */}
            <div className="lg:col-span-1 space-y-4 bg-white/5 p-5 rounded-xl border border-white/10 flex flex-col justify-between">
              <form onSubmit={handleScanSubmit} className="space-y-3">
                <label className="block text-xs font-semibold text-purple-200">
                  Scanner Input / Admission Number:
                </label>
                <div className="relative">
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan QR or type ADM..."
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-black/40 border border-purple-400/40 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                    autoFocus
                  />
                  {scanLoading && (
                    <RefreshCw className="w-4 h-4 text-purple-300 animate-spin absolute right-3 top-3" />
                  )}
                </div>

                {isEditMode ? (
                  <button
                    type="submit"
                    disabled={scanLoading || !scanInput.trim()}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Record Scan Check-In</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to record scan check-ins.')}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-900/40 text-purple-300 border border-purple-500/30 cursor-not-allowed flex items-center justify-center gap-1.5"
                    title="Locked in View Mode: Enable Edit Mode above to record scan check-ins"
                  >
                    <Lock className="w-3.5 h-3.5 text-purple-300" />
                    <span>Scan Check-In (Locked)</span>
                  </button>
                )}
              </form>

              <div className="text-[11px] text-slate-400 space-y-1.5 pt-4 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Synthesized Audio Chime Active</span>
                </div>
                <p>
                  Hardware barcode and QR laser guns automatically submit on scan without requiring mouse clicks.
                </p>
              </div>
            </div>

            {/* Right Live Stream Card */}
            <div className="lg:col-span-2 bg-white/5 p-5 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                <span className="font-bold text-slate-200">
                  Live Terminal Check-In Stream ({terminalLogs.length})
                </span>
                <span className="text-[11px] text-slate-400">Date: {attendanceDate}</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {terminalLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No scans recorded yet in this terminal session. Ready to scan.
                  </div>
                ) : (
                  terminalLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                        log.type === 'success'
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'
                          : log.type === 'already_marked'
                          ? 'bg-amber-950/40 border-amber-500/30 text-amber-100'
                          : 'bg-rose-950/40 border-rose-500/30 text-rose-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                          {log.photo_url ? (
                            <img
                              src={log.photo_url}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{log.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {log.admission_number}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.status === 'present'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : log.status === 'late'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {log.status}
                        </span>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{log.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Selector Card */}
      <div className="card grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
          <select
            value={selectedStandardId}
            onChange={(e) => {
              setSelectedStandardId(e.target.value ? Number(e.target.value) : '')
              setSelectedDivisionId('')
            }}
            className="input"
          >
            <option value="">Select Standard...</option>
            {standards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
          <select
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value ? Number(e.target.value) : '')}
            className="input"
            disabled={!selectedStandardId}
          >
            <option value="">All Batches</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Date *</label>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Attendance Stats & Quick Actions */}
      {rows.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-gray-700">Total: {rows.length}</span>
            <span className="text-green-600 font-semibold">Present: {presentCount}</span>
            <span className="text-red-600 font-semibold">Absent: {absentCount}</span>
            <span className="text-yellow-600 font-semibold">Late: {lateCount}</span>
            <span className="text-blue-600 font-semibold">
              Attendance:{' '}
              {rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : 0}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAllStatus('present')}
              className="text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium py-1.5 px-3 rounded-lg"
            >
              ✓ All Present
            </button>
            <button
              type="button"
              onClick={() => setAllStatus('absent')}
              className="text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium py-1.5 px-3 rounded-lg"
            >
              ✕ All Absent
            </button>
          </div>
        </div>
      )}

      {/* Roster Table */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card overflow-x-auto">
          {!selectedStandardId ? (
            <div className="text-center py-12 text-gray-400">
              <p>Please select a Standard above to load student roster.</p>
            </div>
          ) : loadingStudents ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Loading students roster...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No students enrolled in this standard/batch.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="px-4 py-3 font-semibold">Admission #</th>
                  <th className="px-4 py-3 font-semibold">Student Name</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-600 font-medium">
                      {r.admission_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        {(['present', 'absent', 'late', 'half_day'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateRowStatus(r.student_id, s)}
                            className={`px-2.5 py-1 text-xs rounded-md font-semibold capitalize transition-all ${
                              r.status === s
                                ? s === 'present'
                                  ? 'bg-green-600 text-white shadow-sm'
                                  : s === 'absent'
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : s === 'late'
                                  ? 'bg-yellow-500 text-white shadow-sm'
                                  : 'bg-purple-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={r.remarks}
                        onChange={(e) => updateRowRemarks(r.student_id, e.target.value)}
                        placeholder="Optional remarks"
                        className="input text-xs py-1 h-8"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex justify-end">
            {isEditMode ? (
              <button
                type="submit"
                disabled={markMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {markMutation.isPending ? 'Saving Attendance...' : '💾 Save Attendance Register'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to save attendance register.')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                title="Locked in View Mode: Enable Edit Mode above to save attendance"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Save Attendance Register (Locked)</span>
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}

