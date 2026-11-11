/**
 * @file        Reports.tsx
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
 * @updated     2026-11-11
 *
 * @description Centralized Reporting & Analytics Centre uniting module-wise reports across Students, Academics, Fees, Workforce Payroll, Examinations, and System Audit.
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  academicYearsApi,
  homeworkApi,
  leadsApi,
} from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { InvoiceStatusBadge } from '../components/Badge'
import { useBranding } from '../config/branding'
import ExcelReportGrid, { ColumnConfig } from '../components/reports/ExcelReportGrid'
import ReportIntelligenceBanner from '../components/reports/ReportIntelligenceBanner'
import { ConcessionTraceModal } from '../components/common'
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
    id: 'homework-register',
    name: 'Daily Homework Checking Register',
    category: 'academics',
    categoryLabel: 'Academics & Batches',
    description: 'Cohort homework assignments, submission turnaround, teacher review velocity, and non-completion defaulters.',
    badge: 'Curriculum Ops',
    icon: FileSpreadsheet,
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
  { key: 'academics', label: 'Academics & Batches', icon: GraduationCap, count: 5 },
  { key: 'fees', label: 'Fees & Financials', icon: DollarSign, count: 6 },
  { key: 'concessions', label: 'Concessions & Scholarships', icon: Award, count: 20 },
  { key: 'workforce', label: 'Teachers & Payroll', icon: Briefcase, count: 7 },
  { key: 'examinations', label: 'Examinations & Merit', icon: Award, count: 2 },
  { key: 'system', label: 'System & Audit', icon: ShieldCheck, count: 3 },
]

export default function Reports() {
  const branding = useBranding()
  const { user, selectedAcademicYearId, selectedInstitutionId } = useAuthStore()

  // ── Navigation & Catalog State ──
  const [activeCategory, setActiveCategory] = useState<ReportCategoryKey>('students')
  const [activeReportId, setActiveReportId] = useState<string>('student-master')
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
  const { data: standards = [] } = useQuery({
    queryKey: ['reports-standards', selectedInstitutionId],
    queryFn: () => standardsApi.list().then((r) => r.data),
  })

  const { data: divisions = [] } = useQuery({
    queryKey: ['reports-divisions', selectedStandardId],
    queryFn: () => divisionsApi.list(selectedStandardId ? Number(selectedStandardId) : undefined).then((r) => r.data),
  })

  const { data: examinations = [] } = useQuery({
    queryKey: ['reports-examinations', selectedAcademicYearId],
    queryFn: () => examinationsApi.list({ academic_year_id: selectedAcademicYearId || undefined }).then((r) => r.data),
  })

  // Auto-select latest exam if none selected
  useEffect(() => {
    if (examinations.length > 0 && !selectedExamId) {
      setSelectedExamId(String(examinations[0].id))
    }
  }, [examinations, selectedExamId])

  // ── Category Report Queries ────────────────────────────────────────────────

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

  // 5. Academics: Batch Capacity
  const { data: batchCapacityData = [], isLoading: loadingBatchCapacity, refetch: refetchBatchCapacity } = useQuery({
    queryKey: ['report-batch-capacity', selectedBoardId, selectedStandardId],
    queryFn: () => academicReportsApi.getBatchCapacity({ board_id: selectedBoardId || undefined, standard_id: selectedStandardId || undefined }).then((r) => r.data),
    enabled: activeReportId === 'batch-capacity',
  })

  // 6. Academics: Board Distribution
  const { data: distributionData = [], isLoading: loadingDistribution, refetch: refetchDistribution } = useQuery({
    queryKey: ['report-distribution'],
    queryFn: () => academicReportsApi.getDistribution().then((r) => r.data),
    enabled: activeReportId === 'academic-distribution',
  })

  // 7. Academics: Curriculum Matrix
  const { data: curriculumMatrixData = [], isLoading: loadingCurriculum, refetch: refetchCurriculum } = useQuery({
    queryKey: ['report-curriculum-matrix', selectedBoardId, selectedStandardId],
    queryFn: () => reportsApi.curriculumMatrix({ board_id: selectedBoardId || undefined, standard_id: selectedStandardId || undefined }).then((r) => r.data),
    enabled: activeReportId === 'curriculum-matrix',
  })

  // 8. Academics: Timetable Utilization
  const { data: timetableData = [], isLoading: loadingTimetable, refetch: refetchTimetable } = useQuery({
    queryKey: ['report-timetable-utilization', selectedDivisionId],
    queryFn: () => reportsApi.timetableUtilization({ division_id: selectedDivisionId || undefined }).then((r) => r.data),
    enabled: activeReportId === 'timetable-utilization',
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

  // 23. Students: CRM Enquiries & Conversion Pipeline
  const { data: crmReportsData, isLoading: loadingCrmReports, refetch: refetchCrmReports } = useQuery({
    queryKey: ['report-crm-enquiries', selectedAcademicYearId],
    queryFn: () => leadsApi.getReportsAnalytics().then((r: any) => r.data),
    enabled: activeReportId === 'crm-enquiries',
  })

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
      const blob = new Blob([res.data], {
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
    else if (activeReportId === 'crm-enquiries') refetchCrmReports()
    toast.success('Report data refreshed')
  }

  // ── Column Configurations ──────────────────────────────────────────────────

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
    { id: 'receipt_number', header: 'Receipt #', accessorKey: 'receipt_number', type: 'text', width: 140, sortable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span> },
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

        {/* Global Search Bar */}
        <div className="relative w-full md:w-80">
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
                  setActiveCategory(r.category)
                  setActiveReportId(r.id)
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
                setActiveCategory(cat.key)
                const firstInCat = REPORT_CATALOG.find((r) => r.category === cat.key)
                if (firstInCat) setActiveReportId(firstInCat.id)
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
                onClick={() => setActiveReportId(r.id)}
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
          {/* Standard Selector */}
          {(isConcessionReportActive ||
            activeReportId === 'student-master' ||
            activeReportId === 'student-attendance' ||
            activeReportId === 'withdrawals' ||
            activeReportId === 'batch-capacity' ||
            activeReportId === 'curriculum-matrix' ||
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

          {/* 1. Student Master Directory */}
          {activeReportId === 'student-master' && (
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
                admission_number: (rows) => <span className="font-extrabold text-slate-900">Total: {rows.length}</span>,
              }}
            />
          )}

          {/* 2. Attendance Summary */}
          {activeReportId === 'student-attendance' && (
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
                admission_number: (rows) => <span className="font-extrabold text-slate-900">Total: {rows.length}</span>,
                total_days: (rows) => <span className="font-extrabold">{rows.reduce((acc, r) => acc + (r.total_days || 0), 0)}</span>,
                present_days: (rows) => <span className="font-extrabold text-emerald-700">{rows.reduce((acc, r) => acc + (r.present_days || 0), 0)}</span>,
                absent_days: (rows) => <span className="font-extrabold text-rose-700">{rows.reduce((acc, r) => acc + (r.absent_days || 0), 0)}</span>,
              }}
            />
          )}

          {/* 3. Fee Collection Register */}
          {activeReportId === 'collection' && (
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
                admission_number: (rows) => <span className="font-extrabold text-slate-900">Total: {rows.length}</span>,
                total_fees: (rows) => <span className="font-extrabold text-slate-900">₹{rows.reduce((acc, r) => acc + Number(r.total_fees || 0), 0).toLocaleString('en-IN')}</span>,
                paid: (rows) => <span className="font-extrabold text-emerald-800">₹{rows.reduce((acc, r) => acc + Number(r.paid || 0), 0).toLocaleString('en-IN')}</span>,
                outstanding: (rows) => <span className="font-extrabold text-rose-700">₹{rows.reduce((acc, r) => acc + Number(r.outstanding || 0), 0).toLocaleString('en-IN')}</span>,
              }}
            />
          )}

          {/* 4. Outstanding Dues */}
          {activeReportId === 'outstanding' && (
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
                invoice_number: (rows) => <span className="font-extrabold text-slate-900">Total: {rows.length}</span>,
                outstanding: (rows) => <span className="font-extrabold text-rose-700">₹{rows.reduce((acc, r) => acc + Number(r.outstanding || 0), 0).toLocaleString('en-IN')}</span>,
              }}
            />
          )}

          {/* 5. Fee Defaulters Aging */}
          {activeReportId === 'fee-defaulters' && (
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
                admission_number: (rows) => <span className="font-extrabold text-rose-900">Defaulters: {rows.length}</span>,
                overdue_amount: (rows) => <span className="font-extrabold text-rose-700">₹{rows.reduce((acc, r) => acc + Number(r.overdue_amount || 0), 0).toLocaleString('en-IN')}</span>,
              }}
            />
          )}

          {/* 6. Daily Collection */}
          {activeReportId === 'daily-collection' && (
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
                receipt_number: (rows) => <span className="font-extrabold text-slate-900">Transactions: {rows.length}</span>,
                amount: (rows) => <span className="font-extrabold text-emerald-800">₹{rows.reduce((acc, r) => acc + Number(r.amount || 0), 0).toLocaleString('en-IN')}</span>,
              }}
            />
          )}

          {/* 7. Payment Methods Breakdown */}
          {activeReportId === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Total Invoiced Commitment</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">₹{Number(overviewData.summary?.total_obligation || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Realized Banking Inflow</div>
                  <div className="text-xl font-bold text-emerald-700 mt-1">₹{Number(overviewData.summary?.total_collected || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Outstanding Deficit</div>
                  <div className="text-xl font-bold text-rose-600 mt-1">₹{Number(overviewData.summary?.total_outstanding || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <ExcelReportGrid
                title="Batch-wise Financial Reconciliation Ledger"
                subtitle="Audited breakdown of student fee obligations and realized collection rates per batch"
                columns={[
                  { id: 'batch_name', header: 'Batch / Course', accessorKey: 'batch_name', type: 'text', width: 220, sortable: true },
                  { id: 'student_count', header: 'Students', accessorKey: 'student_count', type: 'number', width: 110, align: 'center', sortable: true },
                  { id: 'total_obligation', header: 'Invoiced (₹)', accessorKey: 'total_obligation', type: 'currency', width: 160, align: 'right', sortable: true, render: (val) => <span>₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'total_collected', header: 'Collected (₹)', accessorKey: 'total_collected', type: 'currency', width: 160, align: 'right', sortable: true, render: (val) => <span className="font-bold text-emerald-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'total_outstanding', header: 'Outstanding (₹)', accessorKey: 'total_outstanding', type: 'currency', width: 160, align: 'right', sortable: true, render: (val) => <span className="font-bold text-rose-600">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                  { id: 'collection_rate', header: 'Collection Rate', accessorKey: 'collection_rate', type: 'number', width: 130, align: 'right', sortable: true, render: (val) => <span className="font-mono font-bold text-primary-700">{val}%</span> },
                ]}
                data={overviewData.batch_breakdown || []}
                loading={loadingOverview}
                exportFilename="financial_reconciliation_report"
                sheetName="Reconciliation"
                showSummaryRow={true}
              />
            </div>
          )}

          {/* 9. Batch Capacity */}
          {activeReportId === 'batch-capacity' && (
            <ExcelReportGrid
              title="Batch Capacity & Occupancy Analysis"
              subtitle="Audited batch-level seat allotments, occupancy rates, and classroom timing"
              columns={[
                { id: 'batch_name', header: 'Batch / Division', accessorKey: 'batch_name', type: 'text', width: 180, sortable: true, render: (val, r: any) => <span className="font-semibold text-slate-900">{val} {r.batch_code ? `[${r.batch_code}]` : ''}</span> },
                { id: 'standard_name', header: 'Standard', accessorKey: 'standard_name', type: 'text', width: 140, sortable: true },
                { id: 'board_name', header: 'Board', accessorKey: 'board_name', type: 'text', width: 120, render: (val) => <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-semibold">{val}</span> },
                { id: 'total_capacity', header: 'Capacity', accessorKey: 'total_capacity', type: 'number', width: 110, align: 'center', sortable: true },
                { id: 'enrolled_count', header: 'Enrolled', accessorKey: 'enrolled_count', type: 'number', width: 110, align: 'center', sortable: true, render: (val) => <span className="font-bold text-primary-700">{val}</span> },
                { id: 'available_seats', header: 'Vacant', accessorKey: 'available_seats', type: 'number', width: 110, align: 'center', sortable: true, render: (val) => <span className={`font-bold ${val <= 5 ? 'text-amber-600' : 'text-emerald-700'}`}>{val}</span> },
                { id: 'occupancy_rate', header: 'Occupancy %', accessorKey: 'occupancy_rate', type: 'number', width: 130, align: 'right', sortable: true, render: (val) => <span className="font-mono font-bold text-primary-800">{val}%</span> },
              ]}
              data={batchCapacityData}
              loading={loadingBatchCapacity}
              exportFilename="batch_capacity_report"
              sheetName="Batch Capacity"
              showSummaryRow={true}
            />
          )}

          {/* 10. Board Distribution */}
          {activeReportId === 'academic-distribution' && (
            <div className="space-y-6">
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
                  { id: 'occupancy_rate', header: 'Occupancy %', accessorKey: 'occupancy_rate', type: 'number', width: 130, align: 'right', sortable: true, render: (val) => <span className="font-mono font-bold text-primary-800">{val}%</span> },
                ]}
                data={distributionData}
                loading={loadingDistribution}
                exportFilename="board_distribution_report"
                sheetName="Distribution"
                showSummaryRow={true}
              />
            </div>
          )}

          {/* 11. Curriculum Matrix */}
          {activeReportId === 'curriculum-matrix' && (
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
            />
          )}

          {/* 12. Timetable Utilization */}
          {activeReportId === 'timetable-utilization' && (
            <ExcelReportGrid
              title="Timetable Room & Batch Utilization"
              subtitle="Classroom scheduling distribution and day-wise slot commitments"
              columns={[
                { id: 'day_of_week', header: 'Day', accessorKey: 'day_of_week', type: 'text', width: 120, sortable: true, render: (val) => <span className="font-bold text-primary-700 uppercase">{val}</span> },
                { id: 'start_time', header: 'Start Time', accessorKey: 'start_time', type: 'text', width: 110 },
                { id: 'end_time', header: 'End Time', accessorKey: 'end_time', type: 'text', width: 110 },
                { id: 'room_number', header: 'Room / Hall', accessorKey: 'room_number', type: 'text', width: 120, render: (val) => <span className="px-2 py-0.5 bg-slate-100 font-bold text-slate-800 rounded">{val}</span> },
                { id: 'batch_name', header: 'Batch / Division', accessorKey: 'batch_name', type: 'text', width: 160, sortable: true },
                { id: 'subject_name', header: 'Subject', accessorKey: 'subject_name', type: 'text', width: 160, sortable: true },
                { id: 'teacher_name', header: 'Assigned Teacher', accessorKey: 'teacher_name', type: 'text', width: 180 },
              ]}
              data={timetableData}
              loading={loadingTimetable}
              exportFilename="timetable_utilization_report"
              sheetName="Timetable"
              showSummaryRow={true}
            />
          )}

          {/* 13. Faculty Load */}
          {activeReportId === 'faculty-load' && (
            <ExcelReportGrid
              title="Faculty Teaching Load & Mentorship Audit"
              subtitle="Weekly session commitments, assigned classroom batches, and supervised students"
              columns={[
                { id: 'teacher_name', header: 'Faculty Member', accessorKey: 'teacher_name', type: 'text', width: 190, sortable: true, render: (val) => <span className="font-bold text-slate-900">{val}</span> },
                { id: 'staff_code', header: 'Staff Code', accessorKey: 'staff_code', type: 'text', width: 130, render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span> },
                { id: 'department', header: 'Department', accessorKey: 'department', type: 'text', width: 140 },
                { id: 'assigned_batches_count', header: 'Active Batches', accessorKey: 'assigned_batches_count', type: 'number', width: 130, align: 'center', sortable: true },
                { id: 'total_weekly_hours', header: 'Weekly Hours', accessorKey: 'total_weekly_hours', type: 'number', width: 130, align: 'center', sortable: true, render: (val) => <span className="font-bold text-primary-700">{val} hrs</span> },
                { id: 'total_students_supervised', header: 'Supervised Students', accessorKey: 'total_students_supervised', type: 'number', width: 160, align: 'center', sortable: true, render: (val) => <span className="font-bold text-emerald-800">{val}</span> },
              ]}
              data={facultyLoadData}
              loading={loadingFacultyLoad}
              exportFilename="faculty_teaching_load"
              sheetName="Faculty Load"
              showSummaryRow={true}
            />
          )}

          {/* 14. Specialized Payroll Reports */}
          {activeReportId.startsWith('payroll-') && (
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
          )}

          {/* 15. Exam Merit Register */}
          {activeReportId === 'exam-merit' && (
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
                admission_number: (rows) => <span className="font-extrabold text-slate-900">Total: {rows.length}</span>,
              }}
            />
          )}

          {/* 16. Exam Analytics */}
          {activeReportId === 'exam-analytics' && examAnalyticsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Exam Name</div>
                  <div className="text-base font-bold text-slate-900 mt-1">{examAnalyticsData.exam_name}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Appeared Students</div>
                  <div className="text-xl font-bold text-primary-700 mt-1">{examAnalyticsData.appeared_candidates}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Class Average</div>
                  <div className="text-xl font-bold text-emerald-700 mt-1">{examAnalyticsData.class_average}%</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Overall Pass %</div>
                  <div className="text-xl font-bold text-primary-700 mt-1">{examAnalyticsData.pass_percentage}%</div>
                </div>
              </div>

              <ExcelReportGrid
                title="Subject-wise Score & Pass Analytics"
                subtitle="Comparative statistical breakdown of student performance per examination subject"
                columns={[
                  { id: 'subject_name', header: 'Subject', accessorKey: 'subject_name', type: 'text', width: 200, sortable: true, render: (val) => <span className="font-bold text-slate-900">{val}</span> },
                  { id: 'candidates_count', header: 'Candidates', accessorKey: 'candidates_count', type: 'number', width: 120, align: 'center', sortable: true },
                  { id: 'average_marks', header: 'Average Score', accessorKey: 'average_marks', type: 'number', width: 140, align: 'center', sortable: true, render: (val) => <span className="font-bold text-slate-800">{val}</span> },
                  { id: 'highest_marks', header: 'Highest', accessorKey: 'highest_marks', type: 'number', width: 120, align: 'center', render: (val) => <span className="font-bold text-emerald-700">{val}</span> },
                  { id: 'lowest_marks', header: 'Lowest', accessorKey: 'lowest_marks', type: 'number', width: 120, align: 'center', render: (val) => <span className="font-bold text-rose-700">{val}</span> },
                ]}
                data={examAnalyticsData.subject_analytics || []}
                loading={loadingExamAnalytics}
                exportFilename="exam_subject_analytics"
                sheetName="Subject Analytics"
                showSummaryRow={true}
              />
            </div>
          )}

          {/* 17. Security Audit Trail */}
          {activeReportId === 'audit-logs' && (
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
                timestamp: (rows) => <span className="font-extrabold text-slate-900">Total Events: {rows.length}</span>,
              }}
            />
          )}

          {/* 18. Communication Logs */}
          {activeReportId === 'comm-logs' && (
            <ExcelReportGrid
              title="Communication & Notification Dispatch Logs"
              subtitle="Delivery records for institutional SMS, WhatsApp, and email messages"
              columns={[
                { id: 'created_at', header: 'Sent At', accessorKey: 'created_at', type: 'date', width: 150, sortable: true, render: (val) => <span className="font-mono text-xs">{val ? new Date(val).toLocaleString('en-IN') : 'N/A'}</span> },
                { id: 'recipient_name', header: 'Recipient', accessorKey: 'recipient_name', type: 'text', width: 160 },
                { id: 'recipient_contact', header: 'Contact #', accessorKey: 'recipient_contact', type: 'text', width: 130 },
                { id: 'channel', header: 'Channel', accessorKey: 'channel', type: 'text', width: 100, render: (val) => <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold uppercase">{val}</span> },
                { id: 'template_title', header: 'Message Type', accessorKey: 'template_title', type: 'text', width: 160 },
                { id: 'status', header: 'Status', accessorKey: 'status', type: 'text', width: 110, render: (val) => <span className={`px-2 py-0.5 rounded text-xs font-bold ${val === 'delivered' || val === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{val}</span> },
              ]}
              data={commLogsData}
              loading={loadingCommLogs}
              exportFilename="communication_logs"
              sheetName="Communications"
              showSummaryRow={true}
            />
          )}

          {/* 19. Import/Export Migration History */}
          {activeReportId === 'import-history' && (
            <ExcelReportGrid
              title="Data Import & Migration History"
              subtitle="Historical records of bulk spreadsheet uploads and data migrations"
              columns={[
                { id: 'created_at', header: 'Import Date', accessorKey: 'created_at', type: 'date', width: 150, sortable: true, render: (val) => <span className="font-mono text-xs">{val ? new Date(val).toLocaleString('en-IN') : 'N/A'}</span> },
                { id: 'file_name', header: 'File Name', accessorKey: 'file_name', type: 'text', width: 200 },
                { id: 'entity_type', header: 'Target Entity', accessorKey: 'entity_type', type: 'text', width: 140, render: (val) => <span className="font-bold text-primary-700 capitalize">{val}</span> },
                { id: 'total_rows', header: 'Rows', accessorKey: 'total_rows', type: 'number', width: 100, align: 'center' },
                { id: 'success_rows', header: 'Imported', accessorKey: 'success_rows', type: 'number', width: 110, align: 'center', render: (val) => <span className="font-bold text-emerald-700">{val}</span> },
                { id: 'error_rows', header: 'Errors', accessorKey: 'error_rows', type: 'number', width: 100, align: 'center', render: (val) => <span className={`font-bold ${val > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{val}</span> },
                { id: 'status', header: 'Status', accessorKey: 'status', type: 'text', width: 120, render: (val) => <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold uppercase">{val}</span> },
              ]}
              data={importHistoryData}
              loading={loadingImportHistory}
              exportFilename="data_import_history"
              sheetName="Imports"
              showSummaryRow={true}
            />
          )}

          {/* 20. Student Withdrawals Ledger */}
          {activeReportId === 'withdrawals' && (
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
                { id: 'gross_paid', header: 'Gross Paid (₹)', accessorKey: 'gross_paid', type: 'currency', width: 140, align: 'right', render: (val) => <span className="font-bold text-emerald-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                { id: 'refund_amount', header: 'Refunded (₹)', accessorKey: 'refund_amount', type: 'currency', width: 140, align: 'right', render: (val) => <span className="font-bold text-amber-700">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
                { id: 'net_retained', header: 'Net Retained (₹)', accessorKey: 'net_retained', type: 'currency', width: 150, align: 'right', render: (val) => <span className="font-bold text-primary-800">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
              ]}
              data={withdrawalsReport}
              loading={loadingWithdrawals}
              exportFilename="student_withdrawals_report"
              sheetName="Withdrawals"
              showSummaryRow={true}
            />
          )}

          {/* 21. Student Attrition Analytics */}
          {activeReportId === 'withdrawal-analytics' && analyticsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Total Exits</div>
                  <div className="text-2xl font-black text-rose-700 mt-1">{analyticsData.summary?.withdrawn_students || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Total Paid at Exit</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">₹{Number(analyticsData.summary?.gross_paid || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Total Refunded</div>
                  <div className="text-xl font-bold text-amber-700 mt-1">₹{Number(analyticsData.summary?.refund_amount || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Net Retained</div>
                  <div className="text-xl font-bold text-primary-700 mt-1">₹{Number(analyticsData.summary?.net_retained || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-sm mb-4">Exits by Reason</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analyticsData.by_reason || []} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={80} label>
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

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-sm mb-4">Monthly Attrition Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.trends_monthly || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
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
            />
          )}

          {/* 23. Students: CRM Enquiries & Pipeline */}
          {activeReportId === 'crm-enquiries' && (
            <div className="space-y-6">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  {Object.entries(concessionReportData.summary).map(([key, val]) => {
                    const isCurrency = !key.includes('count') && !key.includes('students') && !key.includes('percentage') && !key.includes('rate')
                    return (
                      <div key={key} className="bg-white border border-slate-200 rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm font-extrabold text-slate-900 mt-0.5">
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
    </div>
  )
}
