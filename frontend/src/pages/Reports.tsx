/**
 * @file        Reports.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-23
 *
 * @description Centralized Reporting & Analytics Centre uniting module-wise reports across Students, Academics, Fees, Workforce Payroll, Examinations, and System Audit.
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PrintBrandingFooter } from '../components/PrintDocumentBranding'
import {
  reportsApi,
  academicReportsApi,
  teacherPayrollApi,
  examinationsApi,
  feesApi,
  communicationApi,
  importExportApi,
  standardsApi,
  divisionsApi,
  boardsApi,
  academicYearsApi,
  homeworkApi,
  leadsApi,
  eduboardApi,
} from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { InvoiceStatusBadge } from '../components/Badge'
import { useBranding } from '../config/branding'
import ExcelReportGrid, { ColumnConfig } from '../components/reports/ExcelReportGrid'
import ReportIntelligenceBanner from '../components/reports/ReportIntelligenceBanner'
import FlexibleFilterBuilder, { FilterRule, FieldDefinition } from '../components/reports/FlexibleFilterBuilder'
import FlexibleStudentCharts from '../components/reports/FlexibleStudentCharts'
import { ConcessionTraceModal, ContextualHelpButton } from '../components/common'
import {
  Users,
  GraduationCap,
  DollarSign,
  Briefcase,
  Award,
  ShieldCheck,
  Search,
  Star,
  RefreshCw,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  BarChart3,
  Lock,
  ArrowUpRight,
  Presentation,
  BookOpen,
  SlidersHorizontal,
  CalendarCheck,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import toast from 'react-hot-toast'
import ReportBookBuilder from '../components/reports/ReportBookBuilder'
import type { ReportBookReport } from '../components/reports/reportBookTypes'

// ── Types & Metadata ──────────────────────────────────────────────────────────

type ReportCategoryKey = 'students' | 'academics' | 'fees' | 'concessions' | 'workforce' | 'examinations' | 'system'

interface ReportMeta {
  id: string
  name: string
  category: ReportCategoryKey
  categoryLabel: string
  description: string
  badge: string
  icon: any
  requiresFinancialRole?: boolean
  requiresSysAdminRole?: boolean
}

const REPORT_CATALOG: ReportMeta[] = [
  // 1. Students & Admissions
  {
    id: 'student-master',
    name: 'Student Master Directory & Demographic Roster',
    category: 'students',
    categoryLabel: 'Students & Admissions',
    description: 'Comprehensive exportable directory of enrolled students with guardian contact, academic allocation, and demographic details.',
    badge: 'Master Roster',
    icon: Users,
  },
  {
    id: 'student-attendance',
    name: 'Student Attendance Percentage & Defaulters',
    category: 'students',
    categoryLabel: 'Students & Admissions',
    description: 'Cohort and batch-level attendance percentage tracking with quick filtering for chronic attendance defaulters (<75%).',
    badge: 'Compliance',
    icon: CheckCircle2,
  },
  {
    id: 'withdrawals',
    name: 'Student Withdrawals & Exit Ledger',
    category: 'students',
    categoryLabel: 'Students & Admissions',
    description: 'Formal record of withdrawn students, institutional retention, refund reconciliations, and recorded exit reasons.',
    badge: 'Financial Exit',
    icon: AlertTriangle,
  },
  {
    id: 'withdrawal-analytics',
    name: 'Student Attrition & Retention Analytics',
    category: 'students',
    categoryLabel: 'Students & Admissions',
    description: 'Executive dashboard visualizing monthly attrition trends, exit reason distributions, and cohort retention metrics.',
    badge: 'Executive KPI',
    icon: BarChart3,
  },
  {
    id: 'crm-enquiries',
    name: 'Enquiry Pipeline & CRM Conversion',
    category: 'students',
    categoryLabel: 'Students & Admissions',
    description: 'Lead generation pipeline, conversion rates, source effectiveness, and admission drop-off analysis.',
    badge: 'CRM Analytics',
    icon: Users,
  },

  // 2. Academics & Batches
  {
    id: 'batch-capacity',
    name: 'Batch Capacity & Occupancy Analysis',
    category: 'academics',
    categoryLabel: 'Academics & Batches',
    description: 'Batch-level seat allocation audit, occupancy percentages, and classroom timing distribution across boards.',
    badge: 'Operations',
    icon: GraduationCap,
  },
  {
    id: 'academic-distribution',
    name: 'Board & Standard Distribution Audit',
    category: 'academics',
    categoryLabel: 'Academics & Batches',
    description: 'Student enrollment distribution and intake capacity categorized across state and national educational boards.',
    badge: 'Demographics',
    icon: BarChart3,
  },
  {
    id: 'flexible-student-matrix',
    name: 'Universal Student & Academic 360° Matrix',
    category: 'academics',
    categoryLabel: 'Academics & Batches',
    description: 'Dynamic multidimensional register: Board-wise, Standard-wise, Batch-wise student demographics, attendance telemetry, fee collections, and academic performance with condition filters and live charts.',
    badge: 'Flexible 360°',
    icon: SlidersHorizontal,
  },
  {
    id: 'curriculum-matrix',
    name: 'Subject & Curriculum Offering Matrix',
    category: 'academics',
    categoryLabel: 'Academics & Batches',
    description: 'Cross-tabulation matrix of subjects taught per standard and board, weekly hours, and assigned faculty members.',
    badge: 'Curriculum',
    icon: FileSpreadsheet,
  },
  {
    id: 'timetable-utilization',
    name: 'Timetable Room & Batch Utilization',
    category: 'academics',
    categoryLabel: 'Academics & Batches',
    description: 'Weekly schedule occupancy analysis showing classroom room utilization, weekday spread, and instructional coverage.',
    badge: 'Scheduling',
    icon: Calendar,
  },
  {
    id: 'timetable-execution-audit',
    name: 'Timetable Schedule Execution & Substitution Audit',
    category: 'academics',
    categoryLabel: 'Academics & Batches',
    description: 'Audits scheduled vs delivered lectures, substitute/proxy assignments, cancellations, room adherence, and payroll verification.',
    badge: 'Core Audit (8.8/10)',
    icon: CalendarCheck,
  },
  {
    id: 'homework-register',
    name: 'Daily Homework Checking Register',
    category: 'academics',
    categoryLabel: 'Academics & Batches',
    description: 'Cohort homework assignments, submission turnaround, teacher review velocity, and non-completion defaulters.',
    badge: 'Curriculum Ops',
    icon: FileSpreadsheet,
  },
  {
    id: 'eduboard-summary',
    name: 'EduBoard Digital Classroom Usage',
    category: 'academics',
    categoryLabel: 'Academics & Batches',
    description: 'Lecture board adoption, Classic vs Whiteboard vs Presentation slide counts, templates, and PDF publications.',
    badge: 'Smart Classroom',
    icon: Presentation,
  },

  // 3. Fees & Financials
  {
    id: 'collection',
    name: 'Fee Collection Register',
    category: 'fees',
    categoryLabel: 'Fees & Financials',
    description: 'Primary financial register displaying student fee obligations, realized banking receipts, and net balance dues.',
    badge: 'Financial Master',
    icon: DollarSign,
    requiresFinancialRole: true,
  },
  {
    id: 'outstanding',
    name: 'Outstanding Dues & Overdue Aging',
    category: 'fees',
    categoryLabel: 'Fees & Financials',
    description: 'Student-level outstanding balances, invoice schedules, due dates, and collection recovery targets.',
    badge: 'Receivables',
    icon: DollarSign,
    requiresFinancialRole: true,
  },
  {
    id: 'fee-defaulters',
    name: 'Consolidated Fee Defaulters & Overdue Aging',
    category: 'fees',
    categoryLabel: 'Fees & Financials',
    description: 'Consolidated overdue fee aging register with guardian contacts, days overdue, and CodeX privacy masking.',
    badge: 'Recovery',
    icon: AlertTriangle,
    requiresFinancialRole: true,
  },
  {
    id: 'daily-collection',
    name: 'Daily Payment Intake & Cashier Register',
    category: 'fees',
    categoryLabel: 'Fees & Financials',
    description: 'Day-wise cashier intake register showing receipt numbers, student admissions, payment modes, and transaction references.',
    badge: 'Cashier Ledger',
    icon: FileSpreadsheet,
    requiresFinancialRole: true,
  },
  {
    id: 'summary',
    name: 'Payment Methods & Gateway Volume',
    category: 'fees',
    categoryLabel: 'Fees & Financials',
    description: 'Breakdown of fee transaction count and total inflow per payment method (UPI, Net Banking, Card, Cash, Cheque).',
    badge: 'Gateways',
    icon: BarChart3,
    requiresFinancialRole: true,
  },
  {
    id: 'fee-reconciliation',
    name: 'Financial Audit & Reconciliation Ledger',
    category: 'fees',
    categoryLabel: 'Fees & Financials',
    description: 'Balancing reconciliation between total invoiced billing, realized banking inflows, and outstanding deficits.',
    badge: 'Reconciliation',
    icon: ShieldCheck,
    requiresFinancialRole: true,
  },

  // 4. Teachers & Payroll
  {
    id: 'faculty-load',
    name: 'Faculty Teaching Load & Mentorship Audit',
    category: 'workforce',
    categoryLabel: 'Teachers & Payroll',
    description: 'Weekly instructional workload commitments, assigned classroom batches, and supervised students per teacher.',
    badge: 'Workload',
    icon: Briefcase,
  },
  {
    id: 'payroll-monthly-register',
    name: 'Monthly Teacher Payment Register',
    category: 'workforce',
    categoryLabel: 'Teachers & Payroll',
    description: 'Audited monthly payroll register with base compensation, teaching session bonuses, and net disbursements.',
    badge: 'Payroll Master',
    icon: DollarSign,
    requiresFinancialRole: true,
  },
  {
    id: 'payroll-teaching-hours',
    name: 'Teaching Hours & Delivery Report',
    category: 'workforce',
    categoryLabel: 'Teachers & Payroll',
    description: 'Reconciled teaching sessions, delivered instructional hours, and hourly rate calculations per faculty member.',
    badge: 'Instruction',
    icon: Calendar,
    requiresFinancialRole: true,
  },
  {
    id: 'payroll-batch-cost',
    name: 'Batch-wise Teaching Cost Report',
    category: 'workforce',
    categoryLabel: 'Teachers & Payroll',
    description: 'Cost accounting ledger distributing faculty teaching compensation across individual classroom batches.',
    badge: 'Cost Accounting',
    icon: FileSpreadsheet,
    requiresFinancialRole: true,
  },
  {
    id: 'payroll-subject-cost',
    name: 'Subject-wise Teaching Cost Report',
    category: 'workforce',
    categoryLabel: 'Teachers & Payroll',
    description: 'Departmental curriculum expenditure allocating teacher payroll across subjects and academic disciplines.',
    badge: 'Subject Cost',
    icon: FileSpreadsheet,
    requiresFinancialRole: true,
  },
  {
    id: 'payroll-vouchers',
    name: 'Disbursement Voucher Register',
    category: 'workforce',
    categoryLabel: 'Teachers & Payroll',
    description: 'Detailed payment voucher ledger recording transaction reference numbers, disbursement dates, and recipient accounts.',
    badge: 'Vouchers',
    icon: FileSpreadsheet,
    requiresFinancialRole: true,
  },
  {
    id: 'payroll-monthly-summary',
    name: 'Annual Payroll Cost Summary',
    category: 'workforce',
    categoryLabel: 'Teachers & Payroll',
    description: 'Month-by-month financial summary of institutional teacher compensation and instructional expenditure.',
    badge: 'Annual Cost',
    icon: BarChart3,
    requiresFinancialRole: true,
  },

  // 5. Examinations & Merit
  {
    id: 'exam-merit',
    name: 'Consolidated Exam Marks & Merit Roster',
    category: 'examinations',
    categoryLabel: 'Examinations & Merit',
    description: 'Official merit roster showing student ranks, total marks obtained, percentage, letter grades, and pass/fail status.',
    badge: 'Merit Roster',
    icon: Award,
  },
  {
    id: 'exam-analytics',
    name: 'Subject-wise Exam Analytics & Pass Distribution',
    category: 'examinations',
    categoryLabel: 'Examinations & Merit',
    description: 'Comparative statistical analysis of exams showing highest/lowest scores, subject averages, and pass percentages.',
    badge: 'Cohort Analytics',
    icon: BarChart3,
  },

  // 6. System & Audit
  {
    id: 'audit-logs',
    name: 'Security & Access Audit Trail',
    category: 'system',
    categoryLabel: 'System & Audit',
    description: 'Protected immutable audit trail of user access, logins, permission elevations, and system security events.',
    badge: 'Security Audit',
    icon: ShieldCheck,
    requiresSysAdminRole: true,
  },
  {
    id: 'comm-logs',
    name: 'Communication & Notification Dispatch Logs',
    category: 'system',
    categoryLabel: 'System & Audit',
    description: 'Delivery tracking records for SMS, WhatsApp, and email communications dispatched to students and guardians.',
    badge: 'Communications',
    icon: FileSpreadsheet,
  },
  {
    id: 'import-history',
    name: 'Data Import & Migration History',
    category: 'system',
    categoryLabel: 'System & Audit',
    description: 'Historical audit log of bulk Excel data migrations, fee registers, student enrollments, and validation outcomes.',
    badge: 'Data Exchange',
    icon: FileSpreadsheet,
  },

  // 7. Concessions, Waivers & Scholarships Governance (20 Phase 5 Reports)
  {
    id: 'complete-concession-register',
    name: 'Complete Concession Register',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Full line-by-line governed register of fee concessions across schemes, funding sources, and invoice postings.',
    badge: 'Register',
    icon: Award,
    requiresFinancialRole: true,
  },
  {
    id: 'complete-fee-waiver-register',
    name: 'Complete Fee Waiver Register',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Governed register of all full and partial fee waivers with approval references and posting state.',
    badge: 'Waivers',
    icon: Award,
    requiresFinancialRole: true,
  },
  {
    id: 'student-concession-statement',
    name: 'Student-wise Concession Statement',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Student ledger statement comparing Original Fee, Approved Benefits, Applied Benefits, Net Fee, Paid, and Balance.',
    badge: 'Student Ledger',
    icon: Users,
    requiresFinancialRole: true,
  },
  {
    id: 'class-wise-concession',
    name: 'Class-wise Concession Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Class-level rollups of gross assessment, beneficiary counts, concessions, waivers, scholarships, and net dues.',
    badge: 'Class Rollup',
    icon: GraduationCap,
    requiresFinancialRole: true,
  },
  {
    id: 'division-wise-concession',
    name: 'Division-wise Concession Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Batch/division distribution of beneficiaries, waivers, scholarships, average benefit, and net collectible fees.',
    badge: 'Batch Rollup',
    icon: GraduationCap,
    requiresFinancialRole: true,
  },
  {
    id: 'scheme-wise-scholarship',
    name: 'Scheme-wise Scholarship Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Scholarship & scheme utilization matrix separating institute-funded merit awards from external sponsor grants.',
    badge: 'Schemes',
    icon: Award,
    requiresFinancialRole: true,
  },
  {
    id: 'approved-vs-applied',
    name: 'Approved vs Applied Concession Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Reconciliation report tracking approved sanctions against posted invoice allocations to highlight unapplied liability.',
    badge: 'Control Audit',
    icon: CheckCircle2,
    requiresFinancialRole: true,
  },
  {
    id: 'pending-approval',
    name: 'Pending Approval Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Action queue of nominated or verified concession and scholarship requests awaiting executive approval.',
    badge: 'Queue',
    icon: AlertTriangle,
    requiresFinancialRole: true,
  },
  {
    id: 'full-fee-waiver',
    name: 'Full Fee Waiver Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: '100% tuition/fee waiver beneficiaries and full revenue relief impact audit.',
    badge: '100% Waiver',
    icon: Award,
    requiresFinancialRole: true,
  },
  {
    id: 'partial-fee-waiver',
    name: 'Partial Fee Waiver Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Partial fee waiver cases detailing waived share vs remaining payable tuition obligation.',
    badge: 'Partial Waiver',
    icon: Award,
    requiresFinancialRole: true,
  },
  {
    id: 'sponsor-funded-scholarship',
    name: 'Sponsor-funded Scholarship Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Receivables & settlement reconciliation for external trusts, NGOs, and government scholarship grants.',
    badge: 'Sponsors',
    icon: DollarSign,
    requiresFinancialRole: true,
  },
  {
    id: 'expired-benefits',
    name: 'Expired Benefits Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Approved or pending benefits that lapsed past valid_until before invoice posting (zero balance reduction).',
    badge: 'Expired',
    icon: AlertTriangle,
    requiresFinancialRole: true,
  },
  {
    id: 'cancelled-benefits',
    name: 'Cancelled Benefits Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Cancelled benefits audit showing restored invoice balances and mandatory executive cancellation justifications.',
    badge: 'Cancelled',
    icon: AlertTriangle,
    requiresFinancialRole: true,
  },
  {
    id: 'reversal-adjustment',
    name: 'Reversal and Adjustment Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Immutable ledger of negative reversal postings, credit overpayment adjustments, and manual fee modifications.',
    badge: 'Reversals',
    icon: BarChart3,
    requiresFinancialRole: true,
  },
  {
    id: 'installment-wise-concession',
    name: 'Installment-wise Concession Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Installment schedule impact tracing adjusted installment dues after concession/waiver application.',
    badge: 'Installments',
    icon: Calendar,
    requiresFinancialRole: true,
  },
  {
    id: 'fee-collection-vs-concession',
    name: 'Fee Collection vs Concession Reconciliation',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'System-wide single-source-of-truth balance sheet proof linking Gross, Benefits, Net, Paid, Refunds, and Dues.',
    badge: 'SSOT Proof',
    icon: ShieldCheck,
    requiresFinancialRole: true,
  },
  {
    id: 'academic-year-comparison',
    name: 'Academic Year Comparison',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Multi-year comparison of gross fees, concessions, waivers, scholarships, collections, and benefit ratio.',
    badge: 'YoY Trend',
    icon: BarChart3,
    requiresFinancialRole: true,
  },
  {
    id: 'user-wise-approval-audit',
    name: 'User-wise Approval Audit Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Segregation-of-duties governance report grouping sanctioned and verified benefits by approving officer.',
    badge: 'SoD Audit',
    icon: ShieldCheck,
    requiresFinancialRole: true,
  },
  {
    id: 'concession-eligibility-utilization',
    name: 'Concession Eligibility and Utilization Report',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Scheme catalog capacity vs actual utilization rate, average award, and active beneficiary reach.',
    badge: 'Utilization',
    icon: BarChart3,
    requiresFinancialRole: true,
  },
  {
    id: 'complete-student-benefit-register',
    name: 'Complete Student Benefit Register',
    category: 'concessions',
    categoryLabel: 'Concessions & Scholarships',
    description: 'Unified student master benefit register combining concessions, waivers, scholarships, sponsors, and status.',
    badge: 'Unified Ledger',
    icon: FileSpreadsheet,
    requiresFinancialRole: true,
  },
]

const CATEGORIES: { key: ReportCategoryKey; label: string; icon: any; count: number }[] = [
  { key: 'students', label: 'Students & Admissions', icon: Users, count: 5 },
  { key: 'academics', label: 'Academics & Batches', icon: GraduationCap, count: 6 },
  { key: 'fees', label: 'Fees & Financials', icon: DollarSign, count: 6 },
  { key: 'concessions', label: 'Concessions & Scholarships', icon: Award, count: 20 },
  { key: 'workforce', label: 'Teachers & Payroll', icon: Briefcase, count: 7 },
  { key: 'examinations', label: 'Examinations & Merit', icon: Award, count: 2 },
  { key: 'system', label: 'System & Audit', icon: ShieldCheck, count: 3 },
]

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, selectedAcademicYearId, selectedInstitutionId } = useAuthStore()
  if (searchParams.get('view') === 'books') {
    const bookReports: ReportBookReport[] = REPORT_CATALOG.map((report) => ({
      id: report.id,
      name: report.name,
      category: report.category,
      categoryLabel: report.categoryLabel,
      description: report.description,
      requiresFinancialRole: report.requiresFinancialRole,
      requiresSysAdminRole: report.requiresSysAdminRole,
    }))
    return (
      <ReportBookBuilder
        reports={bookReports}
        institutionId={selectedInstitutionId || undefined}
        selectedAcademicYearId={selectedAcademicYearId || undefined}
        userRole={user?.role}
        onBack={() => setSearchParams((current) => {
          const next = new URLSearchParams(current)
          next.delete('view')
          return next
        }, { replace: true })}
      />
    )
  }
  return <ReportsWorkspace />
}

function ReportsWorkspace() {
  const branding = useBranding()
  const { user, selectedAcademicYearId, selectedInstitutionId } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedReport = REPORT_CATALOG.find((report) => report.id === searchParams.get('report'))
  const requestedCategory = CATEGORIES.find((category) => category.key === searchParams.get('category'))?.key
  const initialCategory = requestedReport?.category || requestedCategory || 'students'
  const initialReportId = requestedReport?.id || REPORT_CATALOG.find((report) => report.category === initialCategory)?.id || 'student-master'

  // ── Navigation & Catalog State ──
  const [activeCategory, setActiveCategory] = useState<ReportCategoryKey>(initialCategory)
  const [activeReportId, setActiveReportId] = useState<string>(initialReportId)
  const [globalSearch, setGlobalSearch] = useState<string>('')
  const [pinnedReports, setPinnedReports] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prashant_pinned_reports')
      return saved ? JSON.parse(saved) : ['student-master', 'collection', 'batch-capacity', 'exam-merit']
    } catch {
      return ['student-master', 'collection', 'batch-capacity', 'exam-merit']
    }
  })

  // ── Global Filter State ──
  const [selectedStandardId, setSelectedStandardId] = useState<string>('')
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('')
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [selectedExamId, setSelectedExamId] = useState<string>('')
  const [reportStatusFilter, setReportStatusFilter] = useState<'default' | 'all' | 'active' | 'withdrawn' | 'completed' | 'graduated' | 'inactive'>('default')
  const [timetableAuditStatus, setTimetableAuditStatus] = useState<string>('all')
  const [concessionStudentSearch, setConcessionStudentSearch] = useState<string>('')
  const [concessionStatusFilter, setConcessionStatusFilter] = useState<string>('all')
  const [concessionFundingFilter, setConcessionFundingFilter] = useState<string>('all')
  const [traceTarget, setTraceTarget] = useState<{
    type: 'application' | 'allocation' | 'invoice' | 'student'
    id: number
  } | null>(null)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-01-01`
  })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [defaultersOnly, setDefaultersOnly] = useState<boolean>(false)
  const [flexibleRules, setFlexibleRules] = useState<FilterRule[]>([])

  // Toggle Pinned
  const togglePin = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedReports((prev) => {
      const next = prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
      try {
        localStorage.setItem('prashant_pinned_reports', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // Active Report Meta
  const activeReport = useMemo(() => {
    return REPORT_CATALOG.find((r) => r.id === activeReportId) || REPORT_CATALOG[0]
  }, [activeReportId])

  const selectReport = (report: ReportMeta) => {
    setActiveCategory(report.category)
    setActiveReportId(report.id)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('category', report.category)
      next.set('report', report.id)
      return next
    }, { replace: true })
  }

  useEffect(() => {
    const report = REPORT_CATALOG.find((item) => item.id === searchParams.get('report'))
    const category = report?.category ||
      CATEGORIES.find((item) => item.key === searchParams.get('category'))?.key ||
      'students'
    const reportId = report?.id || REPORT_CATALOG.find((item) => item.category === category)?.id || 'student-master'
    setActiveCategory(category)
    setActiveReportId(reportId)
  }, [searchParams])

  // Filtered Catalog by search
  const filteredCatalog = useMemo(() => {
    if (!globalSearch.trim()) return []
    const term = globalSearch.toLowerCase()
    return REPORT_CATALOG.filter(
      (r) => r.name.toLowerCase().includes(term) || r.description.toLowerCase().includes(term) || r.categoryLabel.toLowerCase().includes(term)
    )
  }, [globalSearch])

  // Category Reports
  const categoryReports = useMemo(() => {
    return REPORT_CATALOG.filter((r) => r.category === activeCategory)
  }, [activeCategory])

  // RBAC Permission Check
  const hasAccess = useMemo(() => {
    if (!user) return false
    const role = user.role?.toLowerCase() || ''
    const isFinancialAuthorized = ['superadmin', 'super_admin', 'admin', 'accountant', 'principal', 'sysadmin'].includes(role)
    const isSysAdminAuthorized = ['superadmin', 'super_admin', 'sysadmin', 'admin'].includes(role)

    if (activeReport.requiresSysAdminRole && !isSysAdminAuthorized) return false
    if (activeReport.requiresFinancialRole && !isFinancialAuthorized) return false
    return true
  }, [user, activeReport])

  // ── Reference Dropdown Queries ──
  const { data: boards = [] } = useQuery({
    queryKey: ['reports-boards', selectedInstitutionId],
    queryFn: () => boardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: standards = [] } = useQuery({
    queryKey: ['reports-standards', selectedInstitutionId],
    queryFn: () => standardsApi.list().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: divisions = [] } = useQuery({
    queryKey: ['reports-divisions', selectedStandardId, selectedBoardId],
    queryFn: () => divisionsApi.list({
      standard_id: selectedStandardId ? Number(selectedStandardId) : undefined,
      board_id: selectedBoardId ? Number(selectedBoardId) : undefined,
    }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: examinations = [] } = useQuery({
    queryKey: ['reports-examinations', selectedAcademicYearId],
    queryFn: () => examinationsApi.list({ academic_year_id: selectedAcademicYearId || undefined }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  // Auto-select latest exam if none selected
  useEffect(() => {
    if (examinations.length > 0 && !selectedExamId) {
      setSelectedExamId(String(examinations[0].id))
    }
  }, [examinations, selectedExamId])

  // ── Category Report Queries ────────────────────────────────────────────────

  // 0. Universal Flexible Student & Academic 360 Matrix
  const { data: flexibleMatrixData = [], isLoading: loadingFlexibleMatrix, refetch: refetchFlexibleMatrix } = useQuery({
    queryKey: ['report-flexible-matrix', selectedAcademicYearId, selectedBoardId, selectedStandardId, selectedDivisionId, reportStatusFilter],
    queryFn: () =>
      reportsApi.flexibleStudentMatrix({
        academic_year_id: selectedAcademicYearId || undefined,
        board_id: selectedBoardId || undefined,
        standard_id: selectedStandardId || undefined,
        division_id: selectedDivisionId || undefined,
        status: reportStatusFilter !== 'default' ? reportStatusFilter : undefined,
      }).then((r) => r.data),
    enabled: activeReportId === 'flexible-student-matrix',
  })

  // Dynamic filter evaluation for flexible matrix
  const filteredFlexibleData = useMemo(() => {
    if (!flexibleMatrixData || flexibleMatrixData.length === 0) return []
    if (flexibleRules.length === 0) return flexibleMatrixData

    return flexibleMatrixData.filter((row: any) => {
      return flexibleRules.every((rule) => {
        const rawVal = row[rule.fieldId]
        const targetVal = rule.value

        if (rule.operator === 'equals') {
          return String(rawVal ?? '').toLowerCase() === String(targetVal ?? '').toLowerCase()
        }
        if (rule.operator === 'not_equals') {
          return String(rawVal ?? '').toLowerCase() !== String(targetVal ?? '').toLowerCase()
        }
        if (rule.operator === 'contains') {
          return String(rawVal ?? '').toLowerCase().includes(String(targetVal ?? '').toLowerCase())
        }
        if (rule.operator === 'greater_than') {
          return Number(rawVal ?? 0) > Number(targetVal)
        }
        if (rule.operator === 'greater_equal') {
          return Number(rawVal ?? 0) >= Number(targetVal)
        }
        if (rule.operator === 'less_than') {
          return Number(rawVal ?? 0) < Number(targetVal)
        }
        if (rule.operator === 'less_equal') {
          return Number(rawVal ?? 0) <= Number(targetVal)
        }
        return true
      })
    })
  }, [flexibleMatrixData, flexibleRules])

  const flexibleMatrixMetrics = useMemo(() => {
    if (!filteredFlexibleData || !filteredFlexibleData.length) return null
    const cohortCount = filteredFlexibleData.length
    const totalBilled = filteredFlexibleData.reduce((acc: number, r: any) => acc + Number(r.total_fees || 0), 0)
    const totalCollected = filteredFlexibleData.reduce((acc: number, r: any) => acc + Number(r.paid_fees || 0), 0)
    const totalBalance = filteredFlexibleData.reduce((acc: number, r: any) => acc + Number(r.balance_fees || 0), 0)

    const withAttendance = filteredFlexibleData.filter((r: any) => Number(r.total_sessions || 0) > 0)
    const avgAttendance =
      withAttendance.length > 0
        ? (withAttendance.reduce((acc: number, r: any) => acc + Number(r.attendance_percentage || 0), 0) / withAttendance.length).toFixed(1)
        : '0.0'

    const withExams = filteredFlexibleData.filter((r: any) => Number(r.exam_percentage || 0) > 0)
    const avgExamPct =
      withExams.length > 0
        ? (withExams.reduce((acc: number, r: any) => acc + Number(r.exam_percentage || 0), 0) / withExams.length).toFixed(1)
        : '0.0'

    return {
      cohortCount,
      totalBilled,
      totalCollected,
      totalBalance,
      avgAttendance,
      avgExamPct,
    }
  }, [filteredFlexibleData])

  // 1. Students: Master Directory
  const { data: studentMasterData = [], isLoading: loadingMaster, refetch: refetchMaster } = useQuery({
    queryKey: ['report-student-master', selectedAcademicYearId, selectedStandardId, selectedDivisionId, reportStatusFilter],
    queryFn: () =>
      reportsApi.studentMasterDirectory({
        academic_year_id: selectedAcademicYearId || undefined,
        standard_id: selectedStandardId || undefined,
        division_id: selectedDivisionId || undefined,
        status: reportStatusFilter !== 'default' ? reportStatusFilter : undefined,
      }).then((r) => r.data),
    enabled: activeReportId === 'student-master',
  })

  const studentMasterMetrics = useMemo(() => {
    if (!studentMasterData || !studentMasterData.length) return null
    const totalStudents = studentMasterData.length
    const activeEnrolled = studentMasterData.filter((r: any) => r.status === 'enrolled' || r.status === 'active').length
    const uniqueStandards = new Set(studentMasterData.map((r: any) => r.standard_name).filter(Boolean)).size
    const uniqueBatches = new Set(studentMasterData.map((r: any) => r.division_name).filter(Boolean)).size
    const uniqueBoards = new Set(studentMasterData.map((r: any) => r.board_name).filter(Boolean)).size
    const maleCount = studentMasterData.filter((r: any) => (r.gender || '').toLowerCase() === 'male' || (r.gender || '').toLowerCase() === 'm').length
    const femaleCount = studentMasterData.filter((r: any) => (r.gender || '').toLowerCase() === 'female' || (r.gender || '').toLowerCase() === 'f').length
    return {
      totalStudents,
      activeEnrolled,
      uniqueStandards,
      uniqueBatches,
      uniqueBoards,
      genderRatio: `M:${maleCount} / F:${femaleCount}`,
    }
  }, [studentMasterData])

  // 2. Students: Attendance Summary
  const { data: attendanceSummaryData = [], isLoading: loadingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['report-attendance-summary', selectedAcademicYearId, selectedStandardId, selectedDivisionId, startDate, endDate, defaultersOnly],
    queryFn: () =>
      reportsApi.attendanceSummary({
        academic_year_id: selectedAcademicYearId || undefined,
        standard_id: selectedStandardId || undefined,
        division_id: selectedDivisionId || undefined,
        start_date: startDate,
        end_date: endDate,
        defaulters_only: defaultersOnly,
      }).then((r) => r.data),
    enabled: activeReportId === 'student-attendance',
  })

  const attendanceSummaryMetrics = useMemo(() => {
    if (!attendanceSummaryData || !attendanceSummaryData.length) return null
    const totalEvaluated = attendanceSummaryData.length
    const totalSessions = attendanceSummaryData.reduce((sum: number, r: any) => sum + (Number(r.total_days) || 0), 0)
    const totalAttended = attendanceSummaryData.reduce((sum: number, r: any) => sum + (Number(r.present_days) || 0), 0)
    const totalAbsences = attendanceSummaryData.reduce((sum: number, r: any) => sum + (Number(r.absent_days) || 0), 0)
    const avgAttendance = totalSessions > 0 ? ((totalAttended / totalSessions) * 100).toFixed(1) : '0'
    const defaultersCount = attendanceSummaryData.filter((r: any) => (Number(r.attendance_percentage) || 0) < 75 || r.is_defaulter).length
    return {
      totalEvaluated,
      avgAttendance,
      totalSessions,
      totalAttended,
      totalAbsences,
      defaultersCount,
    }
  }, [attendanceSummaryData])

  // 3. Students: Withdrawals
  const { data: withdrawalsReport = [], isLoading: loadingWithdrawals, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['report-withdrawals', selectedAcademicYearId, selectedStandardId, selectedDivisionId],
    queryFn: () =>
      reportsApi.withdrawals({
        academic_year_id: selectedAcademicYearId || undefined,
        standard_id: selectedStandardId || undefined,
        division_id: selectedDivisionId || undefined,
      }).then((r) => r.data),
    enabled: activeReportId === 'withdrawals',
  })

  // 4. Students: Withdrawal Analytics
  const { data: analyticsData, isLoading: loadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['report-withdrawal-analytics', selectedAcademicYearId],
    queryFn: () => reportsApi.withdrawalAnalytics({ academic_year_id: selectedAcademicYearId || undefined }).then((r) => r.data),
    enabled: activeReportId === 'withdrawal-analytics',
  })

  const withdrawalsMetrics = useMemo(() => {
    if (!withdrawalsReport) return null
    const totalWithdrawn = withdrawalsReport.length
    const totalGrossPaid = withdrawalsReport.reduce((acc: number, r: any) => acc + Number(r.gross_paid || 0), 0)
    const totalRefunded = withdrawalsReport.reduce((acc: number, r: any) => acc + Number(r.refund_amount || 0), 0)
    const netRetained = withdrawalsReport.reduce((acc: number, r: any) => acc + Number(r.net_retained || 0), 0)
    const retentionRate = totalGrossPaid > 0 ? ((netRetained / totalGrossPaid) * 100).toFixed(1) : '100.0'
    const uniqueStandards = new Set(withdrawalsReport.map((r: any) => r.standard_name).filter(Boolean)).size
    return {
      totalWithdrawn,
      totalGrossPaid,
      totalRefunded,
      netRetained,
      retentionRate,
      uniqueStandards,
    }
  }, [withdrawalsReport])

  // 5. Academics: Batch Capacity
  const { data: batchCapacityData = [], isLoading: loadingBatchCapacity, refetch: refetchBatchCapacity } = useQuery({
    queryKey: ['report-batch-capacity', selectedBoardId, selectedStandardId],
    queryFn: () => academicReportsApi.getBatchCapacity({ board_id: selectedBoardId || undefined, standard_id: selectedStandardId || undefined }).then((r) => r.data),
    enabled: activeReportId === 'batch-capacity',
  })

  const batchCapacityMetrics = useMemo(() => {
    if (!batchCapacityData || !batchCapacityData.length) return null
    const totalBatches = batchCapacityData.length
    const totalCapacity = batchCapacityData.reduce((sum: number, r: any) => sum + (Number(r.capacity) || 0), 0)
    const totalEnrolled = batchCapacityData.reduce((sum: number, r: any) => sum + (Number(r.enrolled) || 0), 0)
    const totalVacant = batchCapacityData.reduce((sum: number, r: any) => sum + (Number(r.available_seats) || 0), 0)
    const overallOccupancy = totalCapacity > 0 ? ((totalEnrolled / totalCapacity) * 100).toFixed(1) : '0'
    const highOccupancyBatches = batchCapacityData.filter((r: any) => (Number(r.occupancy_percentage) || 0) >= 90).length
    return {
      totalBatches,
      totalCapacity,
      totalEnrolled,
      totalVacant,
      overallOccupancy,
      highOccupancyBatches,
    }
  }, [batchCapacityData])

  // 6. Academics: Board Distribution
  const { data: distributionData = [], isLoading: loadingDistribution, refetch: refetchDistribution } = useQuery({
    queryKey: ['report-distribution'],
    queryFn: () => academicReportsApi.getDistribution().then((r) => r.data),
    enabled: activeReportId === 'academic-distribution',
  })

  const distributionMetrics = useMemo(() => {
    if (!distributionData || !distributionData.length) return null
    const uniqueBoards = new Set(distributionData.map((r: any) => r.board_name).filter(Boolean)).size
    const uniqueStandards = new Set(distributionData.map((r: any) => r.standard_name).filter(Boolean)).size
    const totalBatches = distributionData.reduce((acc: number, r: any) => acc + (Number(r.batches_count) || 0), 0)
    const totalCapacity = distributionData.reduce((acc: number, r: any) => acc + (Number(r.total_capacity) || 0), 0)
    const totalEnrolled = distributionData.reduce((acc: number, r: any) => acc + (Number(r.enrolled_count) || 0), 0)
    const avgOccupancy = totalCapacity > 0 ? ((totalEnrolled / totalCapacity) * 100).toFixed(1) : '0'
    return {
      uniqueBoards,
      uniqueStandards,
      totalBatches,
      totalCapacity,
      totalEnrolled,
      avgOccupancy,
    }
  }, [distributionData])

  // 7. Academics: Curriculum Matrix
  const { data: curriculumMatrixData = [], isLoading: loadingCurriculum, refetch: refetchCurriculum } = useQuery({
    queryKey: ['report-curriculum-matrix', selectedBoardId, selectedStandardId],
    queryFn: () => reportsApi.curriculumMatrix({ board_id: selectedBoardId || undefined, standard_id: selectedStandardId || undefined }).then((r) => r.data),
    enabled: activeReportId === 'curriculum-matrix',
  })

  const curriculumMatrixMetrics = useMemo(() => {
    if (!curriculumMatrixData || !curriculumMatrixData.length) return null
    const totalOfferings = curriculumMatrixData.length
    const uniqueSubjects = new Set(curriculumMatrixData.map((r: any) => r.subject_name)).size
    const totalWeeklyHours = curriculumMatrixData.reduce((sum: number, r: any) => sum + (Number(r.weekly_hours) || 0), 0)
    const uniqueStandards = new Set(curriculumMatrixData.map((r: any) => r.standard_name)).size
    const allocatedTeachersCount = curriculumMatrixData.reduce((sum: number, r: any) => sum + (Number(r.assigned_teachers_count) || 0), 0)
    const avgWeeklyLoad = totalOfferings > 0 ? (totalWeeklyHours / totalOfferings).toFixed(1) : '0'
    return {
      totalOfferings,
      uniqueSubjects,
      totalWeeklyHours,
      uniqueStandards,
      allocatedTeachersCount,
      avgWeeklyLoad,
    }
  }, [curriculumMatrixData])

  // 8. Academics: Timetable Utilization
  const { data: timetableData = [], isLoading: loadingTimetable, refetch: refetchTimetable } = useQuery({
    queryKey: ['report-timetable-utilization', selectedDivisionId],
    queryFn: () => reportsApi.timetableUtilization({ division_id: selectedDivisionId || undefined }).then((r) => r.data),
    enabled: activeReportId === 'timetable-utilization',
  })

  const enrichedTimetableData = useMemo(() => {
    return timetableData.map((d: any) => {
      let dur = 1.0
      if (d.start_time && d.end_time) {
        const [sh, sm] = d.start_time.split(':').map(Number)
        const [eh, em] = d.end_time.split(':').map(Number)
        if (!isNaN(sh) && !isNaN(eh)) {
          const diff = (eh * 60 + em - (sh * 60 + sm)) / 60
          if (diff > 0) dur = Math.round(diff * 100) / 100
        }
      }
      return { ...d, duration_hours: dur }
    })
  }, [timetableData])

  const timetableUtilizationMetrics = useMemo(() => {
    if (!enrichedTimetableData || !enrichedTimetableData.length) return null
    const uniqueRooms = new Set(enrichedTimetableData.map((d: any) => d.room_number).filter(Boolean))
    const uniqueBatches = new Set(enrichedTimetableData.map((d: any) => d.batch_name).filter(Boolean))
    const uniqueTeachers = new Set(
      enrichedTimetableData.map((d: any) => d.teacher_name).filter((t: string) => t && t !== 'Unassigned')
    )
    const totalHours = enrichedTimetableData.reduce((acc: number, cur: any) => acc + (cur.duration_hours || 0), 0)

    const dayCounts: Record<string, number> = {}
    enrichedTimetableData.forEach((d: any) => {
      if (d.day_of_week) {
        dayCounts[d.day_of_week] = (dayCounts[d.day_of_week] || 0) + 1
      }
    })
    let peakDay = '—'
    let peakCount = 0
    Object.entries(dayCounts).forEach(([day, count]) => {
      if (count > peakCount) {
        peakCount = count
        peakDay = day
      }
    })

    return {
      totalSlots: enrichedTimetableData.length,
      activeRooms: uniqueRooms.size,
      activeBatches: uniqueBatches.size,
      activeTeachers: uniqueTeachers.size,
      totalWeeklyHours: Math.round(totalHours * 10) / 10,
      peakDay: `${peakDay} (${peakCount} slots)`,
    }
  }, [enrichedTimetableData])

  // 8b. Academics: Timetable Execution & Substitution Audit
  const { data: timetableExecutionData, isLoading: loadingTimetableExecution, refetch: refetchTimetableExecution } = useQuery({
    queryKey: ['report-timetable-execution-audit', selectedDivisionId, timetableAuditStatus, startDate, endDate, selectedAcademicYearId],
    queryFn: () =>
      reportsApi.timetableExecutionAudit({
        division_id: selectedDivisionId || undefined,
        status: timetableAuditStatus !== 'all' ? timetableAuditStatus : undefined,
        date_from: startDate || undefined,
        date_to: endDate || undefined,
        academic_year_id: selectedAcademicYearId || undefined,
      }).then((r) => r.data),
    enabled: activeReportId === 'timetable-execution-audit',
  })

  // 9. Fees: Fee Collection
  const { data: collectionReport = [], isLoading: loadingCollection, refetch: refetchCollection } = useQuery({
    queryKey: ['report-collection', selectedAcademicYearId, selectedInstitutionId, reportStatusFilter],
    queryFn: () =>
      reportsApi.feeCollection({
        academic_year_id: selectedAcademicYearId || undefined,
        institution_id: selectedInstitutionId || undefined,
        status: reportStatusFilter !== 'default' ? reportStatusFilter : undefined,
      }).then((r) => r.data),
    enabled: activeReportId === 'collection',
  })

  // 10. Fees: Outstanding Dues
  const { data: outstandingReport = [], isLoading: loadingOutstanding, refetch: refetchOutstanding } = useQuery({
    queryKey: ['report-outstanding', selectedAcademicYearId, selectedInstitutionId, reportStatusFilter],
    queryFn: () =>
      reportsApi.outstanding({
        academic_year_id: selectedAcademicYearId || undefined,
        institution_id: selectedInstitutionId || undefined,
        status: reportStatusFilter !== 'default' ? reportStatusFilter : undefined,
      }).then((r) => r.data),
    enabled: activeReportId === 'outstanding',
  })

  // 11. Fees: Defaulters Aging
  const { data: feeDefaultersData = [], isLoading: loadingFeeDefaulters, refetch: refetchFeeDefaulters } = useQuery({
    queryKey: ['report-fee-defaulters', selectedAcademicYearId, selectedStandardId, selectedDivisionId],
    queryFn: () =>
      reportsApi.feeDefaulters({
        academic_year_id: selectedAcademicYearId || undefined,
        standard_id: selectedStandardId || undefined,
        division_id: selectedDivisionId || undefined,
      }).then((r) => r.data),
    enabled: activeReportId === 'fee-defaulters',
  })

  // 12. Fees: Daily Collection
  const { data: dailyCollectionData = [], isLoading: loadingDailyCollection, refetch: refetchDailyCollection } = useQuery({
    queryKey: ['report-daily-collection', startDate, endDate],
    queryFn: () =>
      reportsApi.dailyCollection({
        start_date: startDate,
        end_date: endDate,
      }).then((r) => r.data),
    enabled: activeReportId === 'daily-collection',
  })

  // 13. Fees: Payment Methods Summary
  const { data: summaryReport = [], isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['report-summary', selectedAcademicYearId],
    queryFn: () => reportsApi.paymentsSummary({ academic_year_id: selectedAcademicYearId || undefined }).then((r) => r.data),
    enabled: activeReportId === 'summary',
  })

  // Fees Sleek Telemetry Metrics (Rule 014 Sleek Design System)
  const collectionMetrics = useMemo(() => {
    if (!collectionReport || !collectionReport.length) return null
    const totalCommitment = collectionReport.reduce((acc: number, r: any) => acc + Number(r.total_fees || 0), 0)
    const totalPaid = collectionReport.reduce((acc: number, r: any) => acc + Number(r.paid || 0), 0)
    const totalOutstanding = collectionReport.reduce((acc: number, r: any) => acc + Number(r.outstanding || 0), 0)
    const collectionRate = totalCommitment > 0 ? (totalPaid / totalCommitment) * 100 : 0
    const settledCount = collectionReport.filter((r: any) => Number(r.outstanding || 0) <= 0).length
    const pendingCount = collectionReport.length - settledCount
    return {
      totalCommitment,
      totalPaid,
      totalOutstanding,
      collectionRate,
      settledCount,
      pendingCount,
      totalStudents: collectionReport.length,
    }
  }, [collectionReport])

  const outstandingMetrics = useMemo(() => {
    if (!outstandingReport || !outstandingReport.length) return null
    const totalInvoiced = outstandingReport.reduce((acc: number, r: any) => acc + Number(r.net_amount || 0), 0)
    const totalRecovered = outstandingReport.reduce((acc: number, r: any) => acc + Number(r.paid_amount || 0), 0)
    const totalDeficit = outstandingReport.reduce((acc: number, r: any) => acc + Number(r.outstanding || 0), 0)
    const recoveryRate = totalInvoiced > 0 ? (totalRecovered / totalInvoiced) * 100 : 0
    const avgArrears = outstandingReport.length > 0 ? Math.round(totalDeficit / outstandingReport.length) : 0
    const overdueCount = outstandingReport.filter((r: any) => r.status === 'overdue' || (r.due_date && new Date(r.due_date) < new Date())).length
    return {
      totalInvoices: outstandingReport.length,
      totalInvoiced,
      totalRecovered,
      totalDeficit,
      recoveryRate,
      avgArrears,
      overdueCount,
    }
  }, [outstandingReport])

  const feeDefaultersMetrics = useMemo(() => {
    if (!feeDefaultersData) return null
    const totalOverdue = feeDefaultersData.reduce((acc: number, r: any) => acc + Number(r.overdue_amount || 0), 0)
    const totalOutstanding = feeDefaultersData.reduce((acc: number, r: any) => acc + Number(r.total_outstanding || 0), 0)
    const criticalOverdueCount = feeDefaultersData.filter((r: any) => Number(r.days_overdue || 0) >= 30).length
    const avgDaysOverdue = feeDefaultersData.length > 0 ? Math.round(feeDefaultersData.reduce((acc: number, r: any) => acc + Number(r.days_overdue || 0), 0) / feeDefaultersData.length) : 0
    const contactableCount = feeDefaultersData.filter((r: any) => !!r.guardian_phone && r.guardian_phone !== '—').length
    return {
      defaulterCount: feeDefaultersData.length,
      totalOverdue,
      totalOutstanding,
      criticalOverdueCount,
      avgDaysOverdue,
      contactableCount,
    }
  }, [feeDefaultersData])

  const dailyCollectionMetrics = useMemo(() => {
    if (!dailyCollectionData || !dailyCollectionData.length) return null
    const totalAmount = dailyCollectionData.reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0)
    const issuedReceipts = dailyCollectionData.filter((r: any) => r.receipt_status === 'valid' || !!r.receipt_number).length
    const uniqueStudents = new Set(dailyCollectionData.map((r: any) => r.admission_number).filter(Boolean)).size
    const uniqueCashiers = new Set(dailyCollectionData.map((r: any) => r.collector_name).filter(Boolean)).size
    const avgReceiptAmount = dailyCollectionData.length > 0 ? Math.round(totalAmount / dailyCollectionData.length) : 0
    return {
      transactionCount: dailyCollectionData.length,
      totalAmount,
      issuedReceipts,
      uniqueStudents,
      uniqueCashiers,
      avgReceiptAmount,
    }
  }, [dailyCollectionData])

  const summaryMetrics = useMemo(() => {
    if (!summaryReport || !summaryReport.length) return null
    const totalVolume = summaryReport.reduce((acc: number, r: any) => acc + Number(r.total || 0), 0)
    const totalTransactions = summaryReport.reduce((acc: number, r: any) => acc + Number(r.count || 0), 0)
    const sorted = [...summaryReport].sort((a: any, b: any) => Number(b.total || 0) - Number(a.total || 0))
    const topMethod = sorted[0]?.payment_method || '—'
    const topMethodVolume = Number(sorted[0]?.total || 0)
    const channelsCount = summaryReport.length
    const avgPerTxn = totalTransactions > 0 ? Math.round(totalVolume / totalTransactions) : 0
    return {
      totalVolume,
      totalTransactions,
      topMethod,
      topMethodVolume,
      channelsCount,
      avgPerTxn,
    }
  }, [summaryReport])

  // 14. Fees: Financial Reconciliation
  const { data: overviewData, isLoading: loadingOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['report-fee-overview', selectedAcademicYearId],
    queryFn: () => feesApi.getOverview({ academic_year_id: selectedAcademicYearId || undefined }).then((r) => r.data),
    enabled: activeReportId === 'fee-reconciliation',
  })

  // 15. Workforce: Faculty Load
  const { data: facultyLoadData = [], isLoading: loadingFacultyLoad, refetch: refetchFacultyLoad } = useQuery({
    queryKey: ['report-faculty-load'],
    queryFn: () => academicReportsApi.getFacultyLoad().then((r) => r.data),
    enabled: activeReportId === 'faculty-load',
  })

  const facultyLoadMetrics = useMemo(() => {
    if (!facultyLoadData || !facultyLoadData.length) return null
    const activeFaculty = facultyLoadData.filter((r: any) => (r.weekly_sessions_count || 0) > 0 || (r.assigned_batches_count || 0) > 0)
    const totalSessions = facultyLoadData.reduce((sum: number, r: any) => sum + (r.weekly_sessions_count || 0), 0)
    const totalHours = facultyLoadData.reduce((sum: number, r: any) => sum + (Number(r.weekly_hours) || 0), 0)
    const totalClashes = facultyLoadData.reduce((sum: number, r: any) => sum + (r.schedule_clashes_count || 0), 0)
    const totalStudents = facultyLoadData.reduce((sum: number, r: any) => sum + (r.total_students || 0), 0)
    const avgSessions = activeFaculty.length > 0 ? (totalSessions / activeFaculty.length).toFixed(1) : '0'

    return {
      totalFaculty: facultyLoadData.length,
      activeFaculty: activeFaculty.length,
      totalSessions,
      totalHours: totalHours.toFixed(1),
      totalClashes,
      totalStudents,
      avgSessions,
    }
  }, [facultyLoadData])

  // 16. Workforce: Specialized Payroll Reports
  const payrollReportType = useMemo(() => {
    if (activeReportId.startsWith('payroll-')) {
      return activeReportId.replace('payroll-', '')
    }
    return 'monthly-register'
  }, [activeReportId])

  const { data: payrollReportData = [], isLoading: loadingPayroll, refetch: refetchPayroll } = useQuery({
    queryKey: ['teacher-payroll-report', payrollReportType, startDate, endDate],
    queryFn: () =>
      teacherPayrollApi.getReport(payrollReportType, {
        start_date: startDate,
        end_date: endDate,
      }).then((r) => r.data),
    enabled: activeReportId.startsWith('payroll-'),
  })

  const payrollMetrics = useMemo(() => {
    if (!payrollReportData || !payrollReportData.length) return null
    const totalEntries = payrollReportData.length

    const totalOutlay = payrollReportData.reduce((sum: number, r: any) => {
      const val = Number(r.net_payable ?? r.total_cost ?? r.total_amount ?? r.amount_paid ?? r.base_earnings ?? 0)
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

    const paidOut = payrollReportData.reduce((sum: number, r: any) => {
      const val = Number(r.paid_amount ?? r.amount_paid ?? (r.status === 'paid' ? r.net_payable : 0) ?? 0)
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

    const pendingAmount = payrollReportData.reduce((sum: number, r: any) => {
      const val = Number(r.pending_amount ?? (r.status === 'pending' ? r.net_payable : 0) ?? 0)
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

    const totalHours = payrollReportData.reduce((sum: number, r: any) => {
      const val = Number(r.teaching_hours ?? r.total_hours ?? 0)
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

    const uniqueTeachers = new Set(payrollReportData.map((r: any) => r.teacher_name || r.teacher_id).filter(Boolean)).size
    const settlementRate = totalOutlay > 0 ? ((paidOut / totalOutlay) * 100).toFixed(1) : '100.0'

    return {
      totalEntries,
      totalOutlay,
      paidOut,
      pendingAmount,
      totalHours,
      uniqueTeachers: uniqueTeachers || totalEntries,
      settlementRate,
    }
  }, [payrollReportData])

  // 17. Examinations: Merit Register
  const { data: examMeritData = [], isLoading: loadingExamMerit, refetch: refetchExamMerit } = useQuery({
    queryKey: ['report-exam-merit', selectedExamId, selectedAcademicYearId],
    queryFn: () =>
      reportsApi.examMeritRegister({
        exam_id: selectedExamId ? Number(selectedExamId) : undefined,
        academic_year_id: selectedAcademicYearId || undefined,
      }).then((r) => r.data),
    enabled: activeReportId === 'exam-merit',
  })

  // 18. Examinations: Analytics
  const { data: examAnalyticsData, isLoading: loadingExamAnalytics, refetch: refetchExamAnalytics } = useQuery({
    queryKey: ['report-exam-analytics', selectedExamId],
    queryFn: () => examinationsApi.getAnalytics(Number(selectedExamId)).then((r) => r.data),
    enabled: activeReportId === 'exam-analytics' && !!selectedExamId,
  })

  // 19. System: Security Audit Logs
  const { data: auditLogsData = [], isLoading: loadingAuditLogs, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['report-audit-logs', startDate, endDate],
    queryFn: () => reportsApi.systemAuditSummary({ start_date: startDate, end_date: endDate, limit: 200 }).then((r) => r.data),
    enabled: activeReportId === 'audit-logs',
  })

  // 20. System: Communication Logs
  const { data: commLogsData = [], isLoading: loadingCommLogs, refetch: refetchCommLogs } = useQuery({
    queryKey: ['report-comm-logs'],
    queryFn: () => communicationApi.getLogs().then((r) => (r.data as any)?.items || []),
    enabled: activeReportId === 'comm-logs',
  })

  // 21. System: Import History
  const { data: importHistoryData = [], isLoading: loadingImportHistory, refetch: refetchImportHistory } = useQuery({
    queryKey: ['report-import-history'],
    queryFn: () => importExportApi.getHistory().then((r) => (r.data as any)?.items || []),
    enabled: activeReportId === 'import-history',
  })

  // Examinations & System Sleek Telemetry Metrics (Rule 014 Sleek Design System)
  const examMeritMetrics = useMemo(() => {
    if (!examMeritData) return null
    const totalCandidates = examMeritData.length
    const passedCount = examMeritData.filter((r: any) => (r.status || '').toLowerCase() === 'pass').length
    const failedCount = totalCandidates - passedCount
    const passRate = totalCandidates > 0 ? ((passedCount / totalCandidates) * 100).toFixed(1) : '0'
    const topScore = examMeritData.length > 0 ? Math.max(...examMeritData.map((r: any) => Number(r.marks_obtained) || 0)) : 0
    const totalMarks = examMeritData.reduce((acc: number, r: any) => acc + (Number(r.percentage) || 0), 0)
    const classAvgPct = totalCandidates > 0 ? (totalMarks / totalCandidates).toFixed(1) : '0'
    return {
      totalCandidates,
      passedCount,
      failedCount,
      passRate,
      topScore,
      classAvgPct,
    }
  }, [examMeritData])

  const auditLogsMetrics = useMemo(() => {
    if (!auditLogsData) return null
    const totalEvents = auditLogsData.length
    const uniqueUsers = new Set(auditLogsData.map((r: any) => r.actor_name || r.user_id).filter(Boolean)).size
    const criticalEvents = auditLogsData.filter((r: any) => (r.severity || '').toLowerCase() === 'critical').length
    const warningEvents = auditLogsData.filter((r: any) => (r.severity || '').toLowerCase() === 'warning').length
    const securityActions = auditLogsData.filter((r: any) => (r.resource_type || '').toLowerCase().includes('auth') || (r.action || '').toLowerCase().includes('login')).length
    const adminActions = totalEvents - securityActions
    return {
      totalEvents,
      uniqueUsers,
      criticalEvents,
      warningEvents,
      securityActions,
      adminActions,
    }
  }, [auditLogsData])

  const commLogsMetrics = useMemo(() => {
    if (!commLogsData) return null
    const totalDispatches = commLogsData.length
    const deliveredCount = commLogsData.filter((r: any) => (r.status || '').toLowerCase() === 'delivered' || (r.status || '').toLowerCase() === 'sent').length
    const failedCount = totalDispatches - deliveredCount
    const deliveryRate = totalDispatches > 0 ? ((deliveredCount / totalDispatches) * 100).toFixed(1) : '100.0'
    const smsCount = commLogsData.filter((r: any) => (r.channel || '').toLowerCase() === 'sms').length
    const whatsappCount = commLogsData.filter((r: any) => (r.channel || '').toLowerCase() === 'whatsapp').length
    const emailCount = commLogsData.filter((r: any) => (r.channel || '').toLowerCase() === 'email').length
    return {
      totalDispatches,
      deliveredCount,
      failedCount,
      deliveryRate,
      smsCount,
      whatsappCount,
      emailCount,
    }
  }, [commLogsData])

  const importHistoryMetrics = useMemo(() => {
    if (!importHistoryData) return null
    const totalMigrations = importHistoryData.length
    const totalRows = importHistoryData.reduce((acc: number, r: any) => acc + (Number(r.total_rows) || 0), 0)
    const successRows = importHistoryData.reduce((acc: number, r: any) => acc + (Number(r.successful_rows) || 0), 0)
    const failedRows = importHistoryData.reduce((acc: number, r: any) => acc + (Number(r.failed_rows) || 0), 0)
    const successRate = totalRows > 0 ? ((successRows / totalRows) * 100).toFixed(1) : '100.0'
    const completedMigrations = importHistoryData.filter((r: any) => (r.status || '').toLowerCase() === 'completed' || (r.status || '').toLowerCase() === 'success').length
    return {
      totalMigrations,
      totalRows,
      successRows,
      failedRows,
      successRate,
      completedMigrations,
    }
  }, [importHistoryData])

  // 22. Academics: Daily Homework Register
  const { data: homeworkRegisterData, isLoading: loadingHomeworkRegister, refetch: refetchHomeworkRegister } = useQuery({
    queryKey: ['report-homework-register', selectedStandardId, selectedDivisionId],
    queryFn: () =>
      homeworkApi.getDailyRegisterReport({
        standard_id: selectedStandardId || undefined,
        division_id: selectedDivisionId || undefined,
      }).then((r) => r.data),
    enabled: activeReportId === 'homework-register',
  })

  const homeworkRegisterMetrics = useMemo(() => {
    const items = homeworkRegisterData?.items || []
    if (!items.length) return null
    const totalAssignments = items.length
    const totalAssigned = items.reduce((sum, r) => sum + (Number(r.total_students) || 0), 0)
    const totalCompleted = items.reduce((sum, r) => sum + (Number(r.completed) || 0), 0)
    const totalPending = items.reduce((sum, r) => sum + (Number(r.pending) || 0), 0)
    const turnaroundRate = totalAssigned > 0 ? ((totalCompleted / totalAssigned) * 100).toFixed(1) : '0'
    const uniqueTeachers = new Set(items.map((r) => r.teacher).filter(Boolean)).size
    return {
      totalAssignments,
      totalAssigned,
      totalCompleted,
      totalPending,
      turnaroundRate,
      uniqueTeachers,
    }
  }, [homeworkRegisterData])

  // 22b. Academics: EduBoard Usage Summary
  const { data: eduboardSummaryData, isLoading: loadingEduBoardSummary, refetch: refetchEduBoardSummary } = useQuery({
    queryKey: ['report-eduboard-summary', selectedAcademicYearId],
    queryFn: () => eduboardApi.getReportsSummary(selectedAcademicYearId || undefined).then((r) => r.data),
    enabled: activeReportId === 'eduboard-summary',
  })

  const eduboardSummaryMetrics = useMemo(() => {
    if (!eduboardSummaryData) return null
    const totalBoards = eduboardSummaryData.total_boards ?? 0
    const publishedBoards = eduboardSummaryData.published_boards ?? 0
    const totalPages = eduboardSummaryData.total_pages ?? 0
    const pdfAttachments = eduboardSummaryData.total_pdf_attachments ?? 0
    const templatesCount = eduboardSummaryData.templates_count ?? 0
    const avgPagesPerBoard = totalBoards > 0 ? (totalPages / totalBoards).toFixed(1) : '0'
    return {
      totalBoards,
      publishedBoards,
      totalPages,
      pdfAttachments,
      templatesCount,
      avgPagesPerBoard,
    }
  }, [eduboardSummaryData])

  // 23. Students: CRM Enquiries & Conversion Pipeline
  const { data: crmReportsData, isLoading: loadingCrmReports, refetch: refetchCrmReports } = useQuery({
    queryKey: ['report-crm-enquiries', selectedAcademicYearId],
    queryFn: () => leadsApi.getReportsAnalytics().then((r: any) => r.data),
    enabled: activeReportId === 'crm-enquiries',
  })

  const crmEnquiriesMetrics = useMemo(() => {
    const matrix = crmReportsData?.counsellors_matrix || []
    if (!matrix.length) return null
    const totalCounsellors = matrix.length
    const totalLeads = matrix.reduce((sum: number, r: any) => sum + (Number(r.assigned_leads) || 0), 0)
    const totalFollowUps = matrix.reduce((sum: number, r: any) => sum + (Number(r.follow_ups_logged) || 0), 0)
    const totalConversions = matrix.reduce((sum: number, r: any) => sum + (Number(r.conversions) || 0), 0)
    const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : '0'
    const avgFollowUpsPerLead = totalLeads > 0 ? (totalFollowUps / totalLeads).toFixed(1) : '0'
    return {
      totalCounsellors,
      totalLeads,
      totalFollowUps,
      totalConversions,
      conversionRate,
      avgFollowUpsPerLead,
    }
  }, [crmReportsData])

  // 24. Concessions, Waivers & Scholarships (20 Phase 5 Governed Reports)
  const isConcessionReportActive = activeReport.category === 'concessions'
  const { data: concessionReportData, isLoading: loadingConcessionReport, refetch: refetchConcessionReport } = useQuery({
    queryKey: [
      'report-concession-governance',
      activeReportId,
      selectedAcademicYearId,
      selectedStandardId,
      selectedDivisionId,
      startDate,
      endDate,
      concessionStatusFilter,
      concessionFundingFilter,
      concessionStudentSearch,
    ],
    queryFn: () =>
      reportsApi
        .concessionReport(activeReportId, {
          academic_year_id: selectedAcademicYearId || undefined,
          standard_id: selectedStandardId || undefined,
          division_id: selectedDivisionId || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          status: concessionStatusFilter !== 'all' ? concessionStatusFilter : undefined,
          funding_source: concessionFundingFilter !== 'all' ? concessionFundingFilter : undefined,
          search: concessionStudentSearch.trim() || undefined,
        })
        .then((r) => r.data),
    enabled: isConcessionReportActive && hasAccess,
  })

  const reportQueryClient = useQueryClient()
  const reportQueryPrefix = isConcessionReportActive
    ? 'report-concession-governance'
    : activeReportId.startsWith('payroll-')
      ? 'teacher-payroll-report'
      : ({
          'student-master': 'report-student-master',
          'student-attendance': 'report-attendance-summary',
          withdrawals: 'report-withdrawals',
          'withdrawal-analytics': 'report-withdrawal-analytics',
          'batch-capacity': 'report-batch-capacity',
          'academic-distribution': 'report-distribution',
          'curriculum-matrix': 'report-curriculum-matrix',
          'timetable-utilization': 'report-timetable-utilization',
          'timetable-execution-audit': 'report-timetable-execution-audit',
          collection: 'report-collection',
          outstanding: 'report-outstanding',
          'fee-defaulters': 'report-fee-defaulters',
          'daily-collection': 'report-daily-collection',
          summary: 'report-summary',
          'fee-reconciliation': 'report-fee-overview',
          'faculty-load': 'report-faculty-load',
          'exam-merit': 'report-exam-merit',
          'exam-analytics': 'report-exam-analytics',
          'audit-logs': 'report-audit-logs',
          'comm-logs': 'report-comm-logs',
          'import-history': 'report-import-history',
          'homework-register': 'report-homework-register',
          'eduboard-summary': 'report-eduboard-summary',
          'crm-enquiries': 'report-crm-enquiries',
        } as Record<string, string>)[activeReportId]
  const activeReportQueryError = reportQueryPrefix
    ? reportQueryClient
        .getQueryCache()
        .findAll({ queryKey: [reportQueryPrefix] })
        .find((query) => query.isActive() && query.state.status === 'error')?.state.error
    : undefined

  const handleDownloadConcessionExport = async (format: 'csv' | 'xlsx') => {
    try {
      const res = await reportsApi.exportConcessionReport(activeReportId, {
        format,
        academic_year_id: selectedAcademicYearId || undefined,
        standard_id: selectedStandardId || undefined,
        division_id: selectedDivisionId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status: concessionStatusFilter !== 'all' ? concessionStatusFilter : undefined,
        funding_source: concessionFundingFilter !== 'all' ? concessionFundingFilter : undefined,
        search: concessionStudentSearch.trim() || undefined,
      })
      let exportData = res.data
      if (format === 'csv' && typeof exportData === 'string' && !exportData.startsWith('\uFEFF')) {
        exportData = '\uFEFF' + exportData
      }
      const blob = new Blob([exportData], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8;'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${activeReportId}_${new Date().toISOString().slice(0, 10)}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Exported ${activeReport.name} as ${format.toUpperCase()}`)
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()} file.`)
    }
  }

  // Master Refetch Trigger
  const handleRefetch = () => {
    if (isConcessionReportActive) refetchConcessionReport()
    else if (activeReportId === 'student-master') refetchMaster()
    else if (activeReportId === 'student-attendance') refetchAttendance()
    else if (activeReportId === 'withdrawals') refetchWithdrawals()
    else if (activeReportId === 'withdrawal-analytics') refetchAnalytics()
    else if (activeReportId === 'batch-capacity') refetchBatchCapacity()
    else if (activeReportId === 'academic-distribution') refetchDistribution()
    else if (activeReportId === 'curriculum-matrix') refetchCurriculum()
    else if (activeReportId === 'timetable-utilization') refetchTimetable()
    else if (activeReportId === 'timetable-execution-audit') refetchTimetableExecution()
    else if (activeReportId === 'collection') refetchCollection()
    else if (activeReportId === 'outstanding') refetchOutstanding()
    else if (activeReportId === 'fee-defaulters') refetchFeeDefaulters()
    else if (activeReportId === 'daily-collection') refetchDailyCollection()
    else if (activeReportId === 'summary') refetchSummary()
    else if (activeReportId === 'fee-reconciliation') refetchOverview()
    else if (activeReportId === 'faculty-load') refetchFacultyLoad()
    else if (activeReportId.startsWith('payroll-')) refetchPayroll()
    else if (activeReportId === 'exam-merit') refetchExamMerit()
    else if (activeReportId === 'exam-analytics') refetchExamAnalytics()
    else if (activeReportId === 'audit-logs') refetchAuditLogs()
    else if (activeReportId === 'comm-logs') refetchCommLogs()
    else if (activeReportId === 'import-history') refetchImportHistory()
    else if (activeReportId === 'homework-register') refetchHomeworkRegister()
    else if (activeReportId === 'eduboard-summary') refetchEduBoardSummary()
    else if (activeReportId === 'crm-enquiries') refetchCrmReports()
    else if (activeReportId === 'flexible-student-matrix') refetchFlexibleMatrix()
    toast.success('Report data refreshed')
  }

  // ── Column Configurations ──────────────────────────────────────────────────

  // 0. Flexible Matrix Field Definitions for Dynamic Condition Filter
  const flexibleFieldDefinitions = useMemo<FieldDefinition[]>(() => [
    { id: 'board_name', label: 'Board', type: 'text' },
    { id: 'standard_name', label: 'Standard / Grade', type: 'text' },
    { id: 'division_name', label: 'Batch / Division', type: 'text' },
    { id: 'student_name', label: 'Student Name', type: 'text' },
    { id: 'admission_number', label: 'Admission #', type: 'text' },
    { id: 'roll_number', label: 'Roll Number', type: 'text' },
    { id: 'gender', label: 'Gender', type: 'select', options: [{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }] },
    { id: 'guardian_name', label: 'Guardian Name', type: 'text' },
    { id: 'guardian_phone', label: 'Guardian Phone', type: 'text' },
    { id: 'city', label: 'City', type: 'text' },
    { id: 'attendance_percentage', label: 'Attendance %', type: 'percentage' },
    { id: 'attendance_status', label: 'Attendance Compliance', type: 'select', options: [{ label: 'Good', value: 'Good' }, { label: 'Average', value: 'Average' }, { label: 'Defaulter (<75%)', value: 'Defaulter (<75%)' }] },
    { id: 'total_fees', label: 'Total Invoiced (₹)', type: 'currency' },
    { id: 'paid_fees', label: 'Paid Fees (₹)', type: 'currency' },
    { id: 'balance_fees', label: 'Outstanding Balance (₹)', type: 'currency' },
    { id: 'payment_status', label: 'Fee Payment Status', type: 'select', options: [{ label: 'Paid', value: 'Paid' }, { label: 'Partial', value: 'Partial' }, { label: 'Defaulter', value: 'Defaulter' }, { label: 'No Fees', value: 'No Fees' }] },
    { id: 'exam_percentage', label: 'Exam Marks %', type: 'percentage' },
    { id: 'performance_grade', label: 'Performance Grade', type: 'text' },
  ], [])

  // 0. Flexible Matrix Grid Columns
  const flexibleMatrixColumns = useMemo<ColumnConfig<any>[]>(() => [
    { id: 'admission_number', header: 'Admission #', accessorKey: 'admission_number', type: 'text', width: 130, sortable: true, filterable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span> },
    { id: 'student_name', header: 'Student Name', accessorKey: 'student_name', type: 'text', width: 190, sortable: true, filterable: true, render: (val) => <span className="font-semibold text-slate-900">{val}</span> },
    { id: 'board_name', header: 'Board', accessorKey: 'board_name', type: 'text', width: 120, sortable: true, filterable: true, render: (val) => <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-semibold">{val}</span> },
    { id: 'standard_name', header: 'Standard / Grade', accessorKey: 'standard_name', type: 'text', width: 140, sortable: true, filterable: true },
    { id: 'division_name', header: 'Batch / Division', accessorKey: 'division_name', type: 'text', width: 160, sortable: true, filterable: true, render: (val, r) => <span className="font-semibold text-slate-800">{val} {r.batch_code ? `[${r.batch_code}]` : ''}</span> },
    { id: 'roll_number', header: 'Roll #', accessorKey: 'roll_number', type: 'text', width: 90, sortable: true, align: 'center' },
    { id: 'guardian_name', header: 'Guardian Name', accessorKey: 'guardian_name', type: 'text', width: 150, sortable: true },
    { id: 'guardian_phone', header: 'Guardian Contact', accessorKey: 'guardian_phone', type: 'text', width: 140, render: (val) => <span className="font-mono">{val}</span> },
    { id: 'attendance_percentage', header: 'Attd %', accessorKey: 'attendance_percentage', type: 'number', width: 120, align: 'right', sortable: true, render: (val) => <span className={`font-mono font-bold ${val < 75 ? 'text-rose-600' : val >= 85 ? 'text-emerald-700' : 'text-amber-600'}`}>{val}%</span> },
    { id: 'attendance_status', header: 'Attd Health', accessorKey: 'attendance_status', type: 'text', width: 140, render: (val) => <span className={`px-2 py-0.5 rounded text-xs font-bold ${val === 'Defaulter (<75%)' ? 'bg-rose-100 text-rose-800' : val === 'Good' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{val}</span> },
    { id: 'total_fees', header: 'Total Fees (₹)', accessorKey: 'total_fees', type: 'currency', width: 140, align: 'right', sortable: true, render: (val) => <span className="font-medium text-slate-900">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
    { id: 'paid_fees', header: 'Paid (₹)', accessorKey: 'paid_fees', type: 'currency', width: 140, align: 'right', sortable: true, render: (val) => <span className="font-bold text-emerald-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
    { id: 'balance_fees', header: 'Balance Dues (₹)', accessorKey: 'balance_fees', type: 'currency', width: 150, align: 'right', sortable: true, render: (val) => <span className={`font-bold ${val > 0 ? 'text-rose-600' : 'text-slate-400'}`}>₹{Number(val || 0).toLocaleString('en-IN')}</span> },
    { id: 'payment_status', header: 'Fee Status', accessorKey: 'payment_status', type: 'text', width: 120, render: (val) => <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${val === 'Paid' ? 'bg-emerald-100 text-emerald-800' : val === 'Defaulter' ? 'bg-rose-100 text-rose-800' : val === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{val}</span> },
    { id: 'exam_percentage', header: 'Exam Marks %', accessorKey: 'exam_percentage', type: 'number', width: 130, align: 'right', sortable: true, render: (val) => <span className="font-mono font-bold text-indigo-700">{val}%</span> },
    { id: 'performance_grade', header: 'Grade', accessorKey: 'performance_grade', type: 'text', width: 100, align: 'center', sortable: true, render: (val) => <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700">{val}</span> },
  ], [])

  // 1. Student Master Directory Columns
  const studentMasterColumns = useMemo<ColumnConfig<any>[]>(() => [
    { id: 'admission_number', header: 'Admission #', accessorKey: 'admission_number', type: 'text', width: 130, sortable: true, filterable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span> },
    { id: 'student_name', header: 'Student Name', accessorKey: 'student_name', type: 'text', width: 190, sortable: true, filterable: true, render: (val) => <span className="font-semibold text-slate-900">{val}</span> },
    { id: 'standard_name', header: 'Standard / Grade', accessorKey: 'standard_name', type: 'text', width: 140, sortable: true, filterable: true },
    { id: 'division_name', header: 'Batch / Division', accessorKey: 'division_name', type: 'text', width: 150, sortable: true, filterable: true },
    { id: 'board_name', header: 'Board', accessorKey: 'board_name', type: 'text', width: 110, sortable: true, filterable: true, render: (val) => <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-semibold">{val}</span> },
    { id: 'gender', header: 'Gender', accessorKey: 'gender', type: 'text', width: 90, sortable: true, render: (val) => <span className="capitalize">{val}</span> },
    { id: 'date_of_birth', header: 'DOB', accessorKey: 'date_of_birth', type: 'date', width: 110, sortable: true },
    { id: 'phone', header: 'Guardian Phone', accessorKey: 'phone', type: 'text', width: 130, render: (val) => <span className="font-mono">{val}</span> },
    { id: 'city', header: 'City', accessorKey: 'city', type: 'text', width: 110 },
    { id: 'status', header: 'Status', accessorKey: 'status', type: 'text', width: 110, render: (val) => <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${val === 'enrolled' || val === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{val}</span> },
  ], [])

  // 2. Attendance Summary Columns
  const attendanceColumns = useMemo<ColumnConfig<any>[]>(() => [
    { id: 'admission_number', header: 'Admission #', accessorKey: 'admission_number', type: 'text', width: 130, sortable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span> },
    { id: 'student_name', header: 'Student Name', accessorKey: 'student_name', type: 'text', width: 190, sortable: true, render: (val) => <span className="font-semibold text-slate-900">{val}</span> },
    { id: 'standard_name', header: 'Standard', accessorKey: 'standard_name', type: 'text', width: 130, sortable: true },
    { id: 'division_name', header: 'Batch', accessorKey: 'division_name', type: 'text', width: 140, sortable: true },
    { id: 'total_days', header: 'Total Sessions', accessorKey: 'total_days', type: 'number', width: 120, align: 'center', sortable: true },
    { id: 'present_days', header: 'Attended', accessorKey: 'present_days', type: 'number', width: 110, align: 'center', sortable: true, render: (val) => <span className="font-bold text-emerald-700">{val}</span> },
    { id: 'absent_days', header: 'Absent', accessorKey: 'absent_days', type: 'number', width: 100, align: 'center', sortable: true, render: (val) => <span className="font-bold text-rose-700">{val}</span> },
    { id: 'attendance_percentage', header: 'Attendance %', accessorKey: 'attendance_percentage', type: 'number', width: 130, align: 'right', sortable: true, render: (val) => <span className={`font-mono font-bold text-sm ${val < 75 ? 'text-rose-600' : 'text-emerald-700'}`}>{val}%</span> },
    { id: 'status', header: 'Compliance', accessorKey: 'status', type: 'text', width: 140, render: (val, row) => <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.is_defaulter ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'}`}>{val}</span> },
  ], [])

  // 3. Fee Collection Columns
  const collectionColumns = useMemo<ColumnConfig<any>[]>(() => [
    { id: 'admission_number', header: 'Admission #', accessorKey: 'admission_number', type: 'text', width: 130, sortable: true, filterable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span> },
    { id: 'student_name', header: 'Student Name', accessorKey: 'student_name', type: 'text', width: 190, sortable: true, filterable: true, render: (val) => <span className="font-semibold text-slate-900">{val}</span> },
    { id: 'total_fees', header: 'Net Invoiced (₹)', accessorKey: 'total_fees', type: 'currency', width: 150, align: 'right', sortable: true, render: (val) => <span className="font-bold text-slate-900">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
    { id: 'paid', header: 'Realized Paid (₹)', accessorKey: 'paid', type: 'currency', width: 150, align: 'right', sortable: true, render: (val) => <span className="font-bold text-emerald-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
    { id: 'outstanding', header: 'Balance Due (₹)', accessorKey: 'outstanding', type: 'currency', width: 150, align: 'right', sortable: true, render: (val) => <span className={`font-bold ${val > 0 ? 'text-rose-600' : 'text-slate-400'}`}>₹{Number(val || 0).toLocaleString('en-IN')}</span> },
  ], [])

  // 4. Fee Defaulters Columns
  const feeDefaultersColumns = useMemo<ColumnConfig<any>[]>(() => [
    { id: 'admission_number', header: 'Admission #', accessorKey: 'admission_number', type: 'text', width: 130, sortable: true, render: (val) => <span className="font-mono font-bold text-rose-700">{val}</span> },
    { id: 'student_name', header: 'Student Name', accessorKey: 'student_name', type: 'text', width: 190, sortable: true, render: (val) => <span className="font-semibold text-slate-900">{val}</span> },
    { id: 'standard_name', header: 'Standard', accessorKey: 'standard_name', type: 'text', width: 130, sortable: true },
    { id: 'guardian_phone', header: 'Guardian Phone', accessorKey: 'guardian_phone', type: 'text', width: 140, render: (val) => <span className="font-mono">{val}</span> },
    { id: 'installment_name', header: 'Overdue Milestone', accessorKey: 'installment_name', type: 'text', width: 150 },
    { id: 'days_overdue', header: 'Days Overdue', accessorKey: 'days_overdue', type: 'number', width: 120, align: 'center', sortable: true, render: (val) => <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">{val} days</span> },
    { id: 'overdue_amount', header: 'Overdue Dues (₹)', accessorKey: 'overdue_amount', type: 'currency', width: 150, align: 'right', sortable: true, render: (val) => <span className="font-bold text-rose-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
    { id: 'total_outstanding', header: 'Total Balance (₹)', accessorKey: 'total_outstanding', type: 'currency', width: 150, align: 'right', sortable: true, render: (val) => <span className="font-bold text-slate-900">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
  ], [])

  // 5. Daily Collection Columns
  const dailyCollectionColumns = useMemo<ColumnConfig<any>[]>(() => [
    { id: 'receipt_number', header: 'Receipt #', accessorKey: 'receipt_number', type: 'text', width: 160, sortable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val || '—'}</span> },
    { id: 'receipt_status', header: 'Receipt Status', accessorKey: 'receipt_status', type: 'text', width: 130, render: (val) => <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${val === 'valid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{val === 'valid' ? 'Issued' : val === 'missing' ? 'Not issued' : val}</span> },
    { id: 'payment_date', header: 'Date', accessorKey: 'payment_date', type: 'date', width: 110, sortable: true },
    { id: 'student_name', header: 'Student Name', accessorKey: 'student_name', type: 'text', width: 180, sortable: true },
    { id: 'admission_number', header: 'Admission #', accessorKey: 'admission_number', type: 'text', width: 120 },
    { id: 'payment_mode', header: 'Mode', accessorKey: 'payment_mode', type: 'text', width: 110, render: (val) => <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold uppercase">{val}</span> },
    { id: 'transaction_reference', header: 'Reference', accessorKey: 'transaction_reference', type: 'text', width: 150, render: (val) => <span className="font-mono text-xs">{val}</span> },
    { id: 'collector_name', header: 'Cashier / Collector', accessorKey: 'collector_name', type: 'text', width: 160 },
    { id: 'amount', header: 'Amount (₹)', accessorKey: 'amount', type: 'currency', width: 140, align: 'right', sortable: true, render: (val) => <span className="font-bold text-emerald-800">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
  ], [])

  // 6. Exam Merit Columns
  const examMeritColumns = useMemo<ColumnConfig<any>[]>(() => [
    { id: 'rank', header: 'Rank', accessorKey: 'rank', type: 'number', width: 80, align: 'center', sortable: true, render: (val) => <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mx-auto ${val === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' : val === 2 ? 'bg-slate-200 text-slate-800' : val === 3 ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-600'}`}>{val}</span> },
    { id: 'admission_number', header: 'Admission #', accessorKey: 'admission_number', type: 'text', width: 130, sortable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span> },
    { id: 'student_name', header: 'Student Name', accessorKey: 'student_name', type: 'text', width: 190, sortable: true, render: (val) => <span className="font-semibold text-slate-900">{val}</span> },
    { id: 'exam_name', header: 'Exam', accessorKey: 'exam_name', type: 'text', width: 150 },
    { id: 'marks_obtained', header: 'Marks Obtained', accessorKey: 'marks_obtained', type: 'number', width: 130, align: 'center', sortable: true, render: (val, row) => <span className="font-mono font-bold text-slate-900">{val} / {row.max_marks}</span> },
    { id: 'percentage', header: 'Percentage', accessorKey: 'percentage', type: 'number', width: 120, align: 'right', sortable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val}%</span> },
    { id: 'grade', header: 'Grade', accessorKey: 'grade', type: 'text', width: 90, align: 'center', render: (val) => <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 font-bold rounded">{val}</span> },
    { id: 'status', header: 'Result', accessorKey: 'status', type: 'text', width: 100, align: 'center', render: (val) => <span className={`px-2 py-0.5 rounded text-xs font-bold ${val === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{val}</span> },
  ], [])

  // 7. Security Audit Columns
  const auditColumns = useMemo<ColumnConfig<any>[]>(() => [
    { id: 'timestamp', header: 'Timestamp', accessorKey: 'timestamp', type: 'date', width: 160, sortable: true, render: (val) => <span className="font-mono text-xs text-slate-600">{val ? new Date(val).toLocaleString('en-IN') : 'N/A'}</span> },
    { id: 'actor_name', header: 'Actor User', accessorKey: 'actor_name', type: 'text', width: 160, sortable: true, render: (val) => <span className="font-semibold text-slate-900">{val}</span> },
    { id: 'action', header: 'Action', accessorKey: 'action', type: 'text', width: 160, render: (val) => <span className="font-mono text-xs text-primary-700 font-semibold">{val}</span> },
    { id: 'resource_type', header: 'Resource', accessorKey: 'resource_type', type: 'text', width: 130 },
    { id: 'severity', header: 'Severity', accessorKey: 'severity', type: 'text', width: 100, render: (val) => <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${val === 'critical' ? 'bg-rose-100 text-rose-800' : val === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-primary-50 text-primary-700'}`}>{val}</span> },
    { id: 'ip_address', header: 'IP Address', accessorKey: 'ip_address', type: 'text', width: 130, render: (val) => <span className="font-mono text-xs text-slate-500">{val}</span> },
    { id: 'details', header: 'Event Details', accessorKey: 'details', type: 'text', width: 250 },
  ], [])

  // 8. Generic dynamic columns for payroll reports
  const dynamicPayrollColumns = useMemo<ColumnConfig<any>[]>(() => {
    if (!payrollReportData.length) return []
    return Object.keys(payrollReportData[0]).map((key) => ({
      id: key,
      header: key.replace(/_/g, ' ').toUpperCase(),
      accessorKey: key,
      type: typeof payrollReportData[0][key] === 'number' ? 'number' : 'text',
      sortable: true,
      filterable: true,
      render: (val: any) => {
        if (typeof val === 'number' && (key.includes('amount') || key.includes('cost') || key.includes('net') || key.includes('salary'))) {
          return <span className="font-mono font-bold text-slate-900">₹{val.toLocaleString('en-IN')}</span>
        }
        return <span>{String(val ?? 'N/A')}</span>
      },
    }))
  }, [payrollReportData])

  return (
    <div className="space-y-6">
      {/* ── Header & Global Search Bar ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reporting & Analytics Centre</h1>
            <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 border border-indigo-200 rounded-full font-bold text-xs uppercase">
              {REPORT_CATALOG.length} Enterprise Reports
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Centralized institutional business intelligence, audited spreadsheets, financial reconciliations, and cohort analytics
          </p>
        </div>

        {/* Global Search Bar & Contextual Help */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <ContextualHelpButton moduleKey="reports" variant="pill" label="Reports Help" />
          <button
            type="button"
            onClick={() => setSearchParams((current) => {
              const next = new URLSearchParams(current)
              next.set('view', 'books')
              return next
            }, { replace: true })}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-800"
          >
            <BookOpen className="h-4 w-4" />
            Report Book Builder
          </button>
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search all ${REPORT_CATALOG.length} reports...`}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* ── Search Dropdown Overlay (When searching across entire catalog) ───── */}
      {globalSearch.trim() && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 space-y-2 max-h-80 overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            Matching Reports ({filteredCatalog.length})
          </div>
          {filteredCatalog.length === 0 ? (
            <div className="text-sm text-slate-500 p-4 text-center">No reports match "{globalSearch}"</div>
          ) : (
            filteredCatalog.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                    selectReport(r)
                    setGlobalSearch('')
                  }}
                className="p-2.5 hover:bg-primary-50 rounded-lg cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {r.name}
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{r.categoryLabel}</span>
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-1">{r.description}</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-primary-600 shrink-0" />
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Primary Category Switcher Tabs ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => {
                const firstInCat = REPORT_CATALOG.find((r) => r.category === cat.key)
                if (firstInCat) selectReport(firstInCat)
              }}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                isActive
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md ring-2 ring-indigo-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-primary-600'}`} />
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cat.count}
                </span>
              </div>
              <div className="font-bold text-xs leading-tight line-clamp-1">{cat.label}</div>
            </button>
          )
        })}
      </div>

      {/* ── Sub-Report Selector Pills & Pinning Bar ─────────────────────────── */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {categoryReports.map((r) => {
            const isSelected = activeReportId === r.id
            const isPinned = pinnedReports.includes(r.id)
            return (
              <button
                key={r.id}
                onClick={() => selectReport(r)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{r.name}</span>
                <span
                  onClick={(e) => togglePin(r.id, e)}
                  title={isPinned ? 'Unpin report' : 'Pin to favorites'}
                  className={`cursor-pointer ${isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
                >
                  <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400' : ''}`} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Active Report Control & Filter Header ───────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{activeReport.name}</h2>
              <span className="px-2 py-0.5 bg-primary-50 text-primary-700 border border-blue-200 rounded text-[10px] font-bold">
                {activeReport.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{activeReport.description}</p>
          </div>

          <button
            onClick={handleRefetch}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh Data
          </button>
        </div>

        {/* Granular Context Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Board Selector */}
          {(isConcessionReportActive ||
            activeReportId === 'student-master' ||
            activeReportId === 'flexible-student-matrix' ||
            activeReportId === 'batch-capacity' ||
            activeReportId === 'curriculum-matrix' ||
            activeReportId === 'timetable-utilization' ||
            activeReportId === 'fee-defaulters' ||
            activeReportId === 'withdrawals') && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Board:</span>
              <select
                value={selectedBoardId}
                onChange={(e) => {
                  setSelectedBoardId(e.target.value)
                  setSelectedStandardId('')
                  setSelectedDivisionId('')
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="">All Boards</option>
                {boards.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Standard Selector */}
          {(isConcessionReportActive ||
            activeReportId === 'student-master' ||
            activeReportId === 'flexible-student-matrix' ||
            activeReportId === 'student-attendance' ||
            activeReportId === 'withdrawals' ||
            activeReportId === 'batch-capacity' ||
            activeReportId === 'curriculum-matrix' ||
            activeReportId === 'timetable-execution-audit' ||
            activeReportId === 'fee-defaulters') && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Standard:</span>
              <select
                value={selectedStandardId}
                onChange={(e) => {
                  setSelectedStandardId(e.target.value)
                  setSelectedDivisionId('')
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="">All Standards</option>
                {standards.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Division / Batch Selector */}
          {(isConcessionReportActive ||
            activeReportId === 'student-master' ||
            activeReportId === 'student-attendance' ||
            activeReportId === 'withdrawals' ||
            activeReportId === 'timetable-utilization' ||
            activeReportId === 'timetable-execution-audit' ||
            activeReportId === 'fee-defaulters') && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Batch:</span>
              <select
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="">All Batches</option>
                {divisions.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `[${d.code}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Concession Governance Filters */}
          {isConcessionReportActive && (
            <>
              <input
                type="text"
                value={concessionStudentSearch}
                onChange={(e) => setConcessionStudentSearch(e.target.value)}
                placeholder="Search student / app # / sponsor..."
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium min-w-[190px]"
              />
              <select
                value={concessionStatusFilter}
                onChange={(e) => setConcessionStatusFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="applied">Applied / Posted</option>
                <option value="approved">Approved (Unapplied)</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="reversed">Reversed</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={concessionFundingFilter}
                onChange={(e) => setConcessionFundingFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="all">All Funding Sources</option>
                <option value="institute">Institute / Academy</option>
                <option value="external_sponsor">External Sponsor</option>
                <option value="government">Government Grant</option>
              </select>
            </>
          )}

          {/* Exam Selector */}
          {(activeReportId === 'exam-merit' || activeReportId === 'exam-analytics') && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Select Examination:</span>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium font-semibold"
              >
                {examinations.map((ex: any) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.exam_type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Pickers */}
          {(isConcessionReportActive ||
            activeReportId === 'student-attendance' ||
            activeReportId === 'daily-collection' ||
            activeReportId === 'timetable-execution-audit' ||
            activeReportId.startsWith('payroll-') ||
            activeReportId === 'audit-logs') && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Date Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
          )}

          {/* Timetable Execution Status Filter */}
          {activeReportId === 'timetable-execution-audit' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Session Status:</span>
              <select
                value={timetableAuditStatus}
                onChange={(e) => setTimetableAuditStatus(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="all">All Session Types</option>
                <option value="conducted">Conducted / Completed</option>
                <option value="substituted">Proxy Substituted</option>
                <option value="cancelled">Cancelled / Missed</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </div>
          )}

          {/* Chronic Defaulter Toggle */}
          {activeReportId === 'student-attendance' && (
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              <input
                type="checkbox"
                checked={defaultersOnly}
                onChange={(e) => setDefaultersOnly(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              Show Defaulters Only (&lt;75%)
            </label>
          )}

          {/* Student Status Scope Filter for Financial & Master Reports */}
          {(activeReportId === 'student-master' || activeReportId === 'collection' || activeReportId === 'outstanding') && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Student Scope:</span>
              <select
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="default">Institute Default</option>
                <option value="active">Active Only</option>
                <option value="all">Include All Statuses</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Security Authorization Gate ─────────────────────────────────────── */}
      {hasAccess && activeReportQueryError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-bold">Could not load {activeReport.name}.</p>
          <p className="mt-1">{activeReportQueryError instanceof Error ? activeReportQueryError.message : String(activeReportQueryError)}</p>
          <button type="button" onClick={handleRefetch} className="mt-2 font-bold underline">
            Retry
          </button>
        </div>
      )}
      {!hasAccess ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto font-bold">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Restricted Access Report</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            You do not possess the necessary RBAC permissions to inspect {activeReport.name}. This report contains confidential institutional, banking, or payroll metrics restricted to verified financial authorities.
          </p>
        </div>
      ) : (
        /* ── Report Body Container ─────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Universal Calculation & Decision Intelligence Engine */}
          <ReportIntelligenceBanner
            reportId={activeReportId}
            filters={{
              academic_year_id: selectedAcademicYearId || undefined,
              standard_id: selectedStandardId || undefined,
              division_id: selectedDivisionId || undefined,
              board_id: selectedBoardId || undefined,
              exam_id: selectedExamId || undefined,
              start_date: startDate || undefined,
              end_date: endDate || undefined,
              status: reportStatusFilter !== 'default' ? reportStatusFilter : undefined,
            }}
          />

          {/* 0. Universal Flexible Student & Academic 360 Matrix */}
          {activeReportId === 'flexible-student-matrix' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {flexibleMatrixMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cohort Count</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{flexibleMatrixMetrics.cohortCount}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Avg Attendance</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{flexibleMatrixMetrics.avgAttendance}%</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Billed</p>
                    <p className="text-base font-black font-mono text-slate-800 mt-0.5">₹{flexibleMatrixMetrics.totalBilled.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Realized Fees</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">₹{flexibleMatrixMetrics.totalCollected.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Pending Dues</p>
                    <p className="text-base font-black font-mono text-rose-700 mt-0.5">₹{flexibleMatrixMetrics.totalBalance.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Exam Cohort Avg</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{flexibleMatrixMetrics.avgExamPct}%</p>
                  </div>
                </div>
              )}

              <FlexibleFilterBuilder
                fields={flexibleFieldDefinitions}
                rules={flexibleRules}
                onAddRule={(newRule) => setFlexibleRules((prev) => [...prev, newRule])}
                onRemoveRule={(id) => setFlexibleRules((prev) => prev.filter((r) => r.id !== id))}
                onClearAll={() => setFlexibleRules([])}
                dataCount={filteredFlexibleData.length}
                totalCount={flexibleMatrixData.length}
              />

              <FlexibleStudentCharts data={filteredFlexibleData} />

              <ExcelReportGrid
                title="Universal Student & Academic 360° Matrix"
                subtitle="Multi-dimensional operational register: Board, Standard, and Batch distribution with attendance telemetry, financial realization, and academic merit"
                columns={flexibleMatrixColumns}
                data={filteredFlexibleData}
                loading={loadingFlexibleMatrix}
                exportFilename="student_academic_360_matrix"
                sheetName="Student Matrix"
                showSummaryRow={true}
                summaryCalculations={{
                  admission_number: (rows) => <span className="font-black text-slate-900 font-mono">Total: {rows.length}</span>,
                  attendance_percentage: (rows) => {
                    const withSessions = rows.filter((r) => Number(r.total_sessions || 0) > 0)
                    const avg = withSessions.length > 0 ? (withSessions.reduce((acc, r) => acc + Number(r.attendance_percentage || 0), 0) / withSessions.length).toFixed(1) : '0.0'
                    return <span className="font-black text-sky-700 font-mono">{avg}% avg</span>
                  },
                  total_fees: (rows) => <span className="font-black text-slate-900 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.total_fees || 0), 0).toLocaleString('en-IN')}</span>,
                  paid_fees: (rows) => <span className="font-black text-emerald-700 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.paid_fees || 0), 0).toLocaleString('en-IN')}</span>,
                  balance_fees: (rows) => <span className="font-black text-rose-700 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.balance_fees || 0), 0).toLocaleString('en-IN')}</span>,
                  exam_percentage: (rows) => {
                    const withExams = rows.filter((r) => Number(r.exam_percentage || 0) > 0)
                    const avg = withExams.length > 0 ? (withExams.reduce((acc, r) => acc + Number(r.exam_percentage || 0), 0) / withExams.length).toFixed(1) : '0.0'
                    return <span className="font-black text-indigo-700 font-mono">{avg}% avg</span>
                  },
                }}
              />
            </div>
          )}

          {/* 1. Student Master Directory */}
          {activeReportId === 'student-master' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {studentMasterMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Roster</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{studentMasterMetrics.totalStudents}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active Enrolled</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{studentMasterMetrics.activeEnrolled}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Standards</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{studentMasterMetrics.uniqueStandards}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Batches Active</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{studentMasterMetrics.uniqueBatches}</p>
                  </div>
                  <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Boards</p>
                    <p className="text-base font-black font-mono text-violet-800 mt-0.5">{studentMasterMetrics.uniqueBoards}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Gender Ratio</p>
                    <p className="text-sm font-black font-mono text-amber-800 mt-1">{studentMasterMetrics.genderRatio}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Student Master Directory & Demographic Roster"
                subtitle="Official demographic register of all enrolled students with guardian contact and status"
                columns={studentMasterColumns}
                data={studentMasterData}
                loading={loadingMaster}
                exportFilename="student_master_directory"
                sheetName="Students"
                showSummaryRow={true}
                summaryCalculations={{
                  admission_number: (rows) => <span className="font-extrabold text-slate-900 font-mono">Total: {rows.length}</span>,
                }}
              />
            </div>
          )}

          {/* 2. Attendance Summary */}
          {activeReportId === 'student-attendance' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {attendanceSummaryMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evaluated Students</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{attendanceSummaryMetrics.totalEvaluated}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Average Attendance</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{attendanceSummaryMetrics.avgAttendance}%</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Total Sessions</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{attendanceSummaryMetrics.totalSessions}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Present</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{attendanceSummaryMetrics.totalAttended}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Total Absent</p>
                    <p className="text-base font-black font-mono text-rose-700 mt-0.5">{attendanceSummaryMetrics.totalAbsences}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Defaulters (&lt;75%)</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-base font-black font-mono text-amber-800">{attendanceSummaryMetrics.defaultersCount}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${attendanceSummaryMetrics.defaultersCount > 0 ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                        {attendanceSummaryMetrics.defaultersCount > 0 ? 'Alert' : 'Clean'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Student Attendance Summary & Defaulter Audit"
                subtitle="Aggregated session check-in percentages and chronic defaulter flags"
                columns={attendanceColumns}
                data={attendanceSummaryData}
                loading={loadingAttendance}
                exportFilename="student_attendance_summary"
                sheetName="Attendance"
                showSummaryRow={true}
                summaryCalculations={{
                  admission_number: (rows) => <span className="font-extrabold text-slate-900 font-mono">Total: {rows.length}</span>,
                  total_days: (rows) => <span className="font-extrabold font-mono text-slate-900">{rows.reduce((acc, r) => acc + (r.total_days || 0), 0)}</span>,
                  present_days: (rows) => <span className="font-extrabold font-mono text-emerald-700">{rows.reduce((acc, r) => acc + (r.present_days || 0), 0)}</span>,
                  absent_days: (rows) => <span className="font-extrabold font-mono text-rose-700">{rows.reduce((acc, r) => acc + (r.absent_days || 0), 0)}</span>,
                  attendance_percentage: (rows) => {
                    const totalDays = rows.reduce((acc, r) => acc + (r.total_days || 0), 0)
                    const presentDays = rows.reduce((acc, r) => acc + (r.present_days || 0), 0)
                    const pct = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0'
                    return <span className="font-extrabold font-mono text-indigo-700">{pct}%</span>
                  },
                }}
              />
            </div>
          )}

          {/* 3. Fee Collection Register */}
          {activeReportId === 'collection' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {collectionMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Billed</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">₹{collectionMetrics.totalCommitment.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Realized Inflow</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">₹{collectionMetrics.totalPaid.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Outstanding Deficit</p>
                    <p className="text-base font-black font-mono text-rose-700 mt-0.5">₹{collectionMetrics.totalOutstanding.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Realization Rate</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-base font-black font-mono text-indigo-800">{collectionMetrics.collectionRate.toFixed(1)}%</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${collectionMetrics.collectionRate >= 80 ? 'bg-emerald-100 text-emerald-800' : collectionMetrics.collectionRate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                        {collectionMetrics.collectionRate >= 80 ? 'Healthy' : collectionMetrics.collectionRate >= 50 ? 'Moderate' : 'Low'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Settled Accounts</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{collectionMetrics.settledCount} / {collectionMetrics.totalStudents}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Accounts in Deficit</p>
                    <p className="text-base font-black font-mono text-amber-800 mt-0.5">{collectionMetrics.pendingCount} Accounts</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Fee Collection Register"
                subtitle="Total student fee assessments, realized banking collections, and outstanding deficits"
                columns={collectionColumns}
                data={collectionReport}
                loading={loadingCollection}
                exportFilename="fee_collection_register"
                sheetName="Collections"
                showSummaryRow={true}
                summaryCalculations={{
                  admission_number: (rows) => <span className="font-extrabold text-slate-900 font-mono">Total: {rows.length}</span>,
                  total_fees: (rows) => <span className="font-extrabold text-slate-900 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.total_fees || 0), 0).toLocaleString('en-IN')}</span>,
                  paid: (rows) => <span className="font-extrabold text-emerald-800 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.paid || 0), 0).toLocaleString('en-IN')}</span>,
                  outstanding: (rows) => <span className="font-extrabold text-rose-700 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.outstanding || 0), 0).toLocaleString('en-IN')}</span>,
                }}
              />
            </div>
          )}

          {/* 4. Outstanding Dues */}
          {activeReportId === 'outstanding' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {outstandingMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoices</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{outstandingMetrics.totalInvoices}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Gross Invoiced</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">₹{outstandingMetrics.totalInvoiced.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Recovered Inflow</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">₹{outstandingMetrics.totalRecovered.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Pending Deficit</p>
                    <p className="text-base font-black font-mono text-rose-700 mt-0.5">₹{outstandingMetrics.totalDeficit.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Recovery Rate</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{outstandingMetrics.recoveryRate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Overdue Invoices</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-base font-black font-mono text-amber-800">{outstandingMetrics.overdueCount}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${outstandingMetrics.overdueCount > 0 ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                        {outstandingMetrics.overdueCount > 0 ? 'Action' : 'Current'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Outstanding Receivables & Due Dates"
                subtitle="Detailed invoice receivables categorized by due dates and student commitments"
                columns={[
                  { id: 'invoice_number', header: 'Invoice #', accessorKey: 'invoice_number', type: 'text', width: 130, render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span> },
                  { id: 'admission_number', header: 'Admission #', accessorKey: 'admission_number', type: 'text', width: 120 },
                  { id: 'student_name', header: 'Student Name', accessorKey: 'student_name', type: 'text', width: 180, sortable: true },
                  { id: 'due_date', header: 'Due Date', accessorKey: 'due_date', type: 'date', width: 110, sortable: true },
                  { id: 'net_amount', header: 'Total Invoiced (₹)', accessorKey: 'net_amount', type: 'currency', width: 140, align: 'right', render: (val) => <span>₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'paid_amount', header: 'Paid Amount (₹)', accessorKey: 'paid_amount', type: 'currency', width: 140, align: 'right', render: (val) => <span className="text-emerald-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'outstanding', header: 'Outstanding Due (₹)', accessorKey: 'outstanding', type: 'currency', width: 150, align: 'right', render: (val) => <span className="font-bold text-rose-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'status', header: 'Status', accessorKey: 'status', type: 'text', width: 110, render: (val) => <InvoiceStatusBadge status={val} /> },
                ]}
                data={outstandingReport}
                loading={loadingOutstanding}
                exportFilename="outstanding_dues_report"
                sheetName="Outstanding"
                showSummaryRow={true}
                summaryCalculations={{
                  invoice_number: (rows) => <span className="font-extrabold text-slate-900 font-mono">Total: {rows.length}</span>,
                  net_amount: (rows) => <span className="font-extrabold text-slate-900 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.net_amount || 0), 0).toLocaleString('en-IN')}</span>,
                  paid_amount: (rows) => <span className="font-extrabold text-emerald-800 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.paid_amount || 0), 0).toLocaleString('en-IN')}</span>,
                  outstanding: (rows) => <span className="font-extrabold text-rose-700 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.outstanding || 0), 0).toLocaleString('en-IN')}</span>,
                }}
              />
            </div>
          )}

          {/* 5. Fee Defaulters Aging */}
          {activeReportId === 'fee-defaulters' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {feeDefaultersMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Defaulter Students</p>
                    <p className="text-base font-black font-mono text-rose-700 mt-0.5">{feeDefaultersMetrics.defaulterCount}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Immediate Overdue</p>
                    <p className="text-base font-black font-mono text-rose-700 mt-0.5">₹{feeDefaultersMetrics.totalOverdue.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deficit Balance</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">₹{feeDefaultersMetrics.totalOutstanding.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Chronic Overdue (&gt;30d)</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-base font-black font-mono text-amber-800">{feeDefaultersMetrics.criticalOverdueCount}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${feeDefaultersMetrics.criticalOverdueCount > 0 ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                        {feeDefaultersMetrics.criticalOverdueCount > 0 ? 'Escalate' : 'Normal'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Average Aging</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{feeDefaultersMetrics.avgDaysOverdue} Days</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Contactable Phone</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{feeDefaultersMetrics.contactableCount} / {feeDefaultersMetrics.defaulterCount}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Consolidated Fee Defaulters Aging Roster"
                subtitle="Overdue installment ledgers with days overdue, guardian contacts, and recovery escalation"
                columns={feeDefaultersColumns}
                data={feeDefaultersData}
                loading={loadingFeeDefaulters}
                exportFilename="fee_defaulters_aging_report"
                sheetName="Defaulters"
                showSummaryRow={true}
                summaryCalculations={{
                  admission_number: (rows) => <span className="font-extrabold text-rose-900 font-mono">Defaulters: {rows.length}</span>,
                  overdue_amount: (rows) => <span className="font-extrabold text-rose-700 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.overdue_amount || 0), 0).toLocaleString('en-IN')}</span>,
                  total_outstanding: (rows) => <span className="font-extrabold text-slate-900 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.total_outstanding || 0), 0).toLocaleString('en-IN')}</span>,
                }}
              />
            </div>
          )}

          {/* 6. Daily Collection */}
          {activeReportId === 'daily-collection' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {dailyCollectionMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Transactions</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{dailyCollectionMetrics.transactionCount}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Realized Inflow</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">₹{dailyCollectionMetrics.totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Issued Receipts</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{dailyCollectionMetrics.issuedReceipts}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Students Serviced</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{dailyCollectionMetrics.uniqueStudents}</p>
                  </div>
                  <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Active Cashiers</p>
                    <p className="text-base font-black font-mono text-violet-800 mt-0.5">{dailyCollectionMetrics.uniqueCashiers}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Avg Ticket Value</p>
                    <p className="text-base font-black font-mono text-amber-800 mt-0.5">₹{dailyCollectionMetrics.avgReceiptAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Daily Payment Collection & Cashier Register"
                subtitle="Day-wise realized payment receipts, cash desk collections, and gateway transactions"
                columns={dailyCollectionColumns}
                data={dailyCollectionData}
                loading={loadingDailyCollection}
                exportFilename="daily_payment_collection"
                sheetName="Daily Inflow"
                showSummaryRow={true}
                summaryCalculations={{
                  receipt_number: (rows) => <span className="font-extrabold text-slate-900 font-mono">Transactions: {rows.length}</span>,
                  amount: (rows) => <span className="font-extrabold text-emerald-800 font-mono">₹{rows.reduce((acc, r) => acc + Number(r.amount || 0), 0).toLocaleString('en-IN')}</span>,
                }}
              />
            </div>
          )}

          {/* 7. Payment Methods Breakdown */}
          {activeReportId === 'summary' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {summaryMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Volume</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">₹{summaryMetrics.totalVolume.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Transactions</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{summaryMetrics.totalTransactions}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Primary Instrument</p>
                    <p className="text-sm font-black font-mono text-indigo-800 uppercase mt-1 truncate">{summaryMetrics.topMethod}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Lead Volume</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">₹{summaryMetrics.topMethodVolume.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Active Channels</p>
                    <p className="text-base font-black font-mono text-violet-800 mt-0.5">{summaryMetrics.channelsCount}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Avg / Transaction</p>
                    <p className="text-base font-black font-mono text-amber-800 mt-0.5">₹{summaryMetrics.avgPerTxn.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-sm mb-4">Payment Methods Volume Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summaryReport}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="payment_method" />
                        <YAxis />
                        <RechartsTooltip formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`} />
                        <Bar dataKey="total" fill={branding.colors.primary} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-sm mb-4">Transaction Count per Channel</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={summaryReport} dataKey="count" nameKey="payment_method" cx="50%" cy="50%" outerRadius={80} label>
                          {summaryReport.map((_: any, idx: number) => (
                            <Cell key={`cell-${idx}`} fill={['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][idx % 5]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <ExcelReportGrid
                title="Payment Methods Transaction Table"
                subtitle="Tabulated count and realized volume per transaction instrument"
                columns={[
                  { id: 'payment_method', header: 'Payment Method', accessorKey: 'payment_method', type: 'text', width: 200, render: (val) => <span className="font-bold uppercase text-primary-700">{val}</span> },
                  { id: 'count', header: 'Transaction Count', accessorKey: 'count', type: 'number', width: 180, align: 'center', sortable: true },
                  { id: 'total', header: 'Realized Volume (₹)', accessorKey: 'total', type: 'currency', width: 200, align: 'right', sortable: true, render: (val) => <span className="font-bold text-emerald-800">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                ]}
                data={summaryReport}
                loading={loadingSummary}
                exportFilename="payment_methods_summary"
                sheetName="Payment Methods"
                showSummaryRow={true}
                summaryCalculations={{
                  payment_method: (rows) => <span className="font-extrabold text-slate-900">Total Channels: {rows.length}</span>,
                  count: (rows) => <span className="font-extrabold">{rows.reduce((acc, r) => acc + (r.count || 0), 0)}</span>,
                  total: (rows) => <span className="font-extrabold text-emerald-800">₹{rows.reduce((acc, r) => acc + Number(r.total || 0), 0).toLocaleString('en-IN')}</span>,
                }}
              />
            </div>
          )}

          {/* 8. Financial Reconciliation */}
          {activeReportId === 'fee-reconciliation' && overviewData && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoiced</p>
                  <p className="text-base font-black font-mono text-slate-900 mt-0.5">₹{Number(overviewData.summary?.total_obligation || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Realized Collections</p>
                  <p className="text-base font-black font-mono text-emerald-700 mt-0.5">₹{Number(overviewData.summary?.total_collected || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Outstanding Deficit</p>
                  <p className="text-base font-black font-mono text-rose-700 mt-0.5">₹{Number(overviewData.summary?.total_outstanding || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Reconciliation Rate</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-base font-black font-mono text-indigo-800">{Number(overviewData.summary?.collection_rate || 0).toFixed(1)}%</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${Number(overviewData.summary?.collection_rate || 0) >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {Number(overviewData.summary?.collection_rate || 0) >= 80 ? 'Balanced' : 'Review'}
                    </span>
                  </div>
                </div>
                <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Batches Audited</p>
                  <p className="text-base font-black font-mono text-sky-700 mt-0.5">{overviewData.batch_breakdown?.length || 0}</p>
                </div>
                <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Total Enrolled</p>
                  <p className="text-base font-black font-mono text-violet-800 mt-0.5">{overviewData.batch_breakdown?.reduce((acc: number, b: any) => acc + (b.student_count || 0), 0) || 0}</p>
                </div>
              </div>

              <ExcelReportGrid
                title="Batch-wise Financial Reconciliation Ledger"
                subtitle="Audited breakdown of student fee obligations and realized collection rates per batch"
                columns={[
                  { id: 'batch_name', header: 'Batch / Course', accessorKey: 'batch_name', type: 'text', width: 220, sortable: true },
                  { id: 'student_count', header: 'Students', accessorKey: 'student_count', type: 'number', width: 110, align: 'center', sortable: true },
                  { id: 'total_fees', header: 'Invoiced (₹)', accessorKey: 'total_fees', type: 'currency', width: 160, align: 'right', sortable: true, render: (val) => <span>₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'collected', header: 'Collected (₹)', accessorKey: 'collected', type: 'currency', width: 160, align: 'right', sortable: true, render: (val) => <span className="font-bold text-emerald-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'outstanding', header: 'Outstanding (₹)', accessorKey: 'outstanding', type: 'currency', width: 160, align: 'right', sortable: true, render: (val) => <span className="font-bold text-rose-600">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'rate', header: 'Collection Rate', accessorKey: 'rate', type: 'number', width: 130, align: 'right', sortable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val}%</span> },
                ]}
                data={overviewData.batch_breakdown || []}
                loading={loadingOverview}
                exportFilename="financial_reconciliation_report"
                sheetName="Reconciliation"
                showSummaryRow={true}
                summaryCalculations={{
                  batch_name: (rows) => <span className="font-extrabold text-slate-900 font-mono">Total Batches: {rows.length}</span>,
                  student_count: (rows) => <span className="font-extrabold font-mono text-slate-900">{rows.reduce((acc, r) => acc + (r.student_count || 0), 0)}</span>,
                  total_fees: (rows) => <span className="font-extrabold font-mono text-slate-900">₹{rows.reduce((acc, r) => acc + Number(r.total_fees || 0), 0).toLocaleString('en-IN')}</span>,
                  collected: (rows) => <span className="font-extrabold font-mono text-emerald-700">₹{rows.reduce((acc, r) => acc + Number(r.collected || 0), 0).toLocaleString('en-IN')}</span>,
                  outstanding: (rows) => <span className="font-extrabold font-mono text-rose-600">₹{rows.reduce((acc, r) => acc + Number(r.outstanding || 0), 0).toLocaleString('en-IN')}</span>,
                }}
              />
            </div>
          )}

          {/* 9. Batch Capacity */}
          {activeReportId === 'batch-capacity' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {batchCapacityMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Batches</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{batchCapacityMetrics.totalBatches}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Total Capacity</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{batchCapacityMetrics.totalCapacity}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active Enrolled</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{batchCapacityMetrics.totalEnrolled}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Vacant Seats</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{batchCapacityMetrics.totalVacant}</p>
                  </div>
                  <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Overall Occupancy</p>
                    <p className="text-base font-black font-mono text-violet-800 mt-0.5">{batchCapacityMetrics.overallOccupancy}%</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Near Full (≥90%)</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-base font-black font-mono text-amber-800">{batchCapacityMetrics.highOccupancyBatches}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${batchCapacityMetrics.highOccupancyBatches > 0 ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                        {batchCapacityMetrics.highOccupancyBatches > 0 ? 'Alert' : 'Balanced'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Batch Capacity & Occupancy Analysis"
                subtitle="Audited batch-level seat allotments, occupancy rates, and classroom timing"
                columns={[
                  { id: 'batch_name', header: 'Batch / Division', accessorKey: 'batch_name', type: 'text', width: 180, sortable: true, render: (val, r: any) => <span className="font-semibold text-slate-900">{val} {r.batch_code ? `[${r.batch_code}]` : ''}</span> },
                  { id: 'standard_name', header: 'Standard', accessorKey: 'standard_name', type: 'text', width: 140, sortable: true },
                  { id: 'board_name', header: 'Board', accessorKey: 'board_name', type: 'text', width: 120, render: (val) => <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-semibold">{val}</span> },
                  { id: 'capacity', header: 'Capacity', accessorKey: 'capacity', type: 'number', width: 110, align: 'center', sortable: true },
                  { id: 'enrolled', header: 'Enrolled', accessorKey: 'enrolled', type: 'number', width: 110, align: 'center', sortable: true, render: (val) => <span className="font-bold text-primary-700">{val}</span> },
                  { id: 'available_seats', header: 'Vacant', accessorKey: 'available_seats', type: 'number', width: 110, align: 'center', sortable: true, render: (val) => <span className={`font-bold ${val <= 5 ? 'text-amber-600' : 'text-emerald-700'}`}>{val}</span> },
                  { id: 'occupancy_percentage', header: 'Occupancy %', accessorKey: 'occupancy_percentage', type: 'number', width: 130, align: 'right', sortable: true, render: (val) => <span className="font-mono font-bold text-primary-800">{val}%</span> },
                ]}
                data={batchCapacityData}
                loading={loadingBatchCapacity}
                exportFilename="batch_capacity_report"
                sheetName="Batch Capacity"
                showSummaryRow={true}
                summaryCalculations={{
                  batch_name: (rows) => <span className="font-black text-slate-900 font-mono">Batches: {rows.length}</span>,
                  capacity: (rows) => <span className="font-black text-slate-900 font-mono">{rows.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0)}</span>,
                  enrolled: (rows) => <span className="font-black text-emerald-700 font-mono">{rows.reduce((sum, r) => sum + (Number(r.enrolled) || 0), 0)}</span>,
                  available_seats: (rows) => <span className="font-black text-sky-700 font-mono">{rows.reduce((sum, r) => sum + (Number(r.available_seats) || 0), 0)}</span>,
                  occupancy_percentage: (rows) => {
                    const totalCap = rows.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0)
                    const totalEnr = rows.reduce((sum, r) => sum + (Number(r.enrolled) || 0), 0)
                    const pct = totalCap > 0 ? ((totalEnr / totalCap) * 100).toFixed(1) : '0'
                    return <span className="font-black text-violet-800 font-mono">{pct}%</span>
                  },
                }}
              />
            </div>
          )}

          {/* 10. Board Distribution */}
          {activeReportId === 'academic-distribution' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {distributionMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Boards</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{distributionMetrics.uniqueBoards}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Standards Mapped</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{distributionMetrics.uniqueStandards}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Total Batches</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{distributionMetrics.totalBatches}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Intake Capacity</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{distributionMetrics.totalCapacity.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Enrolled Students</p>
                    <p className="text-base font-black font-mono text-violet-800 mt-0.5">{distributionMetrics.totalEnrolled.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Average Occupancy</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-base font-black font-mono text-amber-800">{distributionMetrics.avgOccupancy}%</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${Number(distributionMetrics.avgOccupancy) >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                        {Number(distributionMetrics.avgOccupancy) >= 80 ? 'High' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="font-bold text-slate-900 text-sm mb-4">Board Enrollment Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="board_name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="total_capacity" fill="#94a3b8" name="Total Capacity" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="enrolled_count" fill={branding.colors.primary} name="Enrolled Students" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <ExcelReportGrid
                title="Board & Standard Distribution Audit"
                subtitle="Comprehensive breakdown of student distribution and capacity across educational boards"
                columns={[
                  { id: 'board_name', header: 'Board', accessorKey: 'board_name', type: 'text', width: 160, sortable: true, render: (val) => <span className="font-bold text-primary-700">{val}</span> },
                  { id: 'standard_name', header: 'Standard', accessorKey: 'standard_name', type: 'text', width: 140, sortable: true },
                  { id: 'batches_count', header: 'Batches', accessorKey: 'batches_count', type: 'number', width: 110, align: 'center', sortable: true },
                  { id: 'total_capacity', header: 'Capacity', accessorKey: 'total_capacity', type: 'number', width: 120, align: 'center', sortable: true },
                  { id: 'enrolled_count', header: 'Enrolled', accessorKey: 'enrolled_count', type: 'number', width: 120, align: 'center', sortable: true, render: (val) => <span className="font-bold text-emerald-700">{val}</span> },
                  { id: 'occupancy_percentage', header: 'Occupancy %', accessorKey: 'occupancy_percentage', type: 'number', width: 130, align: 'right', sortable: true, render: (val) => <span className="font-mono font-bold text-primary-800">{val}%</span> },
                ]}
                data={distributionData}
                loading={loadingDistribution}
                exportFilename="board_distribution_report"
                sheetName="Distribution"
                showSummaryRow={true}
                summaryCalculations={{
                  board_name: (rows) => <span className="font-extrabold text-slate-900 font-mono">Total Rows: {rows.length}</span>,
                  batches_count: (rows) => <span className="font-extrabold font-mono text-slate-900">{rows.reduce((sum, r) => sum + (Number(r.batches_count) || 0), 0)}</span>,
                  total_capacity: (rows) => <span className="font-extrabold font-mono text-slate-900">{rows.reduce((sum, r) => sum + (Number(r.total_capacity) || 0), 0)}</span>,
                  enrolled_count: (rows) => <span className="font-extrabold font-mono text-emerald-700">{rows.reduce((sum, r) => sum + (Number(r.enrolled_count) || 0), 0)}</span>,
                  occupancy_percentage: (rows) => {
                    const totalCap = rows.reduce((sum, r) => sum + (Number(r.total_capacity) || 0), 0)
                    const totalEnr = rows.reduce((sum, r) => sum + (Number(r.enrolled_count) || 0), 0)
                    const pct = totalCap > 0 ? ((totalEnr / totalCap) * 100).toFixed(1) : '0'
                    return <span className="font-extrabold font-mono text-primary-800">{pct}%</span>
                  },
                }}
              />
            </div>
          )}

          {/* 11. Curriculum Matrix */}
          {activeReportId === 'curriculum-matrix' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {curriculumMatrixMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Curriculum Offerings</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{curriculumMatrixMetrics.totalOfferings}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Unique Subjects</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{curriculumMatrixMetrics.uniqueSubjects}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Weekly Hours Load</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{curriculumMatrixMetrics.totalWeeklyHours} h</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Standards Covered</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{curriculumMatrixMetrics.uniqueStandards}</p>
                  </div>
                  <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Teachers Allocated</p>
                    <p className="text-base font-black font-mono text-violet-800 mt-0.5">{curriculumMatrixMetrics.allocatedTeachersCount}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Avg Weekly Load</p>
                    <p className="text-base font-black font-mono text-amber-800 mt-0.5">{curriculumMatrixMetrics.avgWeeklyLoad} h/wk</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Subject & Curriculum Offering Matrix"
                subtitle="Standardized curriculum mapping across educational boards with allocated faculty"
                columns={[
                  { id: 'subject_name', header: 'Subject Name', accessorKey: 'subject_name', type: 'text', width: 190, sortable: true, render: (val) => <span className="font-bold text-slate-900">{val}</span> },
                  { id: 'subject_code', header: 'Code', accessorKey: 'subject_code', type: 'text', width: 110, render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span> },
                  { id: 'standard_name', header: 'Standard', accessorKey: 'standard_name', type: 'text', width: 140, sortable: true },
                  { id: 'board_name', header: 'Board', accessorKey: 'board_name', type: 'text', width: 120, render: (val) => <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-semibold">{val}</span> },
                  { id: 'weekly_hours', header: 'Weekly Load', accessorKey: 'weekly_hours', type: 'number', width: 120, align: 'center', render: (val) => <span className="font-bold text-slate-700">{val} hrs/wk</span> },
                  { id: 'assigned_teachers_count', header: 'Teachers', accessorKey: 'assigned_teachers_count', type: 'number', width: 110, align: 'center', render: (val) => <span className="font-bold text-primary-700">{val}</span> },
                  { id: 'teachers_list', header: 'Allocated Faculty Members', accessorKey: 'teachers_list', type: 'text', width: 280, render: (val) => <span className="text-slate-700 font-medium">{val}</span> },
                ]}
                data={curriculumMatrixData}
                loading={loadingCurriculum}
                exportFilename="curriculum_matrix_report"
                sheetName="Curriculum"
                showSummaryRow={true}
                summaryCalculations={{
                  subject_name: (rows) => <span className="font-black text-slate-900 font-mono">Offerings: {rows.length}</span>,
                  weekly_hours: (rows) => <span className="font-black text-emerald-700 font-mono">{rows.reduce((sum, r) => sum + (Number(r.weekly_hours) || 0), 0)} hrs/wk</span>,
                  assigned_teachers_count: (rows) => <span className="font-black text-primary-700 font-mono">{rows.reduce((sum, r) => sum + (Number(r.assigned_teachers_count) || 0), 0)}</span>,
                }}
              />
            </div>
          )}

          {/* 12. Timetable Utilization */}
          {activeReportId === 'timetable-utilization' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {timetableUtilizationMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scheduled Slots</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{timetableUtilizationMetrics.totalSlots}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Active Rooms</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{timetableUtilizationMetrics.activeRooms}</p>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Active Batches</p>
                    <p className="text-base font-black font-mono text-blue-800 mt-0.5">{timetableUtilizationMetrics.activeBatches}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Faculty Allocated</p>
                    <p className="text-base font-black font-mono text-emerald-800 mt-0.5">{timetableUtilizationMetrics.activeTeachers}</p>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Weekly Commitment</p>
                    <p className="text-base font-black font-mono text-purple-800 mt-0.5">{timetableUtilizationMetrics.totalWeeklyHours}h</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Peak Volume Day</p>
                    <p className="text-xs font-black font-mono text-amber-900 mt-1">{timetableUtilizationMetrics.peakDay}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Timetable Room & Batch Utilization"
                subtitle="Classroom scheduling distribution, room saturation analysis, and weekly slot commitments"
                columns={[
                  {
                    id: 'day_of_week',
                    header: 'Day',
                    accessorKey: 'day_of_week',
                    type: 'text',
                    width: 120,
                    sortable: true,
                    render: (val) => <span className="font-bold text-primary-700 uppercase">{val}</span>,
                  },
                  {
                    id: 'start_time',
                    header: 'Start Time',
                    accessorKey: 'start_time',
                    type: 'text',
                    width: 105,
                    render: (val) => <span className="font-mono text-xs font-semibold text-slate-700">{val}</span>,
                  },
                  {
                    id: 'end_time',
                    header: 'End Time',
                    accessorKey: 'end_time',
                    type: 'text',
                    width: 105,
                    render: (val) => <span className="font-mono text-xs font-semibold text-slate-700">{val}</span>,
                  },
                  {
                    id: 'duration_hours',
                    header: 'Duration',
                    accessorKey: 'duration_hours',
                    type: 'number',
                    width: 95,
                    align: 'center',
                    sortable: true,
                    render: (val) => <span className="font-mono text-xs font-bold text-slate-800">{val}h</span>,
                  },
                  {
                    id: 'room_number',
                    header: 'Room / Hall',
                    accessorKey: 'room_number',
                    type: 'text',
                    width: 125,
                    sortable: true,
                    render: (val) => (
                      <span className="px-2 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 rounded border border-slate-200 text-xs">
                        {val}
                      </span>
                    ),
                  },
                  {
                    id: 'batch_name',
                    header: 'Batch / Division',
                    accessorKey: 'batch_name',
                    type: 'text',
                    width: 160,
                    sortable: true,
                    render: (val, row) => (
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{val}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{row.batch_code}</span>
                      </div>
                    ),
                  },
                  {
                    id: 'subject_name',
                    header: 'Subject',
                    accessorKey: 'subject_name',
                    type: 'text',
                    width: 160,
                    sortable: true,
                    render: (val) => <span className="font-semibold text-slate-800">{val}</span>,
                  },
                  {
                    id: 'teacher_name',
                    header: 'Assigned Teacher',
                    accessorKey: 'teacher_name',
                    type: 'text',
                    width: 180,
                    sortable: true,
                    render: (val) =>
                      val === 'Unassigned' ? (
                        <span className="text-amber-700 italic text-xs font-medium">Unassigned</span>
                      ) : (
                        <span className="font-medium text-slate-800">{val}</span>
                      ),
                  },
                ]}
                data={enrichedTimetableData}
                loading={loadingTimetable}
                exportFilename="timetable_room_and_batch_utilization_report"
                sheetName="Timetable"
                showSummaryRow={true}
                summaryCalculations={{
                  day_of_week: (rows) => <span className="font-black text-slate-900 font-mono">Slots: {rows.length}</span>,
                  duration_hours: (rows) => (
                    <span className="font-black text-slate-900 font-mono">
                      {rows.reduce((sum, r) => sum + (Number(r.duration_hours) || 0), 0).toFixed(1)}h
                    </span>
                  ),
                }}
              />
            </div>
          )}

          {/* 12b. Timetable Schedule Execution & Substitution Status Audit */}
          {activeReportId === 'timetable-execution-audit' && (
            <div className="space-y-4">
              {/* Telemetry KPI Summary Ribbon */}
              {timetableExecutionData?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sessions</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{timetableExecutionData.summary.total_sessions}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Conducted</p>
                    <p className="text-base font-black font-mono text-emerald-800 mt-0.5">{timetableExecutionData.summary.conducted_count}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Proxy Substituted</p>
                    <p className="text-base font-black font-mono text-amber-800 mt-0.5">{timetableExecutionData.summary.substituted_count}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Cancelled / Missed</p>
                    <p className="text-base font-black font-mono text-rose-800 mt-0.5">{timetableExecutionData.summary.cancelled_count}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Substitution Rate</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{timetableExecutionData.summary.substitution_rate_pct}%</p>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Instruction Hours</p>
                    <p className="text-base font-black font-mono text-purple-800 mt-0.5">{timetableExecutionData.summary.total_instruction_hours}h</p>
                  </div>
                </div>
              )}

              {/* Governed ExcelReportGrid Table */}
              <ExcelReportGrid
                title="Timetable Schedule Execution & Substitution Audit"
                subtitle="Granular audit of scheduled timetable commitments vs delivered teaching sessions with proxy teacher tracing and payroll status"
                columns={[
                  {
                    id: 'session_date',
                    header: 'Date',
                    accessorKey: 'session_date',
                    type: 'date',
                    width: 105,
                    sortable: true,
                    render: (val, row) => (
                      <div className="flex flex-col">
                        <span className="font-mono font-medium text-slate-800 text-xs">{val}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{row.day_of_week}</span>
                      </div>
                    ),
                  },
                  {
                    id: 'time_slot',
                    header: 'Time Slot',
                    accessorKey: 'time_slot',
                    type: 'text',
                    width: 115,
                    render: (val) => <span className="font-mono text-xs font-semibold text-slate-700">{val}</span>,
                  },
                  {
                    id: 'batch_name',
                    header: 'Batch / Div',
                    accessorKey: 'batch_name',
                    type: 'text',
                    width: 120,
                    sortable: true,
                    render: (val, row) => (
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs">{val}</span>
                        <span className="text-[10px] text-slate-400">{row.standard_name}</span>
                      </div>
                    ),
                  },
                  {
                    id: 'subject_name',
                    header: 'Subject',
                    accessorKey: 'subject_name',
                    type: 'text',
                    width: 140,
                    sortable: true,
                    render: (val, row) => (
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-xs">{val}</span>
                        <span className="text-[10px] font-mono text-primary-600 font-medium">{row.subject_code}</span>
                      </div>
                    ),
                  },
                  {
                    id: 'scheduled_teacher_name',
                    header: 'Scheduled Faculty',
                    accessorKey: 'scheduled_teacher_name',
                    type: 'text',
                    width: 150,
                    sortable: true,
                    render: (val) => <span className="text-slate-700 text-xs font-medium">{val}</span>,
                  },
                  {
                    id: 'actual_teacher_name',
                    header: 'Delivered By (Proxy)',
                    accessorKey: 'actual_teacher_name',
                    type: 'text',
                    width: 175,
                    sortable: true,
                    render: (val, row) =>
                      row.is_substituted ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-900 text-xs">{val}</span>
                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 rounded">
                            Proxy
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-800 text-xs font-medium">{val}</span>
                      ),
                  },
                  {
                    id: 'status_label',
                    header: 'Execution Status',
                    accessorKey: 'status_label',
                    type: 'text',
                    width: 140,
                    sortable: true,
                    render: (val, row) => {
                      if (row.is_substituted) {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Proxy Substituted
                          </span>
                        )
                      }
                      if (row.session_status === 'completed') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Conducted
                          </span>
                        )
                      }
                      if (row.session_status === 'cancelled') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-800 rounded-full border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Cancelled
                          </span>
                        )
                      }
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                          {val}
                        </span>
                      )
                    },
                  },
                  {
                    id: 'room_number',
                    header: 'Room',
                    accessorKey: 'room_number',
                    type: 'text',
                    width: 95,
                    align: 'center',
                    render: (val) => (
                      <span className="px-2 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 rounded text-[11px]">
                        {val}
                      </span>
                    ),
                  },
                  {
                    id: 'duration_hours',
                    header: 'Duration',
                    accessorKey: 'duration_hours',
                    type: 'number',
                    width: 90,
                    align: 'center',
                    sortable: true,
                    render: (val) => <span className="font-mono text-xs font-semibold text-slate-800">{val}h</span>,
                  },
                  {
                    id: 'topic_taught',
                    header: 'Topic Covered',
                    accessorKey: 'topic_taught',
                    type: 'text',
                    width: 220,
                    render: (val) => <span className="text-slate-600 text-xs truncate max-w-[210px] block" title={val}>{val}</span>,
                  },
                  {
                    id: 'approval_status',
                    header: 'Payroll Verified',
                    accessorKey: 'approval_status',
                    type: 'text',
                    width: 120,
                    align: 'center',
                    render: (val) =>
                      val === 'approved' ? (
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-500 rounded-full">
                          Pending
                        </span>
                      ),
                  },
                ]}
                data={timetableExecutionData?.records || []}
                loading={loadingTimetableExecution}
                exportFilename="timetable_schedule_execution_and_substitution_audit"
                sheetName="Timetable Execution Audit"
                showSummaryRow={true}
                summaryCalculations={{
                  session_date: (rows) => <span className="font-black text-slate-900 font-mono">Sessions: {rows.length}</span>,
                  duration_hours: (rows) => (
                    <span className="font-black text-slate-900 font-mono">
                      {rows.reduce((sum, r) => sum + (Number(r.duration_hours) || 0), 0).toFixed(1)}h
                    </span>
                  ),
                }}
              />
            </div>
          )}

          {/* 13. Faculty Load & Multi-Batch Clashing Diagnostics */}
          {activeReportId === 'faculty-load' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {facultyLoadMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Faculty</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{facultyLoadMetrics.totalFaculty}</p>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Active Teaching</p>
                    <p className="text-base font-black font-mono text-blue-800 mt-0.5">{facultyLoadMetrics.activeFaculty}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Weekly Sessions</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{facultyLoadMetrics.totalSessions}</p>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Instruction Hours</p>
                    <p className="text-base font-black font-mono text-purple-800 mt-0.5">{facultyLoadMetrics.totalHours}h</p>
                  </div>
                  <div className={`${Number(facultyLoadMetrics.totalClashes) > 0 ? 'bg-rose-50/60 border-rose-200/80' : 'bg-emerald-50/50 border-emerald-200/70'} border rounded-xl px-3.5 py-2.5 shadow-xs`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${Number(facultyLoadMetrics.totalClashes) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Schedule Clashes</p>
                    <p className={`text-base font-black font-mono ${Number(facultyLoadMetrics.totalClashes) > 0 ? 'text-rose-800' : 'text-emerald-800'} mt-0.5`}>
                      {facultyLoadMetrics.totalClashes} {Number(facultyLoadMetrics.totalClashes) === 0 ? '• Clean' : 'Alert'}
                    </p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Avg Sessions / Staff</p>
                    <p className="text-base font-black font-mono text-amber-800 mt-0.5">{facultyLoadMetrics.avgSessions}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Faculty Teaching Load & Multi-Batch Clashing Diagnostics"
                subtitle="Weekly session commitments, instruction contact hours, active classroom batches, and scheduling collision diagnostics"
                columns={[
                  {
                    id: 'teacher_name',
                    header: 'Faculty Member',
                    accessorKey: 'teacher_name',
                    type: 'text',
                    width: 200,
                    sortable: true,
                    render: (val, row) => (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">{val}</span>
                          {row.is_class_teacher && (
                            <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200 rounded">
                              Class Mentor
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{row.email}</span>
                      </div>
                    ),
                  },
                  {
                    id: 'staff_code',
                    header: 'Staff Code',
                    accessorKey: 'staff_code',
                    type: 'text',
                    width: 120,
                    render: (val) => <span className="font-mono font-bold text-primary-700 text-xs">{val}</span>,
                  },
                  {
                    id: 'designation',
                    header: 'Designation',
                    accessorKey: 'designation',
                    type: 'text',
                    width: 170,
                    render: (val) => <span className="text-slate-700 text-xs">{val}</span>,
                  },
                  {
                    id: 'assigned_batches_count',
                    header: 'Active Batches',
                    accessorKey: 'assigned_batches_count',
                    type: 'number',
                    width: 125,
                    align: 'center',
                    sortable: true,
                    render: (val) => (
                      <span className="px-2 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 rounded text-xs">
                        {val}
                      </span>
                    ),
                  },
                  {
                    id: 'weekly_sessions_count',
                    header: 'Weekly Sessions',
                    accessorKey: 'weekly_sessions_count',
                    type: 'number',
                    width: 130,
                    align: 'center',
                    sortable: true,
                    render: (val) => (
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {val}
                      </span>
                    ),
                  },
                  {
                    id: 'weekly_hours',
                    header: 'Contact Hours',
                    accessorKey: 'weekly_hours',
                    type: 'number',
                    width: 120,
                    align: 'center',
                    sortable: true,
                    render: (val) => <span className="font-mono font-bold text-purple-800 text-xs">{val}h</span>,
                  },
                  {
                    id: 'schedule_clashes_count',
                    header: 'Schedule Clashes',
                    accessorKey: 'schedule_clashes_count',
                    type: 'number',
                    width: 140,
                    align: 'center',
                    sortable: true,
                    render: (val) =>
                      Number(val) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          {val} Clashes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Clean
                        </span>
                      ),
                  },
                  {
                    id: 'total_students',
                    header: 'Taught Students',
                    accessorKey: 'total_students',
                    type: 'number',
                    width: 135,
                    align: 'center',
                    sortable: true,
                    render: (val) => <span className="font-bold text-emerald-800 text-xs">{val}</span>,
                  },
                ]}
                data={facultyLoadData}
                loading={loadingFacultyLoad}
                exportFilename="faculty_teaching_load_and_clash_diagnostics"
                sheetName="Faculty Load"
                showSummaryRow={true}
                summaryCalculations={{
                  teacher_name: (rows) => <span className="font-black text-slate-900 font-mono">Faculty: {rows.length}</span>,
                  weekly_sessions_count: (rows) => (
                    <span className="font-black text-slate-900 font-mono">
                      {rows.reduce((sum, r) => sum + (Number(r.weekly_sessions_count) || 0), 0)}
                    </span>
                  ),
                  weekly_hours: (rows) => (
                    <span className="font-black text-slate-900 font-mono">
                      {rows.reduce((sum, r) => sum + (Number(r.weekly_hours) || 0), 0).toFixed(1)}h
                    </span>
                  ),
                  total_students: (rows) => (
                    <span className="font-black text-emerald-800 font-mono">
                      {rows.reduce((sum, r) => sum + (Number(r.total_students) || 0), 0)}
                    </span>
                  ),
                }}
              />
            </div>
          )}

          {/* 14. Specialized Payroll Reports */}
          {activeReportId.startsWith('payroll-') && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {payrollMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Entries</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{payrollMetrics.totalEntries}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Gross Outlay</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">₹{payrollMetrics.totalOutlay.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Disbursed / Paid</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">₹{payrollMetrics.paidOut.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Payable</p>
                    <p className="text-base font-black font-mono text-amber-700 mt-0.5">₹{payrollMetrics.pendingAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Teaching Hours</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">
                      {payrollMetrics.totalHours > 0 ? `${payrollMetrics.totalHours.toFixed(1)}h` : '—'}
                    </p>
                  </div>
                  <div className="bg-teal-50/50 border border-teal-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Settlement %</p>
                    <p className="text-base font-black font-mono text-teal-700 mt-0.5">{payrollMetrics.settlementRate}%</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title={activeReport.name}
                subtitle={activeReport.description}
                columns={dynamicPayrollColumns}
                data={payrollReportData}
                loading={loadingPayroll}
                exportFilename={`payroll_${payrollReportType}_report`}
                sheetName="Payroll"
                showSummaryRow={true}
              />
            </div>
          )}

          {/* 15. Exam Merit Register */}
          {activeReportId === 'exam-merit' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {examMeritMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Candidates</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{examMeritMetrics.totalCandidates}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Passed</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{examMeritMetrics.passedCount}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Failed / Backlog</p>
                    <p className="text-base font-black font-mono text-rose-700 mt-0.5">{examMeritMetrics.failedCount}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Pass Rate</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{examMeritMetrics.passRate}%</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Top Score</p>
                    <p className="text-base font-black font-mono text-amber-700 mt-0.5">{examMeritMetrics.topScore}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Class Average</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{examMeritMetrics.classAvgPct}%</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Consolidated Exam Marks & Merit Roster"
                subtitle="Ranked cohort performance register with total score, percentage, and letter grade"
                columns={examMeritColumns}
                data={examMeritData}
                loading={loadingExamMerit}
                exportFilename="exam_merit_roster"
                sheetName="Merit Roster"
                showSummaryRow={true}
                summaryCalculations={{
                  admission_number: (rows) => <span className="font-black text-slate-900 font-mono">Total: {rows.length}</span>,
                  marks_obtained: (rows) => (
                    <span className="font-black text-slate-900 font-mono">
                      Avg: {rows.length > 0 ? (rows.reduce((sum, r) => sum + (Number(r.marks_obtained) || 0), 0) / rows.length).toFixed(1) : 0}
                    </span>
                  ),
                  percentage: (rows) => (
                    <span className="font-black text-indigo-700 font-mono">
                      {rows.length > 0 ? (rows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) / rows.length).toFixed(1) : 0}%
                    </span>
                  ),
                  status: (rows) => {
                    const pass = rows.filter((r) => (r.status || '').toLowerCase() === 'pass').length
                    return <span className="font-black text-emerald-700 font-mono">Pass: {pass}/{rows.length}</span>
                  },
                }}
              />
            </div>
          )}

          {/* 16. Exam Analytics */}
          {activeReportId === 'exam-analytics' && examAnalyticsData && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exam Title</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5 truncate" title={examAnalyticsData.exam_name}>{examAnalyticsData.exam_name}</p>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Candidates</p>
                  <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{examAnalyticsData.appeared_candidates}</p>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Class Average</p>
                  <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{examAnalyticsData.class_average}%</p>
                </div>
                <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Overall Pass %</p>
                  <p className="text-base font-black font-mono text-sky-700 mt-0.5">{examAnalyticsData.pass_percentage}%</p>
                </div>
                <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Subjects Tested</p>
                  <p className="text-base font-black font-mono text-amber-700 mt-0.5">{(examAnalyticsData.subject_analytics || []).length}</p>
                </div>
                <div className="bg-teal-50/50 border border-teal-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Status</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    Sealed
                  </span>
                </div>
              </div>

              <ExcelReportGrid
                title="Subject-wise Score & Pass Analytics"
                subtitle="Comparative statistical breakdown of student performance per examination subject"
                columns={[
                  { id: 'subject_name', header: 'Subject', accessorKey: 'subject_name', type: 'text', width: 200, sortable: true, render: (val) => <span className="font-bold text-slate-900">{val}</span> },
                  { id: 'candidates_count', header: 'Candidates', accessorKey: 'candidates_count', type: 'number', width: 120, align: 'center', sortable: true },
                  { id: 'average_marks', header: 'Average Score', accessorKey: 'average_marks', type: 'number', width: 140, align: 'center', sortable: true, render: (val) => <span className="font-bold font-mono text-slate-800">{val}</span> },
                  { id: 'highest_marks', header: 'Highest', accessorKey: 'highest_marks', type: 'number', width: 120, align: 'center', render: (val) => <span className="font-bold font-mono text-emerald-700">{val}</span> },
                  { id: 'lowest_marks', header: 'Lowest', accessorKey: 'lowest_marks', type: 'number', width: 120, align: 'center', render: (val) => <span className="font-bold font-mono text-rose-700">{val}</span> },
                ]}
                data={examAnalyticsData.subject_analytics || []}
                loading={loadingExamAnalytics}
                exportFilename="exam_subject_analytics"
                sheetName="Subject Analytics"
                showSummaryRow={true}
                summaryCalculations={{
                  subject_name: (rows) => <span className="font-black text-slate-900 font-mono">Subjects: {rows.length}</span>,
                  candidates_count: (rows) => (
                    <span className="font-black text-slate-900 font-mono">
                      {rows.reduce((sum, r) => Math.max(sum, Number(r.candidates_count) || 0), 0)} max
                    </span>
                  ),
                  average_marks: (rows) => (
                    <span className="font-black text-slate-900 font-mono">
                      {rows.length > 0 ? (rows.reduce((sum, r) => sum + (Number(r.average_marks) || 0), 0) / rows.length).toFixed(1) : 0}
                    </span>
                  ),
                  highest_marks: (rows) => (
                    <span className="font-black text-emerald-700 font-mono">
                      {rows.length > 0 ? Math.max(...rows.map((r) => Number(r.highest_marks) || 0)) : 0}
                    </span>
                  ),
                  lowest_marks: (rows) => (
                    <span className="font-black text-rose-700 font-mono">
                      {rows.length > 0 ? Math.min(...rows.map((r) => Number(r.lowest_marks) || 0)) : 0}
                    </span>
                  ),
                }}
              />
            </div>
          )}

          {/* 17. Security Audit Trail */}
          {activeReportId === 'audit-logs' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {auditLogsMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Audit Events</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{auditLogsMetrics.totalEvents}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Active Actors</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{auditLogsMetrics.uniqueUsers}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Auth & Security</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{auditLogsMetrics.securityActions}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Admin Operations</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{auditLogsMetrics.adminActions}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Warnings</p>
                    <p className="text-base font-black font-mono text-amber-700 mt-0.5">{auditLogsMetrics.warningEvents}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Critical Incidents</p>
                    <p className="text-base font-black font-mono text-rose-700 mt-0.5">
                      {auditLogsMetrics.criticalEvents > 0 ? (
                        <span className="text-rose-700">{auditLogsMetrics.criticalEvents}</span>
                      ) : (
                        <span className="text-emerald-700">0 (Clean)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Security & System Access Audit Trail"
                subtitle="Immutable log of user authentication, permission elevation, and administrative events"
                columns={auditColumns}
                data={auditLogsData}
                loading={loadingAuditLogs}
                exportFilename="security_audit_logs"
                sheetName="Security Logs"
                showSummaryRow={true}
                summaryCalculations={{
                  timestamp: (rows) => <span className="font-black text-slate-900 font-mono">Total Events: {rows.length}</span>,
                  action: (rows) => {
                    const uniqueActions = new Set(rows.map((r) => r.action).filter(Boolean)).size
                    return <span className="font-black text-slate-900 font-mono">{uniqueActions} Actions</span>
                  },
                  actor_name: (rows) => {
                    const uniqueActors = new Set(rows.map((r) => r.actor_name || r.user_id).filter(Boolean)).size
                    return <span className="font-black text-indigo-700 font-mono">{uniqueActors} Actors</span>
                  },
                }}
              />
            </div>
          )}

          {/* 18. Communication Logs */}
          {activeReportId === 'comm-logs' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {commLogsMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Dispatches</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{commLogsMetrics.totalDispatches}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Delivered</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{commLogsMetrics.deliveredCount}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Delivery Rate</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{commLogsMetrics.deliveryRate}%</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">SMS Outbound</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{commLogsMetrics.smsCount}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">WhatsApp</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{commLogsMetrics.whatsappCount}</p>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Email Dispatches</p>
                    <p className="text-base font-black font-mono text-purple-700 mt-0.5">{commLogsMetrics.emailCount}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Communication & Notification Dispatch Logs"
                subtitle="Delivery records for institutional SMS, WhatsApp, and email messages"
                columns={[
                  { id: 'created_at', header: 'Sent At', accessorKey: 'created_at', type: 'date', width: 150, sortable: true, render: (val) => <span className="font-mono text-xs">{val ? new Date(val).toLocaleString('en-IN') : 'N/A'}</span> },
                  { id: 'recipient_name', header: 'Recipient', accessorKey: 'recipient_name', type: 'text', width: 160 },
                  { id: 'recipient_destination', header: 'Contact #', accessorKey: 'recipient_destination', type: 'text', width: 150 },
                  { id: 'channel', header: 'Channel', accessorKey: 'channel', type: 'text', width: 100, render: (val) => <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold uppercase font-mono">{val}</span> },
                  { id: 'template_code', header: 'Message Type', accessorKey: 'template_code', type: 'text', width: 160 },
                  { id: 'subject', header: 'Subject', accessorKey: 'subject', type: 'text', width: 200 },
                  { id: 'status', header: 'Status', accessorKey: 'status', type: 'text', width: 110, render: (val) => <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${val === 'delivered' || val === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{val}</span> },
                ]}
                data={commLogsData}
                loading={loadingCommLogs}
                exportFilename="communication_logs"
                sheetName="Communications"
                showSummaryRow={true}
                summaryCalculations={{
                  created_at: (rows) => <span className="font-black text-slate-900 font-mono">Total: {rows.length}</span>,
                  channel: (rows) => {
                    const sms = rows.filter((r) => (r.channel || '').toLowerCase() === 'sms').length
                    const wa = rows.filter((r) => (r.channel || '').toLowerCase() === 'whatsapp').length
                    return <span className="font-black text-slate-900 font-mono">SMS:{sms} WA:{wa}</span>
                  },
                  status: (rows) => {
                    const delivered = rows.filter((r) => (r.status || '').toLowerCase() === 'delivered' || (r.status || '').toLowerCase() === 'sent').length
                    return <span className="font-black text-emerald-700 font-mono">Delivered: {delivered}/{rows.length}</span>
                  },
                }}
              />
            </div>
          )}

          {/* 19. Import/Export Migration History */}
          {activeReportId === 'import-history' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {importHistoryMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Migrations</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{importHistoryMetrics.totalMigrations}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Rows Ingested</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{importHistoryMetrics.totalRows.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Successfully Imported</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{importHistoryMetrics.successRows.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Failed Records</p>
                    <p className="text-base font-black font-mono text-rose-700 mt-0.5">{importHistoryMetrics.failedRows.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Ingestion Rate</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{importHistoryMetrics.successRate}%</p>
                  </div>
                  <div className="bg-teal-50/50 border border-teal-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Completed Batches</p>
                    <p className="text-base font-black font-mono text-teal-700 mt-0.5">{importHistoryMetrics.completedMigrations}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Data Import & Migration History"
                subtitle="Historical records of bulk spreadsheet uploads and data migrations"
                columns={[
                  { id: 'created_at', header: 'Import Date', accessorKey: 'created_at', type: 'date', width: 150, sortable: true, render: (val) => <span className="font-mono text-xs">{val ? new Date(val).toLocaleString('en-IN') : 'N/A'}</span> },
                  { id: 'file_name', header: 'File Name', accessorKey: 'file_name', type: 'text', width: 200 },
                  { id: 'entity_type', header: 'Target Entity', accessorKey: 'entity_type', type: 'text', width: 140, render: (val) => <span className="font-bold text-primary-700 capitalize">{val}</span> },
                  { id: 'total_rows', header: 'Rows', accessorKey: 'total_rows', type: 'number', width: 100, align: 'center' },
                  { id: 'successful_rows', header: 'Imported', accessorKey: 'successful_rows', type: 'number', width: 110, align: 'center', render: (val) => <span className="font-bold font-mono text-emerald-700">{val}</span> },
                  { id: 'failed_rows', header: 'Errors', accessorKey: 'failed_rows', type: 'number', width: 100, align: 'center', render: (val) => <span className={`font-bold font-mono ${val > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{val}</span> },
                  { id: 'status', header: 'Status', accessorKey: 'status', type: 'text', width: 120, render: (val) => <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold uppercase font-mono">{val}</span> },
                ]}
                data={importHistoryData}
                loading={loadingImportHistory}
                exportFilename="data_import_history"
                sheetName="Imports"
                showSummaryRow={true}
                summaryCalculations={{
                  file_name: (rows) => <span className="font-black text-slate-900 font-mono">Batches: {rows.length}</span>,
                  total_rows: (rows) => (
                    <span className="font-black text-slate-900 font-mono">
                      {rows.reduce((sum, r) => sum + (Number(r.total_rows) || 0), 0).toLocaleString('en-IN')}
                    </span>
                  ),
                  successful_rows: (rows) => (
                    <span className="font-black text-emerald-700 font-mono">
                      {rows.reduce((sum, r) => sum + (Number(r.successful_rows) || 0), 0).toLocaleString('en-IN')}
                    </span>
                  ),
                  failed_rows: (rows) => (
                    <span className="font-black text-rose-700 font-mono">
                      {rows.reduce((sum, r) => sum + (Number(r.failed_rows) || 0), 0).toLocaleString('en-IN')}
                    </span>
                  ),
                }}
              />
            </div>
          )}

          {/* 20. Student Withdrawals Ledger */}
          {activeReportId === 'withdrawals' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {withdrawalsMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Withdrawn Students</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{withdrawalsMetrics.totalWithdrawn}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Gross Paid</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">₹{withdrawalsMetrics.totalGrossPaid.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Refund Disbursed</p>
                    <p className="text-base font-black font-mono text-amber-700 mt-0.5">₹{withdrawalsMetrics.totalRefunded.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Net Retained</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">₹{withdrawalsMetrics.netRetained.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Retention Rate</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{withdrawalsMetrics.retentionRate}%</p>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Standards Affected</p>
                    <p className="text-base font-black font-mono text-purple-700 mt-0.5">{withdrawalsMetrics.uniqueStandards}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Student Withdrawals Ledger"
                subtitle="Comprehensive record of exited students, retained fees, and refunded amounts"
                columns={[
                  { id: 'admission_number', header: 'Admission #', accessorKey: 'admission_number', type: 'text', width: 130, render: (val) => <span className="font-mono font-bold text-slate-800">{val}</span> },
                  { id: 'student_name', header: 'Student Name', accessorKey: 'student_name', type: 'text', width: 180, sortable: true },
                  { id: 'standard_name', header: 'Standard', accessorKey: 'standard_name', type: 'text', width: 120 },
                  { id: 'division_name', header: 'Batch', accessorKey: 'division_name', type: 'text', width: 130 },
                  { id: 'exit_date', header: 'Exit Date', accessorKey: 'exit_date', type: 'date', width: 110, sortable: true },
                  { id: 'exit_reason', header: 'Reason', accessorKey: 'exit_reason', type: 'text', width: 150 },
                  { id: 'gross_paid', header: 'Gross Paid (₹)', accessorKey: 'gross_paid', type: 'currency', width: 140, align: 'right', render: (val) => <span className="font-bold font-mono text-emerald-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'refund_amount', header: 'Refunded (₹)', accessorKey: 'refund_amount', type: 'currency', width: 140, align: 'right', render: (val) => <span className="font-bold font-mono text-amber-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'net_retained', header: 'Net Retained (₹)', accessorKey: 'net_retained', type: 'currency', width: 150, align: 'right', render: (val) => <span className="font-bold font-mono text-primary-800">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                ]}
                data={withdrawalsReport}
                loading={loadingWithdrawals}
                exportFilename="student_withdrawals_report"
                sheetName="Withdrawals"
                showSummaryRow={true}
                summaryCalculations={{
                  admission_number: (rows) => <span className="font-black text-slate-900 font-mono">Total: {rows.length}</span>,
                  gross_paid: (rows) => (
                    <span className="font-black text-emerald-700 font-mono">
                      ₹{rows.reduce((sum, r) => sum + (Number(r.gross_paid) || 0), 0).toLocaleString('en-IN')}
                    </span>
                  ),
                  refund_amount: (rows) => (
                    <span className="font-black text-amber-700 font-mono">
                      ₹{rows.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0).toLocaleString('en-IN')}
                    </span>
                  ),
                  net_retained: (rows) => (
                    <span className="font-black text-primary-800 font-mono">
                      ₹{rows.reduce((sum, r) => sum + (Number(r.net_retained) || 0), 0).toLocaleString('en-IN')}
                    </span>
                  ),
                }}
              />
            </div>
          )}

          {/* 21. Student Attrition Analytics */}
          {activeReportId === 'withdrawal-analytics' && analyticsData && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Exits</p>
                  <p className="text-base font-black font-mono text-rose-700 mt-0.5">{analyticsData.summary?.total_withdrawn || 0}</p>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Gross Paid at Exit</p>
                  <p className="text-base font-black font-mono text-emerald-700 mt-0.5">₹{Number(analyticsData.summary?.total_gross_paid || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Total Refunded</p>
                  <p className="text-base font-black font-mono text-amber-700 mt-0.5">₹{Number(analyticsData.summary?.total_refunds || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Net Retained</p>
                  <p className="text-base font-black font-mono text-indigo-800 mt-0.5">₹{Number(analyticsData.summary?.total_net_retained || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Retention %</p>
                  <p className="text-base font-black font-mono text-sky-700 mt-0.5">
                    {Number(analyticsData.summary?.total_gross_paid || 0) > 0
                      ? ((Number(analyticsData.summary?.total_net_retained || 0) / Number(analyticsData.summary?.total_gross_paid || 0)) * 100).toFixed(1)
                      : '100.0'}%
                  </p>
                </div>
                <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Primary Reason</p>
                  <p className="text-xs font-bold text-purple-800 mt-1 truncate" title={(analyticsData.by_reason && analyticsData.by_reason[0]?.reason) || 'None'}>
                    {(analyticsData.by_reason && analyticsData.by_reason[0]?.reason) || 'None'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Exits by Reason</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analyticsData.by_reason || []} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={70} label>
                          {(analyticsData.by_reason || []).map((_: any, idx: number) => (
                            <Cell key={`cell-${idx}`} fill={['#f43f5e', '#f59e0b', '#06b6d4', '#6366f1', '#8b5cf6'][idx % 5]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Monthly Attrition Trend</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.trends_monthly || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="count" stroke="#e11d48" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 22. Academics: Daily Homework Register */}
          {activeReportId === 'homework-register' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {homeworkRegisterMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tasks</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{homeworkRegisterMetrics.totalAssignments}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Total Submissions</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{homeworkRegisterMetrics.totalAssigned}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Completed Work</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{homeworkRegisterMetrics.totalCompleted}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Review</p>
                    <p className="text-base font-black font-mono text-amber-700 mt-0.5">{homeworkRegisterMetrics.totalPending}</p>
                  </div>
                  <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Turnaround Rate</p>
                    <p className="text-base font-black font-mono text-violet-800 mt-0.5">{homeworkRegisterMetrics.turnaroundRate}%</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Active Teachers</p>
                    <p className="text-base font-black font-mono text-sky-800 mt-0.5">{homeworkRegisterMetrics.uniqueTeachers}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Daily Homework Checking Register"
                subtitle="Daily assignment issuance, submission turnaround, checking status, and completion rate"
                columns={[
                  { id: 'assignment_code', header: 'Code', accessorKey: 'assignment_code', type: 'text', width: 110, render: (val) => <span className="font-mono font-bold text-slate-800">{val}</span> },
                  { id: 'title', header: 'Assignment Title', accessorKey: 'title', type: 'text', width: 180, sortable: true },
                  { id: 'standard', header: 'Standard', accessorKey: 'standard', type: 'text', width: 120 },
                  { id: 'batch', header: 'Batch', accessorKey: 'batch', type: 'text', width: 120 },
                  { id: 'subject', header: 'Subject', accessorKey: 'subject', type: 'text', width: 130 },
                  { id: 'teacher', header: 'Teacher', accessorKey: 'teacher', type: 'text', width: 150 },
                  { id: 'due_date', header: 'Due Date', accessorKey: 'due_date', type: 'date', width: 110 },
                  { id: 'total_students', header: 'Assigned', accessorKey: 'total_students', type: 'number', width: 90, align: 'right' },
                  { id: 'completed', header: 'Done', accessorKey: 'completed', type: 'number', width: 80, align: 'right', render: (val) => <span className="font-bold text-emerald-700">{val}</span> },
                  { id: 'pending', header: 'Pending', accessorKey: 'pending', type: 'number', width: 80, align: 'right', render: (val) => <span className="font-bold text-amber-700">{val}</span> },
                  { id: 'completion_rate', header: 'Completion %', accessorKey: 'completion_rate', type: 'text', width: 110, align: 'right', render: (val) => <span className="font-extrabold text-indigo-700">{val}</span> },
                ]}
                data={homeworkRegisterData?.items || []}
                loading={loadingHomeworkRegister}
                exportFilename="homework_daily_register"
                sheetName="Homework"
                showSummaryRow={true}
                summaryCalculations={{
                  assignment_code: (rows) => <span className="font-black text-slate-900 font-mono">Tasks: {rows.length}</span>,
                  total_students: (rows) => <span className="font-black text-slate-900 font-mono">{rows.reduce((sum, r) => sum + (Number(r.total_students) || 0), 0)}</span>,
                  completed: (rows) => <span className="font-black text-emerald-700 font-mono">{rows.reduce((sum, r) => sum + (Number(r.completed) || 0), 0)}</span>,
                  pending: (rows) => <span className="font-black text-amber-700 font-mono">{rows.reduce((sum, r) => sum + (Number(r.pending) || 0), 0)}</span>,
                }}
              />
            </div>
          )}

          {/* 22b. Academics: EduBoard Digital Classroom Usage */}
          {activeReportId === 'eduboard-summary' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {eduboardSummaryMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Boards</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{eduboardSummaryMetrics.totalBoards}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Published Live</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{eduboardSummaryMetrics.publishedBoards}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Total Pages</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{eduboardSummaryMetrics.totalPages}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">PDF Attachments</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{eduboardSummaryMetrics.pdfAttachments}</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Saved Templates</p>
                    <p className="text-base font-black font-mono text-amber-800 mt-0.5">{eduboardSummaryMetrics.templatesCount}</p>
                  </div>
                  <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Avg Pages / Board</p>
                    <p className="text-base font-black font-mono text-violet-800 mt-0.5">{eduboardSummaryMetrics.avgPagesPerBoard}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Recent EduBoard Classroom Boards"
                subtitle="Published and draft teaching boards across Classic, Whiteboard, and PDF Presentation modes"
                columns={[
                  { id: 'board_code', header: 'Board Code', accessorKey: 'board_code', type: 'text', width: 150 },
                  { id: 'title', header: 'Title', accessorKey: 'title', type: 'text', width: 240, sortable: true },
                  { id: 'mode', header: 'Mode', accessorKey: 'mode', type: 'text', width: 120 },
                  { id: 'status', header: 'Status', accessorKey: 'status', type: 'text', width: 110 },
                  { id: 'page_count', header: 'Pages', accessorKey: 'page_count', type: 'number', width: 90, align: 'right' },
                ]}
                data={eduboardSummaryData?.recent_boards || []}
                loading={loadingEduBoardSummary}
                exportFilename="eduboard_usage_summary"
                sheetName="EduBoard"
                showSummaryRow={true}
                summaryCalculations={{
                  board_code: (rows) => <span className="font-black text-slate-900 font-mono">Boards: {rows.length}</span>,
                  page_count: (rows) => <span className="font-black text-indigo-700 font-mono">{rows.reduce((sum, r) => sum + (Number(r.page_count) || 0), 0)}</span>,
                }}
              />
            </div>
          )}

          {/* 23. Students: CRM Enquiries & Pipeline */}
          {activeReportId === 'crm-enquiries' && (
            <div className="space-y-4">
              {/* Telemetry KPI Ribbon (Rule 014 Sleek Design System) */}
              {crmEnquiriesMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Counsellors</p>
                    <p className="text-base font-black font-mono text-slate-900 mt-0.5">{crmEnquiriesMetrics.totalCounsellors}</p>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Assigned Leads</p>
                    <p className="text-base font-black font-mono text-indigo-800 mt-0.5">{crmEnquiriesMetrics.totalLeads}</p>
                  </div>
                  <div className="bg-sky-50/50 border border-sky-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Follow-ups Logged</p>
                    <p className="text-base font-black font-mono text-sky-700 mt-0.5">{crmEnquiriesMetrics.totalFollowUps}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Admissions</p>
                    <p className="text-base font-black font-mono text-emerald-700 mt-0.5">{crmEnquiriesMetrics.totalConversions}</p>
                  </div>
                  <div className="bg-violet-50/50 border border-violet-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Conversion Rate</p>
                    <p className="text-base font-black font-mono text-violet-800 mt-0.5">{crmEnquiriesMetrics.conversionRate}%</p>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Follow-ups / Lead</p>
                    <p className="text-base font-black font-mono text-amber-800 mt-0.5">{crmEnquiriesMetrics.avgFollowUpsPerLead}</p>
                  </div>
                </div>
              )}

              <ExcelReportGrid
                title="Counsellor Conversion Matrix"
                subtitle="Counsellor lead allocation, follow-ups logged, admissions secured, and conversion percentages"
                columns={[
                  { id: 'name', header: 'Counsellor / Staff', accessorKey: 'name', type: 'text', width: 160 },
                  { id: 'assigned_leads', header: 'Assigned Leads', accessorKey: 'assigned_leads', type: 'number', width: 120, align: 'right' },
                  { id: 'follow_ups_logged', header: 'Follow-ups', accessorKey: 'follow_ups_logged', type: 'number', width: 110, align: 'right' },
                  { id: 'conversions', header: 'Enrolled', accessorKey: 'conversions', type: 'number', width: 110, align: 'right', render: (val: any) => <span className="font-bold text-emerald-700">{val}</span> },
                  { id: 'conversion_rate', header: 'Conversion %', accessorKey: 'conversion_rate', type: 'text', width: 120, align: 'right', render: (val: any) => <span className="font-extrabold text-indigo-700">{val}%</span> },
                ]}
                data={crmReportsData?.counsellors_matrix || []}
                loading={loadingCrmReports}
                exportFilename="crm_counsellor_conversions"
                sheetName="Counsellors"
                showSummaryRow={true}
                summaryCalculations={{
                  name: (rows) => <span className="font-black text-slate-900 font-mono">Staff: {rows.length}</span>,
                  assigned_leads: (rows) => <span className="font-black text-slate-900 font-mono">{rows.reduce((sum, r) => sum + (Number(r.assigned_leads) || 0), 0)}</span>,
                  follow_ups_logged: (rows) => <span className="font-black text-sky-700 font-mono">{rows.reduce((sum, r) => sum + (Number(r.follow_ups_logged) || 0), 0)}</span>,
                  conversions: (rows) => <span className="font-black text-emerald-700 font-mono">{rows.reduce((sum, r) => sum + (Number(r.conversions) || 0), 0)}</span>,
                }}
              />
            </div>
          )}

          {/* 24. All 20 Governed Concession, Waiver & Scholarship Reports (Phase 5) */}
          {isConcessionReportActive && (
            <div className="space-y-4">
              {/* Server Export & Print Action Strip */}
              <div className="bg-white border border-indigo-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {concessionReportData?.title || activeReport.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Generated {concessionReportData?.generated_at ? new Date(concessionReportData.generated_at).toLocaleString('en-IN') : 'Live SSOT'}
                    {' · '}Currency: {concessionReportData?.currency?.code || 'INR'} ({concessionReportData?.currency?.symbol || '₹'})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadConcessionExport('xlsx')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Server XLSX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadConcessionExport('csv')}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Server CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold"
                  >
                    Print / PDF
                  </button>
                </div>
              </div>

              {/* Report Summary Cards */}
              {concessionReportData?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {Object.entries(concessionReportData.summary).map(([key, val]) => {
                    const isCurrency = !key.includes('count') && !key.includes('students') && !key.includes('percentage') && !key.includes('rate')
                    return (
                      <div key={key} className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-base font-black font-mono text-slate-900 mt-0.5">
                          {isCurrency
                            ? `${concessionReportData.currency?.symbol || '₹'}${Number(val || 0).toLocaleString('en-IN')}`
                            : Number(val || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Governed Report Grid with Trace Drill-Down */}
              <ExcelReportGrid
                title={concessionReportData?.title || activeReport.name}
                subtitle={activeReport.description}
                columns={[
                  ...(concessionReportData?.columns || []).map((col): ColumnConfig<any> => ({
                    id: col.key,
                    header: col.label,
                    accessorKey: col.key,
                    type: col.type === 'currency' ? 'currency' : col.type === 'number' || col.type === 'percent' ? 'number' : 'text',
                    width: col.key.includes('name') || col.key.includes('remark') || col.key.includes('scheme') ? 170 : 125,
                    align: col.type === 'currency' || col.type === 'number' || col.type === 'percent' ? 'right' : 'left',
                    sortable: true,
                    filterable: true,
                    render: (val: any) => {
                      if (col.type === 'currency') {
                        return (
                          <span className={`font-bold ${Number(val) < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                            {concessionReportData?.currency?.symbol || '₹'}{Number(val || 0).toLocaleString('en-IN')}
                          </span>
                        )
                      }
                      if (col.type === 'percent') {
                        return <span className="font-bold text-indigo-700">{Number(val || 0).toFixed(1)}%</span>
                      }
                      return val ?? '—'
                    },
                  })),
                  {
                    id: '_trace',
                    header: 'Traceability',
                    accessorKey: 'application_id',
                    type: 'text',
                    width: 100,
                    align: 'center',
                    render: (_val: any, row: any) => {
                      if (row?.application_id) {
                        return (
                          <button
                            type="button"
                            onClick={() => setTraceTarget({ type: 'application', id: row.application_id })}
                            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[11px] hover:bg-indigo-100"
                          >
                            Trace
                          </button>
                        )
                      }
                      if (row?.invoice_id) {
                        return (
                          <button
                            type="button"
                            onClick={() => setTraceTarget({ type: 'invoice', id: row.invoice_id })}
                            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[11px] hover:bg-indigo-100"
                          >
                            Trace Inv
                          </button>
                        )
                      }
                      if (row?.student_id) {
                        return (
                          <button
                            type="button"
                            onClick={() => setTraceTarget({ type: 'student', id: row.student_id })}
                            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[11px] hover:bg-indigo-100"
                          >
                            Trace Stu
                          </button>
                        )
                      }
                      return <span className="text-slate-300">—</span>
                    },
                  },
                ]}
                data={concessionReportData?.rows || []}
                loading={loadingConcessionReport}
                exportFilename={activeReportId}
                sheetName="Concessions"
                showSummaryRow={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Drill-Down Financial Traceability Modal */}
      <ConcessionTraceModal
        entityType={traceTarget?.type ?? null}
        entityId={traceTarget?.id ?? null}
        onClose={() => setTraceTarget(null)}
      />
      <PrintBrandingFooter className="hidden" fixedBottom showDivider />
    </div>
  )
}
