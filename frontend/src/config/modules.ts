/**
 * @file        modules.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.config
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-10
 * @updated     2026-11-11
 *
 * @description Canonical Module Registry (SSOT) defining all application workspaces, icons, routes, and permissions.
 */

import React from 'react'
import {
  LayoutDashboard,
  GraduationCap,
  UserPlus,
  Users,
  CreditCard,
  Briefcase,
  DollarSign,
  ClipboardList,
  Award,
  BookOpen,
  FileCheck,
  BarChart2,
  Printer,
  MessageSquare,
  FileSpreadsheet,
  Download,
  Shield,
  GitBranch,
  FlaskConical,
  Settings,
  Terminal,
  LucideIcon,
} from 'lucide-react'
import type { User, NavigationModule, NavigationSubItem } from '../types'
import { isUserSysAdmin } from '../store/authStore'

export interface ModuleDefinition {
  id: string
  label: string
  category: 'core' | 'academic' | 'students' | 'workforce' | 'finance' | 'learning' | 'operations' | 'admin' | 'tools'
  defaultPath: string
  icon: LucideIcon
  iconName: string
  description: string
  requiredPermission?: string | null
  sysadminOnly?: boolean
  subItems: NavigationSubItem[]
  badge?: string
}

export const CANONICAL_MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    category: 'core',
    defaultPath: '/dashboard',
    icon: LayoutDashboard,
    iconName: 'LayoutDashboard',
    description: 'Executive overview, key performance indicators, collection analytics, and quick operations pulse.',
    subItems: [],
  },
  {
    id: 'academic',
    label: 'Academic Structure',
    category: 'academic',
    defaultPath: '/academic',
    icon: GraduationCap,
    iconName: 'GraduationCap',
    description: 'Curriculum standards, boards, subjects, batches, timetable schedules, and class enrollment rosters.',
    subItems: [
      { id: 'academic_structure', label: 'Academic Structure', to: '/academic' },
      { id: 'academic_boards', label: 'Boards', to: '/academic/boards' },
      { id: 'academic_classes', label: 'Classes / Standards', to: '/academic/classes' },
      { id: 'academic_subjects', label: 'Subjects', to: '/academic/subjects' },
      { id: 'academic_batches', label: 'Batches', to: '/academic/batches' },
      { id: 'academic_timetable', label: 'Timetable', to: '/academic/timetable' },
      { id: 'academic_enrollment', label: 'Enrollment', to: '/academic/enrollment' },
      { id: 'academic_reports', label: 'Reports', to: '/academic/reports' },
      { id: 'academic_settings', label: 'Settings', to: '/academic/settings' },
    ],
  },
  {
    id: 'crm',
    label: 'Admissions & CRM',
    category: 'students',
    defaultPath: '/leads',
    icon: UserPlus,
    iconName: 'UserPlus',
    description: 'Student inquiry pipeline, lead stages, follow-up SLA, counseling demos, and conversion metrics.',
    subItems: [
      { id: 'crm_overview', label: 'Overview', to: '/leads' },
      { id: 'crm_all', label: 'All Leads', to: '/leads/all' },
      { id: 'crm_pipeline', label: 'Lead Pipeline', to: '/leads/pipeline' },
      { id: 'crm_followups', label: 'Follow-ups', to: '/leads/follow-ups' },
      { id: 'crm_counselling', label: 'Counselling & Demo', to: '/leads/counselling' },
      { id: 'crm_sources', label: 'Lead Sources', to: '/leads/sources' },
      { id: 'crm_campaigns', label: 'Campaigns', to: '/leads/campaigns' },
      { id: 'crm_reports', label: 'Reports', to: '/leads/reports' },
      { id: 'crm_settings', label: 'Settings', to: '/leads/settings' },
    ],
  },
  {
    id: 'students',
    label: 'Students',
    category: 'students',
    defaultPath: '/students',
    icon: Users,
    iconName: 'Users',
    description: 'Student master directory, admission enrollment, batch allocations, ID cards, and lifecycle tracking.',
    subItems: [
      { id: 'students_overview', label: 'Overview', to: '/students/overview' },
      { id: 'students_directory', label: 'Master Directory', to: '/students/directory' },
      { id: 'students_admission', label: 'Admissions', to: '/students/admission' },
      { id: 'students_allocations', label: 'Batch Allocations', to: '/students/allocations' },
      { id: 'students_idcards', label: 'ID Cards & Badges', to: '/students/id-cards' },
      { id: 'students_history', label: 'Activity History', to: '/students/history' },
      { id: 'students_reactivation', label: 'Reactivations', to: '/students/reactivation' },
      { id: 'students_settings', label: 'Settings & Policies', to: '/students/settings' },
    ],
  },
  {
    id: 'fees',
    label: 'Fees & Payments',
    category: 'finance',
    defaultPath: '/fees',
    icon: CreditCard,
    iconName: 'CreditCard',
    description: 'Fee structures, invoices, collection desk, defaulters ledger, receipts, and financial daybooks.',
    subItems: [
      { id: 'fees_overview', label: 'Overview', to: '/fees/overview' },
      { id: 'fees_structures', label: 'Fee Structures', to: '/fees/structures' },
      { id: 'fees_invoicing', label: 'Fee Invoicing', to: '/fees/invoicing' },
      { id: 'fees_collection', label: 'Collection Desk', to: '/fees/collection' },
      { id: 'fees_defaulters', label: 'Defaulters & Dues', to: '/fees/defaulters' },
      { id: 'fees_concessions', label: 'Concessions & Waivers', to: '/fees/concessions' },
      { id: 'fees_online_gateway', label: 'Online Gateway', to: '/fees/online-gateway' },
      { id: 'fees_reports', label: 'Financial Daybook', to: '/fees/reports' },
    ],
  },
  {
    id: 'teachers',
    label: 'Teachers',
    category: 'workforce',
    defaultPath: '/teachers',
    icon: GraduationCap,
    iconName: 'GraduationCap',
    description: 'Faculty directory, subject allocations, teaching schedules, attendance logs, and payroll profiles.',
    subItems: [
      { id: 'teachers_overview', label: 'Overview', to: '/teachers/overview' },
      { id: 'teachers_directory', label: 'Faculty Directory', to: '/teachers/directory' },
      { id: 'teachers_allocations', label: 'Batch Allocations', to: '/teachers/allocations' },
      { id: 'teachers_timetable', label: 'Teaching Schedules', to: '/teachers/timetable' },
      { id: 'teachers_attendance', label: 'Presence & Leaves', to: '/teachers/attendance' },
      { id: 'teachers_payroll', label: 'Salary & Payroll', to: '/teachers/payroll' },
      { id: 'teachers_performance', label: 'Teaching Sessions', to: '/teachers/performance' },
      { id: 'teachers_settings', label: 'Policies & Settings', to: '/teachers/settings' },
    ],
  },
  {
    id: 'staff',
    label: 'Staff Directory',
    category: 'workforce',
    defaultPath: '/staff',
    icon: Briefcase,
    iconName: 'Briefcase',
    description: 'Administrative and operational staff register, onboarding, duties, leaves, and HR documents studio.',
    subItems: [
      { id: 'staff_overview', label: 'Overview', to: '/staff/overview' },
      { id: 'staff_directory', label: 'Staff Register', to: '/staff/directory' },
      { id: 'staff_onboarding', label: 'New Onboarding', to: '/staff/onboarding' },
      { id: 'staff_duties', label: 'Roles & Duties', to: '/staff/duties' },
      { id: 'staff_attendance', label: 'Staff Presence', to: '/staff/attendance' },
      { id: 'staff_leaves', label: 'Leave Requests', to: '/staff/leaves' },
      { id: 'staff_documents', label: 'HR Documents Studio', to: '/staff/documents' },
      { id: 'staff_settings', label: 'HR Policies', to: '/staff/settings' },
    ],
  },
  {
    id: 'teacher_payroll',
    label: 'Teacher Payroll',
    category: 'finance',
    defaultPath: '/teacher-payroll',
    icon: DollarSign,
    iconName: 'DollarSign',
    description: 'Faculty compensation, teaching session logging, monthly wage generation, and payment vouchers.',
    subItems: [],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    category: 'operations',
    defaultPath: '/attendance',
    icon: ClipboardList,
    iconName: 'ClipboardList',
    description: 'Daily roll call, QR terminal check-in, monthly registers, absenteeism tracking, and parent alerts.',
    subItems: [
      { id: 'attendance_overview', label: 'Overview', to: '/attendance/overview' },
      { id: 'attendance_daily', label: 'Daily Roll Call', to: '/attendance/daily' },
      { id: 'attendance_qr', label: 'QR Terminal', to: '/attendance/qr-terminal' },
      { id: 'attendance_register', label: 'Monthly Register', to: '/attendance/register' },
      { id: 'attendance_absenteeism', label: 'Defaulters & Alerts', to: '/attendance/absenteeism' },
      { id: 'attendance_leaves', label: 'Leave Requests', to: '/attendance/leaves' },
      { id: 'attendance_reports', label: 'Reports & Analytics', to: '/attendance/reports' },
      { id: 'attendance_settings', label: 'Settings & Policies', to: '/attendance/settings' },
    ],
  },
  {
    id: 'examinations',
    label: 'Tests & Results',
    category: 'academic',
    defaultPath: '/examinations',
    icon: Award,
    iconName: 'Award',
    description: 'Exam scheduling, marks entry, performance analytics, report cards generation, and question papers.',
    subItems: [
      { id: 'exam_overview', label: 'Overview', to: '/examinations/overview' },
      { id: 'exam_schedules', label: 'Exam Schedules', to: '/examinations/schedules' },
      { id: 'exam_marks', label: 'Marks Entry', to: '/examinations/marks-entry' },
      { id: 'exam_analytics', label: 'Performance Analytics', to: '/examinations/analytics' },
      { id: 'exam_report_cards', label: 'Report Cards', to: '/examinations/report-cards' },
      { id: 'exam_papers', label: 'Question Papers', to: '/examinations/papers' },
      { id: 'exam_settings', label: 'Settings & Grading', to: '/examinations/settings' },
    ],
  },
  {
    id: 'homework',
    label: 'Homework & Assignments',
    category: 'academic',
    defaultPath: '/homework',
    icon: FileCheck,
    iconName: 'FileCheck',
    description: 'Homework assignment creation, physical notebook checking register, digital submissions, and progress.',
    subItems: [
      { id: 'homework_overview', label: 'Overview & List', to: '/homework' },
      { id: 'homework_create', label: 'Assign Homework', to: '/homework/create' },
      { id: 'homework_checking', label: 'Checking Register', to: '/homework/checking' },
      { id: 'homework_reports', label: 'Daily Register Report', to: '/homework/reports' },
    ],
  },
  {
    id: 'courses',
    label: 'Study Materials',
    category: 'learning',
    defaultPath: '/courses',
    icon: BookOpen,
    iconName: 'BookOpen',
    description: 'Digital course repository, chapter notes, question banks, recorded video lectures, and syllabus tracking.',
    subItems: [
      { id: 'courses_overview', label: 'Materials Overview', to: '/courses/overview' },
      { id: 'courses_repository', label: 'Master Library', to: '/courses/repository' },
      { id: 'courses_upload', label: 'Upload Content', to: '/courses/upload' },
      { id: 'courses_notes', label: 'Chapter Notes', to: '/courses/notes' },
      { id: 'courses_question_banks', label: 'Question Banks', to: '/courses/question-banks' },
      { id: 'courses_video_lectures', label: 'Video Lectures', to: '/courses/video-lectures' },
      { id: 'courses_syllabi', label: 'Curriculum Syllabi', to: '/courses/syllabi' },
      { id: 'courses_settings', label: 'Storage Policies', to: '/courses/settings' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    category: 'core',
    defaultPath: '/reports',
    icon: BarChart2,
    iconName: 'BarChart2',
    description: 'Consolidated institute analytics, enrollment trends, academic performance, and financial daybooks.',
    subItems: [],
  },
  {
    id: 'forms',
    label: 'Print Forms & KYC',
    category: 'operations',
    defaultPath: '/forms',
    icon: Printer,
    iconName: 'Printer',
    description: 'Centralized document studio for admission forms, ID cards, receipts, hall tickets, and certificates.',
    subItems: [
      { id: 'forms_overview', label: 'Overview', to: '/forms/overview' },
      { id: 'forms_admissions', label: 'Admission Forms', to: '/forms/admissions' },
      { id: 'forms_idcards', label: 'Student & Staff IDs', to: '/forms/id-cards' },
      { id: 'forms_financial', label: 'Receipts & Notices', to: '/forms/financial' },
      { id: 'forms_academic', label: 'Hall Tickets & Transcripts', to: '/forms/academic' },
      { id: 'forms_certificates', label: 'Leaving & Experience Certs', to: '/forms/certificates' },
      { id: 'forms_bulk_print', label: 'Bulk Print Spooler', to: '/forms/bulk-print' },
      { id: 'forms_audit_logs', label: 'Print Audit Trail', to: '/forms/audit-logs' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication Center',
    category: 'operations',
    defaultPath: '/communication',
    icon: MessageSquare,
    iconName: 'MessageSquare',
    description: 'Broadcast composer, WhatsApp messaging streams, automated fee reminders, and SMS dispatch logs.',
    subItems: [
      { id: 'comm_overview', label: 'Overview', to: '/communication/overview' },
      { id: 'comm_broadcasts', label: 'Broadcast Composer', to: '/communication/broadcasts' },
      { id: 'comm_whatsapp', label: 'WhatsApp Stream', to: '/communication/whatsapp' },
      { id: 'comm_templates', label: 'Message Templates', to: '/communication/templates' },
      { id: 'comm_history', label: 'Dispatch Logs', to: '/communication/history' },
      { id: 'comm_automations', label: 'Reminder Queues', to: '/communication/automations' },
      { id: 'comm_gateways', label: 'Gateway Diagnostics', to: '/communication/gateways' },
      { id: 'comm_settings', label: 'Channel Settings', to: '/communication/settings' },
    ],
  },
  {
    id: 'import_export',
    label: 'Import & Export',
    category: 'tools',
    defaultPath: '/import-export',
    icon: FileSpreadsheet,
    iconName: 'FileSpreadsheet',
    description: 'Bulk student, faculty, and fee register data import via Excel templates and CSV exports.',
    subItems: [],
  },
  {
    id: 'install',
    label: 'Install App (PWA)',
    category: 'tools',
    defaultPath: '/install',
    icon: Download,
    iconName: 'Download',
    description: 'Install progressive web application for desktop and mobile offline access.',
    subItems: [],
  },
  {
    id: 'users',
    label: 'Users & Roles',
    category: 'admin',
    defaultPath: '/users',
    icon: Shield,
    iconName: 'Shield',
    description: 'Staff user accounts, role definitions, access permissions, invitations, and login audit trails.',
    requiredPermission: 'users:view',
    subItems: [],
  },
  {
    id: 'releases',
    label: 'Releases & Changes',
    category: 'admin',
    defaultPath: '/releases',
    icon: GitBranch,
    iconName: 'GitBranch',
    description: 'Product versioning changelog, feature updates, database migrations history, and release notes.',
    subItems: [],
  },
  {
    id: 'training',
    label: 'Training & Demo Lab',
    category: 'admin',
    defaultPath: '/training',
    icon: FlaskConical,
    iconName: 'FlaskConical',
    description: 'Isolated sandbox environment with sample data for faculty practice and feature evaluation.',
    subItems: [],
  },
  {
    id: 'settings',
    label: 'Settings',
    category: 'admin',
    defaultPath: '/settings',
    icon: Settings,
    iconName: 'Settings',
    description: 'Institute profile, branding, academic rules, document formats, lookups, and navigation settings.',
    subItems: [],
  },
  {
    id: 'sysadmin',
    label: 'SysAdmin Center',
    category: 'admin',
    defaultPath: '/sysadmin',
    icon: Terminal,
    iconName: 'Terminal',
    description: 'Root system administrative operations, tenant management, and emergency ledger maintenance.',
    sysadminOnly: true,
    subItems: [],
  },
]

export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  GraduationCap,
  UserPlus,
  Users,
  CreditCard,
  Briefcase,
  DollarSign,
  ClipboardList,
  Award,
  BookOpen,
  FileCheck,
  BarChart2,
  Printer,
  MessageSquare,
  FileSpreadsheet,
  Download,
  Shield,
  GitBranch,
  FlaskConical,
  Settings,
  Terminal,
}

export function getAuthorizedModules(user: User | null): ModuleDefinition[] {
  if (!user) return []
  const isSys = isUserSysAdmin(user)
  const role = (user.role || '').toLowerCase()
  const perms = user.permissions || []

  return CANONICAL_MODULE_REGISTRY.filter((mod) => {
    if (mod.sysadminOnly && !isSys) return false

    if (mod.requiredPermission && !isSys && role !== 'admin' && role !== 'principal') {
      if (!perms.includes(mod.requiredPermission) && !perms.includes('*:*')) {
        return false
      }
    }

    return true
  })
}

export function getModuleById(id: string): ModuleDefinition | undefined {
  return CANONICAL_MODULE_REGISTRY.find((m) => m.id === id)
}

export function findModuleByPath(pathname: string): ModuleDefinition | undefined {
  const clean = pathname.toLowerCase()
  return CANONICAL_MODULE_REGISTRY.find(
    (m) =>
      clean === m.defaultPath.toLowerCase() ||
      clean.startsWith(m.defaultPath.toLowerCase() + '/') ||
      m.subItems.some((s) => clean === s.to.toLowerCase() || clean.startsWith(s.to.toLowerCase() + '/'))
  )
}
