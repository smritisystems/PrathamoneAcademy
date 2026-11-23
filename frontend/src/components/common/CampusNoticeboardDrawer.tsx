/**
 * @file        CampusNoticeboardDrawer.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.1.0
 * @created     2026-11-23
 * @updated     2026-11-23
 *
 * @description Slide-over public noticeboard and live batch timetable drawer for the authentication portal, featuring dynamic API synchronization with offline fallback, real-time ongoing period detection, and 1-click schedule printing.
 */

import React, { useState, useEffect } from 'react'
import {
  X,
  Megaphone,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Sparkles,
  ArrowRight,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  GraduationCap,
  Download,
  Building2,
  Printer,
  RefreshCw,
} from 'lucide-react'

export interface CampusNotice {
  id: string
  title: string
  category: 'Examination' | 'Academic' | 'Holiday' | 'Event'
  date: string
  urgency: 'high' | 'normal'
  summary: string
  targetGrade: string
  hasAttachment?: boolean
}

export interface TimetableSlot {
  period: string
  time: string
  subject: string
  room: string
  batchType: string
  facultyInitial: string
}

const FALLBACK_NOTICES: CampusNotice[] = [
  {
    id: 'n1',
    title: 'Pre-Board & Term-2 Comprehensive Test Series Timetable Released',
    category: 'Examination',
    date: '23 Nov 2026',
    urgency: 'high',
    summary: 'Detailed seating plans and syllabus breakdown for Class 10 & 12 Board candidates. Hall tickets will be issued via student workspace.',
    targetGrade: 'Class 10 & Class 12',
    hasAttachment: true,
  },
  {
    id: 'n2',
    title: 'Winter Session Operational Timings Active from 01 Dec 2026',
    category: 'Academic',
    date: '21 Nov 2026',
    urgency: 'normal',
    summary: 'Morning batches will convene from 07:00 AM to 12:30 PM. Evening foundation sessions will conclude promptly at 08:30 PM per institutional schedule guidelines.',
    targetGrade: 'All Standards',
  },
  {
    id: 'n3',
    title: 'NEP 2020 Conceptual Problem-Solving Lab Workshop',
    category: 'Academic',
    date: '18 Nov 2026',
    urgency: 'normal',
    summary: 'Special hands-on analytical reasoning workshop targeting Olympiad, JEE Advanced, and NEET conceptual foundations.',
    targetGrade: 'Class 9, 10 & 11',
    hasAttachment: true,
  },
  {
    id: 'n4',
    title: 'Annual Academic Merit & Achievers Award Ceremony 2026–27',
    category: 'Event',
    date: '15 Nov 2026',
    urgency: 'normal',
    summary: 'Nominations open for 100% Attendance Honours and Subject Master Laurels. Parent invitations will be dispatched via registered portal.',
    targetGrade: 'Institute-wide',
  },
]

