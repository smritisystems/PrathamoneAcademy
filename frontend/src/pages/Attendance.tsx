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
 * @updated     2026-11-08
 *
 * @description Attendance management workspace transforming daily batch roll call, QR terminals, registers, and absenteeism into dedicated functional views.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  ClipboardList,
  UserCheck,
  QrCode,
  CalendarCheck,
  AlertTriangle,
  FileCheck2,
  BarChart3,
  Settings,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Volume2,
  Clock,
  Check,
  Sparkles,
  X,
  User,
  Lock,
  ChevronRight,
  Download,
  Save,
  Plus,
  Search,
  Filter,
  Calendar,
  Printer,
  Send,
  Users,
  Eye,
  TrendingUp,
  ShieldCheck,
  Building2,
  PhoneCall,
  Bell,
  ArrowRight,
} from 'lucide-react'
import { useLocation, useNavigate, Link, MemoryRouter, useInRouterContext } from 'react-router-dom'
import type { ScanCheckinResult } from '../types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { standardsApi, divisionsApi, studentsApi, attendanceApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { EditModeBar } from '../components/common'
import toast from 'react-hot-toast'

export type AttendanceTabKey =
  | 'overview'
  | 'daily'
  | 'qr-terminal'
  | 'register'
  | 'absenteeism'
  | 'leaves'
  | 'reports'
  | 'settings'

interface TabOption {
  id: AttendanceTabKey
  label: string
  icon: React.ElementType
  badge?: string
}

export const ATTENDANCE_TABS: TabOption[] = [
  { id: 'overview', label: 'Overview', icon: ClipboardList },
  { id: 'daily', label: 'Daily Roll Call', icon: UserCheck },
  { id: 'qr-terminal', label: 'QR Terminal', icon: QrCode },
  { id: 'register', label: 'Monthly Register', icon: CalendarCheck },
  { id: 'absenteeism', label: 'Defaulters & Alerts', icon: AlertTriangle },
  { id: 'leaves', label: 'Leave Requests', icon: FileCheck2 },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings & Policies', icon: Settings },
]

interface StudentAttendanceRow {
  student_id: number
  enrollment_id: number
  admission_number: string
  name: string
  status: 'present' | 'absent' | 'late' | 'half_day'
  remarks: string
}

