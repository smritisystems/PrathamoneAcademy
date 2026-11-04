/**
 * @file        StudentDashboard.tsx
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
 * @updated     2026-11-04
 *
 * @description Dedicated student portal dashboard presenting enrolled courses, timetable, and exam results.
 */

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Home, BookOpen, Calendar, ClipboardCheck, Award, CreditCard,
  FileText, User, Bell, Clock, MapPin, Phone, Mail, CheckCircle,
  AlertCircle, Download, ChevronRight, Save, RefreshCw, ShieldAlert
} from 'lucide-react'
import { studentPortalApi, studentsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { StatusBadge } from '../components/Badge'
import type { TimetableSlot, StudyMaterialItem } from '../types'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const PORTAL_TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'classes', label: 'My Classes', icon: BookOpen },
  { id: 'timetable', label: 'Timetable', icon: Calendar },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'tests', label: 'Tests & Results', icon: Award },
  { id: 'fees', label: 'Fees', icon: CreditCard },
  { id: 'materials', label: 'Study Materials', icon: FileText },
  { id: 'profile', label: 'Profile', icon: User },
] as const

type PortalTab = (typeof PORTAL_TABS)[number]['id']

export default function StudentDashboardPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const urlStudentId = searchParams.get('student_id')
    ? Number(searchParams.get('student_id'))
    : undefined

  const isStaffOrAdmin = user?.role !== 'student'

  const [activeTab, setActiveTab] = useState<PortalTab>('home')
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(urlStudentId)
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (urlStudentId) {
      setSelectedStudentId(urlStudentId)
    }
  }, [urlStudentId])

  // 1. Fetch student list for Admin/Staff switcher dropdown
  const { data: studentsListResp } = useQuery({
    queryKey: ['portal-students-list'],
    queryFn: () => studentsApi.list({ page_size: 100 }).then((r) => r.data),
    enabled: isStaffOrAdmin,
  })
  const allStudents = studentsListResp?.data || []

  // Effective student ID for switcher
  const effectiveId = selectedStudentId || (allStudents.length > 0 ? allStudents[0].id : undefined)

  // 2. Fetch Dashboard summary
  const { data: dashboard, isLoading: isDashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['student-portal-dashboard', effectiveId],
    queryFn: () => studentPortalApi.getDashboard(effectiveId).then((r) => r.data),
  })

  // 3. Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['student-portal-classes', effectiveId],
    queryFn: () => studentPortalApi.getClasses(effectiveId).then((r) => r.data),
    enabled: activeTab === 'classes',
  })

  // 4. Fetch Timetable
  const { data: timetableData } = useQuery({
    queryKey: ['student-portal-timetable', effectiveId],
    queryFn: () => studentPortalApi.getTimetable(effectiveId).then((r) => r.data),
    enabled: activeTab === 'timetable',
  })

  // 5. Fetch Attendance
  const { data: attendanceData } = useQuery({
    queryKey: ['student-portal-attendance', effectiveId],
    queryFn: () => studentPortalApi.getAttendance({ student_id: effectiveId }).then((r) => r.data),
    enabled: activeTab === 'attendance',
  })

  // 6. Fetch Tests & Results
  const { data: testsData } = useQuery({
    queryKey: ['student-portal-tests', effectiveId],
    queryFn: () => studentPortalApi.getTests(effectiveId).then((r) => r.data),
    enabled: activeTab === 'tests',
  })

  // 7. Fetch Fees
  const { data: feesData } = useQuery({
    queryKey: ['student-portal-fees', effectiveId],
    queryFn: () => studentPortalApi.getFees(effectiveId).then((r) => r.data),
    enabled: activeTab === 'fees',
  })

  // 8. Fetch Study Materials
  const { data: materialsData } = useQuery({
    queryKey: ['student-portal-materials', effectiveId],
    queryFn: () => studentPortalApi.getStudyMaterials({ student_id: effectiveId }).then((r) => r.data),
    enabled: activeTab === 'materials',
  })

  // 9. Fetch Profile
  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['student-portal-profile', effectiveId],
    queryFn: () => studentPortalApi.getProfile(effectiveId).then((r) => r.data),
    enabled: activeTab === 'profile',
  })

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    phone: '',
    email: '',
    blood_group: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  })

  // Sync profile data to form when loaded
  React.useEffect(() => {
    if (profileData?.student) {
      setProfileForm({
        phone: profileData.student.phone || '',
        email: profileData.student.email || '',
        blood_group: profileData.student.blood_group || '',
        address: profileData.student.address || '',
        city: profileData.student.city || '',
        state: profileData.student.state || '',
        pincode: profileData.student.pincode || '',
      })
    }
  }, [profileData])

  const profileMutation = useMutation({
    mutationFn: (data: typeof profileForm) =>
      studentPortalApi.updateProfile(data, effectiveId),
    onSuccess: () => {
      setEditSuccessMessage('Profile details saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['student-portal-profile', effectiveId] })
      queryClient.invalidateQueries({ queryKey: ['student-portal-dashboard', effectiveId] })
      setTimeout(() => setEditSuccessMessage(null), 4000)
    },
  })

  if (isDashboardLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700" />
        <p className="mt-3 text-sm text-gray-500">Loading Student Portal...</p>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="card text-center py-16">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-800">Student Portal Unavailable</h2>
        <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
          No student record is linked to this account, or no student records are currently available in the coaching institute.
        </p>
      </div>
    )
  }

  const { student, active_enrollment, fee_status, attendance_summary, recent_results, upcoming_classes, announcements, stats } = dashboard

  return (
    <div className="space-y-6">
      {/* Admin / Teacher Preview Banner & Student Switcher */}
      {isStaffOrAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <RefreshCw className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Administrator / Teacher Portal Preview</p>
              <p className="text-sm text-amber-900">
                Viewing student portal experience as: <span className="font-bold">{student.full_name}</span> ({student.admission_number})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-xs font-medium text-amber-900 whitespace-nowrap">Switch Student:</label>
            <select
              value={effectiveId || student.id}
              onChange={(e) => {
                setSelectedStudentId(Number(e.target.value))
              }}
              className="form-input text-xs py-1.5 px-3 rounded-lg border-amber-300 bg-white"
            >
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.admission_number})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Student Welcome Header Card */}
      <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-indigo-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-2xl font-bold">
              {student.first_name[0]}{student.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{student.full_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  {active_enrollment ? active_enrollment.status : 'Active'}
                </span>
              </div>
              <p className="text-primary-100 text-sm mt-0.5">
                Admission No: <span className="font-mono font-bold text-white">{student.admission_number}</span> &bull; Roll No: <span className="font-mono">{active_enrollment?.roll_number || 'N/A'}</span>
              </p>
              <p className="text-xs text-primary-200 mt-1 flex items-center gap-2">
                <span className="bg-white/15 px-2 py-0.5 rounded">{active_enrollment?.board_name || 'General Board'}</span>
                <span>&bull;</span>
                <span className="bg-white/15 px-2 py-0.5 rounded">{active_enrollment?.standard_name || 'Class X'}</span>
                <span>&bull;</span>
                <span className="bg-white/15 px-2 py-0.5 rounded font-medium">Batch: {active_enrollment?.division_name || 'Main Batch'}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap md:flex-col items-end gap-2 text-right">
            <span className="text-xs text-primary-200">Academic Year: {active_enrollment?.academic_year || '2024-25'}</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-medium text-white border border-white/20">
              <Clock className="w-3.5 h-3.5 text-primary-200" /> Current Term
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {PORTAL_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-700 text-white shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
                {tab.id === 'materials' && stats.study_materials_count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700 font-bold'}`}>
                    {stats.study_materials_count}
                  </span>
                )}
                {tab.id === 'tests' && stats.upcoming_tests_count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 font-bold'}`}>
                    {stats.upcoming_tests_count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* TAB CONTENT 1: HOME */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card border-l-4 border-l-emerald-500">
              <p className="text-xs text-gray-500 font-medium">Attendance Rate</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-gray-900">{attendance_summary.attendance_percentage}%</span>
                <span className="text-xs text-emerald-600 font-medium">{attendance_summary.present_days}/{attendance_summary.total_days} Days</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${attendance_summary.attendance_percentage}%` }} />
              </div>
            </div>

            <div className="card border-l-4 border-l-blue-500">
              <p className="text-xs text-gray-500 font-medium">Fee Obligation</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-gray-900">{fmt(fee_status.total_fees)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Paid: <span className="font-semibold text-emerald-600">{fmt(fee_status.paid_amount)}</span></p>
            </div>

            <div className="card border-l-4 border-l-amber-500">
              <p className="text-xs text-gray-500 font-medium">Outstanding Balance</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-xl font-bold ${fee_status.outstanding_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {fmt(fee_status.outstanding_balance)}
                </span>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-2 ${
                fee_status.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {fee_status.status}
              </span>
            </div>

            <div className="card border-l-4 border-l-purple-500">
              <p className="text-xs text-gray-500 font-medium">Upcoming Schedule</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-gray-900">{upcoming_classes.length}</span>
                <span className="text-xs text-purple-600 font-medium">Sessions Today</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Study Materials: <span className="font-semibold text-gray-700">{stats.study_materials_count}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Classes / Timetable */}
            <div className="card lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-700" />
                  <h3 className="font-bold text-gray-900">Today & Upcoming Classes</h3>
                </div>
                <button
                  onClick={() => setActiveTab('timetable')}
                  className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1"
                >
                  Full Weekly Timetable <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {upcoming_classes.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No scheduled lectures for today.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcoming_classes.map((cls) => (
                    <div key={cls.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs">
                          {cls.start_time}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{cls.subject_name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            <span className="font-medium text-gray-600">{cls.day_of_week}</span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {cls.start_time} - {cls.end_time}</span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cls.room_number}</span>
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Scheduled
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Announcements / Notice Board */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-gray-900">Notice Board</h3>
                </div>
              </div>

              {announcements.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No announcements at this time.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className={`p-3 rounded-xl border ${ann.is_pinned ? 'bg-amber-50/50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-gray-200 text-gray-700">
                          {ann.category}
                        </span>
                        <span className="text-[11px] text-gray-400">{ann.publish_date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 mt-1.5">{ann.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Test Results on Home */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900">Recent Test Results</h3>
              </div>
              <button
                onClick={() => setActiveTab('tests')}
                className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1"
              >
                View All Results <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recent_results.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No examination records recorded yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recent_results.map((res) => (
                  <div key={res.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">{res.subject_name}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary-100 text-primary-800">
                          Grade {res.grade}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{res.exam_name} &bull; {res.exam_type}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200 flex items-baseline justify-between">
                      <div>
                        <span className="text-xl font-bold text-gray-900">{res.marks_obtained}</span>
                        <span className="text-xs text-gray-500"> / {res.max_marks}</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">{res.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: MY CLASSES */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <BookOpen className="w-5 h-5 text-primary-700" />
              <h3 className="font-bold text-gray-900">Enrolled Courses & Batches</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classesData?.enrollments?.map((enr: any) => (
                <div key={enr.id} className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200">
                      {enr.board_name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {enr.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{enr.standard_name}</h4>
                    <p className="text-sm text-gray-600">Batch Division: <span className="font-semibold">{enr.division_name}</span></p>
                    <p className="text-xs text-gray-500 mt-1">Roll Number: <span className="font-mono font-medium">{enr.roll_number}</span> &bull; Enrolled on {enr.enrollment_date}</p>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Academic Year: {enr.academic_year}</span>
                    <span>Level: Standard {enr.standard_level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects for enrolled standard */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-900">Curriculum Subjects</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classesData?.subjects?.map((sub: any) => (
                <div key={sub.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{sub.name}</p>
                    <p className="text-xs text-gray-500 font-mono">Code: {sub.code || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Max Marks</span>
                    <p className="text-sm font-bold text-gray-800">{sub.max_marks}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="card space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Weekly Class Timetable</h3>
              <p className="text-xs text-gray-500">Batch: <span className="font-semibold text-primary-700">{timetableData?.batch_name || 'Standard Batch'}</span></p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
              <Clock className="w-3.5 h-3.5" /> Sessions: Monday through Saturday
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
              const daySlots = timetableData?.grouped_by_day?.[day] || []
              return (
                <div key={day} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="bg-primary-50 px-4 py-2.5 border-b border-primary-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-primary-900">{day}</span>
                    <span className="text-[11px] font-semibold text-primary-700 bg-white px-2 py-0.5 rounded-full border border-primary-200">
                      {daySlots.length} lecture{daySlots.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="p-3 divide-y divide-gray-100 flex-1">
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center italic">No scheduled lectures</p>
                    ) : (
                      daySlots.map((slot: TimetableSlot) => (
                        <div key={slot.id} className="py-2.5 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900">{slot.subject_name}</span>
                            <span className="text-[11px] font-mono text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                              {slot.start_time} - {slot.end_time}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                            <span>Room: {slot.room_number}</span>
                            <span className="text-emerald-600 font-medium">Regular</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-500">Overall Attendance</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{attendanceData?.summary.attendance_percentage}%</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">Total Working Days</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{attendanceData?.summary.total_days}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">Present Days</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{attendanceData?.summary.present_days}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">Absent Days</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{attendanceData?.summary.absent_days}</p>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="font-bold text-gray-900">Dated Attendance History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceData?.records?.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-gray-900">{rec.date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          rec.status === 'present' ? 'bg-green-100 text-green-800' :
                          rec.status === 'absent' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs">{rec.remarks || 'Regular Attendance'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: TESTS & RESULTS */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          {/* Upcoming Tests */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Award className="w-5 h-5 text-primary-700" />
              <h3 className="font-bold text-gray-900">Upcoming Examinations & Unit Tests</h3>
            </div>
            {testsData?.upcoming_tests?.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No upcoming examinations scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testsData?.upcoming_tests?.map((t: any) => (
                  <div key={t.id} className="p-4 rounded-xl border border-primary-200 bg-primary-50/40 flex items-center justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-100 text-primary-800">
                        {t.exam_type}
                      </span>
                      <h4 className="font-bold text-gray-900 mt-1">{t.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Start Date: <span className="font-medium text-gray-700">{t.start_date || 'TBA'}</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">Max Marks</span>
                      <p className="text-lg font-bold text-gray-900">{t.max_marks}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Result History */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-900">Completed Test Marks & Grades</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <th className="py-2.5 px-3">Examination</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Marks Obtained</th>
                    <th className="py-2.5 px-3">Max Marks</th>
                    <th className="py-2.5 px-3">Percentage</th>
                    <th className="py-2.5 px-3">Grade</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {testsData?.results?.map((res: any) => (
                    <tr key={res.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-gray-900">{res.exam_name}</td>
                      <td className="py-2.5 px-3 text-gray-700 font-semibold">{res.subject_name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{res.marks_obtained}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-500">{res.max_marks}</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-semibold">{res.percentage}%</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary-100 text-primary-800">
                          {res.grade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{res.remarks || 'Pass'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: FEES */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-500">Total Fee Plan</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(feesData?.summary?.total_fees || 0)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">Collected Amount</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{fmt(feesData?.summary?.paid_amount || 0)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{fmt(feesData?.summary?.outstanding_balance || 0)}</p>
            </div>
          </div>

          {/* Fee Invoices */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-900">Fee Invoices & Installments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3">Paid Amount</th>
                    <th className="py-2.5 px-3">Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {feesData?.invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary-700">{inv.invoice_number}</td>
                      <td className="py-2.5 px-3 text-gray-600">{inv.issue_date}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{fmt(inv.net_amount)}</td>
                      <td className="py-2.5 px-3 text-green-600 font-semibold">{fmt(inv.paid_amount)}</td>
                      <td className="py-2.5 px-3 text-red-600 font-semibold">{fmt(inv.outstanding_amount)}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments & Receipts */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-900">Payment Transactions & Receipts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-3">Payment Date</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {feesData?.payments?.map((pmt: any) => (
                    <tr key={pmt.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary-700">{pmt.receipt_number}</td>
                      <td className="py-2.5 px-3 text-gray-600">{pmt.payment_date}</td>
                      <td className="py-2.5 px-3 uppercase text-xs font-medium text-gray-700">{pmt.payment_method}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{pmt.transaction_reference}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{fmt(pmt.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>All payment transactions and receipts are verified by Prashant Academy administration. For payment assistance, please contact the academy office.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: STUDY MATERIALS */}
      {activeTab === 'materials' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-700" />
              <h3 className="font-bold text-gray-900">Study Notes & Reference Materials</h3>
            </div>
            <span className="text-xs text-gray-500">{materialsData?.materials?.length || 0} materials available</span>
          </div>

          {materialsData?.materials?.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No study materials uploaded for your enrolled standard yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materialsData?.materials?.map((mat: StudyMaterialItem) => (
                <div key={mat.id} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between hover:border-primary-300 transition-colors">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-100 text-primary-800">
                        {mat.file_type}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {(mat.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 mt-2 text-sm">{mat.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{mat.description}</p>
                    <p className="text-xs font-semibold text-primary-700 mt-2">Subject: {mat.subject_name}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">Class: {mat.standard_name}</span>
                    <a
                      href={mat.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 8: PROFILE */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {editSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>{editSuccessMessage}</span>
            </div>
          )}

          {/* Student Personal Info & Editable Contact Details */}
          <div className="card space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-700" />
                <h3 className="font-bold text-gray-900">Student Personal & Contact Profile</h3>
              </div>
              <span className="text-xs text-gray-400">Editable by student/guardian</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                profileMutation.mutate(profileForm)
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Admission Number</label>
                  <p className="font-mono font-bold text-gray-900 mt-1">{profileData?.student?.admission_number}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Full Name</label>
                  <p className="font-bold text-gray-900 mt-1">{profileData?.student?.full_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date of Birth</label>
                  <p className="font-medium text-gray-800 mt-1">{profileData?.student?.date_of_birth}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="text-xs font-medium text-gray-700">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="form-input text-sm mt-1"
                    placeholder="Enter contact number"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="form-input text-sm mt-1"
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Blood Group</label>
                  <input
                    type="text"
                    value={profileForm.blood_group}
                    onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })}
                    className="form-input text-sm mt-1"
                    placeholder="e.g. O+, B+, A+"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-700">Residential Address</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="form-input text-sm mt-1"
                    placeholder="Street, Building, Landmark"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="form-input text-sm mt-1"
                    placeholder="e.g. Thane / Mumbai"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Pincode</label>
                  <input
                    type="text"
                    value={profileForm.pincode}
                    onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                    className="form-input text-sm mt-1"
                    placeholder="e.g. 400601"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={profileMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {profileMutation.isPending ? 'Saving Details...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Guardians */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-900">Parent / Guardian Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileData?.guardians?.map((g: any) => (
                <div key={g.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900">{g.first_name} {g.last_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-gray-200 text-gray-700">
                      {g.relation}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Phone: <span className="font-mono text-gray-800">{g.phone || 'N/A'}</span></p>
                  <p className="text-xs text-gray-500">Email: <span className="text-gray-800">{g.email || 'N/A'}</span></p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-900">Uploaded Student Documents</h3>
            {profileData?.documents?.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No documents uploaded.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {profileData?.documents?.map((d: any) => (
                  <div key={d.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{d.title}</p>
                      <p className="text-xs text-gray-500">{d.document_type} &bull; Uploaded {d.uploaded_at}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