const BATCH_TIMETABLES: Record<string, TimetableSlot[]> = {
  'class-12-jee': [
    { period: 'Period 01', time: '07:00 – 08:30', subject: 'Physics (Mechanics & Rotational Dynamics)', room: 'Hall A (Ground Flr)', batchType: 'JEE Advanced', facultyInitial: 'Dr. RK' },
    { period: 'Period 02', time: '08:45 – 10:15', subject: 'Chemistry (Reaction Kinetics & Electrochemistry)', room: 'Lab 02 (1st Flr)', batchType: 'JEE Advanced', facultyInitial: 'Prof. AS' },
    { period: 'Period 03', time: '10:30 – 12:00', subject: 'Mathematics (Differential Calculus & Vectors)', room: 'Hall A (Ground Flr)', batchType: 'JEE Advanced', facultyInitial: 'Er. VM' },
    { period: 'Period 04', time: '12:15 – 01:15', subject: 'Guided Problem Solving & Doubt Clearing', room: 'Library Annex', batchType: 'Tutorial', facultyInitial: 'Mentor Team' },
    { period: 'Period 05', time: '02:00 – 04:00', subject: 'Simulated Computer-Based Test (CBT) Practice', room: 'Computer Centre 1', batchType: 'JEE Advanced', facultyInitial: 'Testing Dept' },
  ],
  'class-12-neet': [
    { period: 'Period 01', time: '07:00 – 08:30', subject: 'Zoology (Human Physiology & Circulation)', room: 'Hall B (Ground Flr)', batchType: 'NEET Achievers', facultyInitial: 'Dr. SB' },
    { period: 'Period 02', time: '08:45 – 10:15', subject: 'Botany (Genetics & Molecular Basis)', room: 'Hall B (Ground Flr)', batchType: 'NEET Achievers', facultyInitial: 'Dr. MT' },
    { period: 'Period 03', time: '10:30 – 12:00', subject: 'Physics (Optics & Modern Physics)', room: 'Lab 01 (1st Flr)', batchType: 'NEET Achievers', facultyInitial: 'Prof. PK' },
    { period: 'Period 04', time: '12:15 – 01:15', subject: 'NCERT Exemplar Analysis & Mock Drilling', room: 'Library Annex', batchType: 'Tutorial', facultyInitial: 'Mentor Team' },
  ],
  'class-10-foundation': [
    { period: 'Period 01', time: '08:00 – 09:30', subject: 'Mathematics (Quadratic Equations & Trigonometry)', room: 'Room 201 (2nd Flr)', batchType: 'Class 10 CBSE/State', facultyInitial: 'Prof. SM' },
    { period: 'Period 02', time: '09:45 – 11:00', subject: 'Science (Carbon Compounds & Light Optics)', room: 'Room 201 (2nd Flr)', batchType: 'Class 10 CBSE/State', facultyInitial: 'Prof. NA' },
    { period: 'Period 03', time: '11:15 – 12:30', subject: 'Social Science & Analytical Reasoning', room: 'Room 202 (2nd Flr)', batchType: 'Foundation', facultyInitial: 'Prof. DJ' },
    { period: 'Period 04', time: '12:30 – 01:15', subject: 'Daily Practice Paper (DPP) Evaluation', room: 'Study Hall', batchType: 'Practice', facultyInitial: 'Staff Mentor' },
  ],
  'class-9-olympiad': [
    { period: 'Period 01', time: '04:00 – 05:30', subject: 'Mathematics (Number Theory & Geometry Foundations)', room: 'Room 105 (1st Flr)', batchType: 'Olympiad & NTSE', facultyInitial: 'Prof. SM' },
    { period: 'Period 02', time: '05:45 – 07:15', subject: 'Physics & Chemistry Integrated Lab', room: 'Lab 02 (1st Flr)', batchType: 'Foundation', facultyInitial: 'Prof. NA' },
  ],
}

/**
 * Calculates whether a period slot is ongoing right now, upcoming, or already finished.
 */
const getSlotStatus = (timeRange: string): 'ongoing' | 'upcoming' | 'completed' => {
  try {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const parts = timeRange.split(/[–\-]/).map((s) => s.trim())
    if (parts.length < 2) return 'upcoming'

    const parseToMinutes = (str: string): number => {
      const match = str.match(/(\d+):(\d+)/)
      if (!match) return 0
      let hh = parseInt(match[1], 10)
      const mm = parseInt(match[2], 10)
      // Normalize 12-hour/24-hour afternoon times if <= 6
      if (hh < 7) hh += 12
      return hh * 60 + mm
    }

    const startMin = parseToMinutes(parts[0])
    const endMin = parseToMinutes(parts[1])

    if (currentMinutes >= startMin && currentMinutes < endMin) {
      return 'ongoing'
    } else if (currentMinutes < startMin) {
      return 'upcoming'
    } else {
      return 'completed'
    }
  } catch {
    return 'upcoming'
  }
}

interface CampusNoticeboardDrawerProps {
  isOpen: boolean
  onClose: () => void
  academyName?: string
}