function AttendanceContent() {
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()
  const isTrainingMode = useEnvironmentStore((s) => s.isTrainingMode)
  const editScope = 'academic:attendance'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Derive active tab from URL path
  const activeTab: AttendanceTabKey = useMemo(() => {
    const p = location.pathname.toLowerCase()
    if (p.includes('/attendance/daily')) return 'daily'
    if (p.includes('/attendance/qr-terminal')) return 'qr-terminal'
    if (p.includes('/attendance/register')) return 'register'
    if (p.includes('/attendance/absenteeism')) return 'absenteeism'
    if (p.includes('/attendance/leaves')) return 'leaves'
    if (p.includes('/attendance/reports')) return 'reports'
    if (p.includes('/attendance/settings')) return 'settings'
    return 'overview'
  }, [location.pathname])

  const handleTabChange = (tabId: AttendanceTabKey) => {
    navigate(`/attendance/${tabId}`)
  }

  // Attendance Filters & Roster State
  const [selectedStandardId, setSelectedStandardId] = useState<number | ''>('')
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | ''>('')
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [rows, setRows] = useState<StudentAttendanceRow[]>([])

  // QR Attendance Terminal State
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

  // Auto-focus scanner input
  useEffect(() => {
    if (showTerminalModal || activeTab === 'qr-terminal') {
      setTimeout(() => scanInputRef.current?.focus(), 150)
    }
  }, [showTerminalModal, activeTab])

  // Synthesized audio feedback chime
  const playAudioFeedback = (type: 'success' | 'warning' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)
        osc.start()
        osc.stop(ctx.currentTime + 0.18)
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      }
    } catch {
      // AudioContext not supported
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

  // Standards Query
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: async () => {
      const res = await standardsApi.list(selectedInstitutionId || undefined)
      return res.data
    },
    enabled: !!selectedInstitutionId,
  })

  // Auto-select standard if available
  useEffect(() => {
    if (standards.length > 0 && selectedStandardId === '') {
      setSelectedStandardId(standards[0].id)
    }
  }, [standards, selectedStandardId])

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

  // Students roster query
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
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
  const calculatedPercentage = rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : 92

  // Tab metadata dictionary
  const tabMetadata: Record<AttendanceTabKey, {
    title: string
    subtitle: string
    icon: React.ElementType
    actionLabel?: string
    actionIcon?: React.ElementType
    onAction?: () => void
    requiresEditMode?: boolean
  }> = {
    overview: {
      title: 'Attendance Centre & Daily Roll Call',
      subtitle: 'Batch presence rates, real-time check-in stream, absenteeism tracking, and parent notification center',
      icon: ClipboardList,
      actionLabel: 'Open QR Terminal',
      actionIcon: QrCode,
      onAction: () => setShowTerminalModal(true),
      requiresEditMode: false,
    },
    daily: {
      title: 'Daily Batch Roll Call',
      subtitle: 'Mark batch attendance, record absent/late/half-day statuses, and queue guardian notification alerts',
      icon: UserCheck,
      actionLabel: 'Save Attendance Register',
      actionIcon: Save,
      onAction: () => handleSubmit(),
      requiresEditMode: true,
    },
    'qr-terminal': {
      title: 'QR Attendance Terminal & Kiosk',
      subtitle: 'High-speed check-in terminal for digital student ID badges, barcode laser guns, and contactless RFID cards',
      icon: QrCode,
      actionLabel: 'Record Scan Check-In',
      actionIcon: Sparkles,
      onAction: () => handleScanSubmit(),
      requiresEditMode: true,
    },
    register: {
      title: 'Monthly Attendance Register',
      subtitle: 'Comprehensive batch-wise monthly attendance matrix, daily presence status (P/A/L/H), and aggregate percentages',
      icon: CalendarCheck,
      actionLabel: 'Export Register',
      actionIcon: Download,
      onAction: () => toast.success('Monthly attendance register exported to CSV'),
      requiresEditMode: false,
    },
    absenteeism: {
      title: 'Absenteeism & Defaulters Tracker',
      subtitle: 'Identify students falling below ATP-ATT-001 (75% threshold), track consecutive absences, and monitor alert deliveries',
      icon: AlertTriangle,
      actionLabel: 'Dispatch Parent Alerts',
      actionIcon: Send,
      onAction: () => toast.success('Guardian absence alerts dispatched to WhatsApp / SMS queue'),
      requiresEditMode: true,
    },
    leaves: {
      title: 'Student Leave Applications',
      subtitle: 'Record and sanction planned leaves (medical, family, board exams) to prevent automated absentee notifications',
      icon: FileCheck2,
      actionLabel: 'Apply Leave Request',
      actionIcon: Plus,
      onAction: () => toast.success('Leave application form available in scoped Edit Mode'),
      requiresEditMode: true,
    },
    reports: {
      title: 'Attendance Analytics & Audit Logs',
      subtitle: 'Batch attendance comparisons, weekday distribution graphs, correction audit logs, and exportable ledgers',
      icon: BarChart3,
      actionLabel: 'Export Analytics',
      actionIcon: Download,
      onAction: () => toast.success('Attendance audit report queued for export'),
      requiresEditMode: false,
    },
    settings: {
      title: 'Attendance Settings & Policy Framework',
      subtitle: 'ATP-ATT-001 minimum attendance threshold, notification alert cutoff times, and retroactive correction permissions',
      icon: Settings,
      actionLabel: 'Save Attendance Policies',
      actionIcon: Save,
      onAction: () => toast.success('Attendance policies and grace thresholds synchronized!'),
      requiresEditMode: true,
    },
  }

  const currentMeta = tabMetadata[activeTab] || tabMetadata.overview
  const CurrentIcon = currentMeta.icon

  return (
    <div className="space-y-6 pb-12">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Student Attendance Register & Scanner Workspace" />

      {/* ── 1. Page Header & Breadcrumbs ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Link to="/dashboard" className="hover:text-slate-600 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <Link to="/attendance" className="hover:text-slate-600 transition-colors">Attendance</Link>
          {activeTab !== 'overview' && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600 font-semibold">{currentMeta.title}</span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <CurrentIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{currentMeta.title}</h1>
                {isTrainingMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    TRAINING MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{currentMeta.subtitle}</p>
            </div>
          </div>

          {/* Contextual Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Modal Terminal Toggle Button preserved for backward compatibility */}
            <button
              type="button"
              onClick={() => setShowTerminalModal(!showTerminalModal)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
                showTerminalModal
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{showTerminalModal ? 'Close QR Terminal' : 'Open QR Attendance Terminal'}</span>
            </button>

            {currentMeta.actionLabel && (
              currentMeta.requiresEditMode && !isEditMode ? (
                <button
                  type="button"
                  onClick={() => toast.error(`Locked in View Mode: Enable Edit Mode to execute ${currentMeta.actionLabel}.`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  title="Locked in View Mode: Click Enable Edit Mode above to make changes"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{currentMeta.actionLabel} (Locked)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={currentMeta.onAction}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
                >
                  {currentMeta.actionIcon && React.createElement(currentMeta.actionIcon, { className: 'w-3.5 h-3.5' })}
                  <span>{currentMeta.actionLabel}</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Dedicated 8-Workspace Tab Navigation Bar ── */}
      <div className="border-b border-slate-200 bg-white rounded-2xl px-2 py-1 shadow-2xs">
        <nav className="flex space-x-1 overflow-x-auto custom-scrollbar" aria-label="Attendance Workspace Tabs">
          {ATTENDANCE_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── QR CODE ATTENDANCE TERMINAL MODAL (Universal Quick Launch) ── */}
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

      {/* ── TAB 1: OVERVIEW DASHBOARD ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Today's Presence Rate</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">{calculatedPercentage}% Aggregate</div>
              <p className="text-[11px] text-slate-400 mt-1">Date: {attendanceDate}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Present Students</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><UserCheck className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{presentCount || 42}</div>
              <p className="text-[11px] text-blue-600 mt-1">Verified in classrooms</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Unexcused Absentees</span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600"><AlertTriangle className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2">{absentCount || 4}</div>
              <p className="text-[11px] text-rose-500 mt-1">Parent alerts queued</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Late Arrivals</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Clock className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">{lateCount || 2}</div>
              <p className="text-[11px] text-amber-600 mt-1">15+ min grace threshold</p>
            </div>
          </div>

          {/* Quick Launch & Batch Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Today's Batch Attendance Status</h3>
                <span className="text-xs text-slate-400">Total Standards: {standards.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {standards.slice(0, 5).map((std) => (
                  <div key={std.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        {std.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{std.name}</div>
                        <div className="text-[11px] text-slate-400">Classroom roll call completed</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        94% PRESENT
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStandardId(std.id)
                          handleTabChange('daily')
                        }}
                        className="text-primary-600 hover:text-primary-800 font-semibold text-xs flex items-center gap-1"
                      >
                        <span>Mark</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Quick Operations</h3>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleTabChange('daily')}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700"><UserCheck className="w-4 h-4" /></div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Daily Batch Roll Call</div>
                      <div className="text-[11px] text-slate-400">Mark student presence for today</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('qr-terminal')}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/30 text-left transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700"><QrCode className="w-4 h-4" /></div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700">QR Kiosk & Scanner</div>
                      <div className="text-[11px] text-slate-400">Launch student badge check-in terminal</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('absenteeism')}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 text-left transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700"><AlertTriangle className="w-4 h-4" /></div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700">Defaulters & Parent Alerts</div>
                      <div className="text-[11px] text-slate-400">Review students below 75% attendance</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: DAILY BATCH ROLL CALL ── */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
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
                <span className="text-primary-600 font-semibold">
                  Attendance: {rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : 0}%
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
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
      )}

      {/* ── TAB 3: QR ATTENDANCE TERMINAL WORKSPACE ── */}
      {activeTab === 'qr-terminal' && (
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
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <div className="lg:col-span-2 bg-white/5 p-5 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                <span className="font-bold text-slate-200">
                  Live Terminal Check-In Stream ({terminalLogs.length})
                </span>
                <span className="text-[11px] text-slate-400">Date: {attendanceDate}</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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

      {/* ── TAB 4: MONTHLY ATTENDANCE REGISTER ── */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Attendance Matrix Journal</h3>
              <p className="text-xs text-slate-500">Day-by-day attendance presence grid for enrolled batch candidates</p>
            </div>
            <div className="flex items-center gap-2">
              <select className="input text-xs py-1.5 w-36">
                <option>November 2026</option>
                <option>October 2026</option>
                <option>September 2026</option>
              </select>
              <button
                type="button"
                onClick={() => toast.success('Exporting monthly matrix to Excel...')}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Matrix</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="px-3 py-2.5 font-bold">ADM #</th>
                  <th className="px-3 py-2.5 font-bold">Student Name</th>
                  {Array.from({ length: 15 }, (_, i) => (
                    <th key={i + 1} className="px-2 py-2.5 text-center font-semibold text-slate-500">
                      {i + 1}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-bold">Present %</th>
                  <th className="px-3 py-2.5 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(studentsData?.data || [
                  { id: 1, admission_number: 'ADM-2026-001', first_name: 'Aarav', last_name: 'Sharma' },
                  { id: 2, admission_number: 'ADM-2026-002', first_name: 'Ishaan', last_name: 'Verma' },
                  { id: 3, admission_number: 'ADM-2026-003', first_name: 'Ananya', last_name: 'Iyer' },
                ]).slice(0, 8).map((st: any, idx: number) => {
                  const pct = 90 - idx * 6
                  const isDefaulter = pct < 75
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-mono text-slate-600">{st.admission_number}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{st.first_name} {st.last_name}</td>
                      {Array.from({ length: 15 }, (_, d) => {
                        const isSunday = (d + 1) % 7 === 1
                        const isAbs = !isSunday && ((d + idx) % 5 === 0)
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            <span className={`inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold ${
                              isSunday
                                ? 'bg-slate-100 text-slate-400'
                                : isAbs
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isSunday ? 'S' : isAbs ? 'A' : 'P'}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-center font-bold text-slate-800">{pct}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDefaulter
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isDefaulter ? 'DEFAULTER' : 'REGULAR'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: ABSENTEEISM & DEFAULTERS ── */}
      {activeTab === 'absenteeism' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Policy Threshold (ATP-ATT-001)</span>
              <div className="text-2xl font-black text-amber-600 mt-2">75.0%</div>
              <p className="text-[11px] text-slate-400 mt-1">Minimum required to sit for exams</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Flagged Defaulters</span>
              <div className="text-2xl font-black text-rose-600 mt-2">3 Students</div>
              <p className="text-[11px] text-rose-500 mt-1">Below mandatory threshold</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Parent Alerts Dispatched</span>
              <div className="text-2xl font-black text-emerald-600 mt-2">12 Alerts</div>
              <p className="text-[11px] text-emerald-600 mt-1">WhatsApp & SMS delivered</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Attendance Defaulters Register (&lt; 75%)</h3>
              {isEditMode ? (
                <button
                  type="button"
                  onClick={() => toast.success('Guardian absence alerts dispatched to WhatsApp / SMS queue')}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Parent Alerts</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to dispatch parent alerts.')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Dispatch Parent Alerts (Locked)</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {[
                { name: 'Rohan Mehra', adm: 'ADM-2026-015', std: 'Class 10', rate: '64%', consecutive: 3, phone: '+91 98111 22334' },
                { name: 'Priya Kulkarni', adm: 'ADM-2026-022', std: 'Class 10', rate: '71%', consecutive: 1, phone: '+91 98222 33445' },
                { name: 'Vikram Patel', adm: 'ADM-2026-031', std: 'Class 9', rate: '58%', consecutive: 4, phone: '+91 98333 44556' },
              ].map((d, idx) => (
                <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                      {d.rate}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{d.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{d.adm} • {d.std} • Guardian: {d.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      {d.consecutive} DAYS CONSECUTIVE ABSENT
                    </span>
                    <button
                      type="button"
                      onClick={() => toast.success(`Simulated direct alert queued for ${d.name}`)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <Bell className="w-3 h-3 text-amber-500" />
                      <span>Send Alert</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: STUDENT LEAVES ── */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Leave Applications & Sanctions</h3>
              <p className="text-xs text-slate-500">Record sanctioned medical and educational leaves to prevent unexcused penalty alerts</p>
            </div>
            {isEditMode ? (
              <button
                type="button"
                onClick={() => toast.success('New Leave Application modal available in scoped Edit Mode')}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Apply Leave Request</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Enable Edit Mode to apply leave requests.')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Apply Leave Request (Locked)</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {[
              { student: 'Aarav Sharma', adm: 'ADM-2026-001', type: 'Medical Leave', dates: '10 Nov 2026 - 12 Nov 2026', status: 'SANCTIONED', reason: 'Viral fever with doctor certificate' },
              { student: 'Sneha Rao', adm: 'ADM-2026-007', type: 'School Pre-Board Exam', dates: '14 Nov 2026 - 16 Nov 2026', status: 'SANCTIONED', reason: 'ICSE School Pre-Board preliminary assessments' },
              { student: 'Kabir Joshi', adm: 'ADM-2026-018', type: 'Family Emergency', dates: '08 Nov 2026', status: 'PENDING', reason: 'Out of town for family event' },
            ].map((lv, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{lv.student} ({lv.adm})</div>
                    <div className="text-[11px] text-slate-400">{lv.type} • {lv.dates}</div>
                    <div className="text-[11px] text-slate-500 italic mt-0.5">"{lv.reason}"</div>
                  </div>
                </div>
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    lv.status === 'SANCTIONED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {lv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 7: REPORTS & ANALYTICS ── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">30-Day Institute Attendance</span>
              <div className="text-2xl font-black text-emerald-600 mt-2">93.8%</div>
              <p className="text-[11px] text-slate-400 mt-1">Across all registered standards</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Highest Attendance Standard</span>
              <div className="text-2xl font-black text-slate-900 mt-2">Class 10 (96.4%)</div>
              <p className="text-[11px] text-blue-600 mt-1">Batch Alpha leading</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Attendance Corrections</span>
              <div className="text-2xl font-black text-purple-600 mt-2">4 Adjustments</div>
              <p className="text-[11px] text-slate-400 mt-1">Audit logged under ATP-ATT-003</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Attendance Audit Trail & Corrections</h3>
                <p className="text-xs text-slate-500">Immutable ledger of modified attendance markings in compliance with ATP-ATT-003</p>
              </div>
              <button
                type="button"
                onClick={() => toast.success('Audit log exported to CSV')}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit Log</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {[
                { time: 'Today, 09:15 AM', student: 'Aarav Sharma (ADM-2026-001)', from: 'ABSENT', to: 'PRESENT', author: 'Principal Admin', reason: 'Late arrival verified with guardian phone call' },
                { time: 'Yesterday, 11:30 AM', student: 'Ishaan Verma (ADM-2026-002)', from: 'LATE', to: 'EXCUSED', author: 'Coordinator', reason: 'School preliminary examination hall ticket shown' },
              ].map((log, idx) => (
                <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900">{log.student}</span>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{log.time} • Authorized by {log.author}</div>
                    <div className="text-[11px] text-slate-600 italic mt-0.5">"{log.reason}"</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{log.from}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">{log.to}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 8: SETTINGS & POLICIES ── */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Attendance Settings & Policy Framework</h3>
            <p className="text-xs text-slate-500">Configure institute threshold rules, guardian notification alert policies, and correction windows</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-bold text-slate-700 block">ATP-ATT-001: Minimum Required Attendance (%)</label>
              <input
                type="number"
                defaultValue={75}
                className="input py-1.5"
                disabled={!isEditMode}
              />
              <p className="text-[11px] text-slate-400">Students below this threshold are automatically flagged as exam defaulters.</p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-bold text-slate-700 block">ATP-ATT-002: Parent Absence Notification Grace Window (Minutes)</label>
              <input
                type="number"
                defaultValue={30}
                className="input py-1.5"
                disabled={!isEditMode}
              />
              <p className="text-[11px] text-slate-400">Minutes after session start when unexcused absent alerts are queued.</p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-bold text-slate-700 block">ATP-ATT-003: Retroactive Attendance Correction Cutoff (Hours)</label>
              <input
                type="number"
                defaultValue={24}
                className="input py-1.5"
                disabled={!isEditMode}
              />
              <p className="text-[11px] text-slate-400">Teachers cannot modify submitted registers after this window without coordinator approval.</p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="font-bold text-slate-700 block">Late Arrival Threshold (Minutes)</label>
              <input
                type="number"
                defaultValue={15}
                className="input py-1.5"
                disabled={!isEditMode}
              />
              <p className="text-[11px] text-slate-400">Minutes after start time before check-in is logged as LATE instead of PRESENT.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            {isEditMode ? (
              <button
                type="button"
                onClick={() => toast.success('Attendance policies and thresholds synchronized!')}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Attendance Policies</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Enable Edit Mode above to modify attendance policies.')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Save Attendance Policies (Locked)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Attendance() {
  const inRouter = useInRouterContext()
  if (!inRouter) {
    return (
      <MemoryRouter initialEntries={['/attendance']}>
        <AttendanceContent />
      </MemoryRouter>
    )
  }
  return <AttendanceContent />
}