export const CampusNoticeboardDrawer: React.FC<CampusNoticeboardDrawerProps> = ({
  isOpen,
  onClose,
  academyName = 'PrathamOne Academy',
}) => {
  const [activeTab, setActiveTab] = useState<'notices' | 'timetable'>('notices')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [selectedBatch, setSelectedBatch] = useState<string>('class-12-jee')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [noticesList, setNoticesList] = useState<CampusNotice[]>(FALLBACK_NOTICES)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Fetch notices from backend public endpoint with graceful fallback
  useEffect(() => {
    if (!isOpen) return
    let isMounted = true
    const fetchPublicNotices = async () => {
      try {
        setIsSyncing(true)
        const res = await fetch('/api/v1/institutions/public/notices')
        if (res.ok) {
          const data = await res.json()
          if (data && Array.isArray(data.notices) && data.notices.length > 0 && isMounted) {
            setNoticesList(data.notices)
          }
        }
      } catch {
        // Retain fallback offline notices silently
      } finally {
        if (isMounted) setIsSyncing(false)
      }
    }
    fetchPublicNotices()
    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredNotices = noticesList.filter((n) => {
    const matchesCategory = categoryFilter === 'All' || n.category === categoryFilter
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.targetGrade.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const currentSlots = BATCH_TIMETABLES[selectedBatch] || []

  // Resolve today's date formatted
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="fixed inset-0 z-50 flex justify-start animate-fade-in" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Content Drawer */}
      <div className="relative z-10 w-full max-w-xl bg-slate-900 border-r border-slate-700/60 text-slate-100 flex flex-col h-full shadow-2xl overflow-hidden animate-slide-right">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-[10.5px] font-mono tracking-wider uppercase">
              <Building2 className="w-3 h-3 text-cyan-400" />
              <span>Public Campus Desk</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Noticeboard & Timetable</span>
              {isSyncing && <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {academyName} • Academic Session 2026–27
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-6 pt-3 gap-6 text-xs font-mono font-medium">
          <button
            onClick={() => setActiveTab('notices')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'notices'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Public Notices</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px]">
              {noticesList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'timetable'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Today's Batch Schedule</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          {activeTab === 'notices' ? (
            <>
              {/* Category Filter Pills & Search */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search circulars, exams, syllabus..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-md bg-slate-950/70 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-sans"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                  {['All', 'Examination', 'Academic', 'Holiday', 'Event'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 font-semibold'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notice Cards List */}
              <div className="space-y-3 pt-1">
                {filteredNotices.length > 0 ? (
                  filteredNotices.map((notice) => (
                    <div
                      key={notice.id}
                      className="p-4 rounded-lg bg-slate-950/50 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-medium ${
                            notice.category === 'Examination'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : notice.category === 'Academic'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : notice.category === 'Holiday'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {notice.category}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notice.date}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                        {notice.title}
                      </h3>

                      <p className="text-xs text-slate-300/80 leading-relaxed font-sans">
                        {notice.summary}
                      </p>

                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1 text-slate-300">
                          <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                          {notice.targetGrade}
                        </span>
                        {notice.hasAttachment && (
                          <span className="inline-flex items-center gap-1 text-cyan-400 font-medium">
                            <FileText className="w-3 h-3" />
                            PDF Circular
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-mono">
                    No circulars found matching your filter criteria.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Batch Selector & Today's Calendar Banner */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                    Target Cohort / Batch:
                  </label>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-[11px] font-mono transition-colors cursor-pointer"
                    title="Print Today's Batch Schedule"
                  >
                    <Printer className="w-3 h-3 text-cyan-400" />
                    <span>Print Sheet</span>
                  </button>
                </div>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700/80 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                >
                  <option value="class-12-jee">Class 12 — JEE Advanced Intensive (Hall A)</option>
                  <option value="class-12-neet">Class 12 — NEET Achievers Batch (Hall B)</option>
                  <option value="class-10-foundation">Class 10 — Foundation & Olympiad (Room 201)</option>
                  <option value="class-9-olympiad">Class 09 — NTSE & Science Talent (Lab 02)</option>
                </select>
              </div>

              {/* Operational Bound & Date Compliance Note */}
              <div className="p-2.5 rounded-md bg-blue-950/30 border border-blue-800/40 text-[11px] font-mono text-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{todayFormatted}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Operating Hours: 06:00 – 22:00 IST
                </span>
              </div>

              {/* Slot Timeline Grid with Live "Ongoing" Status */}
              <div className="space-y-2.5 pt-1">
                {currentSlots.map((slot, idx) => {
                  const status = getSlotStatus(slot.time)
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg transition-all space-y-1.5 ${
                        status === 'ongoing'
                          ? 'bg-emerald-950/20 border-2 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                          : 'bg-slate-950/60 border border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                            {slot.period}
                          </span>
                          {status === 'ongoing' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-semibold animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Ongoing Now
                            </span>
                          )}
                          {status === 'upcoming' && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/40 text-[10px] font-mono text-cyan-300/80">
                              Upcoming
                            </span>
                          )}
                          {status === 'completed' && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-500">
                              Completed
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-medium text-cyan-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {slot.time}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-white">
                        {slot.subject}
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          {slot.room}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                          Mentor: {slot.facultyInitial}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer Notice */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Staff notices & marksheets require sign in.</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Continue to Login
          </button>
        </div>
      </div>
    </div>
  )
}
